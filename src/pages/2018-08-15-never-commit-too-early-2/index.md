---
title: "Types: Never commit too early - Part 2: How typeclasses save us"
description: "Typeclasses allow us to not commit too early to an implementation and simplify the scope of what a function can do. Even better, it's easy to provide a better (faster) implementation without hassle."
date: "2018-08-15T13:00Z"
is_blog: true
path: "/articles/2018/08/15/types-never-commit-too-early-part2/"
language: "en"
tags: ['scala', 'cats', 'scalaz', 'typeclass', 'tagless final', 'mtl']
category: 'Scala'
background: 'Original_Deus_ex_wallpaper.jpg'
---

This article is part of a series:

- [Part 1: The Free Theorems](/articles/2018/08/15/types-never-commit-too-early-part1)
- Part 2: How typeclasses save us
- [Part 3: Stacking Monad Transformers without stack](/articles/2018/08/15/types-never-commit-too-early-part3)

---

As we saw in [part 1](/articles/2018/08/15/types-never-commit-too-early-part1), it's always better to enforce the bare minimum types in our functions and algebras by using polymorphism and generic effects `F[_]`.

Unfortunately, because of Scala/JVM quirks, it's always possible to find edge-cases and do things outside of what the types convey (`null`, `throw`, side-effects, non-total functions..). A best-practice is to code **Total & Deterministic & Side-Effects free functions** (Pure Functionnal Programming), for ensure the types convey exactly what's the functions can do. Types are documentation.

We'll see how typeclasses help us to get away from specific implementations and abtract our functions even more. Also, we'll be careful with the implementations used behind those typeclasses: they could not act all in the same way (performance, stack-safety).

TOC

# Typeclasses to the rescue

Let's focus on specific examples to clear our mind.

We'll take a look at some cats-effect typeclasses, but all the reasonings are valid for any typeclasses.

## Be Coherent

Typeclasses should be (locally or globally) _coherent_. It means we should find only one instance for a given type in a given (local) scope, for a deterministic implicit resolution.
It's a difficult problem with workarounds right now.

Often a typeclass extends another one (like `Monad > Applicative > Functor`), therefore if you have two typeclasses with a same parent in scope, you don't have coherence.

In this example, which `.map` should the compiler pick? It exists in `Monad` and `Traverse`:

```scala
def transform[F[_]: Monad: Traverse](x: F[A], f: A => A) = { ... x.map(f) ... }
```

Typeclasses coherences is a very hot topic, feel free to wander:

- [Allow Typeclasses to Declare Themselves Coherent dotty/#2047](https://github.com/lampepfl/dotty/issues/2047)
- [What kind of typeclass coherence should we support? dotty/#4234](https://github.com/lampepfl/dotty/issues/4234)
- [Coherence Domains in Scala](https://gist.github.com/djspiewak/9f6feadab02b16829c41484b394d16e4)
- [Local Coherence from the Scala Typeclass proposal](https://github.com/dotty-staging/dotty/blob/add-common/docs/docs/reference/extend/local-coherence.md)
- [Type classes: confluence, coherence and global uniqueness](http://blog.ezyang.com/2014/07/type-classes-confluence-coherence-global-uniqueness/)

## Be in Sync with the Postel's law

> Be conservative in what you send, be liberal in what you accept —Postel's law

In my previous job, I wanted to replace all our `Future` or `Task` by `F[_]: Sync`.

`Sync` is a typeclass providing the capability of deferring some execution. Anyone can implement this trait with its own type. We can find `Sync` instances for [`cats IO`](https://github.com/typelevel/cats-effect), [`monix Task`](https://github.com/monix/monix), [`ZIO`](https://github.com/scalaz/scalaz-zio), [`BIO`](https://github.com/LukaJCB/cats-bio), [`UIO`](https://github.com/LukaJCB/cats-uio). It's not only used for asynchronous execution: we also have instances for monad transformers (if their inner monad has a `Sync`) `EitherT`, `OptionT`, `WriteT`, `StateT` etc.

Here is the description of `Sync` (from cats 1.x):

```scala
trait Bracket[F[_], E] extends MonadError[F, E] { ... }
trait Sync[F[_]] extends Bracket[F, Throwable] {
  def suspend[A](thunk: => F[A]): F[A]
  def delay[A](thunk: => A): F[A] = suspend(pure(thunk))
}
```

Basically, it just _lazifies_ some execution using a thunk (and provides some cleanup with its parent `Bracket` which is monadic).

Unfortunately, there is no `Sync` instance of `Future` because it wouldn't be lawful (would not respect the law `Sync` needs to respect): `Future` being not lazy, it can't defer an execution.

```scala
val f = Future { Thread.sleep(1000) }
Sync[Future].suspend(f) // f is already started, suspend have no effect!
```

This goes against `Sync`'s laws.

As an alternative, we could build a `Sync` instance over another thunk `() ⇒ Future[A]` to force the suspension:

```scala
type LazyFuture[A] = () => Future[A]
implicit val futureSync = new Sync[LazyFuture] { ... }

val f = () => Future { Thread.sleep(1000) }
Sync[LazyFuture].suspend(f) // it works because the Future didn't start yet
```

Yes, that's ugly. No-one should use `Future` because it's eager and not referentially-transparent, making it hard to know what's going on and is bug-prone.

We prefer relying on `IO` or `Task` from the Scala ecosystem which are lazy by nature, and referentially-transparent.

But better: we prefer relying on `Sync` and let the caller use `IO` or `Task` as they want!

```scala
def specific[A](a: A): Task[A] = Task.eval(a)
specific(5).runSyncUnsafe(Duration.Inf) // Task only

def generic[A, F[_]: Sync](a: A): F[A] = Sync[F].delay(a)
generic[Int, Task](5).runSyncUnsafe(Duration.Inf) // Task!
generic[Int, IO](5).unsafeRunSync()  // IO!
generic[Int, OptionT[IO,?]](5).value.unsafeRunSync() // OptionT[IO, Int]!
```

As you can see, the code is not that much different, but it's more powerful, and follow the Postel's law: we are liberal in what we accept! "Just give me a `Sync` contract, and I'll work with you".

It also reduces drastically what the function can do. `Sync` has less features than `Task` which is a full-blown class: it can run the execution, memoize, add async boundaries, add callbacks on lifecycle changes, etc.

If you don't need those features in your function, why use `Task` inside? Use the least power you can.
If you need more power, use more powerful typeclasses.

## Bracket, LiftIO, Async, Effect, Concurrent, ConcurrentEffect

Instead of knowing all implementations that can run a computation, it's useful to know which typeclasses to use instead (here, focusing on [cats-effect](https://github.com/typelevel/cats-effect)), and let the callers decide upon the implementation (it can get back to the root of the program!).

The typeclasses in cats-effect are particularly useful because a program always needs some form of computation effect, therefore it's quite ubiquitous to use them.

All of them are used the same way as we saw with `Sync`. They just provide more or less features to deal with sync/async executions, and all are `Monad`s to `flatMap` the hell out of them.

Here is a small overview of what's possible:

- `Bracket`: it's the loan-pattern in FP (to manage auto-cleaning of resources):

```scala
def countLines[F[_]](filename: String)(implicit F: Bracket[F, Throwable]): F[Long] = {
  F.bracket(F.pure(Files.newBufferedReader(Paths.get(filename))))
           (br => F.pure(br.lines().count()))
           (br => F.pure(br.close()))
}
countLines[IO]("build.sbt").unsafeRunSync() // 33

// Note that we could use `Resource.fromAutoCloseable` to deal with BufferedReader
```

The cleanup logic is "embedded" into the result: no need to think about it anymore. This is a wonderful abstraction, no need of variable in the outer scope of `try`, of `finally { if (f != null) f.close(); }` and so on.

- `LiftIO`: transform any cats `IO` to the desired effect. Necessary for "bridges".

```scala
val t: Task[Unit] = LiftIO[Task].liftIO(IO(println("Hello")))
```

- `Async`: trigger an async execution. It provides us a callback to call when our execution is "done". `IO.fromFuture` uses this by registering to `Future.onComplete` and _callbacking_.

```scala
// Sorry for the Thread.sleep, trying to keep it simple :-)
def wait[F[_]: Async](ms: Int): F[Unit] = Async[F].async { cb =>
  Thread.sleep(ms)
  cb(Right())
}

wait[IO](2000).unsafeRunSync()
wait[Task](2000).runSyncUnsafe(Duration.Inf)
```

- `Effect`: a super `Async` that can run the effect, and still wraps the result into `IO[Unit]`, referential-transparency abided.

```scala
def printAsync[F[_]: Effect, A](x: F[A]): IO[Unit] = Effect[F].runAsync(x) { result =>
  IO(println(s"Result: $result"))
}
printAsync(IO("hello")).unsafeRunSync() // Result: Right(hello)
```

Previously, we could also call `runSyncStep` to evaluate steps until an async-boundary, but [that will probably be gone soon](https://github.com/typelevel/cats-effect/issues/299), but nevermind.


- `Concurrent` is `Async` with computations race and cancellation:

```scala
// Runs an effect and timeout after `d` if not done yet
def fast[F[_], A](x: F[A], d: FiniteDuration)(implicit F: Concurrent[F], tim: Timer[F]): F[A] =
  F.race(x, tim.sleep(d)).flatMap {
    case Left(value) => F.pure(value)
    case Right(_) => F.raiseError(new Throwable ("Too late!"))
  }
```

Usage:

```scala
val sleep: IO[Unit] = IO(Thread.sleep(10000))

fast(sleep, 500 millis).unsafeRunSync()
// Exception in thread "main" java.lang.Throwable: Too late!

// we must provide a `Timer[EitherT]`, only `Timer[IO]` is in scope by default
implicit val t = Timer.derive[EitherT[IO, Error, ?]]
val x: EitherT[IO, Error, Unit] = fast(EitherT.liftF(sleep), 500 millis)
x.value.unsafeRunSync()
// Exception in thread "main" java.lang.Throwable: Too late!
```

The other usage is to create cancellable computations:

```scala
val work: IO[Int] = Concurrent[IO].cancelable[Int] { cb =>
  val atom = AtomicBoolean(true)
  // we call "cb" when computation is done
  Future(Thread.sleep(1000)) andThen { case _ => if (atom.get) cb(Right(10)) }
  
  // cancel logic as result
  IO(println("cancel!")) *> IO(atom.set(false))
}

// Note the IO[IO[Unit]]]
// It's a computation producing another IO: the "cancellation trigger"
val start: IO[IO[Unit]] = work.runCancelable {
  case Left(ex) => IO(println(s"Left: $ex"))
  case Right(i) => IO(println(s"Right: $i"))
}
```

The previous code was just declarative, now we start the computation:

```scala
val cancelComputation: IO[Unit] = start.unsafeRunSync()

// if we don't call cancelComputation.unsafeRunSync()
// Right: 10

// if we call cancelComputation.unsafeRunSync()
// cancel!
```

- `ConcurrentEffect`: finally, this one is `Concurrent` with the possibility to start a cancellable computation (as we did on `IO`).

- `SyncIO`: was committed a week ago, stay tuned! :-)

## Capabilities: separation of concerns

Typeclasses represents _capabilities_.

```scala
def program[A, F: Console: Async: DbAccess: Permissions: Drawable](p: F[A]) = ???
```

Here, `program` expect multiple features/capabilities that `F` must have to be executed. In an eyeblink, you know this function will do IOs, async stuff, access to the DB, check permissions, and draw something. All are different concerns that can be implemented as the caller want. It's like SOLID OOP programming where you refer to interfaces, not to implementations.

The difference is that we're dealing only with typeclasses: no inheritance, implicitly resolved, applied to functions.

We'll see how important this is when we are going to stack monads.

To avoid having tons of required "capabilities" in our functions, they should be split apart and deal with the minimal set of features (Single Responsability Principle). The only "big" function is the main entry, where we need to provide everything, but we should soon call functions with only a few capabilities: a function that uses `DbAccess` should not rely on `Drawable` (except to pass it on nested functions):

```scala
def program[A, F: Console: Async: DbAccess: Permissions: Drawable](p: F[A]) = for {
    _ <- accessDb
    _ <- draw
    ...
} yield ()

def accessDb[F[_]: DbAccess: Async]): F[DB] = ???
def draw[F: Drawable]: F[Unit] = ???
```

It will be clearer for the reader (and the writer) to know what a function is dealing with, what the function can do, what the function has access to. It's easier to reason about it, because its scope is small and possibilities of actions are not endless.

This is why we have static types: to restrict what we can do, how we can combine them. Having generics `A` is a step even further: you can't do anything with them. Typeclasses exist to be able to act on such types, by just providing some operations.

If you take `String` for instance, you can do so many things with it it's not funny. But if you just provides `A: Show` to a function, you know it can only stringify the value behind `A` (call `.show()` on it).

John A De Goes demonstrates this in [FP to the Max](https://www.youtube.com/watch?v=sxudIMiOo68). Check it out now if you didn't saw it yet.

## Shims: conversions between typeclasses

We talked a lot about cats. It can happen a project uses cats and scalaz at the same time. In this case, [djspiewak/shims](https://github.com/djspiewak/shims) provides interoperability (isomorphisms) between their typeclasses.

It's a bunch of `implicit defs` between the two ecosystems, to avoid polluting our code.

I never had the need to use it. The last time I had both of them in a codebase, I directly replaced the scalaz parts in favor of cats.
I guess in large projects, you don't have time to change everything, so shims can come in handy.

## What if you need to specialize your code?

Monix's `Task` provides several features we don't find in `Sync` or `cats-effect` typeclasses in general, such as memoization, add async boundaries, add callbacks on lifecycle changes (such as `doOnCancel`, `doOnFinish`), races & cancellation (... which are part of the `Concurrent` typeclass!) etc.

[[info]]
|• Callbacks could be handled [`Bracket`](https://typelevel.org/cats-effect/typeclasses/bracket.html) as [Jakub Kozlowski]((https://twitter.com/kubukoz/status/1029523219181522944)) suggested on Twitter<br />
|• Parallelisation by [`Parallel`](https://typelevel.org/cats/typeclasses/parallel.html)

For the sake of it, let's say there is no typeclass equivalent for our features:

```scala
def compute(a: Int, b: Int) = Task.gatherUnordered(List(
  Task(a).asyncBoundary.map(_ + 1),
  Task(b).map(_ + 1)
)).doOnFinish(_ => Task(println("finished!")))

compute(1, 2).runSyncUnsafe(Duration.Inf)

// finished!
// List(2, 3) or List(3, 2)
```

Here, it's difficult to generalize `compute` because it relies on several `Task`'s features which don't have their equivalent in typeclasses: callbacks, unordered gathering, fallback to the default `Scheduler`...

We could create our own specialized typeclasses (respect the coherence) with the methods we want:

```scala
@typeclass
trait Callbacks[F[_]] {
  def doOnFinish[A](a: F[A], cb: Option[Throwable] => F[Unit]): F[A]
}
@typeclass
trait Gather[F[_]] {
  def unordered[A](a: F[A], b: F[A]): F[List[A]]
}

def computeGeneric[F[_]](a: Int, b: Int)
                        (implicit S: Async[F], G: Gather[F],
                           C: Callbacks[F], ec: ExecutionContext): F[List[Int]] = {
  C.doOnFinish(G.unordered(
    S.delay(a).flatMap(a => Async.shift(ec).map(_ => a + 1)),
    S.delay(b).map(_ + 1)
  ), _ => S.delay(println("finished!")))
}
```

Typeclasses should have laws (internal & external), tested with Scalacheck, such as `Functor` has internal laws about its identity:

```scala
def covariantIdentity[A](fa: F[A]): IsEq[F[A]] =
    fa.map(identity) <-> fa
```

Or `Sync` has internal laws about handling errors:

```scala
def suspendThrowIsRaiseError[A](e: Throwable) =
    F.suspend[A](throw e) <-> F.raiseError(e)
```

# Modularization

We saw we always have a "core" that depends upon `F[_]` to let us use any typeclass and build any stacks on top.

A good practice when writing an application or a library is to write this abstract core in its own module and have distinct modules for implementations.

Example of a library which core contains only tagless final algebras, type aliases, and such generic constructions:

```none
lib-core    // F[_]
lib-cats-io // --> cats-effect
lib-zio     // --> scalaz
lib-monix   // --> monix
```

A project will depend upon `lib-core` and `lib-monix` (which will import monix on its own) for instance, but won't depend on the other two modules (which would provide the same function as `lib-monix`, just with a different implementation). It could also depends on `lib-core` and nothing else, and provide its own implementation. This avoids polluting dependencies of the upstream projects.

```scala
libraryDependencies ++= Seq(
  "com.company" %% "lib-core" % "1.0.0"
  "com.company" %% "lib-monix"   % "1.0.0"
)
```

Same story for HTTP frameworks providing serializers and deserializers for like circe and play-json: you use different modules because you commit only to one of those.

# All implementations are different

## Performances

We scratched the performance issue when dealing with Monad Transformers, and we successfully remove the stack by providing our own typeclass implementations.

Another factor is the implementations themselves. Their performance can largely differ. Quite some work has been done lately on the synchronous/asynchronous effects performances, due to some (good) competition between the main actors: scalaz/cats/monix.

A simple benchmark (bits taken from scalaz-zio) can shows tremendous differences to execute the same computation (abstracted by `F[_]`):

```scala
@State(Scope.Thread)
@BenchmarkMode(Array(Mode.Throughput))
@OutputTimeUnit(TimeUnit.SECONDS)
class Bench {

  @Param(Array("10000"))
  var size: Int = _

  def createTestArray: Array[Int] = Range.inclusive(1, size).toArray.reverse

  // The method we're going to evaluate with cats IO, scalaz IO, and Monix Task
  def arrayFill[F[_]: Sync](array: Array[Int])(i: Int): F[Unit] =
    if (i >= array.length) Sync[F].unit
    else Sync[F].delay(array.update(i, i)).flatMap(_ => arrayFill(array)(i + 1))

  @Benchmark
  def catsTest() = {
    import cats.effect.IO

    (for {
      array <- IO.pure(createTestArray)
      _     <- arrayFill[IO](array)(0)
    } yield ()).unsafeRunSync()
  }

  @Benchmark
  def monixTest() = {
    import monix.eval.Task
    implicit val s = Scheduler.computation().withExecutionModel(SynchronousExecution)

    (for {
      array <- Task.eval(createTestArray)
      _     <- arrayFill[Task](array)(0)
    } yield ()).runSyncUnsafe(Duration.Inf)
  }

  @Benchmark
  def scalazTest() = {
    type ZIO[A] = IO[Nothing, A]

    // we provide a bare minimum Sync[ZIO]
    // it's not available yet: https://github.com/scalaz/scalaz-zio/issues/79
    implicit val syncZio = new Sync[ZIO] {
      override def suspend[A](thunk: => ZIO[A]): ZIO[A] = IO.suspend(thunk)
      override def flatMap[A, B](fa: ZIO[A])(f: A => ZIO[B]): ZIO[B] = fa.flatMap(f)
      override def pure[A](x: A): ZIO[A] = IO.point(x)
      // ...
    }
    (for {
      array <- IO.now(createTestArray)
      _     <- arrayFill[ZIO](array)(0)
    } yield ()).run
  }
}
```

Here are the results, with scalaz-zio almost 3x times faster:

```
[info] Benchmark         (size)   Mode  Cnt     Score     Error  Units
[info] Bench.catsTest     10000  thrpt    3  2471,367 ▒  65,831  ops/s
[info] Bench.monixTest    10000  thrpt    3  2411,369 ▒  13,621  ops/s
[info] Bench.scalazTest   10000  thrpt    3  6960,302 ▒ 127,379  ops/s
```

We are not here to debate about those differences.

Our point is that if you care about performance, you should definitely bench and compare several implementations to fit your need.
The needed features can be the same (provided by the typeclass), but how it's done internally has a large impact on the end result.

The best part: it's easy to test different implementations without modifying the whole program (the typeclasses has to act the same way!), and gain performances.

## Stack Safety

Finally, it has to be taken into account that some Monad implementations can be not stack-safe.

It means that if the computations `flatMap` the hell out, it's possible for the program to crash at runtime.

If we implement a recursive method that `flatMap`s before the recursive call, we can test this out:

```scala
// our recursive method, working with F[_]: Sync
def arrayFill[F[_]: Sync](array: Array[Int])(i: Int): F[Unit] = {
  if (i >= array.length) Sync[F].unit
  else Sync[F].delay(array.update(i, i)).flatMap(_ => arrayFill(array)(i + 1))
}
```

This method sets the value of each element with its index, recursively.

We can provide any monadic `F[_]`:

```scala
// No problem, IO is stack-safe
arrayFill[IO]((1 to 100000).toArray)(0).unsafeRunSync()

// No problem, Eval (type State[S, A] = StateT[Eval, S, A]) is stack-safe
arrayFill[State[Int, ?]]((1 to 100000).toArray)(0).unsafeRunSync()

// We grab some Sync[StateT[Id, Int, ?]], notice the usage of Id, **nothing is stack-safe here**
implicit val stateSync = new Sync[StateT[Id, Int, ?]] {
  override def suspend[A](thunk: => StateT[Id, Int, A]): StateT[Id, Int, A] = thunk
  override def flatMap[A, B](fa: StateT[Id, Int, A])(f: A => StateT[Id, Int, B]): StateT[Id, Int, B] = fa.flatMap(f)
  override def pure[A](x: A): StateT[Id, Int, A] = StateT.pure(x)
  // ...
}

// BOOM! Exception in thread "main" java.lang.StackOverflowError
arrayFill[StateT[Id, Int, ?]]((1 to 1000).toArray)(0).run(0)
```

Because our last example uses `Id`, aka "nothing", `StateT` is not stack-safe. This creates a long encapsulation of `.flatMap(...flatMap(...flatMap(...)))` which explodes.

No having stack-safety (normally done via trampolining internally) is a no-go. Watch out for what you are using. You wouldn't like to get a production crash because of some customer having an too long array of whatever data.

Hopefully, all implementations in cats, scalaz, monix, and similar quality projects have our back, and everything is stack-safe. (it was not always the case, see [make IndexedStateT stack safe](https://github.com/typelevel/cats/pull/2187) for instance)

# Part 3: Stacking Monad Transformers without stack

A common issue with effects it that we need to stack them.
To do so, we rely on Monad Transformers (such as `StateT`, `ReaderT`, and so on).

As we'll this in the next and final part of this series, it's possible to stack without stack! How magic is that? [Part 3: Stacking Monad Transformers without stack](/articles/2018/08/15/types-never-commit-too-early-part3)
