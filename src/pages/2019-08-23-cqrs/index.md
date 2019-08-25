---
title: 'CQRS: Protect the Write Model at all cost'
description: ''
date: '2019-08-23T12:00Z'
is_blog: false
path: '/articles/2019/08/23/cqrs/'
language: 'en'
tags: ['cqrs', 'event sourcing', 'kafka', 'architecture']
category: 'Data Engineering'
background: ''
---

I'm working on a new project intended to replace a large —too large— monolith.

To adapt to the evolving needs of the **business** (Customer Orders), boost the **Time To Market**, improve **traceability** and **communication** between teams, we settled in using a CQRS asynchronous architecture (but *without* Event Sourcing).

Long story short, it's not an easy task to "convert" everyone to the new way of thinking this imposes. Things people thought acquired must be re-questionned, re-challenged and new constraints arise (such as eventual consistency, or knowing if we should own a certain piece of data). I was *this* guy always saying "you can't do that", reminding the whys.

This kind of architecture forces us to put strong constraints and have limitations most of us didn't have before (with a classic backend + DB). It's not always a bad thing: it **reveals** things. We learned a lot about the domains themselves, always questionning their separations and their responsabilities. It makes us **understand the business**.

Here, I'll talk about a use-case where we ~~wanted~~ needed to expose *not*-eventually-consistent (aka strongly-consistent) data to other services. CQRS has not to be eventually-consistent, but in our case, it was (because asynchronous). I can see some of you frowning because we should *accept* eventual-consistency, it's part of the life. Agreed. But..

TOC

# CQRS

## Why do we need it?

CQRS —Command Query Response Segregation— was atypical years ago, but nowadays we can find a lot of content about it and lots of companies are using it and communicate about it. We can do CQRS without even knowing we do!

Let's explain the consequences of it:

![](2019-08-25-16-11-18.png)

#### One Write Model, N Read Models

The idea of CQRS is to enable an application (in the large sense) to work with different models:

- One model it writes with: the write model, altered by *Commands* (more on this later)
- One or several models it and other applications read from (no read using the _write_ model)

CQRS does not imply working with microservices, or a messaging infrastructure, or _Events_, or doing DDD in essence. It's just often use with those techniques for reasons.

[[info]]
|eg: If we have an API taking POST/PUT on some resource, saving the state into PostgreSQL, and have a process to synchronize it into Elasticsearch for smart-lookups on our webpage, we're doing CQRS.

#### Scalability

CQRS allows us to scale our system independently: we _often_ have to handle way more reads than writes hence a different scalability.

We want our reads to be accessed in **O(1)**: we don't want taking more time fetching an entity because it has more links to other entities: we want to avoid explosive JOINs. The solution is to precompute the result when data changes, *before* anyone request them. Doing so will also use less resources when a request occurs, will reduce the **latency** and make it **predictable** and stable on p999. We are trading *time* for *space*. More on this later.

When we implement a Redis cache in order to avoid overloading the main database —taking writes— is the CQRS spirit.

#### Business requirements

Separating the write model from the read models helps us separating complex aspects of our domain (who needs what, who is responsible for what) and increase the flexibility of our solution. We can adapt more simply to changing business requirements.

This is because we think more about the responsabilities: who is mutating data, what is the use-case, should we truly own this data, is this not the responsability of another application, who just need to read data, should it be strongly-consistent etc. CQRS is often tighted to **DDD** because of this way of thinking.

#### Concurrency

Technically, it can also *simplify* concurrency and locking (transactional databases) management, **by revealing them**.

When we are working with an asynchronous CQRS pattern, we often talk about data being eventually-consistent, data lifecycles, data ownerships, business requirements, and a lot about the modelization: the transactional boundaries of the entities and the invariants we should always have. Again, this is why CQRS is often DDD-oriented: data form **aggregates** which must be *very* carefully defined.

#### No "Read your own Writes" semantics

Stale data must be explicitely deal with. If we alter a resource (by sending a Command) and read this same resource right away, we won't see our changes. Async CQRS does not provide "Read your own Writes" semantics. Front-ends can simulate it by doing **Optimistic Concurrency**: it can embed some knowledge and suppose the mutation it asked for will _be fine_, so it displays _what it thinks_ will be the answer before getting the real one. In case of discrepancies, it adapts.

When it's synchronous CQRS we can have this semantics: we write the two models into different tables, in the same transaction. It's always in-sync. CQRS is rarely synchronous because we want to work/scale with different resources, type of databases, use a messaging infrastructure: we can rarely make a distributed transaction cross-resources (we could talk about XA or Sagas but... not now!).

> CQRS is a pattern that strictly segregates the responsibility of handling commands from the responsibility of handling side-effect-free query/read access.

## It's not a one-fit-all solution

We should consider implementing CQRS only in certain cases: 

- We have changing business requirements _a lot_
- The business doesn't know exactly where it's heading
- We must collaborate a lot with other teams (ie: other bounded contexts)
- We are orchestrating other services around us
- What's going on in our domain will affect them or vice-versa
- Our domain is write-oriented, we don't read our own data, other applications do

The overhead can be tremendous and unnecessary if we want to expose a simple API working solo or whose the scope is clearly defined.

## AKF Scale Cube

If we follow the logic, it means we're going to have duplicated data in our system. The "same" data will be present under the write-model and under the read-model.

I encountered some people really scared of duplicated data, or feeling it's an anti-pattern. Data have one master, it should be the only one to control who has access to the data, nobody should copy it in its own database or messaging infrastructure. _You must always call my API! Vade Retro!_

Yes, sometimes it can necessary to always call an API and not copy the data (like the user data under GDPR). But it's rarely necessary and it can be an anti-pattern itself because leading to more complexity, more dependencies, bad performances, interruption of services, SLA diminution.

I like the AKF Scale Cube to see why duplication is transversal in an organization: https://akfpartners.com/growth-blog/scale-cube

![](2019-08-25-16-32-51.png)

In short, 3 axis:

- X: **low-level technical**: we should duplicate, replicate, cache, load-balance data
- Y: **organizational**: we should have independent services to handle different domains: they are responsible of their own data (à la DDD)
- Z: **high-level sharding**: we should segment similar things (per resource_id, per geography), per use-case, into their own infra


## Commands / Writes: side-effects

So the _thing_ that causes writes to the _write_ model is called a `Command`. It's a generic term to design what we always worked with: something to change the state of the system (an update of any kind).

- A `Command` can be synchronous or asynchronous.
- A `Command` can go through a message-bus or not.
- A `Command` can be a simple API call.
- A `Command` can be a super-class if doing OOP or not.
- A `Command` can be a simple function call.

All those concepts are orthogonal to what a `Command` is. We _command_ some state to change in some way.
A `Command` is an *intent* (and not a fact) and causes *side-effects* (on a resource). It is directed to a particular destination (not broadcast) and defined in term of the consumer domain (the *co-domain*).
It's generally defined as `VerbSomething`: `CreateOrder`, `ShipProduct`, `ComputePrice`, `GiveMoney`. We'll see later the symmetry with Events defined like `OrderCreated` (again, Events are outside of CQRS scope but they play nicely along).

A `Command` is *behavior-centric* and not *data-centric*. It is about the intent to change something, it does not map to the format of a resource (like DTOs in an API). It can contain data that will help to process the intent but that's it.

#### Flow

The flow of handling a `Command` is always the same:

- If async, it saves it into a messaging infrastructure and returns OK to the caller (can't do much more)

- When handling it —sync or async— according to its form (API, message, function call), call the right *Command Handler* (a function)
- This handler must determine if it's possible to process it:
  - It retrieves the current state (from a database or using Event Sourcing)
  - It uses some business rules to know if it can grant or deny the `Command` on the state
- If granted, it applies the `Command` on the state (can generate Events or not)
  - If not granted, it returns an error (sync or async)
- It saves the new state
- If sync, it returns OK to the caller—or minimal information such as an ID but not the whole state (which is the write model)
  - If async, it commits the message to the messaging infrastructure.

![](2019-08-25-18-02-45.png)

`Commands` should follow a *fire & forget* principle: we should not expect any result from a `Command` except "OK" or "KO". A `Command` is just an *ask*. The processing can be synchronous or asynchronous, we're not supposed to get the result asap. The result will come later from the read part.

A Command Handler must contain business logic to be able to deny instantly a Command or not. For instance, to handle a `CancelOrderCommand`:

```kotlin
class OrderCommandHandler {
    ...
    fun cancelOrder(cmd: CancelOrderCommand) {
        val order = repo.fetch(cmd.orderId) // the only place where we can fetch the write model
        if (order.inTransit()) error("Too late, we can't cancel an order in transit")
        // ...
        val newState = order.cancel()
        repo.persist(newState) // OR persist only events, OR both atomically (Outbox Pattern)
    }
```

There are a lot more things to know about `Commands`, I won't dive into them here because it's not the point of this article.

- `Commands` should be idempotent
- `Commands` can't use the read-side to grab data
- `Commands` should be retried only for technical reasons, and never replayed for business reasons, the result could be different
- `Commands` can be saved into a Command Bus for further processing

> `Commands` are about managing side-effects in a system.

## Queries / Reads / Serving Layer: No side-effects

As stated previously, we can have different read models built from the same original data.

We're all used to do this when we need to query our data to answer different use-cases. We have our source of truth somewhere (PostgreSQL, MongoDB, Cassandra, S3...) where we write/update our stuff, but we want to interpret them differently using specialized databases:

- cache data
- do fast text search
- query using a graph language
- handle timeseries data
- precompute aggregations within a set of dimensions
- use a realtime database (like Google Cloud Firestore) to send realtime updates to the client

#### Denormalizing / Consolidating

It's a common practice to sink our data from a relational database into elasticsearch to enjoy fast search, autocompletion, tokenizers, token filters, scoring, ranking, **stable latency**, which often cannot be obtain by the original database.

If we work in the advertising domain and want realtime dashboards about our advertisers and our publishers, we want to preaggregate the data in a timeseries database because we care about aggregation by bucket of time and sub-second responses. Therefore, we'll sink our data into Apache Druid or ClickHouse where they will preaggregate incoming data (using a CQRS approach internally, ah!).

We are denormalizing our original model to fit another model:

- to present data differently (SQL to NoSQL)
- to an external model (public) other applications will consume (we want to hide our implementation)
- to a "lighter" model where we don't need all the data
- to a "heavier" model where we're going to add lots of data we don't own

This last point is important. It's common to **consolidate** our data when we update our Reads Database. We can JOIN other tables we own or query other applications to fetch data we don't own/can't compute (customer name, product description, VTAs..). We don't want to do this at query time: we want a predictable stable latency hence accesses in O(1).

This consolidation/transformations is done when we need to update the database (when something changed), not at query-time. It means:

- We can update entities that will NEVER be read
- We can update entities that will be read million times
  - One acronym I like is `WORM`: Write Once Read Many. This is a sweet spot in using CQRS.
- We must have a way to detect changes in the original data to trigger the updates on the Reads Database. This is where events are useful.

Also, the Reads Database can be scary, because:

- It can contain data of several domains
  - This means **the Reads Databases should be dealt with the consuming team**, not the producing team. More on this later.
- It can be quite huge in size
- It can be destroyed and reconstructed from scratch to some extent: by assuming the **idempotency** of the other services.
  - If not, the reconstruction could be different than what it was before.
- We can update our Writes part without the Reads part to be down at the same time (independent lifecycles).

![](2019-08-25-21-48-07.png)

#### Free of side-effects

Having multiple databases imposes a strong constraint: the Reads Databases must handle **only reads**, not writes. They are not the source of truth. 

There is no synchronization between them and the Writes Database. Reads Databases cannot create side-effects on the Writes Database.
Due to denormalization, it could be even impossible to find back the original record (if we don't keep all the necessary info, the PK etc. because we don't need them)

When you query an API (a `GET` or some GraphQL Query): you don't expect to mutate the data, same thing here.

#### Eventual Consistency

As stated before, those who use the Reads part could deal with stale data.

When we send a `Command` to be processed, its processing *can* be done asynchronously (no result, Fire & Forget), and the updates of the Reads Database will be asynchronous (except if it's the same database but that's rare?).

Example:

- T0: We send a `AddProductToOrderCommand` about the Order 1234 (v1).
- T1: The Writes Service accepts it and updates the items of the Order 1234 in its Writes Database (v2).
- T2: The Reads Service is notified and query the Product Service to consolidate its view with the name and description.
- T3: An external Email service requests the details of the Order by querying a Reads Service—which is not yet up-to-date (v1).
  - (It can react to the same event the Reads Service reacted to in T2)
- T4: The Product Service responds to the Reads Service which can updates its Reads Database (v2).

Et voilà, in T3, despite the previous update happening before in T2 (in absolute time), the Reads Service sent the old version of the Order (v1) because it was not up-to-date yet.
This is why CQRS does not have the "Read your own Writes" semantics and why we must always think about eventual consistency when we talk with the external systems.

The **version** we just introduced is mandatory to have in such system. This represents a logical time, to help us understand how the flow progresses and make decisions. It's actually part of the Writes Model and will be propagated into the whole system (events if any, reads models...).

There are techniques to help external systems fetching the version they expect, more on that later.

#### Scaling


- Scale read and write differently
    - If we want consistency (write and read updated atomically), we lose Availability (CAP)

#### Features for reads

Provide caching, encryption, authentication, scaling
SSE
Websockets
Optimistic

#### Ways to build the Read Model

It's easy to change and test new technologies

sync: same database, two tables, transactions

synchro database: postgresql => couchbase
dual writes: CAREFUL!

- events
  - CDC


The Serving layer could hide a lambda architecture: RT views + batch views


## The link with DDD

## Hide the ugly: API Gateway

CQRS is about a project, not a whole architecture. it's a implementation detail.
From the outside, it's possible to ignore if an application uses CQRS internally or not

api gateway to hide write/reads apis


# Events





![clever-age.com](2019-08-23-21-53-35.png)


![](2019-08-23-18-36-30.png)

## Raison d'être

- First-class citizen
- Found by event-storming
- Decrease coupling: anyone can interpret them as wanted
 - Invert the control flow (less coupling, more autonomy)
 - Intentless (contrary to Commands), Anonymous, used for broadcast only
 - Fire & Forget (don't expect anything)
- Defined in the **producer domain**
    - Whereas a "Message" is defined in the **consumer domain: a p2p construct, you know the target; just like an API call, except it's asynchronous**
- Emitted upon a successful or failed operation
- "Smart endpoints, dumb pipes" (martin fowler)
    - Endpoints are microservices, pipes is kafka-like: NOT like an ESB
    - Smart endpoints are probably stateful (persistence, state machines)
- Important here: Emitted by aggregates (after they received a Command)
    - We save the state into the events

- Not always produced by a Command: time flows (scheduler)
- 1 Commands can generate multiple events

- Ability to change/fix the model or bugs and recompute state (from the events)
- A LOT of different types of events: http://verraes.net/2019/05/ddd-msg-arch/
- "Standards": https://www.w3.org/TR/activitystreams-core/ or https://cloudevents.io/

## Internal VS External

- "External models" are often denormalized (contains names, address etc. not only ID)
    - Easier to consume and use (no need to understand dependencies)
- "Internal models" contains only IDs.
    - Useful when the models (referenced by the IDs) often change
    - Have a "Translator Service" (or several) to consolidate the event and make it "external"

## Projecting Events

A state is a projection of events (event stream), it forms an aggregate.

## Events does not mean Event Sourcing

If our repository don't build the state from the events: we are not sourcing from events, hence it's not event sourcing. QED.

## Event-Carried State Transfer

Contrary to Event-Sourcing, here, we use:
- Event-carried state transfer": Difficult to find the good balance: what to put in the event? if not enough: the emitter will probably be queried by all the consumers (to consolidate their state): Network overhead! requests overhead! or you just put the whole aggregate into the event. ⇒ Eventual Consistency is happening because data are replicated asynchronously

Why? => Explain + Schema

# Protect the Write Model

## private WriteModel m;

## Communicating with Legacy & New Systems

During a migration, "Legacy view", a new "View"
Don't share the consolidator (views) between services: each should build its own read models 

## What if we need to expose it?

Never read write model
- Internal
- No coupling
- Scalability: different of reads
Don't turn your write model into a read model without noticing.
Don't publish events containing your write model (state) otherwise you just did it.

If we want to ensure we read the latest data
- why?
- business rules?
- wrong domain separation?
- need Command, maybe sagas?


Saga: a state machine, events driven (choregraphy) or orchestrated (orchestrator)., outside of aggregates, reactive, have side effects (create commands, send emails..) multi-service transactions, provide a rollback for each step


## ACLs to the rescue

Or maybe an ACL to expose the write model as a "read"

## From Internal Events to External Events

Transform internal to external events.
Streaming processing
Scalability
Business evolution?


RESTE::

Query model with a blocking "entity_id/v3" until it's up to date, or timeout
