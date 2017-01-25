---
title: "HTCBMS — Part 3 — Circuit-breakers"
date: "2017-01-24T01:32Z"
layout: post
path: "/2017/01/24/how-to-communicate-between-micro-services-part-3-circuit-breakers/"
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
- open (or tripped): the circuit-breaker knows something is broken and is failing. It provides a direct fallback, it won't even try to make the external call.
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
- Function call timeout: a call can be consider as a failure if it took too much time.
- Open to Half-Open delay: to try again to call the service.
- Failure/Success conditions: we can indicate what is a failure (besides timeouts), more business oriented.

- State transitions: we can generally monitor those state changes. We must be aware when a circuit is opened.

# Implementations

## Failsafe

We already used the Retryer of [Failsafe](https://github.com/jhalterman/failsafe#retries) in the previous part of this series.
Let's use their circuit-breaker now, to contact our brittle service.

```scala
libraryDependencies += "net.jodah" % "failsafe" % "1.0.1"
```
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

In [Sentries](https://github.com/erikvanoosten/sentries), circuit-breakers are more an implementation detail and are hidden behind the _sentry_ concept. They are also simpler than in Failsafe for instance.

A sentry can wrap any function call (it's a Higher Order Function), so any caller will first pass through the sentry before reaching the function code, _if_ the sentry let it pass.
A sentry is chainable: it's composed by several other sentries that takes only one responsability, it's a flow of sentries. And because it's a flow: the order matters.

```xml
Sentry Builder -> Sentry with Fail Limit -> Sentry with Rate Limit -> [Code]
```

If we use `withFailLimit` on a sentry, to trigger a circuit-breaker opening after N failures, this will actually _append_ a `CircuitBreakerSentry` to our sentry. Internally, its state are: _FlowState_ (closed) and _BrokenState_ (opened): there is no concept of half-open.{.info}

If we take a simple example:

```scala
object ExternalService extends SentrySupport {
    val client: AsyncHttpClient = new AsyncHttpClient
    val billingSentry = sentry("billing").withFailLimit(failLimit = 2, retryDelay = 1 second)
    def getBilling(url: String = "http://localhost:1234/billing") = billingSentry {
        client.prepareGet(url).execute.get(1000, TimeUnit.MILLISECONDS)
    }
}
println(Try(ExternalService.getBilling()))
println(Try(ExternalService.getBilling()))
println(Try(ExternalService.getBilling()))
```
```xml
Failure(java.util.concurrent.TimeoutException)
Failure(java.util.concurrent.TimeoutException)
Failure(..CircuitBreakerBrokenException: Making billing unavailable after 2 errors)
```

Thanks the sentry (and the cb), the 3rd call wasn't made.
One second later, it would let the call passed, to test them again.

Any call blocked by a sentry will thrown an exception such as `CircuitBreakerBrokenException`, `ConcurrencyLimitExceededException`, `DurationLimitExceededException`, according to which sentry was out of its limits.

Note that a failure is simply because an exception occurred. There is no means to plug in some callback to implement a custom business rule.{.warn}

Sentries provides more features than just circuit-breakers:
- `withMetrics`: Monitoring only. It provides metrics for successes/failures/sentry blocked.
- `withTimer`: Monitoring only. It provides the time passed in a function.
- `withFailLimit`: Breaks if there are more failures than expected. It will call the original function again after some delay.
- `withAdaptiveThroughput`: Try to ensure a given success ratio instead of prevent all calls if case of failures (like when it's acceptable to have 95% of success and 5% of failures on big volumes).
- `withConcurrencyLimit`: Breaks if more than `concurrencyLimit` calls the function at the same time.
- `withRateLimit`: Breaks if the function is called more than expected in a given time.
- `withDurationLimit`: Breaks if the function takes longer than expected.

The API of Sentries is easy, composable, but lack of some features like declaring a failure according to some custom predicate.
The good point is the embedded metrics monitoring, exposed through JMX.

![](sentries_jmx.png)

## Akka

Akka is not to present anymore. It's quite idiomatic in Scala nowadays.
It provides a full-featured [circuit-breaker](http://doc.akka.io/docs/akka/current/common/circuitbreaker.html) using a Akka `Scheduler`. It works mostly async-ly but supports sync calls (just by wrapping the call into a `Future` and `Await`ing it).

Its API is quite similar to Failsafe's.

Let's manually trigger the success and the fail to make it go through the different states:

```scala
libraryDependencies += "com.typesafe.akka" %% "akka-actor" % "2.4.16"
```
```scala
implicit val system = ActorSystem("app")
implicit val ec = system.dispatcher
val scheduler = system.scheduler

val cb = CircuitBreaker(scheduler,
            maxFailures = 3,
            callTimeout = 1 minute,
            resetTimeout = 3 seconds)

cb.onClose(log("cb closed"))
cb.onOpen(log("cb opened"))
cb.onHalfOpen(log("cb half opened"))

log("1x failure"); cb.fail()
log("2x failure"); cb.fail()
log("3x failure"); cb.fail()

// we wait for the half-open state...
scheduler.scheduleOnce(5 seconds) {
    log("task...")
    // cb.fail() — The circuit would be reopened directly from the half-open state!
    cb.succeed()
    val fut: Future[Boolean] = cb.withCircuitBreaker { Future { true } }
    val res: Boolean = cb.withSyncCircuitBreaker { true }
}
```
```xml
0.770: 1x failure
0.782: 2x failure
0.782: 3x failure
0.784: cb opened
3.792: cb half opened
5.794: task...
5.795: cb closed
```

The advantage of the Akka circuit-breaker is that it's dealing with Scala and `Future`s directly: it's can be a `Success` or a `Failure`, which the circuit-breaker is using.
Thanks to this, we can easily provide a fallback value in case of a failure / circuit-breaker opened.

For instance:

```scala
val client: AsyncHttpClient = new AsyncHttpClient
def getBilling(url: String = "http://localhost:1234/billing"): Future[Response] = {
    Future { blocking { client.prepareGet(url).execute.get(1000, TimeUnit.MILLISECONDS) } }
}
...
val responsesF = Future.sequence((1 to 10).map { _ =>
    // getBilling can throw a TimeoutException for instance
    cb.withCircuitBreaker { getBilling().map(_.getStatusCode) }
      .fallbackTo(Future { 1337 })
})

val status: Seq[Int] = Await.result(responsesF, Duration.Inf)
println(status)
```
```
Vector(1337, 1337, 1337, 1337, 1337, 1337, 200, 1337, 1337, 1337
```

We may wonder why can we find a `200` at the 7th position, because the circuit-breaker should be opened at the 3rd failures!?

It is because all the function calls were executed at the same time in the loop here; the circuit was still closed at this moment, because it didn't got any response yet. The async-ness makes it late.{.warn}

We can simulate a _real-word_ simulation by reducing our request timeout and introducing some lag:

```scala
def getBilling(url: String = "http://localhost:1234/billing"): Future[Response] = {
  println("getBilling")
  // 100ms max
  Future { blocking { client.prepareGet(url).execute.get(100, TimeUnit.MILLISECONDS) } }
}
...
val responsesF = Future.sequence((1 to 10).map { _ =>
  // we simulate a call every 120ms
  Thread.sleep(120)
  cb.withCircuitBreaker { getBilling().map(_.getStatusCode) }
    .fallbackTo(Future { 1337 })
})
```
```xml
getBilling
getBilling
getBilling
getBilling
getBilling
cb opened
Vector(1337, 200, 1337, 1337, 1337, 1337, 1337, 1337, 1337, 1337)
```
The circuit-breaker is opened at the fifth call (3rd failures in a row) and the function is not called anymore.

As we want see, this circuit-breaker is not really related to Akka and the Actor model and could be used anymore.
Its only dependency is the Akka Scheduler, which is used to:
- Control the function invocation time and throw a Failure if it's greater than the `callTimeout`.
- Switch from the opened state to the half-open state after the given `resetTimeout`.

## Hystrix

[Hystrix](https://github.com/Netflix/Hystrix) by Netflix is a popular choice.
It's a framework (written in Java) dedicated to application resilience—by wrapping every external service commands. It provides much more than just a circuit-breaker.

Netflix team are experts in the domain of services communication and (volontary) outages! ([Chaos Monkeys](https://github.com/Netflix/SimianArmy/wiki/Chaos-Monkey) anyone?) It's also the one [Spring](https://spring.io/guides/gs/circuit-breaker/) recommends to use.

Someone even translated the circuit-breaker piece to Javascript: [circuit-breaker-js](https://github.com/yammer/circuit-breaker-js).

Its circuit-breaker is part of a more global object: the `HystrixCommand`, which wraps any piece of code that can be executed, generally, doing an external call.

`HystrixCommand`s are the heart of Hystrix:
- they are all protected by a circuit-breaker, a max timeout, a max concurrency
- they can have a fallback
- calls are automatically logged and monitored
- results can be cached
- multiple commands can be collapsed into one to improve the throughput.

Hystrix also provides a lot of options to tune the concurrency (threads pools or semaphores).
Note that their responses are backed by `Observable`s. 



### Plugins

Hystrix has also a tons of plugins. The main one would be [`hystrix-dashboard`](https://github.com/Netflix/Hystrix/tree/master/hystrix-dashboard) to start a webserver and displays the `HystrixCommand`s metrics.



http://blog.octo.com/circuit-breaker-un-pattern-pour-fiabiliser-vos-systemes-distribues-ou-microservices-partie-3/


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