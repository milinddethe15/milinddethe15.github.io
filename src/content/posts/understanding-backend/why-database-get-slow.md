---
title: 'Why Databases Get Slow: A Query Is Work, Not a Lookup'
date: 2026-09-09
description: 'I thought a database was a big dictionary. Give it a key, get a row back. So I built a table of a million users, asked for one by email, and watched Postgres read every single row to find it.'
tags: ['understanding-backend']
series: '#understandingBackend'
---

The handler sends SQL. Rows come back. What happens in between?

I had a picture in my head, and it was basically a dictionary.

```
db["user700000@gmail.com"]
```

Give it a key. Get the row.

That's what it looks like from the handler, too:

```
user = User.find_by(email=email)
```

One line. Feels like a lookup.

So I built a database and watched what it actually did.

## What did I build?

A Postgres table with a million users.

```
users
  id
  email
  name
  country
  created_at
```

And three million orders pointing at them.

Then I asked the most ordinary question a backend asks:

```sql
SELECT * FROM users WHERE email = 'user700000@gmail.com';
```

One row. By email. The login query.

It took 45 ms.

For one row.

Postgres 18, in Docker, on my machine.

Timings are medians of five warm runs, from `psql`, the Postgres command-line client. Numbers inside plan output are single runs.

That one ranged from 44 to 47 ms.

## So what did the database actually do?

Postgres will tell you, if you ask.

Put [`EXPLAIN ANALYZE`](https://www.postgresql.org/docs/current/using-explain.html) in front of a query and it runs it, then shows its work.

```
Seq Scan on users
  Filter: (email = 'user700000@gmail.com')
  Rows Removed by Filter: 999999
Execution Time: 47.287 ms
```

That third line is the whole post.

It read a million rows. Compared every one to my email. Threw away 999,999.

To find one.

The database wasn't looking anything up.

It was searching.

## But why did it read everything?

Because it had no other way.

Rows sit on disk in roughly the order they were written.

Nothing about that order says where `user700000@gmail.com` is.

So the only option is to check every row.

```
row 1          no
row 2          no
row 3          no
...
row 700000     yes
...
row 1000000    no
```

And notice it didn't stop at row 700,000.

Nothing told it there was only one match. So it kept going to the end.

That's a sequential scan. Postgres calls it `Seq Scan`.

Every database has one. It's what happens when there's nothing better.

## Does it get worse?

Linearly.

Same query, same table, three sizes:

```
10,000 rows        ~1 ms
100,000 rows       ~5 ms
1,000,000 rows    ~45 ms
```

Ten times the rows, roughly ten times the time.

At ten thousand rows, nobody notices. That's a dev database.

At a million, every login spends 45 ms searching before it does anything else.

At ten million, it'd be about half a second.

Nothing about the query changed. Only the table did.

## So what does an index actually do?

I knew the word. "Add an [index](https://www.postgresql.org/docs/current/indexes-intro.html), it gets faster."

I didn't know what it _was_.

```sql
CREATE INDEX idx_users_email ON users(email);
```

That took 0.4 seconds to build and used 39 MB of disk.

The table itself is 74 MB.

So the index is a real thing. Half the size of the table.

What's in it?

A sorted copy of one column, with a pointer back to each row.

```
email (sorted)          row
alice@example.org       41203
bob@example.org         9117
carol@example.org       733002
...
```

Sorted is the whole trick.

You search a sorted list the way you search a dictionary.

Open in the middle. Too far, go left. Not far enough, go right.

Every step throws away half.

```
1,000,000
  ↓
500,000
  ↓
250,000
  ↓
...
  ↓
1
```

Twenty steps. Not a million.

The real structure is a [B-tree](https://use-the-index-luke.com/sql/anatomy/the-tree).

Same idea, but each node holds hundreds of keys. So the tree is very flat.

I asked Postgres how deep mine was.

Three levels.

A million emails. Root, one middle layer, leaves.

Any email is three page reads away. One more for the row itself.

## So how much faster?

Same query. Same table. With the index:

```
Index Scan using idx_users_email on users
  Index Cond: (email = 'user700000@gmail.com')
  Buffers: shared hit=4
Execution Time: 0.039 ms
```

Four pages read. The scan read 9,454.

Inside the database, 45 ms became 0.04 ms.

From the client it was half a millisecond. The rest is the round trip.

And the growth curve:

```
10,000 rows        scan ~1 ms      index 0.5 ms
100,000 rows       scan ~5 ms      index 0.5 ms
1,000,000 rows     scan ~45 ms     index 0.5 ms
```

The scan grows with the table.

The index doesn't.

That's the actual difference. Not "faster." A different shape.

## So just index everything?

That was my first thought.

Then I measured what an index costs.

**Every write pays for it.**

I inserted 100,000 rows into an empty table.

```
0 indexes    ~220 ms
3 indexes    ~580 ms
```

Two and a half times slower. Every insert now updates three sorted structures too.

**It takes space.**

The four indexes I ended up with total 109 MB. The tables are 246 MB.

**And it only answers the questions it was built for.**

That one surprised me most.

## When does the index not help?

The index is sorted by email.

So it can answer "find this exact email."

It can answer "find emails starting with `user700000`," because that's a range in a sorted list.

```
email LIKE 'user700000%'      0.6 ms    index
```

It can't answer "find emails ending in `@proton.me`."

```
email LIKE '%@proton.me'      67 ms     every row
```

The end of the string isn't what it's sorted by. There's nowhere to jump to.

Then this one:

```sql
SELECT * FROM users WHERE lower(email) = 'user700000@gmail.com';
```

108 ms. Full scan.

Slower than having no index at all, because now it also runs `lower()` on a million strings.

The index stores `email`. The query asks about `lower(email)`. Different values.

The index is useless, and Postgres doesn't warn you. It just scans.

I've written that exact query. Case-insensitive login. Felt like a nice touch.

One more, subtler.

I indexed `country` and asked for two countries.

```
country = 'NZ'    0.5% of rows     index 5 ms     scan 49 ms
country = 'IN'     40% of rows     index 37 ms    scan 62 ms
```

For New Zealand, the index was 10x faster.

For India, under 2x.

Because the index only helps with _finding_.

Once 400,000 rows match, the work is reading 400,000 rows. No index changes that.

And those are the database's own times. Shipping 400,000 rows to the client adds another 100 ms on top.

## What about sorting?

"Newest ten users."

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

Ten rows. Feels cheap.

```
Sort
  Sort Key: created_at DESC
  ->  Seq Scan on users (rows=1000000)
Execution Time: 75.075 ms
```

To find the newest ten, it read all million rows, keeping the ten newest as it went.

`LIMIT 10` didn't save the read. It only trimmed the answer.

An index on `created_at` is already in order.

So Postgres walks it backwards from the end and stops after ten.

```
Index Scan Backward using idx_users_created
  Buffers: shared hit=13
Execution Time: 0.063 ms
```

Thirteen pages instead of nine and a half thousand.

Sorting is work. `LIMIT` doesn't reduce it unless something is already sorted.

## What about the orders table?

"This user's orders."

```sql
SELECT * FROM orders WHERE user_id = 700000;
```

Three million orders. No index on `user_id`.

```
Seq Scan on orders
  Rows Removed by Filter: 2999998
Execution Time: 98.748 ms
```

99 ms to find two rows.

With an index on `orders(user_id)`: 0.04 ms.

Here's the part I didn't know. Postgres indexes primary keys automatically. [Foreign keys](https://www.postgresql.org/docs/current/tutorial-fk.html), it doesn't.

And a foreign key is exactly the column you're going to search by.

One more, because I've written this one too.

A page listing 100 users with their order totals.

```
users = db.query("SELECT id, email FROM users WHERE id BETWEEN ? AND ?", 700000, 700099)

for user in users:
    total = db.query("SELECT sum(amount) FROM orders WHERE user_id = ?", user.id)
```

101 queries. Every one uses the index. Every one is fast.

```
101 separate queries    ~7 ms
1 JOIN                  ~2 ms
```

And that's with the client on the same machine as the database. A round trip costs about 0.07 ms.

Put a network between them. Half a millisecond per round trip.

Now 101 queries is roughly 50 ms of waiting. The JOIN is still 2 ms.

That's the [N+1 problem](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it). It's post 01 again. Every query is an arrow.

## But why did I never see any of this?

This is the part I keep coming back to.

The query looks the same with or without the index.

```sql
SELECT * FROM users WHERE email = ?
```

Same SQL. Same result. Same one line in the handler.

45 ms or 0.5 ms, and nothing in the code says which.

The database doesn't complain. It doesn't warn.

It finds the row by whatever means it has and returns it.

At dev size, whatever means it has is fast enough.

Ten thousand rows. One millisecond. Ship it.

A year later the table has a million rows. The query takes 45 ms.

Nothing changed in the code. Nothing failed.

Nobody can point at the commit.

> The query says what you want.
>
> It doesn't say what it costs.

Only the plan says that.

That's what `EXPLAIN` is for. It's the one place the database shows its work.

## So is "add an index" the rule?

No.

Every index makes every write slower. I measured that.

An index on a column nobody searches by costs disk, slows every write, and answers nothing.

An index on a column where most rows match barely helps.

And the query has to be shaped so the index can answer it. `lower(email)` isn't.

So the rule isn't "add an index."

The question is:

> How does the database find this?
>
> How many rows does it touch to answer?

If the answer is "all of them" and the table is going to grow, that's the problem.

An index is one fix. Rewriting the query is another.

Sometimes a scan is fine, because the table is small and will stay small.

## What this means in production

**Fast in dev means nothing.**

A scan of 10,000 rows is a millisecond. The same scan of 10,000,000 is half a second.

The code didn't change. The data did.

**The plan is the truth.**

Not the query. Not the ORM.

When something is slow, run `EXPLAIN` on the real query, against a table of production size.

**Indexes come from queries, not from schemas.**

You index what you search by, sort by, and join on. The `WHERE` clauses decide.

And every index is a tax on every write.

## The mental model I'm taking away

A database isn't a dictionary.

Every query is a search.

The index is what makes the search short.

Without it, the database does the only thing it can. Read everything and check.

So the question I'll be asking:

> For this query, how many rows does the database have to touch?

The login query went from 45 ms to half a millisecond.

Then I ran it again. Same email. Same row. Another half millisecond.

And again.

The database did the same three-level walk every time.

To hand back the row it handed back a moment ago.

Half a millisecond is nothing.

Ten thousand people asking for the same row is ten thousand identical searches. For one answer.

**Next: what happens when the same data is requested over and over?**
