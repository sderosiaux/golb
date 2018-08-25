---
title: "Types: Never commit too early - Part 3: Stacking Monad Transformers without stack"
description: "It's common to have to stack monads to provide several effect at once: Monad Transformers are here to help us. But they bring their own issues. Hopefully, typeclasses can help us again."
date: "2018-08-15T14:00Z"
is_blog: true
path: "/articles/2018/08/15/types-never-commit-too-early-part3/"
language: "en"
tags: ['scala', 'cats', 'scalaz', 'typeclass', 'tagless final', 'mtl']
category: 'Scala'
background: 'Fish-are-friends-from-Finding-Nemo.jpg'
---

This article is part of a series:

- [Part 1: The Free Theorems](/articles/2018/08/15/types-never-commit-too-early-part1)
- [Part 2: How typeclasses save us](/articles/2018/08/15/types-never-commit-too-early-part2)
- Part 3: Stacking Monad Transformers without stack

---

As we saw in [part 2](/articles/2018/08/15/types-never-commit-too-early-part2), typeclasses help us tremendously to abstract our functions to the bare minimum.
In this last part, we'll see how we can use them to deal with a serious problem: stacking monads.

It often happens that we need to use several monads as our effects.

The go-to solution is to use Monad Transformers (`StateT`, `OptionT` etc. all those `*T`).
They already embed one monad to avoid some pattern matching when we need to `map` or `flatMap` them (they work with the value inside the embedded monad).

```scala
Task.eval(5.some).map(_.map(_ * 2)) // double .map: Task[Option[Int]]
OptionT(Task.eval(5.some)).map(_ * 2) // one .map: OptionT[Task, Int]
```

It's nice for simple cases but it can quickly becomes cumbersome in for-comprehension when we need to lift everything, especially when we have more than one Monad Transformer to use.

We'll start from a base solution and iterate to an ultimate and performant solution without stacking, but with typeclasses from [cats-mtl](https://github.com/typelevel/cats-mtl).

TOC

# Stacking Monad Transformers without hassle

## The classic overhead solution

Let's imagine an ads system dealing with city targeting if the whole system is configured to use it, or else fallback on displaying all the ads.
We could implement the foundation by relying on `Reader`, `State`, and `IO` monads to deal with configuration, state, and asynchrony:

```scala
type Ads = List[Ad]
type City = String

case class AdsConfig(targeting: Boolean)
case class Ad(imageUrl: String, target: Option[City] = None)

def userLocation(): IO[City] = ???
def needTargeting: Reader[AdsConfig, Boolean] = Reader(_.targeting)
def filterAds(city: City) = State[Ads, Ads](_.partition(!_.target.contains(city)))
def renderAds(ads: Ads): IO[Unit] = ???
```

Usage:

```scala
val ads = List(Ad("http://a", Some("paris")), Ad("http://b"), Ad("http://c", Some("paris")))

filterAds("paris").runA(ads).value
// List(Ad(http://a,Some(paris)), Ad(http://c,Some(paris)))
```  

We can try to combine the whole thing in a for-comp, but the astute reader knows it won't compile, because the monads used in the for-comprehension are not the same, and monads don't compose:

```scala
for {
  location: City <- userLocation()
  shouldTarget: Boolean <- needTargeting
  ads: Ads <- if (shouldTarget) filterAds(location) else State.get[Ads]
  _: Unit <- renderAds(ads)
} yield ()
```

We need to lift everything to the same type: `StateT[ReaderT[IO, AdsConfig, ?], Ads, Ads]]`. It ain't gonna be pretty because of all the liftings:

```scala{4,7-8,12,14}
// we need to lift our State into F now
def filterAdsT[F[_]: Applicative](city: City) = StateT[F, Ads ,Ads](
    _.partition(!_.target.contains(city))
    .pure[F])

val program: StateT[ReaderT[IO, AdsConfig, ?], Ads, Ads] = for {
  location <- StateT.liftF[ReaderT[IO, AdsConfig, ?], Ads, City](
                ReaderT.liftF[IO, AdsConfig, City](
                  userLocation()
                )
              )
  shouldTarget <- StateT.liftF[ReaderT[IO, AdsConfig, ?], Ads, Boolean](
                    needTargeting
                  .lift[IO])
  ads <- if (shouldTarget) filterAdsT[ReaderT[IO, AdsConfig, ?]](location)
         else StateT.get[ReaderT[IO, AdsConfig, ?], Ads]
} yield ads

program.runA(ads).run(AdsConfig(targeting = true)).unsafeRunSync()
// List(Ad(http://a,Some(paris)), Ad(http://c,Some(paris)))
```

This is what stacking monads/effects is. Monad Transformers _simplify_ this a bit (they already wrapped a Monad) but we are not going that far nonetheless. It's too cumbersome.

Multiple ways exist to simplify how to write stacking:

- The free monad
- [djspiewak/emm](https://github.com/djspiewak/emm): A general monad for managing stacking effects
- [atnos-org/eff](https://github.com/atnos-org/eff): Extensible effects are an alternative to monad transformers for computing with effects in a functional way.
- [typelevel/cats-mtl](https://github.com/typelevel/cats-mtl) Using typeclasses! The one we'll care about.

## Final tagless style: the F effect

As we said, using typeclasses makes the developer do not care what the implementation is: here we're talking about `ReaderT`, `StateT`, `IO`.
We'll code using abstractions only provided by cats-mtl and some minor refactoring.

Doing this, we will:

- avoid lifting everything.
- dispatch and hide the massive boilerplate.
- have a unique Effect `F[_]` in our program that will be the combination of types (the stack) behind the scene, but still abstract.

First, we encode the effect into our function instead of relying on concrete types (`StateT`, `IO` etc.), and we make sure `F` is the return type:

```scala
def needTargeting[F[_]](implicit F: ApplicativeAsk[F, AdsConfig]): F[Boolean] =
  F.reader(_.targeting)
def filterAds[F[_]](city: City)(implicit S: MonadState[F, Ads]): F[Ads] =
  S.inspect(_.filter(_.target.contains(city)))

def getAllAds[F[_]: Sync](): F[Ads] = ???
def userLocation[F[_]: Sync](): F[City] = ???
def renderAds[F[_]: Sync](ads: Ads): F[Unit] = ???
```

The `F[_]` will be provided by the "super-stacked-type" later.

Note the usage of `ApplicativeAsk` and `MonadState`: they are typeclasses only (representing `Reader` and `State`). They only impose `F[_]` to have some features, no matter its form: we only need this, nothing more. That's exactly where the power of typeclasses comes from.

## Typeclasses all the way down

Then, we create our whole program asking for all the requirements on `F[_]`: to be `Sync`, to have the ability to read from `AdsConfig`, and to deal with a state, because that's what our little functions need:

```scala
def program[F[_]: Sync: ApplicativeAsk[?[_], AdsConfig]: MonadState[?[_], Ads]]: F[Unit] = {
  for {
    location <- userLocation[F]()
    allAds <- getAllAds[F]()
    shouldTarget <- needTargeting[F]
    ads <- if (shouldTarget) filterAds[F](location) else allAds.pure[F]
    _ <- renderAds[F](ads)
  } yield ()
}
```

All our function depends upon `F` now: the code is quite clear, don't you think?

It does compile, because all methods returns the same monad `F`.

## A transparent stacking

At the end of the world, we must finally provide what is `F[_]`.

We take back our work from previously, and just submit the stack of types. And look, we can even change the order in the stack, it does not matter:

```scala
type Effect[A] = StateT[ReaderT[IO, AdsConfig, ?], Ads, A]
val app: Effect[Unit] = program[Effect]
app.run(ads).run(AdsConfig(targeting = true)).unsafeRunSync()

type OtherEffect[A] = ReaderT[StateT[IO, Ads, ?], AdsConfig, A]
val app2: OtherEffect[Unit] = program[OtherEffect]
app2.run(AdsConfig(targeting = true)).run(ads).unsafeRunSync()
```

[[warning]]
|About the "it does not matter": it does! I've been lucky enough because it's not true in general. Look out for [/u/SystemFw](https://www.reddit.com/r/scala/comments/97s9bc/types_never_commit_too_early/e4llc6b/) comments on Reddit about the why.

This is particularly useful and clean, combined to the tagless final technique (where the algebras all returns `F[_]`).
It's easy to test, because the implementations can easily change, just by altering the stack of types at the root.
Note that the typeclasses instances of `program` are provided by cats-mtl (`ApplicativeAsk`, `MonadState`).

The downside is the performances are not that great because there is still a stack of `Monad`s, hence tons and tons of `flatMap`s overhead.

Fortunately, optimizations are possible, refer to this great talk by Pawel Szulc: [A roadtrip with monads: from MTL, through tagless, to BIO](https://www.youtube.com/watch?v=QM86Ab3lL20).
We'll quickly show them here, but don't forget to watch this talk!

## No more stacking

The idea to remove the stacked monads, is to declare independent instances of the needed typeclasses.

As a reminder, our program has these constraints:

```scala
def program[F[_]: Sync: ApplicativeAsk[?[_], AdsConfig]: MonadState[?[_], Ads]]: F[Unit] = ???
```

We forget about cats-mtl instances and declare our owns.
We can write an `ApplicativeAsk` to read our config (replace the `.run(config)`):

```scala
def constantConfig[F[_]: Applicative, E](e: E) = new DefaultApplicativeAsk[F, E] {
  override val applicative: Applicative[F] = Applicative[F]
  override def ask: F[E] = e.pure[F]
}
implicit val config = constantConfig[IO, AdsConfig](AdsConfig(targeting = true))
```

Our execution becomes:

```scala
// we are just left with the State monad which wraps the IO monad
program[StateT[IO, Ads, ?]].run(ads).unsafeRunSync()
```

We can also implement a basic non thread-safe `StateMonad` (watch for the talk for an thread-safe version), and provide an implicit with the given state directly:

```scala
case class SimpleState[F[_]: Monad, S](var state: S) extends DefaultMonadState[F, S] {
  override val monad: Monad[F] = Monad[F]
  override def get: F[S] = Applicative[F].pure(state)
  override def set(s: S): F[Unit] = (state = s).pure[F]
}
implicit val st = SimpleState[IO, Ads](ads)
```

Our execution becomes trivial:

```scala
// we are just left with the IO monad
program[IO].unsafeRunSync()
```

The monad stack is gone! Everything is provided by typeclasses, the hierarchy is flat, no `flatMap`s overhead, we are good.

And the best: we didn't alter our function at all, just the initialization code. Therefore, it's easy to iterate: from monad transformers (performance penalty), to custom typeclasses implementations.

Conclusion: never commit to custom types in functions, because you don't know how the caller is going to process your result. Embed everything into an `F[_]` effect, require what you need through typeclasses, and let it fulfill the void.

# Conclusion

We talked about a lot of things in this series, because types form a huge huge world.

- We are coding in Scala so we love enforcing types.
- Using the free theorems, we have shown that it's always better to enforce the bare minimum types in our functions and algebras by using polymorphism, generic effects `F[_]`, and typeclasses.

Unfortunately, because of Scala/JVM quirks, it's always possible to go "beyond" what the types state and use un-Pure-Functionnal-Programming features (`null`, `throw`, side-effects, non-total functions..). This is why we should forget about those, and always code: **Total & Deterministic & Side-Effects free functions**.

Respecting PFP, the types convey only what's possible. It's easier to read and understand. The scope of possible actions is smaller, and we don't have to think about implementation details. Types are documentation: comments and function names are often out of date. Types are never out of date.

- Using typeclasses prevent library-collisions-of-types-doing-the-same (`Task`s, `Future`, `IO`) that need conversion overheads when multiple functions, each using a different implementation, needs to work together. Combined to a Tagless Final style, typeclasses are a very good alternative to stacking Monad Transformers: improve readability, maintenance, and performance (by removing the stack). [cats-mtl](https://github.com/typelevel/cats-mtl) implements most of the classic Monad Transformers as typeclasses (`ReaderT`, `WriterT`, `StateT`, ...).

The only downside of typeclasses is their non-specialization. When we need specific features from a given implementation, we can either commit to this implementation (we generally do), or we can write our own typeclass to be consistent with the rest and avoid disgraceful lifting or conversions (and still keep a `F[_]: SuperFeature`).

- Finally, we noticed that all typeclass implementations are not equivalent: some can be faster, but some can be buggier. Your code, your tests, your decision.