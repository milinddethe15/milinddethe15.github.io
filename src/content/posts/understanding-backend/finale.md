---
title: 'Writing the Code Is Only the Beginning'
date: 2026-09-17
description: 'The checkout worked. So I put four copies of it in containers behind a load balancer, kept traffic flowing, and tried to change it. The first deploy was an outage, a column rename broke a perfect rolling deploy, and the rollback made it worse. This is what production turned out to mean.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 09](/posts/understanding-backend/TODO-post-09-slug/) ended on the question I'd been avoiding since post 01.

Everything so far ran on my laptop, with me watching.

The code was correct.

I could see it running.

That felt like the end.

So I wanted to answer the last question:

> **what happens when the code i wrote actually reaches production?**

I don't have a production.

So I built the smallest one I could think of.

## It works

I packaged the checkout as a **container image**:

the code, the Python it needs, the libraries, in one file that runs the same anywhere.

Then I ran four copies of it, put a tiny load balancer in front, and sent a hundred checkouts a second through it.

```text
traffic
  ↓
load balancer
  ↓
four instances of the checkout
  ↓
Postgres
```

A thousand checkouts.

**A thousand 200s.**

Then I changed one line, and I had to get it out there.

## The first deploy was an outage

I did what I'd do on one server.

Stop everything.

Start the new version.

For about **two seconds**, nothing was listening.

Every request in that window failed.

Not because anything was wrong with the new code.

Because there was no code running.

So I did it one instance at a time.

Stop one, start one, wait until it's up, next.

Still **over a hundred** failures.

Spread over five seconds instead of two.

Rolling didn't remove the errors.

It spread them out.

Why?

The balancer didn't know I was deploying.

It kept sending a quarter of the traffic to a port where nothing was listening yet.

And the stop cut off whatever the old instance was in the middle of.

> **a deploy isn't a moment.**
>
> **it's a window where the old and the new run side by side, and someone is always mid-request.**

## So I told the balancer what I was doing

Two rules.

**Readiness**: a new instance gets no traffic until its health check passes.

That took the failures from over a hundred to **six**.

The six were the requests the old instance was handling when I killed it.

**Draining**: take the instance out of the balancer first, wait for its in-flight requests to finish, then ask it to stop instead of killing it.

```text
take one instance out of the balancer
  ↓
wait for its in-flight requests
  ↓
stop it
  ↓
start the new version
  ↓
wait for its health check
  ↓
put it back in
  ↓
next instance
```

**Zero** failed.

This is a **rolling deploy**:

the old and new versions shared traffic for about five seconds, and nobody could tell.

> **the deploy didn't get faster.**
>
> **it got invisible.**

## Then I renamed a column

The next change renamed `total` to `amount`.

One migration, one code change.

The migration ran first, then the rolling deploy, the way a pipeline would.

**778** of two thousand requests failed.

With the deploy that had just done zero.

Why?

The migration took a millisecond.

The deploy took five seconds.

For those five seconds, every old instance still running was inserting into a column that no longer existed.

So I rolled back.

It got worse.

Now all four instances were the old code, and the column was still renamed.

Every request failed until I renamed it back by hand.

> **the two versions weren't just sharing traffic.**
>
> **they were sharing a database.**

## Expand, then contract

The fix was to never change the code and the schema at the same moment.

```text
add the new column, keep the old one
  ↓
deploy code that writes both
  ↓
backfill the old rows
  ↓
deploy code that writes only the new one
  ↓
drop the old column
```

Three migrations and two deploys instead of one of each.

Every step works with the version before it.

So every step can be rolled back.

I ran the whole sequence under load.

**Zero** failures.

This is **expand and contract**, and it's slower on purpose.

> **a migration the old code can't run on**
>
> **is a deploy you can't roll back.**

## Then I shipped a bug

The next version added loyalty points.

It divides by zero for one user in twenty.

My tests didn't use that user.

I rolled it out everywhere with the good rolling deploy.

The deploy worked perfectly.

One checkout in twenty failed.

Rolling back meant redeploying four instances: about **six seconds**, plus however long it took me to notice.

Every user was exposed the whole time.

So I tried it again, on one instance out of four.

This is a **canary**.

A quarter of the traffic went to the new version.

Counting errors per version showed it straight away: new version failing, old version clean.

Rolling back was one instance, about a second and a half.

A quarter of the users met the bug, for a fraction of the time.

> **a canary doesn't keep bugs out of production.**
>
> **it decides how many people meet them.**

## Or don't tie the change to the deploy

Then I tried it a third way.

Same loyalty points, behind a **feature flag**:

a percentage stored in the database, read by the code about once a second.

I deployed it to all four instances with the flag at zero.

Zero failures.

The bug was in production and nobody could reach it.

Then I turned it on for ten percent of users.

Errors.

Then I turned it off.

The errors stopped within about a second.

No deploy.

> **deploying the code and turning it on became two different decisions.**

## `git push` hides a lot

Pushing the change is easy.

The questions behind it aren't.

- what's running while the new version starts?
- who's mid-request when the old one stops?
- does the old code still work on the new schema?
- does the new code work on the old one?
- can this be rolled back, and how long does that take?
- how many users see it first?
- how do I know it's wrong?
- can I turn it off without deploying?
- who gets paged?
- what changes so it doesn't happen again?

None of those decisions appear in:

```bash
git push origin main
```

## What actually changed in my mental model

Before this experiment, I thought:

> "the endpoint works. I'm done."

Now I think of production as a system that is **always in the middle of changing**.

```text
write the code
  ↓
build the image
  ↓
deploy it, a little at a time
  ↓
watch it under real traffic
  ↓
something is wrong
  ↓
roll back, or turn it off
  ↓
find out why
  ↓
write the code
```

The loop doesn't end when the endpoint works.

That's where it starts.

When the bug reached everyone, that was an incident.

The fix wasn't "be more careful".

It was a smaller blast radius next time, and a faster way back.

> **correct code is the entry ticket.**
>
> **production is everything that happens after.**

Ten posts ago I asked what happens to a request after I send it.

The database did work I couldn't see.

The cache lied.

The retries made it worse.

Two requests raced.

The queue changed what "done" meant.

A service never answered.

The event didn't go out.

The system was green and broken.

And then all of it had to be deployed, changed and rolled back, with users in the middle.

I don't think I know backend engineering now.

But I have a much better idea of what it actually means.

**Next: one question at a time. The deep dives start here.**
