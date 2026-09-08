---
title: 'The Journey of a Backend Request: Every Arrow Was Hiding Work'
date: 2026-09-07
description: 'I thought calling an API was client, server, database, response. I traced one request, counted thirteen hops, and measured that most of the time was gone before the server ran a line of my code.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

I've been writing backend code for a while now.

Handlers, API calls, reading logs when something breaks. The normal stuff.

But recently something started bugging me.

I never really understood what happens when I hit an API.

If you'd asked me, I'd have drawn this:

```
client
  ↓
server
  ↓
database
  ↓
response
```

Four boxes. Three arrows.

It's not wrong.

It's just hiding almost everything.

So I decided to trace one request, start to finish.

And write down every place it actually goes.

## So what does a request actually go through?

Here's the version I ended up with.

```
client
  ↓
 DNS
  ↓
TCP + TLS
  ↓
load balancer
  ↓
server
  ↓
routing
  ↓
middleware
  ↓
authentication
  ↓
authorization
  ↓
handler
  ↓
database
  ↓
serialization
  ↓
response
```

Thirteen steps instead of four.

And the interesting part isn't the list.

It's what each arrow costs.

Let's walk it.

## Where does the request even go?

I call `api.example.com`.

That's a name, not an address.

Before anything can be sent, the client has to ask [DNS](https://www.cloudflare.com/learning/dns/what-is-dns/): "which machine is this?"

That's a network round trip on its own.

Usually it's cached, so it feels free.

The first time, it isn't.

The server hasn't done anything yet. My code hasn't run. We've already spent time.

## What does "connect" actually mean?

Now the client has an IP address.

It still can't send the request.

First it has to open a [TCP](https://www.geeksforgeeks.org/computer-networks/what-is-transmission-control-protocol-tcp/) connection. That's a handshake. One round trip.

Then, because it's HTTPS, the [TLS](https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/#what-is-transport-layer-security-tls) handshake.

Certificates, keys, agreeing on how to encrypt.

One or two more round trips.

So before a single byte of my actual request leaves the machine:

```
DNS lookup
  ↓
TCP handshake
  ↓
TLS handshake
  ↓
now send the request
```

At least three round trips of setup for one request.

I'll come back to this. It turns out to be measurable.

## Who actually picks up the request?

My mental model said "the server."

In production, there isn't one server.

There's a [load balancer](https://www.geeksforgeeks.org/system-design/what-is-load-balancer-system-design/) in front, and behind it a bunch of identical servers.

The load balancer:

- accepts the connection
- often terminates TLS
- picks one healthy backend
- forwards the request

So the machine that handles my request is one I didn't choose and can't name.

Another hop. Another arrow.

## What happens before my code runs?

The request finally arrives at a backend process.

I used to think this is where "my code" starts.

Not yet.

First, routing.

The framework looks at `GET /users/42` and picks a handler.

Then middleware. A chain of things that run on _every_ request before the handler:

```
assign request ID
  ↓
log the request
  ↓
rate limit check
  ↓
parse the body
  ↓
authenticate
  ↓
authorize
  ↓
handler
```

Authentication answers "who are you?"

Authorization answers "are you allowed to do this?"

Those are different questions, and I'd been mushing them together for years.

Each of these is cheap on its own.

But they run every time, for every request, before any real work starts.

## Then, finally, my code

The handler runs.

This is the four-box "server" step. The part I thought was the whole thing.

It reads the input and applies the business rules.

Then it decides what data it needs.

Usually that means: go ask the database.

## Where does the data come from?

"Query the database" was one arrow in my diagram.

Here's what's actually inside it:

```
get a connection from the pool
  ↓
send the SQL over the network
  ↓
database parses and plans the query
  ↓
database finds, filters, sorts the rows
  ↓
rows come back over the network
  ↓
rows get mapped into objects
```

The database is another service. On another machine. Over another network hop.

And it's not "storing data." It's doing work to find it.

How much work depends on the query. That's the next post.

## How does the answer get back?

The handler has its objects.

The client wants bytes.

So the response gets [serialized](https://en.wikipedia.org/wiki/Serialization), usually into JSON.

A status code and headers get attached.

Then it travels back the way it came:

```
handler
  ↓
middleware (again, on the way out)
  ↓
load balancer
  ↓
back over the same TLS connection
  ↓
client parses the JSON
```

Same arrows, reversed.

## Did everything happen before the response?

This one surprised me.

Say the handler was "create order."

It saves the order.

It also needs to send a confirmation email, update analytics, and notify the warehouse.

If all of that happens inside the request, the user waits for all of it.

So usually it doesn't.

The order gets saved.

A job goes on a queue.

The response goes back.

The email happens later. Maybe seconds later.

Which means:

> A `200 OK` doesn't mean everything is done.
>
> It means the part the user was waiting for is done.

The rest is [asynchronous](https://www.geeksforgeeks.org/system-design/asynchronous-processing-in-system-design/).

It runs after the response. It can fail after the response.

That's a whole set of problems on its own. Later post.

## Okay, but how much of this is real?

Fair question. Diagrams are cheap.

So I measured it.

`curl` can break down where the time went:

```bash
curl -s -o /dev/null \
  -w "dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n" \
  https://api.github.com/zen
```

Each value is a running total, in seconds, from the start of the request.

First run, nothing cached:

```
dns=0.106  connect=0.125  tls=0.160  ttfb=0.424  total=0.424
```

Next four runs, DNS cached:

```
dns=0.002  connect=0.022  tls=0.058  ttfb=0.080  total=0.081
```

That's the typical line. Across the four runs, total ranged from 76 to 82 ms.

The first run was slower everywhere, not just DNS.

I don't fully know why yet. Cold caches on my side, maybe on theirs too.

Read the warm run as a timeline:

```
  0 ms   start
  2 ms   DNS answered
 22 ms   TCP connected
 58 ms   TLS done
 80 ms   first byte of the response arrives
```

So out of 80 ms:

```
setup (DNS + TCP + TLS)     ~58 ms
send + server work + reply  ~22 ms
```

Roughly three quarters of the total.

Gone before the server ran a single line of code.

You might think:

"Okay, but that's only on the first request."

Exactly.

Give `curl` the URL twice and it reuses the connection for the second request:

```bash
curl -s -o /dev/null -o /dev/null \
  -w "dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n" \
  https://api.github.com/zen https://api.github.com/zen
```

It prints one line per request:

```
dns=0.002  connect=0.022  tls=0.058  ttfb=0.080  total=0.081
dns=0.000  connect=0.000  tls=0.000  ttfb=0.021  total=0.021
```

80 ms became 21 ms.

Nothing about the server changed. We just didn't throw the connection away.

That's the whole reason [keep-alive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Keep-Alive) and [connection pools](https://dev.to/tentanganak/connection-pool-in-backend-development-basic-concept-benefits-and-implementation-4bh0) exist.

I knew those words. I hadn't felt the number.

## But why did I never see any of this?

This is the part I actually wanted to understand.

Every step above is designed to be invisible.

DNS is cached by the OS.

TLS is handled by a library.

The load balancer is infrastructure. It's not in the codebase.

Middleware is a decorator, or one line in a config file.

The database call is `user = User.get(42)`.

It looks like a function call.

It's a network round trip to another machine.

Every layer hides the one beneath it.

That's good. It's why I can write a handler in ten lines.

But it means the cost of each layer is hidden too.

> An abstraction hides work.
>
> It doesn't remove it.

The four-box model wasn't a misunderstanding. It was the abstraction working as intended.

## So is the thirteen-step diagram the "right" one?

No.

It's also a simplification.

I left out CDNs. Caches. Retries. Read replicas.

Service-to-service calls, where the "server" turns around and becomes a client.

The queue worker that runs after the response.

A real production request can touch a lot more than thirteen things.

So the point isn't to memorize the list.

The point is what every arrow has in common:

```
every arrow is a network hop, or a piece of work

every arrow can be slow
every arrow can fail
every arrow can be retried
```

That's the actual lesson. The list was just how I found it.

## What this means in production

Three things fell out of this for me.

**Latency is a sum.**

Total time is every arrow added up.

If a request is slow, the question is "which arrow?"

Not "why is the server slow?"

**Every arrow is a place to fail.**

DNS can fail. The load balancer can pick a dead backend. The database can time out.

The email job can crash after the `200` already went out.

Which means "the request failed" is never one thing.

**The response isn't proof of completion.**

Once work is asynchronous, the client gets an answer before the system is done.

Something has to make sure the rest actually happens.

I don't know how to handle any of these yet.

But I can now see where they live.

## The mental model I'm taking away

A request isn't a function call.

It's a chain of handoffs, and every handoff costs something.

So the question I'll be asking from now on:

> For each arrow in the diagram, what does it cost, and what happens if it fails?

I can't answer that for most of the arrows yet.

But one of them is bugging me more than the rest.

curl could break the setup down. DNS, TCP, TLS, each with its own number.

Everything after that came back as a single number: 22 ms.

Inside those 22 ms: routing, middleware, the handler, the database call, the reply.

curl can't see any of that. It just sees the request go in and the response come out.

On a typical endpoint, most of that time goes to the database.

I know the handler sends SQL and gets rows back.

I don't know what the database does in between.

**Next: what does the database actually do with my query?**
