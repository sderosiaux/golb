---
title: "Akka Streams: Bidirectional Flows"
date: "2017-03-05T08:40Z"
layout: post
path: "/2017/03/05/akka-streams-bidirectional-flows/"
language: "en"
tags: scala, akka, akka streams, bidi
---
 ---
Summary {.summary}
 [[toc]]
 ---
 TODO: use TestKit to test and a TestProbe
 # The basics
 A BidiShape is just another type of Shape (SourceShape 1->, FlowShape 1->1, SinkShape ->1) : 2<->2
(FanInShape, FanOutShape are others): Just a set of Inlets and Outlets.
 `.atop`: compose 2 bidiflows
`.join`: to close a bidiflow and form a classic `Flow`
 `.join` can simply be an identity, to feed its input2 with its output1.
 Extra:
`.reverse`: the inputs becomes the outputs and vice-versa
 # What are the advantages compared to simple Flows combinaisons?
 # Defining a protocol
 (codec, decodec)
 # "Guess the number" with a BidiFlow
 # BidiKillSwitch
 Compared to a classic Graph, with a `BidiFlow` we need to wrap the whole thing using with the `KillSwitch`, for it to handle both ways.
This is a case where we must use `atop`.
 Here is how to get a `KillSwitch` from a _BidiGraph_ (this does not exist but it sounds great):
 - We define a classic `BidiFlow` (`(Int -> Int, Option[Double] -> Boolean)`):
```scala
val bidi: BidiFlow[Int, Int, Option[Double], Boolean, NotUsed] = 
    BidiFlow.fromFlows(
        Flow[Int].map(max => (math.random * max).toInt),
        Flow[Option[Double]].map(_.isDefined)
    )
```
 - We wrap our `BidiFlow` with a `KillSwitch`, using `atopMat` to grab the materialized value (the switch!):
```scala
val bidiWithKs: BidiFlow[Int, Int, Option[Double], Boolean, UniqueKillSwitch] =
    bidi.atopMat(KillSwitches.singleBidi[Int, Option[Double]])(Keep.right)
```
 - We close our `BidiFlow` with a `Flow` (by default, `join` keeps the left materialized value so it's fine):
```scala
val flowWithKs: Flow[Int, Boolean, UniqueKillSwitch] =
    bidiWithKs.join(Flow[Int].map(i => if (i > 50) Some(i) else None))
```
 - We wrap the `Flow` with some `Source` and `Sink`, and we have our `KillSwitch` available:
```scala
val (ks, sum) = Source.fromIterator(() => Iterator.from(0))
    .viaMat(flowWithKs)(Keep.right)
    .toMat(Sink.fold[Int, Boolean](0)((acc, _) => acc + 1))(Keep.both)
    .run()
```
 - We can use it! That will trigger the switch after 100 milliseconds, and the graph will be completed:
```scala
system.scheduler.scheduleOnce(100 millis)(ks.shutdown())
sum.foreach(sum => println("sum=" + sum))
// sum=272159 | what about  you?
```
 # Adding Framing
Framing.delimiter(ByteString.fromString(lf, charset.name()), maxLineSize
 # Akka-Http is a BidiFlow
 # Streaming TCP
 # Alpakka
