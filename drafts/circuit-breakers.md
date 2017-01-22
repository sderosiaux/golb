
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

## Failsafe

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
