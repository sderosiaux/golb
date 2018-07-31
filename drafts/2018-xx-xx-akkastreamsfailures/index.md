---
title: "Akka Streams: Handle failures"
date: "2017-03-05T08:40Z"
layout: post
path: "/2017/03/05/akka-streams-handle-failures/"
language: "en"
tags: scala, akka, akka streams, failures, retry
---
 ---
Summary {.summary}
 [[toc]]
 ---
 http://doc.akka.io/docs/akka/2.4.17/scala/stream/stream-error.html
 TODO: use TestKit to test and a TestProbe
 # Grab a Future[Done] as Materialized value
 # Supervision on the ActorMaterializer
   val errMat = ActorMaterializer(ActorMaterializerSettings(system)
    .withSupervisionStrategy(e => { log.error("mat sup:" + e.getMessage); Supervision.Restart })
    .withDebugLogging(true),
    "KILL_IT"
  )
 # Supervision in the stream
 On a Flow:
   def tickSource() = {
    println("create tick source")
    Source.tick(0 millis, 500 millis, Unit)
      .map(_ => System.currentTimeMillis())
      .mapMaterializedValue(_ => NotUsed)
      .addAttributes(ActorAttributes.supervisionStrategy(e => {
        log.error(e.getMessage, "got it!"); Stop
      }))
      .map(t => {
        throw new Exception("boom"); t
      })
  }
     //.viaMat(KillSwitches.single)(Keep.right)
 # actorPublisher needs manual handling!!!!fjdslkfdslkjfds 
OR Sink.actorSubscriber ????
 # Recover by recreating the source
   val (ks, done) = tickSource()
        .recoverWithRetries(-1, { case t => println("recover"); tickSource() })
        .toMat(Sink.foreach(x => println("tickkk:" + x)))(Keep.both)
        .run()(errMat)
   //system.scheduler.scheduleOnce(1 seconds)(ks.abort(new Exception("boom")))
  done.onFailure { case e => log.error(e, "unhandled ex") }