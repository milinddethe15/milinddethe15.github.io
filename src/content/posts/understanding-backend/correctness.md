---
title: "The Database Update Succeeded. The Event Didn't. Now What?"
date: 2026-09-14
description: 'I saved the order on one line and published the event on the next. Then I killed the process between them, swapped them, and put the publish inside the transaction. Nothing fixed it, until the event became a row.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 07](/posts/understanding-backend/distributed-systems/) ended with a question I didn't have an answer for.

When a request crosses into another service, you can't always know whether it happened.

I had accepted that.

But my checkout handler still does two things every time:

it saves the order in the database, and it tells the shipping service.

Two systems.

One line apart.

I wanted to see what happens when the process dies between those lines, and **whether any order of the two calls saves me**.

So I built the smallest checkout I could think of.

## The simple version

```python
def checkout(order_id):
    db.save_order(order_id)
    queue.publish({"type": "order_placed", "order_id": order_id})

    return "ok"
```

The database is Postgres 18.

The queue is a Redis 8 stream, like in post 06.

A separate shipping service reads the stream and ships whatever it sees.

```text
checkout
  ↓
orders table
  ↓
queue
  ↓
shipping service
```

Ten checkouts.

Ten orders in the table, ten events on the stream, ten shipments.

Shipping saw each event **under 1 ms** after the commit.

Then I killed the process between the two lines.

## Paid, never shipped

Ten checkouts again.

The fourth one died after the save and before the publish.

Ten orders in the table.

**Nine events.**

Order 4 is in the database with status `paid`.

The stream never heard of it.

Nobody will ever ship it.

There is nothing to retry.

No message failed.

No job is waiting.

The only trace is a database row.

It doesn't even have to be a crash.

I tried again with Redis unreachable for that one request.

The publish raised, the user saw an error, and the order was still `paid`.

Then I ran a thousand checkouts, with the process dying on every twentieth.

**Fifty** paid orders nobody shipped.

> **the database kept its half.**
>
> **the queue never got its half.**

## What if I publish first?

If the save can happen without the publish, maybe publish first.

```python
def checkout(order_id):
    queue.publish({"type": "order_placed", "order_id": order_id})
    db.save_order(order_id)

    return "ok"
```

Same crash, between the two lines.

**Ten events. Nine orders.**

Shipping shipped order 4.

Order 4 doesn't exist.

The insert doesn't even need a crash to go missing.

It can fail on its own, and the event is already out.

> **whichever call goes second is the one that might not happen.**

## What about a transaction?

My next thought was simple:

**if two writes have to happen together, use a transaction.**

```python
def checkout(order_id):
    with db.transaction():
        db.save_order(order_id)
        queue.publish({"type": "order_placed", "order_id": order_id})

    return "ok"
```

This fixes one case.

With Redis unreachable, the publish raised inside the transaction, and the insert rolled back with it.

Order 4 doesn't exist anywhere.

Consistent.

Then I crashed the process after the publish and before the commit.

**Ten shipments. Nine orders.**

Postgres rolled the insert back.

Redis had already handed the event to shipping.

The publish was never in the transaction.

It only happened while the transaction was open.

> **a transaction can undo an insert.**
>
> **it can't unsend an event.**

## Make the event a row

The problem was that I was writing to two systems.

So I stopped publishing from the request.

```python
def checkout(order_id):
    with db.transaction():
        db.save_order(order_id)
        db.save_event({"type": "order_placed", "order_id": order_id})

    return "ok"
```

The event goes into a table called `outbox`, in the same transaction as the order.

One commit.

Both rows or neither.

The request doesn't publish anything anymore.

A separate process does.

```text
relay, every 100 ms
  ↓
read rows where published_at is null
  ↓
publish each one
  ↓
mark it sent
```

This is the **outbox pattern**:

**write the event with the data, then let another process publish it.**

Same crash, after the commit and before anything was published.

After the ten requests: ten orders, ten unsent rows, zero events.

I started the relay.

Ten shipments.

Then the thousand checkouts again, with the same fifty deaths.

Paid but never shipped: **zero.**

> **the request stopped promising to publish.**
>
> **it wrote down what it owed, next to the order.**

## But the relay can still crash

The relay has its own two steps:

publish, then mark the row sent.

So I killed it in between.

The new relay saw an unsent row and published it again.

**Eleven events for ten orders.**

Shipping shipped order 4 twice.

This is post 06 again.

The outbox changed the problem from **lost** to **at least once**.

And at-least-once delivery means duplicates are possible.

Every outbox row carries an event id.

The shipping service records the ids it has handled, and skips the ones it has seen.

Eleven events.

Ten shipments.

> **the outbox doesn't make the event happen once.**
>
> **it makes sure it happens, and lets the consumer make it once.**

## The trade-off

The event used to reach shipping under a millisecond after the commit.

Through the relay, on my setup, it took about **100 ms**.

That's the polling interval.

The outbox table grows with every order, and something has to clean it.

And the relay is one more process that has to be running.

If it stops, nothing fails.

Orders keep committing.

The unsent rows just pile up quietly.

> **the outbox trades a lost event for a late one.**
>
> **late is something you can measure.**

## What if shipping fails?

I didn't build the full version of this, but it was the next thing I wondered.

The order is committed.

The event is out.

Shipping reads it and finds the item is out of stock.

There's no rollback that reaches back into another service's committed transaction.

What shipping can do is write its own event, through its own outbox:

`shipment_failed`.

The order service reads it and cancels the order.

```text
order placed
  ↓
shipping fails
  ↓
shipment_failed
  ↓
order cancelled, payment refunded
```

Every step is a local transaction.

Every failure has its own step that undoes the ones before it.

That's a **saga**:

a workflow across services made of small commits and compensating actions, instead of one big transaction that spans them all.

> **across services, there's no undo.**
>
> **there's only another write that cancels the first.**

## One line hides a lot

Publishing an event after a save is one line.

The questions behind it aren't.

- what if the process dies between the two?
- what if the queue is unreachable for a second?
- what if the save fails after the event is out?
- can the consumer see an event for data that was never committed?
- who retries the publish, and from what record?
- what if the event is published twice?
- how does the consumer know it has seen this event?
- how late is too late for the event to arrive?
- who notices when the relay stops?
- what happens when the consumer can't do its part?

None of those decisions appear in:

```python
queue.publish(...)
```

## What changed in my mental model

Before this experiment, I thought of an event as:

> "save the data, then tell everyone."

Now I think of it as **part of the state change**.

```text
one transaction
  ↓
the order and the event, committed together
  ↓
a relay publishes the event, as many times as it takes
  ↓
the consumer handles it once
```

The database is the only thing that can say "both or neither".

So the event has to be written there first.

Publishing becomes a retry someone else is responsible for.

> **if two writes have to agree, put them in the same commit.**
>
> **everything after the commit is a delivery problem, not a consistency one.**

The important part was that the paid orders were no longer silently lost.

But I noticed something while watching the relay.

If I had never started it, nothing would have failed.

The requests would have kept returning "ok".

The outbox would have kept growing.

Which leaves me with the next question:

> **the system works. how do we know when it doesn't?**

Nothing in this lab would have told me.

I only knew because I was counting.

**Next: a backend can be correct and still be impossible to operate.**
