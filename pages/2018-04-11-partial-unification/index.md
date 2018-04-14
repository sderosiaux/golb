---
title: "Kind Projection and Partial Unification caveats"
date: "2018-04-12T12:08Z"
layout: post
path: "/2018/04/12/kind-projection-and-partial-unification-caveats/"
language: "en"
tags: scala, partial-unification, kind-projector
---

The [kind-projector sbt plugin](https://github.com/non/kind-projector) is quite ubiquitous in the Scala world.
So much that we won't need it in the future! Its features will be [native in Dotty/Scala 3](https://github.com/lampepfl/dotty/issues/2041) as we'll see. But we're not there yet.

This plugin introduces new keywords to provide some sugar syntax for advanced type-related usage. It does _not_ provide any new feature but simplifies how to write and read code that is barely readable without.

If you've seen code like:

```scala
def makeFunctor[U] = new Functor[Either[?, U]] { ... }
def compose[G[_]: Applicative]: Applicative[λ[α => F[G[α]]]] = { ... }
```

It's the kind-projector in action. It's way less verbose and explicit than what we would have to write without it (we'll see).

We'll also learn how it's deeply linked to the _Partial Unification_ feature of scalac and all its caveats.

The kind-projector and the partial-unification are truly powerful features that push the limits of the type system of the Scala compiler. It lets us, the developers, abstract more of our work to reuse (compose) it easily, limit the scope of possibilities when we code (when everything is abstract, it's less bug-prone) and have the compiler tell us if the types make sense, all that without verbosity.

They are heavily used in libraries because they need to be the most generic possible for us to work with them (and even with themselves..). But they will also find their ways into real projects and applications. You must be aware of what the partial-unification is, and consider the kind-projector as scalac native to use it where you should.

---
Summary {.summary}

[[toc]]

---

# Partial Unification

First, we'll study partial-unification on its own by going through some examples. That will help us to understand what it is all about. We can forget about the kind-projector for now.

## What's the problem?

Let's say with have a simple function that works with any type constructor `F[_]` (`* -> *` / a higher kinded types / a HKT):

```scala
def show[F[_], A](f: F[A]) = println(f) // we can't do much more with `f` except use it as `Any`
```

We can give it instances that fits, such as `List[_]` or `Option[_]`:

```scala
show(List(1, 2, 3)) // "List(1, 2, 3)"
show(Some("hello")) // "Some(hello)"
```

But we can't pass it variables which types doesn't fit `F[_]` such as `Either[_, _]` (`* -> * -> *` doesn't fit with `* -> *`):

```scala
val err: Either[Error, String] = Left(new Error("boom"))
show(err) // doesn't not compile!
```

Without partial-unification, we can't compile this code:

```raw
no type parameters for method show: (f: F[A])Unit exist so that it can be applied to arguments (Either[Error,String]).
 --- because ---
argument expression's type is not compatible with formal parameter type;
 found   : Either[Error,String]
 required: ?F[?A]
```

We can workaround this issue by creating a type that has only one parametric type and use type ascription to pass the value (it's checked at compile-time, it's not a runtime cast):

```scala
type ErrorEither[A] = Either[Error, A]
show(err: ErrorEither[String]) // "Left(java.lang.Error: boom)"
```

We can also generalize this type to ignore its left parametric type (all three notations does the same):

```scala
type R[A] = Either[_, A] // basically, "Any"
type R[A] = ({ type F[E] = Either[E, A] })#F[_] // type lambda and projection
type R[A] = Either[E, A] forSome { type E }     // existential types

show(Right(5): R[Int])          // "Right(5)"
show(Right("hello"): R[String]) // "Right(hello)"
show(Left(5): R[String])        // "Left(5)"
```

## Partial unification to the rescue

With partial-unification flag enabled, the same code works without declaring the useless types or any types trick:

```scala
// build.sbt
scalacOptions += "-Ypartial-unification"
```

```scala
val err: Either[Error, String] = Left(new Error("boom"))
show(err) // "Left(java.lang.Error: boom)"
```

The compiler successfully _unified_ the call-site types with the function signature types: `Either[_, _]` into `F[_]`. How's that? One type is missing! The compiler had to choose one. This is why it's called _partial unification_, because it's not total. Note that it's used for **type constructor** unification only (the unification is done per parameter, a simple `A` doesn't need any partial application!).

Which types did it used in `show`? It must respect some rules, it's not random. We can find out by using some `scala-reflect` compile-time reflection (or `-Xprint:typer`):

```scala
import scala.reflect.runtime.universe._
def show[F[_], A: TypeTag](f: F[A])(implicit tt: TypeTag[F[A]]) = {
    println(s"${typeOf[F[A]]} and A: ${typeOf[A]}")
}

show(List(1, 2, 3)) // "List[Int] and A: Int"
show(Some("hello")) // "Some[String] and A: String"
val err: Either[Error, String] = Left(new Error("boom"))
show(err)           // "Either[Error,String] and A: String"
```

The compiler used the right type of `Either[_, _]`, the left one does not exist from the `show()` perspective.

Let's try with more complex types:

```scala
show(Triple(1, "2", true)) // "Triple[Int,String,Boolean] and A: Boolean"
show(List(List(1, 2, 3)))  // "List[List[Int]] and A: List[Int]"
show(Free.liftF(IO.pure(Some("hello")))) // Free[IO,Some[String]] and A: Some[String]
```

It really accepts anything!

```scala
show(5)         // "Any and A: Nothing"
show("hello")   // "Comparable[String] and A: String"
                // This one is "funny" because: String extends Comparable[String]
show((str: String) => str.length) // "String => Int and A: Int" (Function[String, Int])
```

If we resume how the unification works:

```scala
def show[F[_], A](f: F[A]) = ???

                   List[Int]: F[_],A = List, Int      // perfect match
              Option[String]: F[_],A = Option, String // perfect match
       Either[Error, String]: F[_],A = [T]Either[Error, T], String
Triple[Int, String, Boolean]: F[_],A = [T]Triple[Int, String, T], Boolean
Free[IO[_], Option[String]]]: F[_],A = [T]Free[IO, T], Option[String]
               String => Int: F[_],A = [T]String => T, Int
                         Int: F[_],A = Any, Nothing
```

As we see, when the types don't match, the compiler fixes the left-most type parameters until a global match is found.

Here are more examples with more type parameters:

```scala
def show2[F[_, _], A, B](f: F[A, B]) = ???

val err: Either[Error, String] = Left(new Error("boom"))
show2(err)                         // F[_,_],A,B = Either, Error, String: // perfect match
show2((str: String) => str.length) // F[_,_],A,B = Function1, String, Int // perfect math
show2(Triple(1, "2", true))        // F[_,_],A,B = [T, U](Int, T, U), String, Boolean
```

When you try to trigger the partial unification on a nested type constructor, it's not what you expect:

```scala
def show3[F[_[_]], G[_]](f: F[G]) = ???
show3(Some(Triple(1, "2", true)))
```

_I would hope_ it's trying to match: `F` as `Some` and `G` as `Triple` (and doing partial unification on its args), but it seems we're at the edge of the type system:

```raw
scala.reflect.internal.Types$NoCommonType:
 lub/glb of incompatible types: [X] <: scala.collection.GenTraversable[X] and
```

It's _ill-kinded_ because `Option` has the shape `F[_]` whereas our function expects a `F[_[_]]`.

We can do this instead:

```scala
def show4[F[_], G[_], A](fa: F[G[A]]]) = ??? // F[G[A]] = ((* -> *) -> *)
show4(Some((1, true)))           // F[_],G[_] = Some, [T](Int, T) -- partial unification!
                                 // Note that Intellij IDEA thinks it's a type mismatch.
```

Anyway, we get to the very important rule that will bite you later (when using the kind-projector, we'll see):

**The type constructors are partially applied from left to right leaving the rightmost type parameters free, therefore favorising the right-biaised type constructors.**

Paraphrasing [@djspiewak](https://gist.github.com/djspiewak/7a81a395c461fd3a09a6941d4cd040f2):

> You should always, always order the type parameters in your type constructor from least-to-most specific. In other words, if your type constructor takes multiple parameters, you should order them such that the parameters you expect users to vary (i.e. write a map function over, change frequently between functions, etc) should be right-most, while the parameters you expect to be consistent (i.e. the same at multiple unrelated places in the code) should be left-most.

At the end, it's a feature of the compiler to treat `F[A, B]` as `F[A][B]` and apply currying when it needs to match types with a given object.

## History and deprecation

Now we have seen what's partial-unification is all about, let's resume its history and what's going to happen:

- the types partial-unification was introduced on April 2016 in the PR [#5102 | SI-2712 Add support for partial unification of type constructors](https://github.com/scala/scala/pull/5102) ([SI-2712 | Implement higher-order unification for type constructor inference](https://issues.scala-lang.org/browse/SI-2712));
- on the 11 April 2018, the PR [#6309 | Partial unification unconditional](https://github.com/scala/scala/pull/6309) was merged in the compiler to use it by default and remove the flag! Why anybody would want to disable it anyway. It only brings fixes.

**Scala 2.12.6 will be the first release where -Ypartial-unification flag won't be needed.**

# Kind Projector

Now we can tackle the other part of this article. The [kind-projector](https://github.com/non/kind-projector) is unrelated to the partial-unification and is more fun! It just happens that the combinaison of the two is verbose-code saving. (and let Intellij troubled with the correctness validation of the program)

As said, the kind-projector is simply a sbt plugin. It is NOT part of scalac for now, but this will [eventually arrive in Dotty/Scala 3](https://github.com/lampepfl/dotty/issues/2041) with some minor adjustements I guess.

## What does it offer?

The kind-projector provides advanced type features and reserves some identifiers in the language such as:

- `Lambda/λ`: hopefully, Intellij can change to `λ`;
- `?` keyword: to not be confused with `_`, both have different purposes (well, `_` has a tons of them according to where it is used, that's another story).

`Lambda/λ` is just a generalization of `?`. We'll mostly used the latter to keep it simple.

## After "_" we have "?"

```scala
// build.sbt
addCompilerPlugin("org.spire-math" %% "kind-projector" % "0.9.4")
```

As we said, it provides purely syntax sugar around advanced typing. For future reference, all of these lines are equivalent:

```scala
({ type F[E] = Either[E, A] })#F // lambda types and type projection "#F", scalac native
Either[?, A]
Lambda[E => Either[E, A]]
λ[α => Either[α, A]]
```

Note that I just lied because we can't use it in type aliases where the lambda types can:

```scala
type R[A] = ({ type F[E] = Either[E, A] })#F[_] // OK!
type R[A] = Either[_, A] // OK!

type R[A] = Either[?, A] // BOOM! As we said, it's not a replacement for '_'
```

The kind-projector is used in the functions or through inheritance, we'll see why.

## Usage in functions

Consider this example:

```scala
def makeListFunctor = new Functor[List] {
  override def map[A, B](fa: List[A])(f: A => B): List[B] = fa.map(f)
}
makeListFunctor.map(List(1, 2))(_ + 1) // List(2, 3)
````

It works naturally because `List` has the kind `* -> *`: that's what `Functor` expects (`(* -> *) -> *`).

If we want a `Functor[Either]`, it's different because `Either` has the kind `* -> * -> *`: one degree more. We need to reduce it by one. This is where the kind-projector shines (hence its name):

```scala
// Left-biased functor for Either (generally, everything is right-biased but we're messing around)
def makeFunctor[U] = new Functor[Either[?, U]] { // Same: new Functor[λ[α => Either[α, U]]]
  override def map[A, B](fa: Either[A, U])(f: A => B): Either[B, U] = fa match {
    case Left(value: A) => f(value).asLeft
    case Right(value: U) => value.asRight
  }
}

val f: Functor[Either[?, String]] = makeFunctor[String]
f.map(Left(5))(_ * 2)                            // Left(10). Works with Int.
f.map(Left("hey"))(_.length)                     // Left(3).  Works with String.
f.map(Left(new Exception("boom")))(_.getMessage) // Left(boom). Anything!
```

We fix one type and let the other one free, represented by the `?` (it's like the partial-unification system). We chose to fix the right one (that's why it's left-biased) by using the type parameter `U` of the function `makeFunctor`.

We can create any `Functor[Either]` with the same function. One free degree `?` is used for `Functor[F[_]]`, and the other is provided outside, by `makeFunctor`. That's basically the whole usage of the kind-projector.

What's interesting is the signature vs the implementation of `map`:

```scala
def map[A, B](fa: F[A])(f: A => B): F[B]
=>
override def map[A, B](fa: Either[A, U])(f: A => B): Either[B, U] = ???
```

`F[A]` is mapped to `Either[A, U]`: `A` is free and `U` is fixed by the outside (same for `F[B]`), thus the _contract_ is respected.

It works with `implicit def` of course! That's even one of the biggest usage (see cats or scalaz).

Here, we'll create a right-biased `Functor[Either]` automatically at the call-sites of the method `f` (to avoid some trouble with partial unification, we'll explain just after):

```scala
implicit def makeFunctor[U]: Functor[Either[U, ?]] = new Functor[Either[U, ?]] {
    override def map[A, B](fa: Either[U, A])(f: A => B): Either[U, B] = fa match {
      case Left(value) => Left(value)
      case Right(value) => Right(f(value))
    }
  }

def f[F[_]: Functor, A, B](a: F[A], f: A => B) = implicitly[Functor[F]].map(a)(f)

f(Left(42): Either[Int, String], (_: String).length) // Left(42)
f(Right(42): Either[Error, Int], (_: Int) + 1)       // Right(43)
```

For the first call, we pass an `Either[Int, String]` to `f` asking for a `F[A]`. What's happening:

- through the partial-unification, `f` is using `F[_]=[T]Either[Int, T]` and `A=String`;
- therefore, it provides us with a `Functor[Either[Int, ?]]`;
- `Int` is fixed on left;
- `map` expects the free degree `?` (represented by the right part of the `Either`) to be `String`.

## NO to left-biased!

If we still had our left-biased `Functor[Either[?, U]]`, we wouldn't be able to compile:

- through the partial-unification, `f` is (still) using `F[_]=[T]Either[Int, T]` and `A=String`;
- therefore, it provides us with a `Functor[Either[Int, ?]]`;
- ... and it fails! Because our implicit provides only `Functor[Either[?, Int]]`.

A left-biased instance can't been found by the partial-unification process. We need to hijack the game as we saw earlier:

```scala
type R[A] = Either[A, _] // Prevent partial-unification
f(Left(42): R[Int], (_: Int) + 10)            // Left(52)
f(Right(42): R[Error], (_: Error).getMessage) // Right(42)
```

**This is the major pain point of the relation between kind-projector and the partial-unification.**

Now you probably understand better why [@djspiewak](https://github.com/djspiewak) said "You should always, always order the type parameters in your type constructor from least-to-most specific.".

We present a way to deal with the left-biased types at the end of this article.


## Usage in inheritance

Let's create some type class we will inherit from:

```scala
trait Stringify[F[_]] { // it's like Functor
  def stringify[A](a: F[A]): String
}
// to help us out
implicit class RichF[F[_], A](val a: F[A]) extends AnyVal {
  def stringify(implicit s: Stringify[F]): String = s.stringify(a)
}
IO.pure(42).stringify // Good! "could not find implicit value for parameter s: Stringify[IO]"
```

Let's say we want to implement this typeclass for `Either`. Same problem, `* -> * -> *` doesn't fit `* -> *`!
So we fix one type with the outside (the class here) and _kind-project_ the other:

```scala
class EitherStringify[T] extends Stringify[Either[T, ?]] {
  override def stringify[A](a: Either[T, A]): String = a.fold(l => s"Left: $l", r => s"Right: $r")
}
// automatically build the instance when needed
implicit def eitherStringify[T]: Stringify[Either[T, ?]] = new EitherStringify[T]

"toto".asRight[Throwable].stringify // "Right: toto"
42.asRight[Throwable].stringify     // "Right: 42"
42.asLeft[String].stringify         // "Left: 42"
```

The creation of the class was not necessary, we could have used an anonymous one. Here are some more examples:

```scala
implicit def eitherStringify[T]: Stringify[Either[T, ?]] = new Stringify[Either[T, ?]] {
  override def stringify[A](a: Either[T, A]): String = a.fold(l => s"Left: $l", r => s"Right: $r")
}

// The classic case here
implicit def listStringify: Stringify[List] = new Stringify[List] {
  override def stringify[A](a: List[A]): String = s"List: ${a.mkString(",")}"
}
```

Here, we need more parameter, a `Comonad`, to be able to run the `Free[S[_], A]`:

```scala
implicit def freeStringify[F[_]: Comonad]: Stringify[Free[F, ?]] = new Stringify[Free[F, ?]] {
  override def stringify[A](a: Free[F, A]): String = s"Free: ${a.run.toString}"
}
Free.liftF(3.some).stringify // Free: 3
```

Here, we use a `Kleisli` that requires a `Stringify` instance of the type it contains and a value `A` (thus the method is not implicit):

```scala
def kleisliStringify[F[_]: Stringify, A](a: A): Stringify[Kleisli[F, A, ?]] =
  new Stringify[Kleisli[F, A, ?]] {
    override def stringify[B](k: Kleisli[F, A, B]): String = s"Kleisli: ${k.run(a).stringify}"
  }

val k: Kleisli[List, String, String] = Kleisli(_.split(" ").toList)
k.stringify(kleisliStringify("hello world")) // Kleisli: List: hello,world

// partial-unification, once again!
def kEither[A]: Kleisli[Either[Throwable, ?], A, A] = Kleisli(_.asRight[Throwable])
kEither.stringify(kleisliStringify("hello world")) // Kleisli: Right: hello world
```

As you can see, it's exactly the same principle with inheritance or not. I hope all those examples have triggered your "Eureka"!

Remember that it's still possible to not use `?` in your code, and replace it with the lambda types but...:

```scala
implicit def eitherStringify[T]: Stringify[Either[T, ?]] = new Stringify[Either[T, ?]] { ... }
implicit def eitherStringify[T] = new Stringify[({ type F[E] = Either[T, E] })#F] { ... }
```

## Enjoy the partial-unification for left-biased structures

Let's say we have a left-biased `Functor` for `Tuple3`:

```scala
implicit def leftBiasedFunctor[B, C] = new Functor[(?, B, C)] {
  override def map[T, U](fa: (T, B, C))(f: T => U): (U, B, C) =
   (f(fa._1), fa._2, fa._3)
}
```

As we seen, we can't rely on partial-unification:

```scala
(1, "2", true).map(i => i + 10) // does NOT compile.
                                // It unifies as [A](Int, String, A), the Functor is not available
```

We can apply some trick (see this [SO](https://stackoverflow.com/questions/46263931/higher-order-unification-for-type-constructor-inference/46265914#46265914)) to reverse the types to enjoy the right-biaised types. Let's make our code compile!

We need a structure to invert the types:

```scala
implicit class InferToLeft[M[_, _, _], A, B, C](a: M[A, B, C]) {
  def lefty: InferToLeft.U[M, C, B, A] = a
}

object InferToLeft {
  type U[M[_, _, _], C, B, A] = M[A, B, C]
}

(1, "2", true).lefty.map(i => i + 10) // (11,2,true) It works!
```

```scala
val lefty: InferToLeft.U[Tuple3, Boolean, String, Int] = (1, "2", true).lefty
lefty.map(i => i + 10)
```

It works because:

- `U` acts like `Id` (`type Id[A] = A`), it's a "virtual wrapper";
- `InferToLeft.U[Tuple3, Boolean, String, Int]` <=> `(Int, String, Boolean)`;
- it's messed up (Intellij sees red);
- the partial-unification resolves: `[T]InferToLeft.U[Tuple3, Boolean, String, T]` which is equivalent to `[T](T, String, Boolean)`;
- therefore it can create the `Functor`: `new Functor[(?, B, C)]`, brillant!

<p class="c"><img src="mindblow.gif" alt="Mindblow" /></p>

::: info
toto va
:::

Note this another trick if you want to do the same with a `Bifunctor`:

```scala
implicit def leftBiasedBifunctor[C]: Bifunctor[(?, ?, C)] = new Bifunctor[(?, ?, C)] {
  override def bimap[A, B, T, U](fab: (A, B, C))(f: A => T, g: B => U): (T, U, C) =
    (f(fab._1), g(fab._2), fab._3)
  }
```

This won't work:

```scala
(1, "2", true).lefty.bimap(i => i + 10, s => s.length)
```

We need another variant of `lefty`:

```scala
implicit class InferToLeft[M[_, _, _], A, B, C](a: M[A, B, C]) {
  def lefty: InferToLeft.U[M, C, B, A] = a
  def lefty2: InferToLeft.V[M, C, A, B] = a // C, A, B, not C, B, A
}

object InferToLeft {
  type U[M[_, _, _], C, B, A] = M[A, B, C]
  type V[M[_, _, _], C, A, B] = M[A, B, C] // C, A, B, not C, B, A
}

(1, "2", true).lefty2.bimap(_ + 10, _.length) // it works!
```

The partial-unification resolves: `[T, U]InferToLeft.V[Tuple3, Boolean, T, U]` <=> `[T, U](T, U, Boolean)`, the definition of our `Bifunctor`.

With `lefty`, it would resolved `[T, U]InferToLeft.V[Tuple3, Boolean, T, U]` <=> `[T, U](U, T, Boolean)`, NOT our definition!

## Real cases: cats and scalaz

Let's try to understand this (scalaz):

```scala
def subst1[G[_], F[_[_]], T](fa: F[G]): F[λ[α => G[α] @@ T]] = {
    fa.asInstanceOf[F[λ[α => G[α] @@ T]]]
}
```

```scala
Traverse[λ[α => F[G[α]]]] 
```

# Conclusion

Dotty [will](https://github.com/lampepfl/dotty/issues/2041) implement `?` and [type lambdas](http://dotty.epfl.ch/docs/reference/type-lambdas.html):

```scala
type T = [X] => (X, X)
```


