---
title: 'The Hardest Distributed Systems Problem: Not Knowing What Happened'
date: 2026-09-14
description: 'I put a breakable network between two services and asked one to charge a card. A timeout looked the same whether the payment never happened, already happened, or was still happening. That changed how I think about distributed systems.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

[Post 06](/posts/understanding-backend/queue/) ended with a question I kept thinking about.

Service A sends a request.

Service B processes it.

Then the network dies.

A gets nothing back.

Inside one process, an error usually tells me what happened.

Across a network, a timeout doesn't.

So I wanted to answer one question:

> **when i get nothing back, did it happen?**

I built two tiny services and a network between them that I could break.

## A asks B to charge a card

A is the checkout.

B is the payments service.

Between them sits a small proxy that I control.

It can pass traffic through, lose the request before B sees it, or lose the response after B has done the work.

```text
  A
  ↓
network
  ↓
  B
  ↓
B's database
```

A waits **one second** for an answer.

One charge through a healthy network: an answer in about 10 ms, and one charge in B's database.

Then I broke the network three different ways.

## Three ways to get the same timeout

I broke the network in three different ways.

### 1. The request never reached B

A waited one second and gave up.

B had no charge.

### 2. B charged the card, but the response was lost

A waited one second and gave up.

B had one charge.

### 3. B was slow

A waited one second and gave up.

B had no charge at that moment.

Three seconds later, the charge appeared.

The important part:

**A saw the exact same timeout in all three cases.**

A timeout doesn't tell you whether the operation happened.

It only tells you that the answer didn't arrive.

> **from a's side, all three are the same silence.**
>
> **on b's side, nothing happened, it happened, or it's still happening.**

## I made the timeout mean "failed"

Then I ran 300 payments through a network that lost one request in ten and one response in ten.

A's rule was the obvious one:

if B doesn't answer, mark the payment failed and tell the user.

In my run, **28 users** were told their payment failed.

B had charged every one of them.

Those users will try again.

Some will be charged twice.

The rest will call support.

That was the moment it clicked:

**"failed" was a guess.**

I had turned "I don't know" into "it failed."

> **a timeout isn't a "no".**
>
> **it's a "don't know".**

## So I tried again

[Post 04](/posts/understanding-backend/retries/) already had part of the answer.

Retry the request, but use the same **idempotency key** every time.

That way, B can recognize:

> "I've already processed this payment."

So retrying is safe.

Same 300 payments, same broken network, up to three attempts each.

Zero users charged and told it failed.

B saw more requests than there were payments, and charged each payment exactly once.

But **five** payments timed out three times in a row.

A still didn't know.

The retry made the request safe to repeat.

It didn't tell A what happened.

> **an idempotency key turns "do this" into "do this, unless you already did".**
>
> **that's a question, not a command.**

## So I started tracking "unknown"

What should A tell the user about those five?

Not "failed".

Not "charged".

The honest answer is:

**"I don't know yet."**

And I realised that should be an actual state.

So A changed its order of operations.

Before calling B, A writes the payment to its own database as `pending`.

If B answers, A updates it.

If B doesn't, A leaves it.

Later, a small reconciler goes through every pending payment and asks B a different question:

"did you charge payment 17?"

B has an endpoint for exactly that.

Same run.

**65** payments were pending when the requests finished.

After the reconciler: zero pending, zero wrong.

The only fact A can be certain of is what A itself did.

So that's what A records.

> **not knowing is a state.**
>
> **give it a name and a row.**

## Then I found another problem

B answers "did you charge this?" from a read replica.

That's common: writes go to the primary, reads spread out across copies.

Normally the replica was about **a millisecond** behind the primary on my machine.

Then I stalled the link between them.

A asked B to charge payment 42.

B: done.

A asked B: did you charge 42?

B: no.

A sent the charge again, same key.

B: already charged.

A asked again: did you charge 42?

B: no.

Same service.

Two honest answers.

The primary knew about the charge.

The replica hadn't heard yet.

This is **replication lag**.

It's one practical example of **eventual consistency**:

**the copies will eventually agree, but they don't have to agree right now.**

While the replica is behind, you have a choice:

- answer with potentially stale data
- wait for fresher data

That's where the consistency trade-off becomes very real.

For a "did you charge this?" question, stale is the wrong choice.

So that read goes to the primary, or the reconciler waits and asks again.

> **a replica doesn't tell you the truth.**
>
> **it tells you the truth as of a moment ago.**

## One function call hides a lot

Calling another service is one line.

The questions behind it aren't.

- what does a timeout mean here?
- has B done nothing, everything, or half?
- is the operation safe to send twice?
- what is the key?
- what does the user see while we don't know?
- who asks B later, and how often?
- which copy of B answers the status question?
- how stale is an answer allowed to be?
- what if two instances of A reconcile the same payment at once?
- what if B's answers arrive out of order?

None of those decisions appear in:

```python
call_b(...)
```

## What changed in my mental model

Before this experiment, I thought a service call had two outcomes:

> "it worked, or it failed."

Now I think there are three:

> **it worked, it failed, or I don't know.**

And that third state changes everything.

```text
send
  ↓
wait
  ↓
answer arrived?
  ├─ yes → you know
  └─ no  → you don't
              ↓
         ask again, safely
              ↓
         or ask later
```

Everything in this post is about handling that third state.

The idempotency key makes retries safe.

The pending row lets us check again later.

The primary read gives us a trustworthy answer.

None of them remove the uncertainty.

They just give us a way to handle it.

> **you can't always know whether it happened.**
>
> **you can always remember that you asked.**

And then I noticed where I'd ended up.

A writes "pending" in its database.

B writes "charged" in its database.

One payment, two records, never written at the same moment.

Which leaves me with the next question:

> **how do you keep two systems consistent when you can't update both at once?**

My checkout still does exactly that on every request.

It saves the order, then tells another service.

**Next: the database update succeeded. the event didn't. now what?**
