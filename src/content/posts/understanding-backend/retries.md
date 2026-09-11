---
title: 'Retries Can Make a Failure Worse: How One Slow Service Takes Down Another'
date: 2026-09-11
description: 'My dependency got slow for three seconds. Without retries, users saw three bad seconds. With three retries, they saw eight, and I watched the retries turn a small problem into a bigger one.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 03](/posts/understanding-backend/caching/) ended with something I didn't understand:

the cache stopped answering, and my request hung for **26 seconds** because of retries I didn't write.

That made me wonder:

> **when something fails, should you just try again?**

So I built two tiny services to find out.

## The setup

Service A is my API.

Service B is a dependency.

```text
user
  ↓
service A
  ↓
service B
```

B can handle eight requests at a time.

When healthy, each request takes about 100 ms, so it can handle roughly 80 requests/s.

A receives 20 requests/s and gives B at most one second to respond.

With B healthy, everything works.

Then I made B slow.

## The first problem wasn't retries

I changed B's response time from 100 ms to 800 ms.

Its capacity dropped from roughly 80 requests/s to 10.

But A was still sending 20.

```text
20 requests/s arrive
        ↓
B finishes 10/s
        ↓
10/s start waiting
        ↓
the queue grows
```

Within a few seconds, A's one-second timeout started firing.

Almost every request failed.

But B kept working.

A had stopped waiting, while B still had those requests queued.

So B was spending resources producing responses for clients that had already given up.

That's the first thing I hadn't considered:

> **a timeout doesn't necessarily stop the work. it only stops waiting for it.**

## So I added retries

The obvious fix was:

```python
for attempt in range(4):
    try:
        return call_b()
    except Timeout:
        continue

give_up()
```

It made things worse.

One user request could now become four requests to B.

Users waited up to four seconds instead of one.

And B was already overloaded.

Sending it even more work couldn't make it catch up.

> **retrying a slow dependency doesn't make it faster.**
>
> **it makes it busier.**

In my experiment, retries pushed B's traffic to almost 4× the original load while the same underlying slowdown remained.

## But what about backoff and jitter?

These are usually the next two things you hear about.

**Backoff** means waiting longer between attempts.

**Jitter** adds randomness to those waits.

Without jitter, 1,000 clients that fail together can all retry together:

```text
failure
  ↓
retry
  ↓
failure
  ↓
retry
  ↓
failure
```

Backoff and jitter help spread that load out.

They're useful.

But they didn't solve my experiment.

B wasn't suffering because everyone retried at exactly the same time.

B simply couldn't keep up.

Spreading four times the work over a longer period is still four times the work.

## A retry budget

The thing that actually helped was limiting how much extra traffic retries could create.

I gave retries a **10% budget**.

```text
request fails
     ↓
does retry budget remain?
     ↓
   yes → retry
    no → fail
```

When B was healthy, the budget was barely used.

When B was drowning, the budget ran out quickly.

A sent about **1.1×** the normal traffic instead of almost 4×.

The dependency was still broken.

The retry budget didn't fix that.

It just stopped A from making it worse.

## Then B recovered

This experiment made the difference even clearer.

I made B slow for exactly three seconds, then healthy again.

Without retries, users saw roughly three bad seconds.

With three immediate retries, users saw **eight**.

Why?

Because during the slowdown, retries filled B's queue with work from requests that had already timed out in A.

B recovered at second six.

But instead of immediately serving new requests, it had to work through the old queue first.

So the dependency was healthy again.

The users just couldn't tell yet.

> **the dependency was down for three seconds.**
>
> **the retry storm made it feel down for eight.**

With the retry budget, recovery was much closer to the original three seconds.

## Maybe we should stop calling B

There's another tool that does almost the opposite of retrying:

a **circuit breaker**.

After enough failures, A stops calling B altogether.

```text
B starts failing
      ↓
breaker opens
      ↓
A fails fast
      ↓
A sends nothing to B
      ↓
wait
      ↓
send a probe
      ↓
B healthy? → close breaker
```

Users still get errors.

But those errors can return immediately instead of waiting for a timeout.

More importantly, B gets a chance to recover without a growing queue.

That's the trade-off:

**fail faster now so the dependency can recover sooner.**

## So when should you retry?

I changed B again.

This time it was fast, but flaky: roughly one request in five failed immediately.

Now retries helped.

With no retries, about 80% of requests succeeded.

With three retries plus backoff and jitter, my run reached 100% success while B saw only about 1.3× the load.

This is a very different failure.

B had capacity.

The failures were transient.

So the mental model I'm taking away is:

> **retry transient failures.**
>
> **don't keep retrying a dependency that's drowning.**

The difficult part is knowing which one you're looking at.

A quick connection reset is different from a dependency that is consistently timing out under load.

## Then I tried a write

Everything so far was a read.

Repeating a read is usually much easier to reason about.

Then I tried an order.

```text
user clicks "place order"
        ↓
A calls B
        ↓
B saves order
        ↓
response gets lost
        ↓
A times out
        ↓
A retries
```

Now A doesn't know whether the operation failed.

It only knows that the response didn't arrive.

If A retries three more times, B might save the order three more times.

One click.

Four orders.

And the user sees an error.

That's a much nastier problem.

> **a timeout tells you the response didn't arrive.**
>
> **it doesn't tell you the operation didn't happen.**

## Idempotency keys

The retry needs to be safe.

So I gave the operation a unique idempotency key.

```python
key = uuid4()

for attempt in range(4):
    try:
        return call_b(
            order,
            idempotency_key=key,
        )
    except Timeout:
        continue

give_up()
```

B stores that key with the operation.

If the same key arrives again, B doesn't create another order.

It returns the result of the original operation instead.

Four attempts.

**One order.**

And when I sent two requests with the same key at exactly the same time, the database's unique constraint prevented the duplicate.

That was another useful lesson:

the retry logic wasn't enough.

The correctness guarantee had to live where concurrent requests could actually be controlled.

## The retry I didn't write

Now the 26-second cache incident makes sense.

The Redis client had its own retry policy.

It was retrying a dependency that was already down, underneath my application code.

I had been looking at:

```python
cache.get(...)
```

and thinking:

> "that's one call."

It wasn't necessarily one attempt.

Database drivers, HTTP clients, queue consumers, and cloud SDKs can all have their own retry behavior.

So now I check the defaults.

## `retries=3` hides a lot of engineering

A retry loop can be five lines.

The engineering isn't.

You have to decide:

- how long should we wait?
- how many attempts are enough?
- which failures are retryable?
- should attempts use backoff?
- should they use jitter?
- how much extra traffic can retries create?
- is the operation safe to repeat?
- what happens if the original request actually succeeded?
- when should we stop calling the dependency entirely?
- what does the user see while we're waiting?
- does the client library already retry underneath us?

None of those decisions appear in:

```python
retries=3
```

## What I actually learned

Before this experiment, I thought of retries as:

> "if it fails, try again."

Now I think of a retry as **another request sent at exactly the moment a dependency might already be struggling**.

That creates a dangerous loop:

```text
dependency slows down
        ↓
requests time out
        ↓
clients retry
        ↓
dependency gets more work
        ↓
dependency slows down more
        ↓
more requests time out
```

Retries aren't automatically resilience.

Sometimes they're the thing extending the outage.

And for writes, retrying without idempotency can turn uncertainty into duplicates.

> **a retry is a request you send when the system can least afford another one.**

The next question is even closer to the problem I found with idempotency keys:

> **what happens when two requests run at the same time?**

Because my database saved me from the duplicate.

I want to know what happens when nothing does.

**Next: my code was correct until two requests ran at once.**
