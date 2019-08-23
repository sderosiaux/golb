---
title: "Dealing with Kafka and Asynchronous executions"
description: ""
date: "2018-08-19T12:00Z"
is_blog: false
path: "/articles/2018/08/19/dealing-with-kafka-and-async-executions/"
language: "en"
tags: ['scala', 'cats', 'cats-effect', 'async']
category: 'Scala'
background: '1_6_3xV73zP7QSOK5pdNoadw.jpeg'
---

TOC

// j'ai voulu faire kafkaproducer et utilier le callback pour pas gérer les Futures

// j'ai de suite penser à Ref[IO, Try[RecordMetadata]] (ref.put et ref.get), une single reference

```scala
// j'ai ensuite regarder du côté de MVar: put/read pour avoir MVar.empty
  def send[F[_]](ref: MVar[F, Try[RecordMetadata]]): Unit = {
    p.sendWithCallback(new ProducerRecord("topic", "value"))((result: Try[RecordMetadata]) => {
      ref.put(result)
    })
  }
  
  val record = for {
    x <- MVar.empty[IO, Record]
    _ = send(x)
    y <- x.take
  } yield y
```

// me suis dit qu'il devait y avoir plus simple: deferred. j'ai pensé que c'était comme Promise avec les Futures

```scala
def send[F[_]](ref: Deferred[F, Record]): F[Record] = {
    p.sendWithCallback(new ProducerRecord("topic", "value"))((result: Record) => {
      ref.complete(result)
    })
    ref.get
  }
  val process = for {
    io <- Deferred[IO, Record]
    res <- send(io)
  } yield res
```

// je simplifie pour tester:

```scala
Deferred[IO, Int].flatMap(d => { d.complete(42); d.get }).unsafeRunSync()

// AH MERDE!
Deferred[IO, Int].flatMap(d => { d.complete(42) *> d.get }).unsafeRunSync()
```

// j'ai compris mon erreur: je n'avais pas "relié" mes ref.complete(xxx) dans l'IO sortante! Donc jms exécuté..
// je me rend compte qu'avec la méthode sendWithCallback qui renvoie void, ca va pas être possible! Totalement différent de Promise
// finalement, rabbatu sur Async simplement
// morale: tout le code doit être lié, aucun retour ne doit être oublié, sinon c'est bug assuré. je me suis laissé à comparer à Promise..
// et toujours revenir à un exemple simple pour mieux voir :)

  def send[F[_]: Async]: F[RecordMetadata] = {
    Async[F].async { cb =>
      p.sendWithCallback(new ProducerRecord("topic", "value"))((result: Record) => {
        cb(result.toEither)
      })
    }
  }

  println(send[IO].unsafeRunSync())


