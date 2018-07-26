---
title: "How to communicate between micro-services — Part 1"
date: "2017-01-18T01:16:28Z"
is_blog: true
path: "/articles/2017/01/18/how-to-communicate-between-micro-services-part-1/"
language: "en"
tags: ['micro-services', 'grpc', 'sbe', 'netty', 'kafka', 'hazelcast', 'hollow', 'zookeeper', 'consul', 'etcd', 'druid', 'cqrs', 'hystrix', 'akka']
---

The title says _micro-services_ but it's more about _services_ on general. It's just more _catchy_.

Let's say we have a main application relying on several services that each provides a specific business value (à la DDD, each has its bounded context).

We want the main application to query them in parallel or sequentially (if some service requests depend on another service results), and we want our application to be resilient.
We may want to load balance a service, introduce a scheduler/worker system, have some policies (like call limits), handle authorization and authentication. 

Being resilient is a must. We don't want any service to crash. More globally, we don't want to shutdown the stack because we need to update one service, or just because one had crashed for some reason (like a network error).
We want to be able to detect those issues quickly, provides some solution when possible (a fallback), and still reply the fastest we can to the client of the main application.
Performance matters.

A few years ago, [Martin Fowler has written a good overview of what is a micro-service architecture, how did we get there coming from the monolithic way](https://martinfowler.com/articles/microservices.html).

The resilience depends of the means of communication between the services.

Let's see what are the existing pieces of technology available today to build a reliable micro-services architecture.

To not make a huge article and stay focused, I think I'll write down a series of articles dedicated to the communication between services.
[[info]]
|This first one talks about general principles and present some softwares and frameworks to get an overview. The subsequent articles will focus on specific frameworks and patterns (like the circuit-breaker) because we want to see some code!

---
Summary {.summary}

[[toc]]

---

# Types of failure

We generally codes the business rules and handle their errors, such as validating some properties to be still get a consistent model.
It also happens that we surround some critical areas with `try/catch` because it happened that this code can crash, and we don't want the whole JVM to crash because of that.

But what about infrastructure errors ?
Generally, they are poorly handled.

- What if, at first, the service can't connect to the database? The application will go into `catch` to log something, then what?
- What if, at first, the service can connect to the database, then hours later, the database is down. What is going to happen to the application, to the requests? Are the queries are going to accumulate, but where? how much? Is the whole application is going to explode, crash, and lose all its flying requests?

They are a bunch of questions to wonder when an application (or service) is contacting another service.
A service failure should not crash the calling application/service, and this, recursively, to not crash the whole stack.

## Retry or break

- Retryer

A simple technique, like Apache Flume is using, is to retry until success.
It never crashes, it's stubborn, it keeps retrying forever, waiting a bit between retries.

It can retry forever because it has a channel (memory, disk, MoM etc.) where it can store the events to process. If it accumulates too much (according to some thresholds), it can just drops them.

In an application, we are often limited by the memory and we don't want to store everything in memory, in case the whole application crashes.
It's often useful to rely on a MoM such as Kafka, to store the *requests* to the service, only if it's possible to process them later.

Unfortunately, we often need the response asap (especially in a micro-service architecture, MSA) to reply to the main application and user as fast as we can.

- Circuit-breaker

A different pattern, instead of retrying forever, is to retry an operation until upon certain conditions, according to the past failures. This is the purpose of the circuit-breaker.

It's a state machine that acts kinda a classic retryer but has memory of the past failures. It's able to provide a direct fallback if it knows some condition is already probably false (like the other service is down), instead of blindly trying to reach it several times. It's based on some thresholds to test if the condition result has changed or not.

## Fail fast

Another way is just to crash quickly and simply.

It's always better to crash quickly than to never crash but always have troubles to do its task and let the other services take hits for our problem. (ok, don't apply that to humanity)

For instance, if we consider a database cluster, what if one hard-drive on a node decides to slowly die? The service on this node will start to act odd, be slow to answer, but will never fail. This will never trigger any alerts nor rebalance, but it can slow down the whole stack before it, create timeouts etc.

Whereas if the service crashes fast, then a good database can rebalance itself, and a monitoring and some alerting can trigger some failover commands like restarting the service (as with supervisor) (eg: think about bad drivers that can't restart properly after a network failure), or start it somewhere else.


# Types of communication

No matter how we handle the services failures, we must first make them communicate between each other.
There are many, many techniques and protocols to help us.

## HTTP

The most common and straightforward way is to simply use a HTTP client, and implement a HTTP server on all services. It's exactly how the websites works, the browser being the client.
It's standard to use HTTP to communicate with other services, due to the powerful available frameworks and the easiness of the implementations. When we get an HTTP answer, we can decide what to do based on the HTTP response code, body, and Content-Type (text, json, xml).

Services are considered as simple HTTP servers, and can respond to HTTP `GET`, `POST` etc. requests. Any HTTP client is able to communicate with them if they respect the communication contract (the exposed routes and parameters). A good and up-to-date documentation is a must for anyone to be able to write a service to interact with any other.

Generally, client-side we can tune the request parameters such as the timeouts, use compression, secured connection, connection pools, to enhance the speed and throughput. The implementations are generally well battle-tested.

Server-side, we can tune the threads pools that accept and process requests (async), the timeouts, the Content-Type it accepts and can return, which protocol it handles (HTTP/2, WebSockets), and of course, the routes.

- A classic library to do HTTP requests is [async-http-client](https://github.com/AsyncHttpClient/async-http-client). It's written in Java but perfectly useable in Scala. Note that it only provides the client side.

- Another way, purely Scala'ish, is to use [akka-http](http://doc.akka.io/docs/akka-http/current/index.html) (previously [spray](http://spray.io/)). It relies on the Actor model provided by Akka which is quite idiomatic in Scala. It provides the [client side](http://doc.akka.io/docs/akka-http/current/scala/http/client-side/connection-level.html) and [server side](http://doc.akka.io/docs/akka-http/current/scala/http/routing-dsl/index.html).

- Twitter has written [Finagle](https://twitter.github.io/finagle/), which is a stack dedicated to RPC communication between JVMs, protocol agnostic. It also created [Twitter Server](https://github.com/twitter/twitter-server) is a framework on top of Finagle. Finally, Twitter made [Finatra](https://github.com/twitter/finatra), built on top of them, to provide a fully-features framework to easily create testable and performant [HTTP services](http://twitter.github.io/finatra/user-guide/build-new-http-server/) (and also [Thrift services](http://twitter.github.io/finatra/user-guide/build-new-thrift-server/)), and

- Airbnb created a stack named [SmartStack](http://nerds.airbnb.com/smartstack-service-discovery-cloud/) which purpose is to stay outside of the services source code. It's composed of [nerve](https://github.com/airbnb/nerve) (track services status, rely on ZK or etcd) and [synapse](https://github.com/airbnb/synapse) (service discovery, rely on HAProxy).

- Netflix has written a bigger stack, composed of many parts any services can use: [Eureka](https://github.com/Netflix/eureka) (service registry client and server), [archaius](https://github.com/Netflix/archaius) (service configuration), [ribbon](https://github.com/Netflix/ribbon) (RPC communication, load balancing, replay, batch, multiple protocols. But they are moving to gRPC), [governator](https://github.com/Netflix/governator) (service lifecycle), [servo](https://github.com/Netflix/servo) (service monitoring), [Hystrix](https://github.com/Netflix/Hystrix) (service resilience, fault tolerance. [I wrote how it works here](https://www.sderosiaux.com/2017/01/29/how-to-communicate-between-micro-services-part-3-circuit-breakers/#hystrix))

## gRPC

[gRPC](http://www.grpc.io/), by Google, provides a performant RPC framework that uses HTTP/2 and [protobuf](https://github.com/google/protobuf).

It handles both server-side (to process request and send response) and client-side (to send request) using protobuf as `Content-Type` (`application/grpc+proto`).
With protobuf, we can define message _and_ service interfaces using a simple DSL, that will be used to generate code we can call from our codebase. gRPC handles classic request/response style, and also streaming RPC.

gRPC can generate code in many languages, C++, Java, Python, Go etc. but not in Scala! Hopefully, there is [ScalaPB](https://scalapb.github.io/) and its extension to generate gRPC compliant services.

## Zero-copy protocols

It exists some protocols that are ultra-fast because they don't need to pack/unpack and parse the payloads. They directly map the memory to the object. They use the zero-copy kernel strategy to prevent useless data copies and cpu cycles (from kernel context to user context), and they barely do memory allocations, except for the message itself. They also handle schema evolution, up to some constraints.

- [Cap'n Proto](https://capnproto.org) is one of them. We write some interfaces and we generate code stub from it.
It's mainly written in C++ but a non official Java implementation exists.
- [flatbuffers](https://github.com/google/flatbuffers), by Google, follows the same strategy, available in multiple languages.
- [simple-binary-encoding](https://github.com/real-logic/simple-binary-encoding) (SBE), is another implementation of this same principle, more XML oriented. Real Logic (the company behind it, specialized in high performance systems) has also written [Aeron](https://github.com/real-logic/Aeron) that is used by Akka Remote ([Artery](http://doc.akka.io/docs/akka/2.4/scala/remoting-artery.html)) to give you an idea.

## Raw TCP/UDP with Netty

The base of every communication is either TCP or UDP. As a reminder, they are used at the OSI level 4, the transport layer, giving the ability to deliver messages from one computer to another.
It's possible to do our own application protocol as we just saw, using Netty as a base framework to handle communication only.

[Netty](http://netty.io/index.html) is a low-level Java framework built on top of Java NIO (which provides non blocking sockets) that can be used to speak *TCP* or *UDP* directly with any payload we want. It will deal with the communication itself and let us deal with the handling, the buffers, the parsing. It provides a lot of features such as zero-copy, thread pools, binary/text-based protocols helpers, already understand some application protocols like HTTP, WebSockets, can deal with compressed data, framing of data. It's a veritable networking swiss-knife designed for high performance in mind.

It's used in all main actors (Akka, Cassandra, Spark, Couchbase, Elasticsearch, Finagle, Play!...) because they all needed to implement their custom protocols.

The fastest protocols are using UDP because of the lack of acknowledgments. It also *provides* packets loss, packets duplications, packets out-of-order arrivals. The application relying on UDP must assume all those constraints and deal with those situations. Packets loss is often acceptable in games, like sending players positions. We can lose one event, they are much more of the same type coming after to correct the situation.

In applications, and particularly services, precautions must be taken. We generally don't want to lose a request nor a response (there is no such concept as *response* in UDP because there is no such concept as *connection* or *conversation*, but we get the idea).

One framework we mentioned can use UDP as protocol: [Aeron](https://github.com/real-logic/Aeron), used in Akka Remote. It can send SBE data through UDP (but not only) for maximum performance (and can pack several messages in the same UDP datagram). Because of the possible loss of messages, Aeron has a layer of checks to detect the related issues.

## Zookeeper, etcd, Consul

The communication we just saw are *direct communication*; meaning a service explicitely calls another service using its address.

It's possible to do *indirect communication* using a third-party service in-between (reactive database), that will be used as intermediate to store and dispatch any message.

### Zookeeper

[Zookeeper](https://zookeeper.apache.org/) is a distributed database (written in Java) used to store metadata and configuration.
Anybody working with hadoop has worked with it.

It provides reliable distributed coordination (thanks to its Zab consensus protocol). Any application can rely on it, instead of trying to implement complex coordinations operations. It can be used to deal with nodes leadership, locks, service discovery, counters, queues..

### etcd

[etcd](https://github.com/coreos/etcd) is also a distributed database (more precisely, it's a reliable key-value store, using Raft as consensus protocol) using gRPC under the hood. It's written in Go.

We can do anything like a classic key-value store (`get`, `put`, `del`). Clients can also watch for value changes, create locks, leases, and so on. The full gRPC interfaces are described [here](https://github.com/coreos/etcd/blob/master/Documentation/dev-guide/api_reference_v3.md).

### Consul 

[Consul](https://www.consul.io/) follows the same principle and is at the same time a Service Discovery system.

Contrary to ZK and etcd where we need to implement raw techniques  based on ephemeral nodes and pings (heart-beats) to know if a service is still alive, Consul scales differently and an agent must be deployed where the services are hosted.

This agent will forward details to the Consul servers. It's more reliable and can provide more insights (more checks can be done, cpu and memory can be monitored). It's a more complete solution but will also need some automation for deploying and managing the agents configuration.

### Example

An application based on a cluster composed of many nodes, can use Zookeeper or etcd to *store* messages or commands. Any of its node can react, pick up the message, then start some process (replication, repartition, anything).

For instance, [Druid](https://github.com/druid-io/druid) is using Zookeeper to give tasks to the Druid's worker nodes:
- The workers subscribes to a path in Zookeeper, waiting for a node (representing a task) to exist.
- The Druid's Coordinator create a task node in there.
- Zookeeper notify the workers.
- One worker takes the lead and process the task.

Same story to ask the Druid's Historical nodes to load/drop some data.
It is also used to manage the leadership between the multiple Overlords and Coordinators (in case of failover).
It is the central point of communication.

## MoM/Message Queues and CQRS/Event Sourcing

Another way to communicate between services is by using async messages queues system like Kafka, RabbitMQ, or JMS. We send a message/command and forget it (just waiting for an acknowledgment most of the time).

Using messages queues to send commands and get responses is an application of the [CQRS](https://martinfowler.com/bliki/CQRS.html) pattern (Command Query Responsability Segregation).
Any service can send a command to another service, then it will eventually get some response from the same or another service: it does not expect an answer.

It's particularly closed to the Event Sourcing model, where we build an *immutable* bus of events any service can register to, and act upon them. It's also designed to keep everything from the beginning: if we want to change any system downstream, we can replay every past events to populate the new systems as if they were just in real-time.

## Distributed cache: Hazelcast, Hollow

### Hazelcast

[Hazelcast](https://hazelcast.com/) is a in-memory datagrid written in Java.

It can distribute data across several servers and each Hazelcast nodes (as a dedicated service or embedded into an existing one) can talk to each other to exchange data, and acts as a [distributed cache](https://hazelcast.com/use-cases/caching/) (but not only). Its architecture makes it very easy to scale horizontally.

This avoids to use the classic pattern of hitting an external database to get the data: the data can already be local to the service asking for them.
If they are not, Hazelcast will automatically and transparently queries its siblings or load them up from the database to get them.

It can also be used as a NoSQL store and can replace MongoDB, Cassandra, Redis, Couchbase, and so on. It's known to beat them hands down ([source](https://mpouttuclarke.wordpress.com/2013/12/12/titan-cassandra-vs-hazelcast-persistence-benchmark/)). Because it's all in memory, it just acts as a middleware and still need a backend to load and save the data. It means we can use it to communicate between different services, as long as they have access to an Hazelcast clusters or have an embedded Hazelcast service.

Similar softwares to Hazelcast are [Apache Ignite](http://ignite.apache.org/), [Pivotal Gemfire (using Apache Geode)](https://pivotal.io/big-data/pivotal-gemfire).

### Hollow

[Hollow](https://github.com/Netflix/hollow), by Netflix, is way different to Hazelcast, but it also serves as a cache service.

Actually, Hollow is not a distributed cache (each Hollow node contains the exact same cache), and the Hollow nodes don't talk to each other.
Nonetheless, it can still be used to communicate between services.

- We define a Hollow producer service (one that updates the data, on some storage/database), and some Hollow consumers.
- When the producer estimates it's time to update, the Hollow consumers will be updated (push or pull) and will be able to query the fresh data locally (and they cannot update their data, they are immutable). It has nice features like indexes, ttls, data snapshots, data validation..


