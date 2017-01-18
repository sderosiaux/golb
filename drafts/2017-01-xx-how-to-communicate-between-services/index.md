---
title: "How to communicate between micro-services — Part 2"
date: "2017-01-12T23:54:17Z"
layout: post
path: "/2017/01/12/how-to-communicate-between-micro-services-part-2/"
language: "en"
---

---
Summary {.summary}

[[toc]]

---



# Example

Create 3 microservices A -> B -> C without any kind of control, just basic HTTP with a standard HTTP client call Make B or C crash.
-> what happens ?
-> what is the error in the frontend? (crap 500)

Run another B, run another C (redundancy, load balancing, master/backup (they can act like backup, inactive the whole time except when the first C fail, B has to implement some kind of logic..), same for multiple B, and multiple A !

-> Sometimes, it's not enough.

Let's say C is just slow because it timeouts trying to access an external resource : the whole stack become slow (and crash at the end): the system is overloaded for no reason.

# Retryer

https://github.com/rholder/guava-retrying

# What is a circuit breaker ?

- Independent of the language (scala's, and in js for instance https://github.com/yammer/circuit-breaker-js)
- Handle infra errors gracefully (fallback to a default value, or error state)
- Timeout explicit: the service is not crashed but slow
- It simulate some kind of backpressure: the end service is slow because it's overloaded? the circuit breaker will short-circuit it and the response is will faster, and the end service will have time to recover. (but Add a circuit breaker

- Sentries: https://github.com/erikvanoosten/sentries
- Akka's implementation
- Hystrix https://github.com/Netflix/Hystrix/wiki/How-it-Works#circuit-breaker

## Tuning

- Parameters
- Exponential Backoff Monitoring of the circuit breaker opening Change to a GRPC implementation, for the sake of it (or just use that from the beginning, to see..)

## Monitoring

WeaveScope
Kamon
Datadog


# Using Hystrix


# Using Lagom


