---
title: "Types: Never commit too early"
description: "Committing early to an implementation can lead to complex refactorings and make the code harder to reason about. Often, depending on a typeclass (declaring a limited capability) is a better choice: you defer the choice of implementation to the caller."
date: "2018-08-15T12:00Z"
is_blog: true
path: "/articles/2018/08/15/types-never-commit-too-early/"
language: "en"
tags: ['scala', 'cats', 'scalaz', 'typeclass', 'tagless final', 'mtl']
category: 'Scala'
background: 'Evan_and_friends_at_halloween.jpg'
---

I remember a year ago, I was arguing with my colleague: he wanted to use `Task` (from Monix) in some function because `Task` is great and offer tons of features. I wanted to use `F[_]: Sync` because I didn't want to commit too early.

I may have trust issues, but I don't like to commit too early when it's not necessary.

Since a while now, the community talks about the _tagless final_ encoding (great [posts](https://typelevel.org/blog/2018/05/09/tagless-final-streaming.html) on [typelevel](https://typelevel.org/blog/2017/12/27/optimizing-final-tagless.html), on [scalac.io](https://blog.scalac.io/exploring-tagless-final.html), on [SoftwareMill](https://softwaremill.com/free-tagless-compared-how-not-to-commit-to-monad-too-early/)) where you write an algebra and let the effect type be a `F[_]`. This is the same thing: you don't want your algebra to depend on a specific effect implementation because it's orthogonal to what your algebra is dealing with (a specific domain).

This algebra deals with what we can do with _items_, the effect does not matter, it can be `Id`, `IO`, `Task`, who cares (the caller):

```scala
trait ItemRepository[F[_]] {
  def findAll: F[List[Item]]
  def find(name: ItemName): F[Option[Item]]
  def save(item: Item): F[Unit]
  def remove(name: ItemName): F[Unit]
}
```

We won't talk that much about tagless final but more about the general case: function encodings.
We'll take a tour about the typeclasses usage, advantages and downsides, and will make our way to un-stack monad-transformers stack.

Committing to an implementation can have an impact on dependents applications: the need to refactor, the need to add libraries, add converters, lifting the types. It can also have an impact on performance, it can even break at runtime, depending on which implementation is used.

TOC

# Two Pine Trees

I remember years ago, we were using `Future` in our codebase (yikes!) then we added a library working with `Task` from scalaz. Therefore we needed to convert them back and forth. We were not the only ones to have this issue: this project [verizon/delorean](https://github.com/Verizon/delorean) deals with this very same problem.

The API is quite simple:

```scala
val f: Future[Foo] = ???
val t: Task[Foo] = f.toTask
val f2: Future[Foo] = t.unsafeToFuture
```

It provides an isomorphism between `Task` and `Future`. The implementation is quite straight-forward for experimented developers, but can be intimidating when you're not fluent in Scala yet, hence this library was a good idea.

But the point is that because we had to deal with `Task`, we had to add another dependency, and add code here and there (or add some implicits) to make it work. This is not practical, can lead to bugs, and add overhead everywhere. We couldn't just move all our code from `Future` to `Task` right? What if some other library were using `Future`?

The library was not about asynchrony, therefore it should not have expose us some scalaz's `Task` (even if this was a good thing!) and let us work with `Future` because our codebase was using it: this concept (the effect used) was orthogonal to the library's purpose.

# Connascence of Type

When coding, we must always follow the principle of the least power.

The less you can do in a function, the easiest to implement it and to reason about it. Your mind is focused on the function parameters and nothing else. This is why environments which work with global variables and functions are the worst. They are not given as parameter of your function, but you can use and invoke them "by magic".

You must have the world in your mind when coding a small function, it's not reassuring and moreover, it's difficult!
You need to rely on documentation to know what is possible, understand where the parameters come from etc. We know documentations are always up-to-date right?

We want to reduce the [connascence of type](https://en.wikipedia.org/wiki/Connascence#Connascence_of_Type_(CoT)) to the maximum. We want to [decouple](https://en.wikipedia.org/wiki/Coupling_(computer_programming)) our code from implementations the most. Why code my function for a `String` if polymorphism is enough? (`def f[A](a: A)`). Why code my function with a `Future` if `F[_]` is enough? (`def f(a: A): F[A]`)

> Types are documentation —Tony Morris

People who implement libraries must commit only to use the bare minimum for their libraries to do their job.
They should abstract upon what is not their core. We don't want to fall into the case I described previously with `Future` and `Task`.

It's not only reserved for library implementers: any application we develop should follow this principle. We all have colleagues (or our future-self) who are going to read and understand the code later on (and during the code review). Therefore their effort should be made easy the more we can.

# Free Theorems

When you read a function signature, ask yourself this question: what this function can do?

```scala
def something[A](a: A): A = ???
```

There is only one possible implementation here.

Just look at the types and ask yourself. The simpler the types, the easiest to answer the question, without referring to the implementation. A simple type is a type with a few instances only (ie: has a low complexity).

## Types Complexity

- `Boolean` is a simple type: it can only be `true` or `false`.
- `String` has a infinite complexity.
- Co-products (sum-types) can be easy to reason about:

```scala
trait Furniture
case object Chair extends Furniture
case object Table extends Furniture
```

A `Furniture` has only 2 instances.

A more complete ADT with mix of products and co-products can be more difficult to reason about, for the same reason as mentioned:

```scala
trait Furniture
case class Chair(size: (Double, Double)) extends Furniture
case class Table(height: Double, chairs: List[Chair]) extends Furniture
```

The complexity increases because `Chair` and `Table` are products.

## Polymorphism helps

The polymorphism of a function helps understanding what it does: its parametricity tells us what the function can and cannot do:

```scala
def something[A](in: List[A]): List[A]
```

This function cannot create new element `A`. It works at the container level. It can only return an empty list or a list with some or all the elements of the original list (like reverse them). It cannot do anything else, it cannot manipulate the elements themselves: `A` has no method associated with!

Compared this to:

```scala
def something(in: List[String]): List[String]
```

This function can do anything beyond our imagination. It create elements, alter the existing elements, split each items by words: we have no idea!

Polymorphism is a way to limit what functions can do. It can be complicated to read, because it can be so abstract.

This is an example of [`Parallel.parTraverse`](https://github.com/typelevel/cats/blob/master/core/src/main/scala/cats/Parallel.scala#L130) in cats:

```scala
def parTraverse[T[_]: Traverse, M[_], F[_], A, B]
  (ta: T[A])(f: A => M[B])(implicit P: Parallel[M, F]): M[T[B]] = {
    val gtb: F[T[B]] = Traverse[T].traverse(ta)(f andThen P.parallel.apply)(P.applicative)
    P.sequential(gtb)
  }
```

It take 5 type parameters and combine the whole thing to return a `M[T[B]]`.

- It has no idea what `A` and `B` are: it doesn't care.
- It knows `T` has the `Traverse` capability (`Traverse[T].traverse`)
- It knows it exists an instance of `Parallel[M, F]`.

That's it. You can't do _much_ with that right? But thanks to this, anyone satisfying those constraints (just 2) can call this function: it will work! The compiler will make sure of it.

Would you have prefered the function to be the following, all types explicit?

```scala
def parTraverse[A, B](ta: List[A])(f: A => Option[B]): Option[List[B]] = {
  val p = Parallel.identity[Option]
  val gtb: Option[List[B]] = ta.traverse(f andThen p.parallel.apply)(Applicative[Option])
  p.sequential(gtb)
}

parTraverse(List(1, 2, 3))(Some(_)) // Some(List(1, 2, 3))
```

Yes, it works! ... But only for a `List` and `Option`. It's not very open, I won't use it.

Whereas I can use the original with anything:

```scala
// Try and Task
Parallel.parTraverse(Try("good"))(Task.eval(_)).runSyncUnsafe(Duration.Inf)
// Success(good)

// List and Either[Int, String]
val x: Either[Int, List[String]] = Parallel.parTraverse(List(1, 2, 3))(_.toString.asRight[Int])
// Right(List(1, 2, 3))
```

My advice: write a version without polymorphism first, then try to generalize it by adding more polymorphism (later, directly go to the polymorphism step, less to type!). You'll probably stumbled upon functions you were calling you can't anymore on `F[_]`: this is where you switch to typeclasses.

## Induction

Philip Wadler studied the types in [Theorems for free!](http://ttic.uchicago.edu/~dreyer/course/papers/wadler.pdf) (also see [Free Theorems Involving Type Constructor Classes](http://www.janis-voigtlaender.eu/papers/FreeTheoremsInvolvingTypeConstructorClasses.pdf)).

From a given function, you can deduce theorems on what it can do according to the types (input and output) used.

In any language, relying on types is the best way to have a strong understanding of a program: function names and comments are easily out of date, we should rarely rely on them. This is why it's complicated to understand programs in dynamic-typed languages. :troll:

Unfortunately, Scala (the JVM) has some _features_ that allows us to create edge cases going against some theorems. Think about `null` or `throw`: we could return `null` or throw an exception in our previous example:

```scala
def something[A](in: List[A]): List[A]
```

The types don't show it, but it's a possibility: subtle edge cases to handle.

In Scala, the `null` case is never even considered. It's never checked in code that the argument or result are not `null`. It's expected that we never ever use `null` in Scala (`Option` exists to expose the fact something is nullable).

## Pure Functional Programming

This is where we encounter the _Pure Functional Programming_ (PFP) principles, where functions must be:

- **Total**: the behavior should be explicit just by looking at the types:

```scala
// Those are NOT total

def f[A](a: A): Boolean = a match { case String => true }
// What happens on f(5) ???
// It's not visible in the function signature!

sealed abstract class Option[+A] {
    def get: A
    ...
}
None.get // AH! Are we getting an A?
```

- **Deterministic**: the same call should return the same result:

```scala
// Those are NOT deterministic

def f(a: Int): Boolean = if (Math.random() > 0.5) true else false
// is f(1) true or false?
```

- **Side-effects free**: nothing outside of the scope of the function should be altered:

```scala
// Those are NOT side-effect free

def f(a: Int): Boolean = { println(s"a=$a"); a > 0 }
```

`f(1)` returns true AND alter stdout. But it's not explicit in the types!

```scala
var c = 0
def f(): Boolean = { c += 1; c }
// f()
// => 1
// f()
// => 2
```

The same call returns different values and alter the outer scope. It's difficult to reason about.
It's not referentially transparent:

```scala
println(f())
println(f())

// has a different outcome than:

val a = f()
println(a)
println(a)
```

If we follow those 3 rules, we unblock some achievements:

- it's easier to reason about the program, about the functions: the types don't hide anything.
- it's easier to compose: small primitives goes into bigger and so on. All the types must be composed: nothing can be lost along the way, nothing can be hidden.
- it provides bug-free refactoring: the behavior can't be altered if everything is referentially transparent.
- it allows for better concurrent programming: no shared state.

Those constraints make it difficult to work with Scala/Java/the JVM because we have "features" which do not follow those principles. [Tom Morris suggested a subset of features to remove in Scala](http://data.tmorris.net/talks/parametricity/4985cb8e6d8d9a24e32d98204526c8e3b9319e33/parametricity.pdf).
It's implemented through [scalaz/scalazzi](https://github.com/scalaz/scalazzi) which will fail the compilation if non-PFP features are used: `null`, `throw`, mutable collections, side-effect functions not wrapped into `IO`...

## Automatic implementation generation

If a program follows PFP principles, we can rely on the [Curry-Howard correspondence](https://en.wikipedia.org/wiki/Curry%E2%80%93Howard_correspondence): types are theorems, programs are proofs.

It's powerful and beyond my comprehension. A well-known talk is the one from Philip Wadler: [Propositions as Types](https://www.youtube.com/watch?v=aeRVdYN6fE8) where it explains the links between logic, mathematics, and type theory.

In a more pragmatic way, there is a library based on this correspondence, which provides a macro to generate the implementation of any function, just by following its types: [chymyst/curryhoward](https://github.com/Chymyst/curryhoward).

```scala
def f[X, Y](x: X, y: Y): X = implement
def g[X, Y](x: X, y: Y): Y = implement
f(5, "foo") // 5
g(5, "foo") // "foo"
```

It works for more complex examples:

```scala
case class Person(name: String, friends: List[Person])

def f(p: String): Person = implement
f("john")
// Person(john, List())

// we can look at the implementation:
// f.lambdaTerm.prettyPrint
// a ⇒ Person2(a, (0 + Nil()))
```

But it's not magic, it can't be sure what's you're thinking about:

```scala
def addFriend(p: Person, p2: String): Person = implement
addFriend(f("john"), "henry")
// Person(henry, List())
```

As we said, we can never rely on function names!

If we declare the function as a value, we stumble upon more troubles:

```scala
val addFriend: (Person2, String) => Person2 = implement

Error:(28, 49) type (Person2, <c>String) ⇒ Person2 can be implemented in 2 inequivalent ways:
 a ⇒ a._1 [score: (0,10000,0,0,0)];
 a ⇒ Person2(a._2, (0 + Nil())) [score: (0,10000,0,0,0)].
```

The resolver find two ways (he's right about that! but it also misses other ones) and can't decide (it's based on heuristics). TIMTOWTDI.

On a last note, we can use it to implement some typeclasses without thinking twice:

```scala
case class Person[A](id: A)

implicit val fperson = new Monad[Person] {
  override def flatMap[A, B](fa: Person[A])(f: A => Person[B]): Person[B] = implement
  override def pure[A](x: A): Person[A] = implement
  override def tailRecM[A, B](a: A)(f: A => Person[Either[A, B]]): Person[B] = ???
}
for {
  id <- 5.pure[Person]
  p <- Person(id + 100)
} yield p
// Person(105)
```

It's not perfect, but it's a very nice proof-of-concept. For instance, here, it couldn't implement `tailRecM` (it's not an easy one).

All that to say: provide simple types to your function, it makes it easier to know what it does and how it's implemented.

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

Note the usage of `ApplicativeAsk` and `MonadState`: they are typeclasses only (representing `Reader` and `State`). They only impose `F[_]` to have some features, no matter its form: we only need this, nothing more. That's exactly where the power of typeclasses come from.

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

This is particularly useful and clean, combined to the tagless final technique (where the algebras all returns `F[_]`).
It's easy to test, because the implementations can easily change, just by altering the stack of types at the root.
Note that the typeclasses instances of `program` are provided by cats-mtl (`ApplicativeAsk`, `MonadState`).

The downside is the performance are not that great because there is still a stack of `Monad`s, hence tons and tons of `flatMap`s overhead.

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

// No problem, IO is stack-safe
arrayFill[IO]((1 to 100000).toArray)(0).unsafeRunSync()

// No problem, Eval (type State[S, A] = StateT[Eval, S, A]) is stack-safe
arrayFill[State[Int, ?]]((1 to 100000).toArray)(0).unsafeRunSync()

// We grab some Sync[StateT[Id, Int, ?]], notice the usage of Id, nothing is stack-safe here
implicit val stateSync = new Sync[StateT[Id, Int, ?]] {
  override def suspend[A](thunk: => StateT[Id, Int, A]): StateT[Id, Int, A] = thunk
  override def flatMap[A, B](fa: StateT[Id, Int, A])(f: A => StateT[Id, Int, B]): StateT[Id, Int, B] = fa.flatMap(f)
  override def pure[A](x: A): StateT[Id, Int, A] = StateT.pure(x)
  // ...
}

// BOOM! Exception in thread "main" java.lang.StackOverflowError
arrayFill[StateT[Id, Int, ?]]((1 to 1000).toArray)(0).run(0)
```

No having stack-safety (via trampolining internally) is a no-go. Watch out for what you are using. You wouldn't like to get a production crash because of some customer having an too long array of whatever data.

Hopefully, all implementations in cats, scalaz, monix, and similar quality projects have our back, and everything is stack-safe. (it was not always the case, see [make IndexedStateT stack safe](https://github.com/typelevel/cats/pull/2187) for instance)

# Conclusion

We talked about a lot of things, because types is a huge huge world.

- We are coding in Scala so we love enforcing types.
- Using the free theorems, we have shown that it's always better to enforce the bare minimum types in our functions and algebras by using polymorphism, generic effects `F[_]`, and typeclasses.

Unfortunately, because of Scala/JVM quirks, it's always possible to go "beyond" what the types state and use un-Pure-Functionnal-Programming features (`null`, `throw`, side-effects, non-total functions..). This is why we should forget about those, and always code: **Total & Deterministic & Side-Effects free functions**.

Respecting PFP, the types convey only what's possible. It's easier to read and understand. The scope of possible actions is smaller, and we don't have to think about implementation details. Types are documentation: comments and function names are often out of date. Types are never out of date.

- Using typeclasses prevent library-collisions-of-types-doing-the-same (`Task`s, `Future`, `IO`) that need conversion overheads when multiple functions, each using a different implementation, needs to work together. Combined to a Tagless Final style, typeclasses are a very good alternative to stacking Monad Transformers: improve readability, maintenance, and performance (by removing the stack). [cats-mtl](https://github.com/typelevel/cats-mtl) implements most of the classic Monad Transformers as typeclasses (`ReaderT`, `WriterT`, `StateT`, ...).

The only downside of typeclasses is their non-specialization. When we need specific features from a given implementation, we can either commit to this implementation (we generally do), or we can write our own typeclass to be consistent with the rest and avoid disgraceful lifting or conversions (and still keep a `F[_]: SuperFeature`).

- Finally, we noticed that all implementations are not equivalent. Some can be faster, but some can be buggier. Your code, your tests, your decision.