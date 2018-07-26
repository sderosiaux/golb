---
title: "HTCBMS — Part 2 — Retryers"
date: "2017-01-22T15:28Z"
is_blog: true
path: "/articles/2017/01/22/how-to-communicate-between-micro-services-part-2-retryers/"
language: "en"
tags: ['micro-services', 'retryers', 'couchbase', 'spark', 'guava', 'akka', 'akka streams', 'lagom']
---

_The introduction of this series: [How to communicate between micro-services — Part 1](https://www.sderosiaux.com/2017/01/18/how-to-communicate-between-micro-services-part-1/)_.

We tend to not write any monolithic application nowadays, that provides all the features at once.

We try to think modular and often write dedicated modules in the application itself (with their own _bounded context_), then switch them to dedicated independent services.
Then, we can release and scale them independently of the rest, and still provide a SLA of 99.999%.

An architecture based on multiple services can create a lot of network operations between them and, of course, the network rarely fails and always provides a good latency.

Unfortunately, that's not true. It always happens that the network fails for some reasons: a trainee removed the wrong cable, the provider did some infra upgrade, a network card has died etc., every application and service must be prepared for that.

We (developers) rarely think about the network or services issues when we code. We don't think about the [fallacies of distributed computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) and we don't think that the other services can have troubles to answer (eg: it's GCing, it's rebooting, it's under a big load, it's waiting for another service etc.). It's not something `TODO` for later, it's something to take into account while writing the code.

If because we have underestimated the potential problems and they happen, this can create a shortage of the application and have a lot of repercussions (financial, 3rd party-services can fail, data can be lost, unhappy customers): just because we didn't handle the error properly with a few lines of code.

In this article, we'll focus on the Retryer pattern, used to deal with communication issues.
The next one will focus on the circuit-breaker pattern, more complex but smarter.

We'll compare different implementations for the sake of it.

---
Summary {.summary}

[[toc]]

---

# An example of a service that can fail

Let's code a quick HTTP service that can fail in Java:

```
class Server {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(1234), 0);
        server.createContext("/billing", httpExchange -> {
            if (Math.random() > 0.8) {
                byte[] out = "hello".getBytes();
                httpExchange.sendResponseHeaders(200, out.length);
                httpExchange.getResponseBody().write(out);
                httpExchange.close();
            }
        });
        server.start();
    }
}
```

It will send a 200 one out of five times when querying `http://server:1234/billing`.
In real life, we also have to consider network issues that can lead to the same issues (no response) or others such as _Unreachable Host_ and so on.


We will code retryers and circuit-breakers around this issue.

# What is a Retryer?

A retryer is a _simple_ and _stupid_ circuit breaker. It has no memory of the previous tentatives by another retryer, whereas the circuit breaker has (it's state machine).
It's just a stubborn function that retry some piece of code until a certain condition occurs or certain thresholds are reached.

It should be used wisely, because a retryer will increase the load on the target service.
If multiple services retry against another one, they can themselves create the issue if the retry delay is too short, instead of waiting a bit to let the service recover (the circuit-breaker is smarter about that).

Still, a retryer is not that stupid and generally provides several strategies and thresholds:

- max retry count, and max time: let's not retry forever.
- Exponential and Fibonacci backoffs: wait more and more between calls, in order to let the other service recover.

A broad comparaison would be with the TCP congestion control mechanism. It tries to find the best rate to send the traffic somewhere.
It starts to send 1 packet (slow-start), then 2, then 4 etc. and decrease (and retry) when packets are lost^[TCP has multiple congestion control algorithms.].
It's the application of a backoff strategy.

As a lecture, ["A Performance Comparison of Different Backoff Algorithms under Different Rebroadcast Probabilities for Mobile Ad hoc Network's"](http://www.comp.leeds.ac.uk/ukpew09/papers/12.pdf) provides some nice comparaison between Exponential backoff and Fibonacci backoff.
We often simply use the Exponential backoff by default, but this shows that we should always measure the best strategy according to our need.

# How to code a custom retryer?

We should never code a retryer ourself, and instead rely on a 3rd party library (battle-tested), but let's see how would we do that.
_Let's not use our buggy HTTP service here, but just simple numbers. We'll use it after with real 3rd party librairies_.

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


[[warn]]
|Note that we should *never* use `Thread.sleep` but a dedicated scheduler instead (Java 8 `ScheduledExecutorService` or an Akka `Scheduler`).

- without recursion

We can prefer a simple iteration loop, but recursion is generally used to avoid to deal with mutable states and the loop itself.
_I'm sure the following code could be improved for an iterative version, but we get the idea, it's ugly:_

```scala
def retry[T](op: => T, 
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

[[info]]
|We won't have any troubles with recursion and the thread stack because the retryer is supposed to use a scheduler that will execute the retry asynchronously, therefore the thread stack is always emptied.

Note that it's also possible to add some _gitter_ to a retryer, to always add tiny random delays.

# guava-retrying

In Java, a common implementation to use is [guava-retrying](https://github.com/rholder/guava-retrying). It obviously depends on [Guava](https://github.com/google/guava) which brings a lot of nice collections types, functional types, caches, and much more classic and useful APIs Java lacks of.
It provides a well battle-tested implementation, fully configurable.

If we try to connect to our buggy service, a HTTP call retryer would be something like:

```scala
libraryDependencies += "com.github.rholder" % "guava-retrying" % "2.0.0"
```
```scala
Retryer<Response> retryer = RetryerBuilder.<Response>newBuilder()
  .retryIfException()
  .withWaitStrategy(WaitStrategies.exponentialWait(2, 10000, TimeUnit.MILLISECONDS))
  .withStopStrategy(StopStrategies.stopAfterAttempt(10))
  .withRetryListener(new RetryListener() {
      @Override
      public <V> void onRetry(Attempt<V> a) {
          if (a.hasException()) {
              System.err.printf("%s (%d) (%dms elapsed). Retrying...\n",
                a.getExceptionCause(), a.getAttemptNumber(), a.getDelaySinceFirstAttempt());
          }
      }
  })
  .retryIfResult(r -> r.getStatusCode() != 200)
  .build();

// wrap the call into the retryer
Response resp = retryer.call(() -> getBilling()));
System.out.println(resp.getResponseBody());

// helpers
private static AsyncHttpClient client = new AsyncHttpClient();
private static Response getBilling() {
    return client.prepareGet("http://server:1234/billing")
                 .execute()
                 .get(1000, TimeUnit.MILLISECONDS);
}
```

- We retry until the HTTP status code is 200
- We retry on any exception, maximum 10 times
- The retryer can delay the next call up to 10s, and it multiplies the previous delay by 2 for each retry
- We set a HTTP timeout of 1s

If the service is unavailable, we would get:
```xml
Can't reach service (1) (2312ms elapsed). Retrying...
Can't reach service (2) (2317ms elapsed). Retrying...
Can't reach service (3) (2326ms elapsed). Retrying...
...
Can't reach service (10) (4363ms elapsed). Retrying...
```

The initial call failed after 2312ms, then the retryer tries 5ms later, then 10ms later, then 20ms etc.

# Failsafe

[Failsafe](https://github.com/jhalterman/failsafe) on the contrary depends on nothing else. It's written in Java and provides more patterns and APIs to deal with failures. (retryers and circuit breakers).

It provides much more events to be plugged into (success, failure, max attempts, aborts, fallback in case of failure), and also implement a asynchronous API (through Executors).

Our previous example could be written this way, it's a bit less verbose:

```scala
libraryDependencies += "net.jodah" % "failsafe" % "1.0.1"
```
```scala
RetryPolicy retryPolicy = new RetryPolicy()
  .retryOn(throwable -> true)
  .retryIf((Predicate<Response>) response -> response.getStatusCode() != 200)
  .withBackoff(10, 10000, TimeUnit.MILLISECONDS, 2.0d)
  .withMaxRetries(10)
  .withJitter(0.05d);

long start = System.currentTimeMillis();
Response resp = Failsafe.with(retryPolicy)
  .onFailedAttempt(t -> System.err.printf("%d: %s%n", System.currentTimeMillis() - start, t))
  .get(() -> getBilling());
// blocking call!

System.out.println(resp.getResponseBody());
```
```
1107: java.util.concurrent.TimeoutException
2133: java.util.concurrent.TimeoutException
3175: java.util.concurrent.TimeoutException
4257: java.util.concurrent.TimeoutException
hello
```

Using an `ExecutorService` would be better, to process them async (notice that returns a `FailsafeFuture` that extends the Java `Future`):

```scala
FailsafeFuture<Response> resp = Failsafe.with(retryPolicy)
  .with(Executors.newScheduledThreadPool(5))
  .onFailedAttempt(t -> System.err.printf("%d: %s%n", System.currentTimeMillis() - start, t))
  .onSuccessAsync((CheckedConsumer<Response>) r -> System.out.println(r.getResponseBody()))
  .onFailureAsync(o -> System.err.println("Failure! " + o))
  .get(() -> getBilling());
```


# Couchbase Retryer

Another interesting usage is in the Couchbase driver. Here is their [Retryer](https://github.com/couchbase/couchbase-java-client/blob/master/src/main/java/com/couchbase/client/java/util/retry/RetryBuilder.java).
It's simpler than Failsafe's but it's the usage that is interesting, because it is used into Observables, from RxJava.

The Couchbase driver exposes the data and metadata only through Observables, so a retryer is used almost for every server calls:

```scala
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

It will try to get the buckets info forever (`max`) waiting 100ms between each retry. It's a very aggressive configuration but it makes sense because those are critical information to get. We can't provide any fallback.

- Its Spark connector also protects every queries from the `BackpressureException`.

It happens when the driver has its internal request ring buffer filled (16384 slots by default), and can't accept anymore requests. It is waiting for the server to process them (which is probably overloaded). It can easily happen with Spark because of some big data set and the parallelism introduced.

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

# Lagom Retryer

A nice Akka implementation can be found in [Lagom](https://www.lightbend.com/lagom).
It's a microservices framework we'll talk more about in this series.

It's used internally (not much yet). It embeds any operation in a `Future` and use an Akka scheduler for async-ness:

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

We can use it by defining an `ActorSystem` and some implicits:

```scala
implicit val system = ActorSystem()
implicit val scheduler = system.scheduler
implicit val ec = system.dispatcher

val retry = new Retry(100 millis, 2.0d, 10) {
  override protected def onRetry(t: Throwable, delay: FiniteDuration, remainingRetries: Int) = {
    println(s"$t. ($delay) Remaining retries: $remainingRetries")
  }
}

val client: AsyncHttpClient = new AsyncHttpClient
def getBilling: Response = client.prepareGet("http://localhost:1234/billing")
                                 .execute.get(1000, TimeUnit.MILLISECONDS)

val resp: Future[Response] = retry(getBilling)
resp.map(_.getResponseBody).foreach(println)
```
```
java.util.concurrent.TimeoutException. (100 milliseconds) Remaining retries: 10
java.util.concurrent.TimeoutException. (200 milliseconds) Remaining retries: 9
hello
```

# Akka Streams

One last usage I'm going to show is by using Akka Streams because the implementation is much more [complex](https://github.com/akka/akka-stream-contrib/blob/master/contrib/src/main/scala/akka/stream/contrib/Retry.scala) than a classic Retryer, due to the nature of Akka Streams.

There is a non-official retryer available in [akka-stream-contrib](https://github.com/akka/akka-stream-contrib).

It's more complex because:
- It introduces the notion of _State_ (tupled with a `Try`) to remember which source element must be retry in case of a failure. This complexifies a bit the code because we must deal with tuples.
- A retry refeeds the stream with the failed states using a `BidiShape` (bidirectional).
- It's not configurable (no thresholds) as the other retryers we saw. It just tries forever unless we explicitely return `None` for an element in the retry handler.

If we change a bit our program and ask to contact several urls in our stream for instance, we can do something like:

```
libraryDependencies += "com.typesafe.akka" %% "akka-stream" % "2.4.16"
libraryDependencies += "com.typesafe.akka" %% "akka-stream-contrib" % "0.6"
```
```scala
implicit val system = ActorSystem()
implicit val scheduler = system.scheduler
implicit val ec = system.dispatcher
implicit val mat = ActorMaterializer()

val client: AsyncHttpClient = new AsyncHttpClient
def getBilling(url: String) = Try(client.prepareGet(url).execute.get(1000, TimeUnit.MILLISECONDS))

// (Input, State) => (Try[Output], State)
def request[T] = Flow[(String, T)].map {
  case (url, state) => (getBilling(url), state)
}

val graph = Source(List("http://localhost:1234/billing",
                        "http://localhost:1234/billing2",
                        "http://localhost:1234/billing3"))
  .map(s => (s ,s))
  .via(Retry(request[String]) {
    case s if !s.contains("billing2") => Some(s, s) // do NOT retry /billing2
    case _ => None
  })

val res: Future[Done] = graph.runForeach {
  case (resp, url) => println(s"$url: ${resp.map(_.getResponseBody)}")
}

res.onFailure { case e: Throwable => println("Call failed: " + e) }
res.onComplete { _ => system.terminate(); client.close() }
```

A result could be:
```xml
http://localhost:1234/billing: Success(hello)
http://localhost:1234/billing2: Failure(java.util.concurrent.TimeoutException)
http://localhost:1234/billing3: Success(hello)
```

# Misc

## Idempotence

In certain cases, we must ensure that if a service receive 2 calls (the first one and a retry), the calls should be idempotent. We wouldn't want to update a balance twice if only one transaction (that was first successful but was also retried) occurred. It's possible the request made it to the server, but for some reason, the response failed to come back.

The point is we should never send things like increments into the payload, but directly the final value we expect. In case of a retry, it will just send twice the same value, that's idempotent.

## Backpressure handling

The Retry pattern is not a really good way to deal with backpressure, because it keeps insisting to get or push its data, even if the other service is still overflown.

Observables implement smart strategies to handle backpressure.

Either some data can be drop or buffered, or it producers or consumers can be notified that they need to slow down. Observables can switch from the _push_ mode to _pull_ mode, waiting for the consumer. It's gently called _reactive pull backpressure_. More details and examples on the [RxJava wiki](https://github.com/ReactiveX/RxJava/wiki/Backpressure#callstack-blocking-as-a-flow-control-alternative-to-backpressure).

# Conclusion

The Retryer pattern is a simple pattern that answers simple needs. It's the first step to provide a resilient communication.

Libraries provides more or less features around it (thresholds, event handlers, fallbacks, async-ness). It can integrate into different ways of coding (imperative, functional, Observables, Streams).

Unfortunately, it's not as smart as the circuit-breaker because it has no memory that another retryer already failed 10x times, and a new retryer could fail again 10x times instead of fallbacking directly.





