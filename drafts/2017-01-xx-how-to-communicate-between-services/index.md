---
title: "How to communicate between micro-services"
date: "2017-01-12T23:54:17Z"
layout: post
path: "/2017/01/12/how-to-communicate-between-micro-services/"
language: "en"
---

The title says _micro-services_ but it's more about _services_ on general.

Let's say we have a main application relying on several small services (as a database which is a big service), that each provides a specific business value (think Domain Driven Development).

We want the main application to query them in parallel or sequentially (if some service requests depends on another service results), and we want our application to be resilient.
We don't want it to crash or shut it down because we want to update one dependent service or just because one had crashed for some reason (like a database error).

We want to be able to detect those issues quickly, provides some solution (like a fallback), and still reply the more quickly we can to the client of the main application.

We are going to implement a simple solution that works for any type of services.

---
Summary {.summary}

[[toc]]

---

# Types of failures

A developer generally codes the business rules and handle their errors, such as the validation.
It also happens that some critical areas are protected into `try/catch` because it happened that this code can crash, and we don't want the whole JVM to crash because of that.

But what about infrastructure error ?
Generally, they are poorly handled.

- What if, at first, the database can't be connected to? The application will go into `catch` to log something, then what?
- What if, at first, the database is able to be connected to, then hours later, the database is down. What is going to happen to the application, to the requests? Are the queries are going to accumulate, but where? how much? Is the whole application is going to explode, crash, and lose all its flying requests?

They are a bunch of questions to wonder when an application (or service) is contacting another service.
A service failure should not crash the calling application/service, and this, recursively, to not crash the whole stack.

## Retry, retry

A simple technique, like Apache Flume is using, is to retry until success.
It never crashes, it's stubborn, it keeps retrying forever, waiting a bit between retries.

It can do that because it has a channel (memory, disk, MoM etc.) where it can store the current events it needs to process. If it accumulates too much, it just drops them.

In an application, we are often limited by the memory and we don't want to store everything in memory, in case the whole application crashes.
It's often useful to rely on a MoM such as Kafka, to store the *requests* to the service, only if it's possible to process them async, later.

Often, we just need to process them in-sync (especially in a micro-service architecture, MSA) to get a business answer and reply to the customer directly.

It's standard to use HTTP to communicate with other services, due to the powerful available frameworks and the easiness of the implementations.

## Example

Create 3 microservices A -> B -> C without any kind of control, just basic HTTP with a standard HTTP client call Make B or C crash.
-> what happens ?
-> what is the error in the frontend? (crap 500)

Run another B, run another C (redundancy, load balancing, master/backup (they can act like backup, inactive the whole time except when the first C fail, B has to implement some kind of logic..), same for multiple B, and multiple A !

-> Sometimes, it's not enough.

Let's say C is just slow because it timeouts trying to access an external resource : the whole stack become slow (and crash at the end): the system is overloaded for no reason.

# What is a circuit breaker ?

- Independent of the language (scala's, and in js for instance https://github.com/yammer/circuit-breaker-js)
- Handle infra errors gracefully (fallback to a default value, or error state)
- Timeout explicit: the service is not crashed but slow
- It simulate some kind of backpressure: the end service is slow because it's overloaded? the circuit breaker will short-circuit it and the response is will faster, and the end service will have time to recover. (but Add a circuit breaker

- Akka's impl
- Hystrix https://github.com/Netflix/Hystrix/wiki/How-it-Works#circuit-breaker

## Tuning

- Parameters
- Exponential Backoff Monitoring of the circuit breaker opening Change to a GRPC implementation, for the sake of it (or just use that from the beginning, to see..)

## Monitoring


# Using Hystrix


# Using Lagom


