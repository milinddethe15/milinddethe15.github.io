---
title: 'A Backend Can Be Correct and Still Be Impossible to Operate'
date: 2026-09-16
description: "Every checkout returned 200 and every order shipped. Then a user said it was slow sometimes, and I couldn't tell where. Then I killed a process and nothing on the request path noticed. Logs, metrics, traces and one alert, in the order I needed them."
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 08](/posts/understanding-backend/correctness/) ended on something that bothered me more than the bug did.

The outbox worked.

Every order shipped, through a crash on every twentieth request.

But I only knew that because I was counting.

If I had never started the relay, nothing would have failed.

The requests would have kept returning "ok".

So I wanted to answer a simple question:

> **when this thing is running and i'm not watching, how do i know it's working?**

I took the checkout from post 08 and added one dependency: a fraud check.

## It works

```text
checkout
  ↓
fraud service
  ↓
orders table + outbox
  ↓
relay
  ↓
shipping
```

A thousand checkouts, about a hundred a second.

**A thousand 200s.**

A thousand orders in the table, a thousand shipped.

Then a user said: "checkout is slow sometimes."

So I opened the logs.

```text
done
checking fraud for order 280
fraud ok (low)
fraud ok (low)
saved order 200
done
saved order 280
done
```

Four thousand lines like that.

I grepped for "error". Nothing.

I grepped for "slow". Nothing.

None of the lines says how long anything took.

None of them says which request it belongs to.

Order 200 was one of the slow ones.

Its lines are in there somewhere, between everyone else's.

> **the logs said exactly what i told them to say.**
>
> **i never told them to say how long.**

## Every line gets a request id

So I changed what a log line is.

One JSON object per line.

Every line carries the request id.

The last line of every request carries how long it took.

```python
log("checkout.done", status=200, ms=804.3)
```

The request id also travels to the fraud service in a header, and the fraud service puts it on its own lines.

Now one grep gives me one request, across both services, in order.

```text
checkout  req-00200  checkout.start
fraud     req-00200  score.start
fraud     req-00200  vendor.lookup   ms=800.5
fraud     req-00200  score.done      ms=800.6
checkout  req-00200  fraud.ok
checkout  req-00200  order.saved
checkout  req-00200  checkout.done   ms=804.3
```

This is **structured logging**:

logs as data you can filter, instead of text you read.

I grepped for done lines over 500 ms.

**Twenty** of the thousand.

But notice what I needed to get there.

A user had to tell me something was slow.

I had to guess that 500 was the number.

And I had to read a thousand lines to learn how bad "sometimes" was.

> **a log answers "what happened to this request?"**
>
> **it can't tell me whether anything is wrong.**

## Then I stopped reading and started counting

Instead of logging each request, I kept three numbers about all of them.

How many.

How many failed.

How long, as a distribution.

These are **metrics**:

counters and histograms, aggregated, with no request ids in them.

For the same thousand checkouts:

```text
requests: 1000   errors: 0
avg 23 ms   p50 6 ms   p99 805 ms
```

The average said fine.

The **p99** said one checkout in a hundred takes almost a second.

A **percentile** is just a rank.

p50 is the middle request.

p99 is the slowest one in a hundred.

That's the important part.

The user who complained was living in the p99.

The average never saw them.

Metrics are cheap enough to keep forever and small enough to draw a line on.

"Page me when p99 crosses 500 ms" is a sentence you can only say about a metric.

> **the median is what most users see.**
>
> **the p99 is what the users who complain see.**

## Where did the time go?

The metric told me checkout was slow.

It didn't tell me which part.

Checkout does two things: it calls the fraud service, and it writes to Postgres.

I'd have started with the database.

Post 02 taught me that.

So I made every step record a **span**:

a name, a start, an end, and the span it ran inside.

The trace id crosses the HTTP call in a header, so the fraud service's spans join the same tree.

The slowest checkout:

```text
checkout                 811 ms   [checkout]
  fraud_check            805 ms   [checkout]
    fraud.score          801 ms   [fraud]
      vendor_lookup      801 ms   [fraud]
  save_order               4 ms   [checkout]
```

**Eight hundred** of the 811 ms are inside the fraud service, waiting on something it calls.

The database took four.

I would have spent an hour on the wrong thing.

This is a **trace**:

one request's time, as a tree, across every service it touched.

> **a metric told me something was slow.**
>
> **a trace told me where.**

## Then I killed the relay

Now I had logs, metrics and traces.

I felt like I could see everything.

So I stopped the relay, the process that moves outbox rows onto the queue, and ran three hundred more checkouts.

```text
requests: 300   errors: 0   p50 6 ms   p99 807 ms
logs: 300 done lines, all status 200
traces: 300, nothing unusual in any of them
```

Everything on the request path was green.

**Zero** of the three hundred orders shipped.

Why?

The request ends at the commit.

So do its logs, its metrics and its trace.

Shipping happens after the request is over.

Nothing I had built could see it.

So I measured the promise instead of the request:

_of the orders placed in the last minute, how many shipped within five seconds?_

This is an **SLI**, a service level indicator:

a number that says whether users are getting what they were promised.

The target I picked, 99%, is the **SLO**, the objective.

And the alert is the line that fires when the number falls below it.

The relay died at t=0.

At six seconds, the alert fired.

Nothing else noticed.

I could have alerted on "the relay process is running" instead.

But a relay that is running and stuck would pass that check.

The orders wouldn't ship either way.

> **the request path was green.**
>
> **the promise was broken.**

## What it cost

Every checkout now writes seven log lines and five spans.

A thousand checkouts wrote about **765 KB** of logs.

The extra latency was too small to measure on my setup.

At a thousand requests a second, that's close to three gigabytes of logs an hour, and five thousand spans a second that someone has to store.

So in production, traces are usually sampled.

Logs are kept for days, not years.

And metrics stay small because they never carry a request id.

> **observability was free at a thousand requests.**
>
> **the bill comes with traffic.**

## `print(...)` hides a lot

Printing a line when the order is saved is easy.

The questions behind it aren't.

- which request did this line come from?
- how long did the request take?
- is that normal?
- how many are like it, right now?
- which part was slow?
- was it my code or a service I called?
- what does the user care about, and is it happening?
- who gets woken up, and by what?
- how long do we keep all this?
- what does it cost to find out?

None of those decisions appear in:

```python
print("saved order", order_id)
```

## What actually changed in my mental model

Before this experiment, I thought:

> "if something breaks, I'll see an error."

Now I think of a running backend as something that has to **answer questions while it runs**.

```text
alert: the promise is broken
  ↓
metrics: how much, since when
  ↓
traces: where
  ↓
logs: what exactly happened to that one request
```

Each signal answers a question the others can't.

And the one that matters most, "are users getting what they were promised?", isn't on the request path at all.

Building the system and understanding it while it runs turned out to be different skills.

The second one is the one I didn't have.

> **a system that says nothing isn't healthy.**
>
> **it's silent.**

Every checkout returned 200.

Every metric was green.

Three hundred orders sat in a table, unshipped.

Which leaves me with the question I've been avoiding since post 01.

Everything so far ran on my laptop, with me watching.

> **what happens when the code i wrote actually reaches production?**

The slow fraud check, the dead relay, the missing alert.

All of it was found in a lab.

**Next: writing the code is only the beginning.**
