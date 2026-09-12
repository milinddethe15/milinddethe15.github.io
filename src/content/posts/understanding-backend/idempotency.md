---
title: 'My Code Was Correct Until Two Requests Ran at Once'
date: 2026-09-12
description: "My inventory handler passed every test. Then twenty buyers hit it at the same moment and it sold twenty units from a stock of five. A transaction didn't help. A lock did, until I ran two copies of the app."
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 04](/posts/understanding-backend/retries/) ended with something I didn't fully understand.

Two requests with the same key arrived at the same instant, and a unique constraint stopped the duplicate.

The database saved me.

I hadn't written anything for that.

So I wanted to find out what happens when two requests change the same thing at the same time, and **nothing saves me**.

I built the smallest inventory handler I could think of.

## Five in stock

One item.

Five units.

```python
def buy(item_id, buyer):
    stock = db.query(
        "SELECT stock FROM inventory WHERE id = ?",
        item_id,
    )

    if stock <= 0:
        return "sold out"

    charge(buyer)

    db.execute(
        "UPDATE inventory SET stock = ? WHERE id = ?",
        stock - 1,
        item_id,
    )
    db.execute("INSERT INTO orders ...")

    return "ok"
```

Read the stock.

Decide if there's enough.

Charge the buyer.

Write the new stock.

I sent twenty buyers through it one at a time.

Five orders.

Fifteen "sold out".

Stock at zero.

**Everything looked correct.**

Same setup as the earlier posts: Postgres 18 in Docker, on my machine. Each request ran in its own thread with its own database connection, the way a web server handles requests.

Then I changed one thing.

I started all twenty requests at the same time.

## Twenty buyers. Five units.

Same handler.

Same five units.

This time:

**twenty orders.**

**stock says four.**

Nobody saw "sold out".

I had sold twenty units of something I only had five of.

Two requests are enough to show what happened:

```text
A reads stock = 5
B reads stock = 5
A writes stock = 4
B writes stock = 4
```

Both requests read five, so both decided there was stock.

B's write then replaced A's.

Two units were sold.

Stock only dropped by one.

The name for this is a **race condition**.

But the shape matters more than the name:

```text
read
  ↓
decide
  ↓
write
```

There's a gap between the read and the write.

Another request can run through that gap.

I even removed the payment call, so the gap was only a few milliseconds wide.

Still twenty orders.

> **my handler was correct for one request at a time.**
>
> **it was never correct for two.**

## A transaction didn't save me

My first thought was obvious:

"put it in a transaction."

So I wrapped the whole thing in `BEGIN` and `COMMIT`.

Twenty orders.

Four left.

Nothing changed.

A transaction makes my steps all-or-nothing.

It doesn't make two transactions take turns.

Both could still read five before either one wrote.

Then both committed four.

Postgres does have a stricter mode that catches this. When I turned it on, it noticed the conflict and refused to commit nineteen of the twenty.

Nothing was corrupted.

But those nineteen came back as errors, not "sold out", and my code had to decide what to do with them.

That taught me something important:

> **a transaction makes my steps all-or-nothing.**
>
> **it doesn't automatically make two requests take turns.**

## So I made them take turns

If the problem is two requests in the gap at once, why not let in one at a time?

```python
with lock:
    buy(item_id, buyer)
```

Five orders.

Stock at zero.

Fixed.

Then I ran two copies of the app, the way two instances sit behind a load balancer.

Ten buyers hit each copy.

**Ten orders.**

Each process had its own lock.

Each lock worked perfectly.

They just didn't know about each other.

The lock protected the process.

The data lived somewhere else.

> **a lock only works if every request that touches the data goes through the same lock.**

In most backends, every instance does share one thing:

the database.

So that's where the coordination has to happen.

## Let the database decide

The simplest fix was to remove the gap entirely.

```sql
UPDATE inventory
SET stock = stock - 1
WHERE id = ? AND stock > 0
RETURNING stock;
```

If a row comes back, the sale happened.

If nothing comes back, it was sold out.

Correct with twenty buyers.

Correct with eighty.

And it was the fastest version I tried.

There's still a lock here.

The database locks the row while it changes it, and checks `stock > 0` again once it has the lock.

The read, decision, and write happen together.

Nothing can slip between them.

I just didn't have to manage the lock myself.

The catch is that the decision has to fit inside that one statement.

> **the race was in the gap between my read and my write.**
>
> **the fix was to remove the gap.**

## When the decision is more complicated

Sometimes the decision doesn't fit in one statement.

You need to read the row, run some logic, and then write.

For that, you can ask the database to lock the row first:

```sql
SELECT stock FROM inventory
WHERE id = ?
FOR UPDATE;
```

Now the row stays locked until the transaction commits.

Anyone else who wants it waits.

Correct again.

But "waits" has a cost.

With eighty buyers, the typical request took about **600 ms** to get through, including requests that were only going to be told "sold out".

They had to get in line just to find out.

And I had made it worse by keeping the payment call inside the lock.

Every buyer was waiting for the buyer ahead of them to finish paying.

I moved the payment before the lock and kept only the read and the write inside it.

The wait dropped to about **100 ms**.

This is **pessimistic concurrency**:

assume there will be a conflict, and prevent it.

It works.

It also turns concurrent requests into a queue.

> **while you hold the lock, everyone else is waiting for you.**

## Or don't lock

There's another approach.

Instead of stopping everyone else, let them all run and catch the conflict afterwards.

Add a version number to the row.

Read the stock and the version.

Do the work.

Then write only if the version is still the one you read:

```sql
UPDATE inventory
SET stock = ?, version = version + 1
WHERE id = ? AND version = ?;
```

If no row changed, someone else got there first.

Read again.

Try again.

This is **optimistic concurrency**.

Nobody waits for a lock.

But the conflict didn't disappear.

With twenty buyers fighting for one row, each request needed about five attempts.

With eighty, about **twenty**.

It ended up slower than the lock.

With two buyers, it was almost always one attempt.

So optimistic concurrency is great when conflicts are rare.

A flash sale on one row is the opposite.

> **optimistic concurrency doesn't remove the conflict.**
>
> **it moves the cost into a retry.**

## Then I found a deadlock

The lock approach had one more trap.

Request A buys item 1, then item 2.

Request B buys item 2, then item 1.

Now:

```text
A locks item 1
B locks item 2

A waits for item 2
B waits for item 1
```

Neither can continue.

Postgres noticed after a moment and killed one of them:

```text
ERROR: deadlock detected
```

The fix was surprisingly small:

**always acquire multiple locks in the same order.**

> **two locks are enough for a deadlock.**
>
> **one consistent order is enough to avoid it.**

## `stock - 1` hides a lot

The fix is one line of SQL.

The decisions behind it aren't.

- what else can write this row while I'm reading it?
- does every app instance coordinate through the same mechanism?
- can the decision be pushed into the database?
- how long is the lock held?
- is there slow work inside it?
- are conflicts rare or constant?
- who retries when a write loses the race?
- how many times?
- when I need two locks, in what order?
- what happens when the database detects a deadlock?
- what does the user see when their transaction fails?

None of those decisions appear in:

```python
stock - 1
```

## What actually changed in my mental model

Before this experiment, I thought:

> "my code is correct if it does the right thing for a request."

Now I think correctness also depends on **the other requests running at the same time**.

The bug looked like this:

```text
read a value
      ↓
decide based on it
      ↓
another request changes it
      ↓
write using the old value
      ↓
data is wrong
```

And that's the part that bothers me.

No exception.

No failed request.

No obvious error.

Just twenty orders and four left.

> **a concurrency bug doesn't have to throw.**
>
> **it can just leave the data wrong.**

And then I noticed something else.

The thing making my lock slow was the payment call sitting inside it.

After payment came the order confirmation email.

Neither needs to happen before the user gets an answer.

Which leaves me with the next question:

> **if some work doesn't need to happen during the request, why is the user waiting for it?**

**Next: what happens after you put something on a queue?**
