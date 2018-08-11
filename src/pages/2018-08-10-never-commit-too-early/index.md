---
title: "Types: Never commit too early"
description: "Committing early to an implementation can lead to complex refactorings and make the code harder to reason about. Often, depending on a typeclass (declaring a limited capacity) is a better choice: you defer the choice of implementation to the caller."
date: "2018-08-10T12:00Z"
is_blog: false
path: "/articles/2018/08/10/never-commit-too-early/"
language: "en"
tags: ['scala', 'cats', 'scalaz', 'typeclass', 'tagless final']
category: 'Scala'
background: 'background.jpg'
---

I remember a year ago, I was arguing with my colleague: he wanted to use `Task` (from Monix) in some function because `Task` is great and offer tons of features. I wanted to use `F[_]: Sync` because I didn't want to commit too early.

I may have trust issues, but I don't like to commit too early when it's not necessary.

Since a while now, the community talks about the _tagless final_ encoding (great [posts](https://typelevel.org/blog/2018/05/09/tagless-final-streaming.html) on [typelevel](https://typelevel.org/blog/2017/12/27/optimizing-final-tagless.html), on [scala.io](https://blog.scalac.io/exploring-tagless-final.html), on [SoftwareMill](https://softwaremill.com/free-tagless-compared-how-not-to-commit-to-monad-too-early/)) where you write an algebra and let the effect type be a `F[_]`. This is the same thing: you don't want your algebra to depend on a specific effect implementation because it's orthogonal to what your algebra is dealing with (a specific domain).

Here, our algebra deals with what we can do with _items_, the effect does not matter:

```scala
trait ItemRepository[F[_]] {
  def findAll: F[List[Item]]
  def find(name: ItemName): F[Option[Item]]
  def save(item: Item): F[Unit]
  def remove(name: ItemName): F[Unit]
}
```

We won't talk much more about tagless final but more about the general case: function encodings.

Committing to an implementation can have an impact on dependents applications: the need to refactor, the need to add libraries, add converters. It can also have an impact on performance, it can even break at runtime (stack safety).

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

We want to reduce the [connascence of type](https://en.wikipedia.org/wiki/Connascence#Connascence_of_Type_(CoT)) to the maximum. We want to [decouple](https://en.wikipedia.org/wiki/Coupling_(computer_programming)) our code from implementations to the maximum. Why code my function for a `String` if polymorphism is enough? (`def f[A](a: A)`). Why code my function with a `Future` if `F[_]` is enough? (`def f(a: A): F[A]`)

> Types are documentation —Tony Morris

People who implement libraries must commit only to the bare minimum for their libraries to do their job.
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

This is where we encounter the _Pure Functional Programming_ principles, where functions must be:

- Total: the behavior should be explicit just by looking at the types:

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

- Deterministic: the same call should return the same result:

```scala
// Those are NOT deterministic

def f(a: Int): Boolean = if (Math.random() > 0.5) true else false
// is f(1) true or false?
```

- Side-effects free: nothing outside of the scope of the function should be altered:

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

If we follow those 3 rules:

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

Let's now focus on specific examples to clear our mind.

We'll use some cats-effect typeclasses in our example, but all the reasonings are valid for any typeclasses.

## Be in Sync with the Postel's law

> Be conservative in what you send, be liberal in what you accept —Postel's law

In my previous job, I wanted to replace all our `Future` or `Task` by `F[_]: Sync`.

`Sync` is a typeclass providing the capability of deferring some execution. Anyone can implement this trait with its own type. We can find `Sync` instances for [`cats IO`](https://github.com/typelevel/cats-effect), [`monix Task`](https://github.com/monix/monix), [`ZIO`](https://github.com/scalaz/scalaz-zio), [`BIO`](https://github.com/LukaJCB/cats-bio), [`UIO`](https://github.com/LukaJCB/cats-uio). It's not only used for asynchronous execution: we also have instances for monad transformers (if their inner monad has a `Sync`) `EitherT`, `OptionT`, `WriteT`, `StateT` etc.

Here is the description of `Sync`:

```scala
trait Bracket[F[_], E] extends MonadError[F, E] { ... }
trait Sync[F[_]] extends Bracket[F, Throwable] {
  def suspend[A](thunk: => F[A]): F[A]
  def delay[A](thunk: => A): F[A] = suspend(pure(thunk))
}
```

Basically, it just _lazifies_ some execution using a thunk (and provides some cleanup with its parent `Bracket`, and is monadic).

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

We prefer relying on `IO` or `Task` from the Scala ecosystem.

But better: we prefer relying on `Sync` and let the user use `IO` or `Task` as they want!

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

Instead of knowing all implementations that exists, it's useful to know which typeclasses to use instead (focusing on `cats-effect`).

All are used the same way as `Sync`. They just provide more (or less) features to deal with sync/async execution:

- Bracket: it's the loan-pattern in FP (to manage auto-cleaning of resources):

```scala
def fopen[F[_]](filename: String)(implicit F: Bracket[F, Throwable]): F[Long] = {
  F.bracket(F.pure(Files.newBufferedReader(Paths.get(filename))))
           (br => F.pure(br.lines().count()))
           (br => F.pure(br.close()))
}
fopen[IO]("build.sbt").unsafeRunSync() // 33
```

- LiftIO: transform any cats `IO` to the desired effect

```scala
val t: Task[Unit] = LiftIO[Task].liftIO(IO(println("Hello")))
```

- Async: trigger an async execution

```scala
// Sorry for the Thread.sleep, trying to keep it simple :-)
def wait[F[_]: Async](ms: Int): F[Unit] = Async[F].async { cb =>
  Thread.sleep(ms)
  cb(Right())
}

wait[IO](2000).unsafeRunSync()
wait[Task](2000).runSyncUnsafe(Duration.Inf)
```

- Effect: run effect step-by-step through its asynchronous boundaries

```scala

```

- Concurrent
- ConcurrentEffect



A project will depend upon `lib-core` and `lib-monix` for instance, but not the other two modules (that would provide the same function as `lib-monix`, just with a different implementation).

## Shims: typeclasses of typeclasses



# What if you need to specialize?

For instance, in Monix, `Task` provides tons of additional features we don't find in `Sync` or `cats-effect` typeclasses in general (`Effect`, `Bracket`, etc.).

Let's take `Task.gatherUnordered`.  or ???

doOnCancel

create your own TC?

# Separation of concerns

To avoid having tons of required "capabilities" in our functions, they should definitely be split apart and deal with one thing only (Single Responsability Principle).

It will be clearer for the reader (and the writer) to know what it's dealing with, what the function can do, what the function has access to. It's easier to reason about it, because its scope is small and possibilities of actions are not endless at all.

This is why we have static types: to restrict what we can do, how we can combine them. Having generics `A` is a step even further: you can't do anything with them. Typeclasses exist to be able to act on such types, by just providing some operations. If you take `String` for instance, you can do so many things with it it's not funny. But if you just provides `A: Show` to a function, you know it can only stringify it.

John A De Goes demonstrates this in FP to the Max. Check it out now if you didn't saw it yet.

## Modularization

A best-practice when writing a library is to write an abstract core and have dedicated modules for given implementation.

```none
lib-core
lib-cats-io
lib-zio
lib-monix
```

# Tagless final

```scala
trait Show[F[_], A] {
    def show(a: A]: F[String]
}
trait ItemRepository[F[_]] {
    def find(id: Int): F[Option[Item]]
}
```

`Id` to test.

It's easier to create different versions of the capabilities without rewriting the whole program.

FP to the max by John A De Goes https://www.youtube.com/watch?v=sxudIMiOo68

Moreover, it can help to test the code. We often refer to using `Id` when working with tagless final, to avoid dealing with asynchronous tests. That's not always possible, especially when you're working with `Sync`: `Id` has no instance of `Sync` so you can't escape it.

It's also useful when you take some `Applicative`. You can work with `Const[A, B]` in tests to avoid complicated code.


# Performances

IO vs ZIO

# Stack Safety

# ApplicativeAsk is also a case where...???



# Conclusion

