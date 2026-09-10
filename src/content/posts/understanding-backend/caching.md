---
title: "The Fastest Backend Operation Is the One You Don't Do"
date: 2026-09-10
description: 'My dashboard query was already as fast as it could get. Then everyone asked for it at once, and the database could only answer nine times a second. A cache fixed that in six lines. Then it started lying to me.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 02](/posts/understanding-backend/why-database-get-slow/) ended with something that bothered me:

the database was doing the same work over and over.

So I wanted to answer a simple question:

> **what if we just don't do the work again?**

## The query

Imagine a dashboard showing the top ten customers by spending over the last year.

```sql
SELECT user_id, sum(amount) AS spent
FROM orders
WHERE created_at >= '2024-09-01'
GROUP BY user_id
ORDER BY spent DESC
LIMIT 10;
```

On my setup, this took about **333 ms**.

That sounds slow.

But I checked the query plan.

The table already had an index that helped find the year's orders — around 600,000 of them.

Then Postgres still had to:

1. read those rows
2. group them by customer
3. add up the amounts
4. sort the results
5. return the top ten

The index can help find the rows.

It doesn't add 600,000 numbers for you.

For this query and this dataset, there wasn't some obvious missing index that would make the whole operation disappear.

So I had a different problem.

The query was expensive.

But the answer was also **the same answer most of the time**.

Same setup as the previous post: Postgres 18 in Docker, on my machine. Timings are from a small Python client.

## One request is fine. What about 10,000?

One person asks for the dashboard.

333 ms.

Not great, but probably acceptable for a dashboard.

Now imagine thousands of requests asking for exactly the same thing.

I pointed a bunch of clients at the endpoint, all asking repeatedly.

The database settled at around **nine responses per second**.

Not nine per client.

Nine total.

Adding clients didn't increase throughput.

It increased the waiting.

```text
more clients
    ↓
same amount of database work
    ↓
same throughput
    ↓
longer queue
    ↓
higher latency
```

And then I noticed something obvious.

Every request was asking the database to calculate the **same ten rows**.

I wasn't facing a query that was too slow for one request.

I was doing the same expensive work thousands of times.

## What if we don't?

Instead of making the database calculate the answer again:

```text
request
   ↓
database
   ↓
calculate
   ↓
return answer
```

what if we save the answer?

```text
request
   ↓
cache
   ├── hit  → return answer
   │
   └── miss → database
                ↓
             calculate
                ↓
             store answer
                ↓
             return answer
```

That's the basic idea behind **cache-aside**.

In code:

```python
def dashboard():
    cached = cache.get("dashboard")
    if cached:
        return cached

    rows = db.query(DASHBOARD_SQL)
    cache.set("dashboard", rows, ttl=60)

    return rows
```

The first request still pays the database cost.

The next requests don't.

That's the important part.

> **the cache doesn't make the expensive work faster.**
>
> **it makes us do the expensive work less often.**

## So why is the cache so much faster?

I'm using Redis as the cache.

It is not magic memory.

It's another process.

It's another network hop.

But the operation is fundamentally different.

The database is being asked:

> find the relevant orders, group them, add them, sort them, and give me the top ten.

The cache is being asked:

> give me the value stored under this key.

The database is doing work.

The cache is retrieving work that was already done.

That's why:

> **the fastest backend operation is the one you don't do.**

## Then the cache started lying

Here's where things got interesting.

I gave the cached answer a short TTL so I could watch it happen.

One customer was at the top.

Then another customer placed a huge order.

They were now actually number one.

But the dashboard still showed the old customer.

For a while.

Then the cache expired.

The next request ran the database query.

The dashboard became correct again.

Nothing was technically broken.

The cache was doing exactly what I told it to do.

It was just serving an old answer.

A TTL doesn't prevent stale data.

It defines **how long you're willing to tolerate it**.

Ten seconds in my experiment.

Maybe a minute.

Maybe five minutes.

That isn't just a technical decision.

If a dashboard can be wrong for five minutes, that's a product decision.

## So delete the cache when the data changes?

Maybe.

For example:

```python
db.insert(order)
cache.delete("dashboard")
```

Now the next dashboard request recalculates the answer.

Better.

But now every piece of code that changes an order needs to know that the dashboard cache exists.

And now we have another problem:

```text
write database
      ↓
delete cache
```

What if something happens between those two operations?

Or what if another request reads the old value at exactly the wrong time?

Caching didn't remove consistency problems.

It introduced a new place to think about them.

I'll come back to that.

## What about cache misses?

Suppose 99% of requests hit the cache.

That sounds great.

And it is.

But the remaining 1% still run the expensive query.

The cache didn't make the slow path faster.

It made the slow path **rarer**.

That's an important distinction.

A rare slow path can still matter.

Especially when many requests miss at the same time.

## The stampede

Imagine the cached value expires.

Thousands of requests arrive around the same time.

They all do this:

```text
request 1 → cache miss → database
request 2 → cache miss → database
request 3 → cache miss → database
...
request N → cache miss → database
```

The cache was supposed to protect the database.

Now its expiration sends a crowd straight to it.

That's a **cache stampede**.

One simple idea is:

> let only one request regenerate the value.

Conceptually:

```python
def dashboard():
    cached = cache.get("dashboard")

    if cached:
        return cached

    with lock:
        cached = cache.get("dashboard")

        if cached:
            return cached

        rows = db.query(DASHBOARD_SQL)
        cache.set("dashboard", rows, ttl=60)

        return rows
```

Notice the second cache check.

The request may have been waiting while another request filled the cache.

Without the second check, we'd still run the query unnecessarily.

This pattern is often called **single-flight**.

The important idea isn't the name.

It's:

```text
many requests
      ↓
one expensive computation
      ↓
many requests get the result
```

The lock shown above is only a simplified example. In a multi-instance application, the coordination mechanism has to work across instances, or you can use techniques such as TTL jitter to reduce synchronized expiry.

## Then I broke Redis

At this point, caching looked almost too good.

So I stopped Redis from responding.

Not gracefully.

I paused it.

The cache was still there.

It just wasn't answering.

I'd configured a two-second timeout.

But the request didn't fail after two seconds.

It failed after about **26 seconds**.

That made no sense at first.

The database was completely fine.

The cache was the thing that was broken.

Then I looked at the client behavior.

The Redis client was retrying automatically.

Again.

And again.

With delays between attempts.

I hadn't written those retries.

The library had them.

So the path that was supposed to be:

```text
request
  ↓
cache
  ↓
database
```

became:

```text
request
  ↓
cache
  ↓
retry
  ↓
retry
  ↓
retry
  ↓
...
  ↓
timeout
```

The database never got a chance to help.

The thing I added to make the endpoint faster made the request dramatically slower when that dependency failed.

That was the part I didn't expect.

## Six lines hide a lot of engineering

The cache-aside code is tiny.

But those six lines create a lot of questions:

- how stale can the data be?
- when should it expire?
- what happens on a miss?
- what happens when thousands of requests miss together?
- what happens when the cache is slow?
- what happens when the cache is down?
- does the client retry automatically?
- should the application fall back to the database?
- what happens when data changes?
- can two requests regenerate the same value?
- how do multiple application instances coordinate?
- how much memory should the cache use?

None of those questions appear in:

```python
cache.get(...)
```

That's the thing I'm starting to notice about backend engineering.

**The simple version is usually simple.**

The production version is where the engineering starts.

## So should we "just cache it"?

No.

I think a better rule is:

> **cache something when it is expensive, requested repeatedly, and allowed to be stale.**

If a query is cheap, caching may add unnecessary complexity.

If nobody requests the same result twice, there isn't much to reuse.

If the value must always be current, stale cache entries can be unacceptable.

And even when caching is a good idea, the cache itself becomes a dependency.

## What I actually learned

Before this experiment, I thought of caching as:

> "put frequently used data in Redis so it's faster."

Now I think about it differently.

Caching is really about **avoiding work you've already done**.

The performance improvement isn't necessarily:

```text
slow operation → faster operation
```

It can be:

```text
slow operation
      ↓
do it once
      ↓
reuse the result
```

And that creates a new class of engineering problems:

```text
stale data
cache misses
stampedes
invalidation
dependency failures
retries
consistency
```

The cache made the happy path dramatically faster.

It also gave me more ways to be wrong.

And that feels like a very backend lesson.

> **every optimization moves the problem somewhere else.**

The question I'm taking into the next experiment is:

> **what happens when something my backend depends on stops responding?**

Because this time, the database was fine.

The cache wasn't.

And somehow my request still took 26 seconds.

**Next: retries can make a failure worse.**
