---
title: "HTCBMS — Part 3 — Circuit-breakers"
date: "2017-01-2xT15:28Z"
layout: post
path: "/2017/01/2x/how-to-communicate-between-micro-services-part-3-circuit-breakers/"
language: "en"
---

_The previous part of this series: [How to communicate between micro-services — Part 2 — Retryers](https://www.ctheu.com/2017/01/22/how-to-communicate-between-micro-services-part-2-retryers/)_.

We saw in the previous article the Retryer pattern which is quite simple but can be sufficient to get resilient communications between services.

A smarter pattern is the Circuit-Breaker. It's smarter, because it has memory and a state. It's a *finite state machine*. It avoids useless retries if it already knows they will fail, and can instantly provides a fallback. According to some thresholds, it will try once later to access the service or resource, to see if it's back.

This is a pattern to use when a fallback is possible, like using another service, providing a default value, or something the program can handle without the expected response. If it's not possible and the code need a external answer no matter what, then the Retryer pattern fits better.

---
Summary {.summary}

[[toc]]

---

# What is a Circuit Breaker?

A circuit-breaker is a finite state machine with 3 states:

- closed: the normal state, the external service or resource is accessible, no problem, as if the circuit-breaker were not there, it's transparent.
- open: the circuit-breaker knows something is broken and is failing. It provides a direct fallback, it won't even try to make the external call.
- half-open: a very temporary state. The CB detected some failures, it will still test to see if it's really broken or if it was just a temporary failure, and will quickly switch to closed or open.

A CB is highly tunable, thanks to the multiple configurable thresholds (by count, by timeouts).

With tiny thresholds, we can either fail fast to provide a quick feedback with an error, or we can provide a quick valid enough fallback.

The timeouts are explicits: it's necessary when service are not down but slow. In some domains, it's mandatory to provide responses under 100ms for instance (like in [RTB](https://developers.google.com/ad-exchange/rtb/peer-guide)), therefore a CB is generally used to be able to provide something quick no matter what.

A CB provides some kind of backpressure: the end service is slow because it's overloaded? the CB will short-circuit it during a while, the time to recover, and will detect when it's available again later.

Note that a circuit-breaker does not provide any retry logic. But we can still mix it with a Retryer if we want to _force_ our way.{.info}

Martin Fowler has written [a piece about it](https://martinfowler.com/bliki/CircuitBreaker.html) a few years ago.

## Tuning parameters

Circuit-breakers have several thresholds and delays to tune their behavior, and how/when they changed their state.

There should not have defaults, because each circuit-breaker is dealing with a particular service call and situation. The circui-breaker must be tested and the impact measured. The latter can affect the business, can provoke more harm than good.

- Failures threshold: to open the circuit (won't call the service again).
- Success threshold: to close the circuit (will call the service again).
- Method call timeout: a call can be consider as a failure if it took too much time.
- Open to Half-Open delay: to try again to call the service.
- Failure/Success conditions: we can indicate what is a failure (besides timeouts), more business oriented.

- State transitions: we can generally monitor those state changes. We must be aware when a circuit is opened.

# Implementations

## Failsafe

We already used the Retryer of [Failsafe](https://github.com/jhalterman/failsafe#retries) in the previous part of this series.
Let's use their circuit-breaker now, to contact our brittle service.

```scala
CircuitBreaker cb = new CircuitBreaker()
  .withFailureThreshold(2)
  .withSuccessThreshold(2)
  .withTimeout(500, TimeUnit.MILLISECONDS)
  .withDelay(1, TimeUnit.SECONDS)
  .failIf((Response r) -> r == null || r.getStatusCode() != 200);

cb.onClose(() -> System.out.println("Good enough, closing circuit"));
cb.onHalfOpen(() -> System.out.println("Will try again, half-opening circuit"));
cb.onOpen(() -> System.out.println("Too many failures, opening circuit"));

// Then our calls:

for (int i = 0; i < 10; i++) {
    try {
        Response response = Failsafe.with(cb).get(() -> getBilling());
        System.out.println("response: " + response);
    } catch (Exception e) {
        System.out.println("ERR: " + e);
    } finally {
        System.out.println("circuit-breaker: " + cb.getState());
        Thread.sleep(200); // just for the example, to get into the half-open state
    }
}
```

- `withFailureThreshold`: we declare it's broken (open the cb) if there are at least 2 consecutive failures.
- `withSuccessThreshold`: we declare it's not broken anymore (close the cb) if there are at least 2 consecutive success.
- `withTimeout`: we consider that if the query takes more than 500ms, then it's a failure (the call is still made to the end).
- `withDelay`: we do not try anymore during 1s if the circuit is opened. ie: we wait 1s before going to half-open state that will try again.
- `failIf`: the condition declaring if the call was a failure or success (besides the timeout).

We'll try to make 10 calls to the external service and log each time the circuit-breaker state.
We can see we pass through all states, how interesting! I've added some spaces and comments in-between:

```shell
// a circuit always starts closed and call our method.
>>> Calling external service...
ERR: net.jodah.failsafe.FailsafeException: java.util.concurrent.TimeoutException
circuit-breaker: CLOSED

>>> Calling external service...
ERR: net.jodah.failsafe.FailsafeException: java.util.concurrent.TimeoutException
Too many failures, opening circuit
circuit-breaker: OPEN
// the call was made twice, and failed twice (withFailureThreshold), hence the circuit is opened.

// when a circuit is opened, our method is not called anymore.
ERR: net.jodah.failsafe.CircuitBreakerOpenException
circuit-breaker: OPEN
ERR: net.jodah.failsafe.CircuitBreakerOpenException
circuit-breaker: OPEN
ERR: net.jodah.failsafe.CircuitBreakerOpenException
circuit-breaker: OPEN
ERR: net.jodah.failsafe.CircuitBreakerOpenException
circuit-breaker: OPEN

// 1s has passed (withDelay), the circuit-breaker will call our method again.
// It will switch to closed only if the success threshold is reached.
Will try again, half-opening circuit
>>> Calling external service...
response: com.ning.http.client.providers.netty.response.NettyResponse@47c62251
circuit-breaker: HALF_OPEN

>>> Calling external service...
response: com.ning.http.client.providers.netty.response.NettyResponse@3e6fa38a
Good enough, closing circuit
circuit-breaker: CLOSED
// and 2 calls have succeed (withSuccessThreshold)! Meaning the circuit is closed again.

>>> Calling external service...
ERR: net.jodah.failsafe.FailsafeException: java.util.concurrent.TimeoutException
circuit-breaker: CLOSED

>>> Calling external service...
ERR: net.jodah.failsafe.FailsafeException: java.util.concurrent.TimeoutException
Too many failures, opening circuit
circuit-breaker: OPEN
// Back to square one, 2 calls have failed again, the circuit is reopened.
```

As we saw, Failsafe provides a quite good implementation. We have everything we need and the API is quite clear.

## Sentries

https://github.com/erikvanoosten/sentries

## Akka

http://doc.akka.io/docs/akka/current/common/circuitbreaker.html

```scala
val breaker =
    new CircuitBreaker(system.scheduler,
      maxFailures = 10,
      callTimeout = 1 seconds,
      resetTimeout = 1 seconds).
      onOpen(println("circuit breaker opened!")).
      onClose(println("circuit breaker closed!")).
      onHalfOpen(println("circuit breaker half-open"))

val askFuture = breaker.withCircuitBreaker(db ? GetRequest("key"))
    askFuture.map(x => "got it: " + x).recover({
      case t => "error: " + t.toString
    }).foreach(x => println(x))



new CircuitBreaker(
      system.scheduler,
      maxFailures = breakerConfig.maxFailures,
      callTimeout = breakerConfig.callTimeout,
      resetTimeout = breakerConfig.resetTimeout).
      onOpen(vowpalNotifyMeOnOpen()).
      onClose(vowpalNotifyMeOnClose())

vowpalbreaker.withCircuitBreaker(
          multiclassResult) fallbackTo executeAlgorithm(request, v1NoShuffle)
```

## Hystrix

https://github.com/Netflix/Hystrix/wiki/How-it-Works#CircuitBreaker
http://blog.octo.com/circuit-breaker-un-pattern-pour-fiabiliser-vos-systemes-distribues-ou-microservices-partie-3/

Also in Javascript, a similar implementation exists, [circuit-breaker-js](https://github.com/yammer/circuit-breaker-js).

## Lagom

http://www.lagomframework.com/documentation/1.2.x/java/ServiceClients.html#circuit-breakers



# Tests

http://blog.octo.com/circuit-breaker-un-pattern-pour-fiabiliser-vos-systemes-distribues-ou-microservices-partie-3/

can we test each impl??


# Monitoring


Kamon
Metrics (Dropwizard) with Scala support through https://github.com/erikvanoosten/metrics-scala

Datadog
WeaveScope