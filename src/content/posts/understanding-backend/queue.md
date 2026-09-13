---
title: "What Happens After You Put Something on a Queue?"
date: 2026-09-13
description: "I moved the confirmation email out of the request and checkout went from 300 ms to under 1 ms. Then I followed one message through crashes, duplicates, dead letters, and backpressure."
tags: ["understanding-backend"]
series: "#understandingBackend"
---

[Post 05](/posts/understanding-backend/concurrency/) ended with a question I couldn't shake.

The slowest thing inside my lock was the payment call.

After that came the confirmation email.

Neither needed to finish before the user got an answer.

So why was the user waiting for them?

I wanted to move that work out of the request.

And then figure out **what I was giving up by doing it.**

## Make the request do less

I started with the smallest checkout handler I could think of:

```python
def checkout(order_id, email):
    db.save_order(order_id)
    send_email(email)
    return "ok"
```

The email takes about **300 ms**.

So every checkout takes about 300 ms.

Then I changed one thing:

```python
def checkout(order_id, email):
    db.save_order(order_id)
    queue.add({"order_id": order_id, "to": email})
    return "ok"
```

Checkout dropped to **under 1 ms**.

The queue was Redis 8 on my machine, using streams. The shape is the same as other message queues: a producer adds messages, a worker takes them.

Then I looked at the queue.

Ten messages waiting.

Zero emails sent.

The user had already received `"ok"`.

The email didn't exist yet.

That changed what `"ok"` meant.

> **"ok" stopped meaning "done".**
>
> **it started meaning "promised".**

## What does the queue actually do?

I put one message on the queue and started one worker.

```text
producer
   ↓
 queue
   ↓
 worker
   ↓
send the email
   ↓
  ack
```

At 0 ms, the producer added the message.

At 3 ms, the worker picked it up.

At 304 ms, the email went out.

At 305 ms, the worker acknowledged the message.

That last step was the interesting one.

An **acknowledgement**, or ack, is the worker telling the queue:

**"i'm done with this message."**

Until then, the queue can't safely assume the work succeeded.

> **delivered doesn't mean done.**

It means a worker received the message.

## What if the worker dies?

First I tried the simplest possible queue: a list.

The producer pushes messages onto one end.

The worker pops them from the other.

I queued ten emails and killed the worker while it was holding the fourth.

Then I started a new worker.

**Nine emails.**

The fourth was gone.

Popping the message had removed it from the queue.

The worker died holding the only copy.

This is **at-most-once** delivery:

the message is handled once, or not at all.

> **the list did exactly what i asked.**
>
> **i asked it to forget.**

## So keep the message until ack

With a stream, the queue keeps the message until the worker acknowledges it.

Same ten emails.

Same crash on the fourth, before sending.

This time the queue knew one message had been taken but not finished.

A new worker could take it over.

**Ten of ten emails.**

This is **at-least-once** delivery.

The queue doesn't forget the message until somebody says it's done.

But that word matters:

**at least once.**

## What if it crashes after the work?

I changed the crash point.

This time the worker died **after sending the fourth email but before the ack**.

From the queue's perspective, this looked exactly like the previous crash:

```text
message taken
      ↓
       ?
      ↓
no ack
```

So the new worker took the message and sent the email again.

**Eleven emails for ten orders.**

The queue couldn't tell whether the email had already been sent.

It only knew that nobody had acknowledged the message.

> **at-least-once means the same message can be delivered twice.**
>
> **the consumer has to deal with that.**

## Make the consumer safe to repeat

This was the same problem as the retried write from Post 04.

Before sending, I recorded that the order had already been processed.

The new worker received the message, checked the record, and skipped it.

Ten emails.

The queue still delivered the message twice.

The consumer made the operation **effectively once**.

But there was still a gap between recording the state and sending the email.

For email, that's usually an acceptable trade-off.

For money, it isn't.

That's a problem for a later experiment.

> **the queue delivers at least once.**
>
> **the consumer has to make that safe.**

## What about a message that never succeeds?

Then I gave one order a bad email address.

The worker tried it.

It failed.

No ack.

So the queue gave it back.

It failed again.

And again.

After twelve seconds, that one message had been delivered **20 times**.

It would have kept going.

The other nine emails were fine, but this one bad message kept consuming worker capacity.

So I gave retries a limit.

After five deliveries, the worker moved the message to a separate queue and acknowledged the original.

That's a **dead letter queue**:

a place for messages that repeatedly fail so they can be inspected and handled separately.

> **a retry only helps if the next attempt can succeed.**
>
> **a bad email address won't fix itself.**

## Then the queue got long

The next problem was the opposite.

I sent work faster than the worker could process it.

Fifty orders a second.

One worker, with each email taking about 300 ms, can handle roughly three a second.

After ten seconds:

**466 emails were waiting.**

Every user still got `"ok"` in under a millisecond.

Nothing had failed.

The queue had simply absorbed the difference between how fast work arrived and how fast it could be processed.

That's what a queue really is:

**a buffer between arrival rate and processing rate.**

But the wait didn't disappear.

It moved.

I tried three approaches.

Twenty workers kept the queue at zero.

Capping the queue at a hundred messages kept it small, but messages had to be dropped to make room. Hundreds of users never got an email.

The third option was to push back.

When the queue is full, the producer waits or says no.

That's **backpressure**.

The user sees the slowness again.

But at least the system isn't pretending everything is fine.

> **a queue doesn't remove the work.**
>
> **it moves the wait somewhere else.**

## `queue.add(...)` hides a lot

Moving the email out of the request is one line.

The engineering decisions aren't.

- what does `"ok"` mean to the user now?
- what happens if the worker dies before the ack?
- what happens if it dies after the work?
- is the work safe to do twice?
- how does the consumer detect duplicates?
- how many times should a message be retried?
- where do permanently failing messages go?
- who looks at them?
- how many workers do we need?
- how long is the user willing to wait?
- what happens when the queue is full?

None of those decisions appear in:

```python
queue.add(...)
```

## What actually changed in my mental model

Before this experiment, I thought of a queue as:

> "do it later."

Now I think of it as:

> **a promise the request makes, and a worker has to keep.**

And the hardest part isn't putting something on the queue.

It's defining what **done** means.

```text
take message
     ↓
 do the work
     ↓
    ack
```

Crash before the work:

redelivery is probably what you want.

Crash after the work but before the ack:

redelivery can create a duplicate.

The queue can't tell which happened.

It only sees:

**no ack.**

> **the queue doesn't know whether the work happened.**
>
> **it only knows nobody said "done".**

And now I understand why moving work to a queue is more than a performance optimization.

It changes the semantics of the request.

The user gets a faster response.

The system gets another component to keep healthy.

The work becomes asynchronous.

Failures become messages.

And "success" becomes something you have to define.

This was one queue and one worker, on one machine.

It still couldn't tell whether the work had happened.

Which leaves me with the next question:

> **what happens when the message crosses into another service?**

Service A sends.

Service B processes.

The network dies.

A gets nothing back.

**Next: the hardest distributed systems problem is not knowing what happened.**
