---
title: "HTCBMS — Part 2 — Retryers & Circuit Breakers"
date: "2017-01-22T01:16:28Z"
layout: post
path: "/2017/01/22/how-to-communicate-between-micro-services-part-2-retryers-circuit-breakers/"
language: "en"
---

We tend to not write any monolithic application nowadays, that provide all the features at once.

We try to think modular and often write dedicated modules in the application itself (with their own _bounded context_), then switch them to dedicated independent services.
Then, we can release and scale them independently of the rest, and still provide a SLA of 99.999%.

A architecture based on multiple services creates a lots of network operations between them and, of course, the network rarely fails and always provide a good latency.

Unfortunately, that's not true. It always happens that the network fails for some reason, a trainee removed the wrong cable, the provider do some infra upgrade, a network card has died etc., all services must be prepared for that.

We (developers) rarely think about the network or services issues when we code. We don't think about the [fallacies of distributed computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) and we don't think the other service can have troubles to answer (it's GCing, it's under a big load, it's waiting for another service etc.). It's not something to `TODO` for later, it's something to take into account while writing the code.

If because we have underestimated the potential problems and they happen, this can create a shortage of the application and have a lot of repercussions (financial, 3rd party-services can fail, data can be lost, unhappy customers): just because we didn't handle the error properly.

Let's see 2 patterns to deal with those issues:

- Retryer
- Circuit-breaker

We'll use different implementations for the sake of it.

---
Summary {.summary}

[[toc]]

---

# Retryer

A retryer is a _stupid_ circuit breaker.
It's just a stubborn function that retry some code until a certain condition occurs or certain thresholds are reached.

It should be used wisely, because a retryer will increase the load on the target service.
If multiple services retry against another one, they can themselves create the issue, instead of waiting a bit to let the service recover (that's more the principle of the circuit-breaker).

Still, a retryer is not that stupid and generally provide several strategies and thresholds:

- exponential and fibonacci backoffs: wait more and more between calls, in order to let the target service recover.
- max retry count and max time: let's not retry forever.

A broad comparaison is the TCP congestion control mechanism. It tries to find the best rate to send the traffic somewhere.
It starts to send 1 packet (slow-start), then 2, then 4 etc. and decrease (and retry) when it packets are lost^[TCP has multiple congestion control algorithms.].
It's the application of a backoff strategy.

As a lecture, ["A Performance Comparison of Different Backoff Algorithms under Different Rebroadcast Probabilities for Mobile Ad hoc Network's"](http://www.comp.leeds.ac.uk/ukpew09/papers/12.pdf) provides some nice comparaison between exponential backoff and fibonacci backoff.

We often simply use the exponential backoff by default, but this shows that we should always measure the best strategy according to our need.

## How to code a retryer

We should never code a retryer ourself, and instead rely on a 3rd party library (battle-tested), but let's see how would we do that.

- recursion

The minimum is to handle the max number of calls:

```scala
def retry[T](op: => T, times: Int = 5): T = {
  try op
  catch {
    case NonFatal(e) if times > 0 =>
      println(s"failed: $e")
      Thread.sleep(500)
      retry(op, times - 1)
  }
}
```

Let's use it with a simple function that sometimes throw an exception:

```scala
def call(): Double = {
  val a = math.random
  if(a > 0.2) throw new Exception(s"$a greater than 0.2") else a
}
retry(call(), 3)
println("success")

// failed: java.lang.Exception: 0.20817832027757133 greater than 0.2
// failed: java.lang.Exception: 0.7250356453861431 greater than 0.2
// success
```

We should add a backoff strategy:

```scala
def retry[T](op: => T,
             times: Int = 5,
             delay: FiniteDuration = 500 millis,
             delayFactor: Double = 1.2d): T = {
  try op
  catch {
    case NonFatal(e) if times > 0 =>
      println(s"failed: $e. waiting $delay")
      Thread.sleep(delay.toMillis)
      retry(op, times - 1, increaseDuration(delay, delayFactor))
  }
}
private def increaseDuration(delay: FiniteDuration, delayFactor: Double) = {
  Duration((delay.toMillis * delayFactor).toLong, MILLISECONDS)
}
```

We can see the retries waitings increasing:

```xml
failed: java.lang.Exception: 0.799957905002729 greater than 0.2. waiting 500 milliseconds
failed: java.lang.Exception: 0.47818844698841034 greater than 0.2. waiting 600 milliseconds
failed: java.lang.Exception: 0.7187151496290404 greater than 0.2. waiting 720 milliseconds
Exception in thread "main" java.lang.Exception: 0.976739042710251 greater than 0.2
```


Note that we should *never* use `Thread.sleep` but a dedicated scheduler instead (Java 8 `ScheduledExecutorService` or an Akka `Scheduler`).{.warn}

- without recursion

We can prefer a simple iteration loop, but recursion is generally used to avoid to deal with mutable states and the loop itself.
_I'm sure the following code could be improved for an iterative version, but we get the idea, it's ugly:_

```scala
def retry2[T](op: => T, 
              times: Int = 5,
              delay: FiniteDuration = 500 millis,
              delayFactor: Double = 1.2d): T = {
  var t = times
  var d = delay
  var r: Option[T] = None
  while (r.isEmpty) {
    try { r = Some(op) }
    catch {
      case NonFatal(e) if t > 0 =>
        println(s"failed: $e. waiting " + d)
        Thread.sleep(d.toMillis)
        t -= 1
        d = increaseDuration(d, delayFactor)
    }
  }
  r.get
}
```

Note that we won't have any troubles with recursion and the thread stack because it's supposed to use scheduler that are executed asynchronously, but the thread stack is always emptied.{.info}

It's also possible to add _gitter_ to a retryer, to always add tiny random delays.

## guava-retrying

In Java or Scala, a common implementation to use is [guava-retrying](https://github.com/rholder/guava-retrying).

It provides a well battle-tested implementation, fully configurable:

```scala
Retryer<Double> retryer = RetryerBuilder.<Double>newBuilder()
  .retryIfExceptionOfType(IOException.class)
  .withWaitStrategy(WaitStrategies.exponentialWait(10, 100, TimeUnit.MILLISECONDS))
  .withStopStrategy(StopStrategies.neverStop())
  .withRetryListener(new RetryListener() {
      @Override
      public <Double> void onRetry(Attempt<Double> a) {
          try {
              System.out.println("attempt " + a.getAttemptNumber() + ", wrong val: " + a.get());
          } catch (ExecutionException e) {
              e.printStackTrace();
          }
      }
  })
  .retryIfResult(i -> i > 0.5)
  .build();

retryer.call(Math::random);
```
```xml
attempt 1, wrong val: 0.5635384092697954
attempt 2, wrong val: 0.693659404087464
attempt 3, wrong val: 0.0912542026215557
```



## Couchbase Retryer

In the Couchbase driver, there is also a [retryer builder](https://github.com/couchbase/couchbase-java-client/blob/master/src/main/java/com/couchbase/client/java/util/retry/RetryBuilder.java).

Couchbase is using RxJava to expose the data or metadata, and connect the retryer to all important calls:

```
public Observable<BucketInfo> info() {
        return Observable.defer(new Func0<Observable<BucketConfigResponse>>() {
            @Override
            public Observable<BucketConfigResponse> call() {
                return core.send(
                  new BucketConfigRequest("/pools/default/buckets/",
                  null, bucket, password));
            }
        })
        .retryWhen(any()
                    .delay(Delay.fixed(100, TimeUnit.MILLISECONDS))
                    .max(Integer.MAX_VALUE)
                    .build())
        ...
```

It will try to get the buckets info forever (`max`) waiting 100ms between each retry. It's a very aggressive configuration.

Its Spark connector also protects every queries with some retry logic:

```scala
Observable.from(query)
  .flatMap(vq => toScalaObservable(bucket.query(vq).retryWhen(
    RetryBuilder
      .anyOf(classOf[BackpressureException])
      .delay(Delay.exponential(TimeUnit.MILLISECONDS, maxDelay, minDelay))
      .max(maxRetries)
      .build()
  )))
```

## Lagom Retryer

A nice Akka implementation can be found in Lagom.

It is executing the operation in a Future and use an Akka scheduler:

```scala
private[lagom] class Retry(delay: FiniteDuration, delayFactor: Double, maxRetries: Int) {
  def apply[T](op: => T)(implicit ec: ExecutionContext, s: Scheduler): Future[T] = {
    def iterate(nextDelay: FiniteDuration, remainingRetries: Int): Future[T] =
      Future(op) recoverWith {
        case NonFatal(throwable) if remainingRetries > 0 => {
          onRetry(throwable, nextDelay, remainingRetries)
          after(nextDelay, s)(iterate(finiteMultiply(nextDelay, delayFactor), remainingRetries - 1))
        }
      }

    iterate(delay, maxRetries)
  }
  ...
```


## Idempotence

In certain cases, we must ensure that if a service receive 2 calls (the first one and a retry because of some timeout thresholds for instance), the calls should be idempotent. You wouldn't want to update a balance twice if only one transaction occured.

The point is we should never send things like increments into the payload, but directly the final value we expect. In case of a retry, it will just send twice the same value, that's idempotent.

## Note on backpressure

The Retry pattern is not a good way to deal with backpressure, because it keeps insisting to get or push its data, even if the other server is already overflown.

Observables already implement smart strategies to handle backpressure. They can switch from the _push_ mode to _pull_ mode, waiting for the other service to be more cooperative. It's gently called _reactive pull backpressure_. More details and examples on the [RxJava wiki](https://github.com/ReactiveX/RxJava/wiki/Backpressure#callstack-blocking-as-a-flow-control-alternative-to-backpressure).



# Circuit Breaker

http://blog.octo.com/circuit-breaker-un-pattern-pour-fiabiliser-vos-systemes-distribues-ou-microservices-partie-2/


- Independent of the language (scala's, and in js for instance https://github.com/yammer/circuit-breaker-js)
- Handle infra errors gracefully (fallback to a default value, or error state)
- Timeout explicit: the service is not crashed but slow
- It simulate some kind of backpressure: the end service is slow because it's overloaded? the circuit breaker will short-circuit it and the response is will faster, and the end service will have time to recover. (but Add a circuit breaker


# How does it work?

# Implementation

## breakr

https://github.com/AdamBien/breakr

## Akka

http://doc.akka.io/docs/akka/current/common/circuitbreaker.html


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


## Hystrix

https://github.com/Netflix/Hystrix/wiki/How-it-Works#CircuitBreaker



## Lagom

http://www.lagomframework.com/documentation/1.2.x/java/ServiceClients.html#circuit-breakers



## JavaScript


https://github.com/erikvanoosten/sentries


# Monitoring

WeaveScope
Kamon
Datadog





