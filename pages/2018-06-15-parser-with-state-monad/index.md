---
title: "Using the State monad to write parsers"
description: ""
date: "2018-06-15T12:00Z"
layout: post
path: "/2018/06/15/using-the-state-monad-to-write-parsers/"
language: "en"
tags: scala, cats, scalaz, typeclass, state
background: 'background.jpg'
---

Sometimes, we just want to _parse_ and process lines from a text file without relying on a third-party library, and not writing tons of `if` ourself because the structure is a bit too dynamic.

Sometimes, regexes are enough but they can be obscure and way too complicated or maintenable.

We remember parsers as huge auto-generated files with some grammar as entry point and we don't want to get there.
Hopefully, we know the `State` monad (because shared state is evil) or not (we'll quickly present it). We'll see how easy it is to write parsers using the State monad.

We'll slowly implement an arithmetic parser from scratch, then we'll see a [Whitespace](https://en.wikipedia.org/wiki/Whitespace_(programming_language)) (the programming language, composed only of... whitespaces!) parser implementation using this technique.

> This article is shamelessly inspired by Leif Battermann's article: [Parsers in Scala built upon existing abstractions](http://blog.leifbattermann.de/2018/02/03/parsers-in-scala-built-upon-existing-abstractions/). Thanks!

---
Summary {.summary}

[[toc]]

---

# Parsers generality

## Grammar needed

In this section, we'll quickly explain parsers logic from a high-level. Feel free to dive into [Introduction to parsers](https://medium.com/@chetcorcos/introduction-to-parsers-644d1b5d7f3d) which is a very nice post going more deeply around all the different layers and techniques.

A parser works with a grammar, to recognize the language used. For instance, one arithmetic grammar is:

```bnf
<Exp> ::= <Exp> + <Term> | <Exp> - <Term> | <Term>
<Term> ::= <Term> * <Factor> | <Term> / <Factor> | <Factor>
<Factor> ::= x | y | ... | ( <Exp> ) | - <Factor>
```

This is a grammar under the Backus–Naur form (BNF).

It's quite _easy_ to understand what it represents.
Each symbol `<Exp>` `<Term>` `<Factor>` is defined `"::="` by an expression (symbols, literals, combinations).

Where it hurts the brain is that it's all recursive! (`Exp` uses `Term`, which uses `Factor`, which uses `Exp` and `Factor`, ...)

Here are the steps parsing `5 + ( -3 / 2 )`:

```bnf
<Exp> + <Term>
<Term> + <Factor>
<Factor> + ( <Expr> )
5 + ( <Term> )
5 + ( <Term> / <Factor> )
5 + ( <Factor> / 2 )
5 + ( - <Factor> / 2 )
5 + ( - 3 / 2 )
```

There are tons of frameworks able to read a BNF file to generate a parser in the language of our choice. In Java, we have [ANTLR](http://www.antlr.org/) for instance.

A parser consumes a text then it tries to match its grammar. If it successfully matches some expressions and symbols, we can then interpret them (do something, like setting some value into the memory, here, we'll `.modify` our `State` monad!).

## Combinators

Parser combinators are a powerful way of writing parsers. We work on "small parsers" not aware of the "grand schema of things", then we combine them into bigger ones.

If we have 2 parsers:

- A understands digits `[0-9]+`;
- B understands letters `[a-zA-Z]+`.

We can combine them to understand: `[0-9]+|[a-zA-Z]+`.

Some pseudo-code would give:

```scala
val A: Parser[String] = makeParser("[0-9]+")
val B: Parser[String] = makeParser("[a-zA-Z]+")
val AorB: Parser[String] = A <+> B

// A
A.parse("123") = "123"
A.parse("toto") = ERR
// B
B.parse("123") = ERR
B.parse("toto") = "toto"
// (A | B)
AorB.parse("123") = "123"
AorB.parse("toto") = "toto"
```

Here, we are creating 2 parsers `A` and `B`, then we create another one `AB` from their combination using `<+>` (let's say it's an operator available on `Parser`).

`A`, `B`, and `AorB` are all typed the same `Parser[String]` because they return a `String` as result. A parser can be seen as a simple function: `String => Option[A]`. We give it an input, it outputs a value or not (a parser is not total: when it can't match its input, then we have an error or a fallback). It's easy to combine such parsers using `PartialFunction`'s `orElse`:

```scala
val A: PartialFunction[String, Int] = { case s if s.matches("[0-9]+") => s.toInt }
val B: PartialFunction[String, Int] = PartialFunction(_.length)
val AB = A orElse B

// A("toto"): MatchError!
AB("123")  // 123
AB("toto") // 4
```

Et voilà, parser combinators FTW!

We'll do exactly the same when combining our "parsers" (represented by a `StateT` monad), except that we'll use proper operators available thanks to some typeclasses and laws.

## Inversible parsers

A quick note on inversible parsers because it's quite powerful.

When we parse a language, we provide the parser some input. It matches and converts the input into some objects in-memory. What if we want to serialize the result back into to JSON or to the original format (altered, optimized maybe) for instance? We need to write the _inverse_ operation of the parsing, the serialization.

Inversible parsers kill two birds with one stone, and ensure the isomorphism of both forms.

There is a Scala project: [invertible-syntax](https://github.com/mossprescott/invertible-syntax), demonstrating this feature:

```scala
import invertible._, Syntax._
val ints = new Syntax[List[BigInt]] {
    def apply[P[_]: Transcriber] = int sepBy1 sepSpace
}

ints.parse("1 20 30")
// \/-(List(1, 20, 30))

ints.print(List(1, 20, 300))
// Some(1 20 300)
```

From the `String` we get the `List`, and vice-versa, without custom serialization code.

# The State monad in a nutshell

Let's dive into our main topic: the `State` monad!

As we know, we use it to avoid to depends on some global mutable state.

A really good documentation about `State` in general can be found on [cats website](https://typelevel.org/cats/datatypes/state.html).
I'll just quote their introduction because it's clear and concise:

> `State` is a structure that provides a functional approach to handling application state. `State[S, A]` is basically a function `S => (S, A)`, where `S` is the type that represents your state and `A` is the result the function produces. In addition to returning the result of type `A`, the function returns a new `S` value, which is the updated state.

For instance, a simple `State` we're going to rely on is:

```scala
val c = State[String, Char](s => (s.tail, s.head))
c.run("re").value // res0: (String, Char) = (e,r)
c.run("are").value // res0: (String, Char) = (re,a)
```

Ok, this is just a plain function, what else? Well, it's a monad!

```scala
val head = State[String, Char](s => (s.tail, s.head))
val toInt = State[String, Int](s => ("", s.toInt))
val product: State[String, Int] = for {
  h <- head
  i <- toInt
} yield h * i

val initialState = "23"
product.run(initialState).value // "2" * 3 = 50 * 3 = 150
```

Clear and concise, right? Also easy to test! No need to think of anything else, all is "contained".

What does it bring on the table compared to simple functions? Ouch...

```scala
val head: String => (String, Char) = s => (s.tail, s.head)
val toInt: String => (String, Int) = s => ("", s.toInt)
val product: String => (String, Int) = s => {
  val (state, ch) = head(s)
  val (state2, i) = toInt(state)
  (state2, ch * i)
}

val initialState = "23"
product(initialState) // "150" ("2" * 3 = 50 * 3)
```

Clearly, the `State` monad removes tons of boilerplate and even provides way more than just state and value management. (more on this in [cats documentation](https://typelevel.org/cats/datatypes/state.html))

It also encapsulates the value into an effect! This is why we used `product.run(...).value`. We need to add `.value` because `State` is an alias for `StateT[Eval, S, A]`: therefore it returns an `Eval` (an `Eval` is a monad containing a computation or value, strict or lazy).

Down to the rabbit hole, `StateT` is also an alias for `IndexedStateT[F, S, S, A]` which can have a different state type in input and output. More on this later (or not).{.info}

The `State` object provides some functions to easily identify some patterns, such as `modify` used to alter the state, without outputting any value (`Unit`).

```scala
// excerpt!
object State {
    def modify[S](f: S => S): State[S, Unit] = State(s => (f(s), ()))
}

val toInt = State[String, Int](s => ("", s.toInt))
val tail: State[String, Unit] = State.modify[String](_.tail)
val product: State[String, Int] = for {
  _ <- tail // we ignore the value, it's ()
  i <- toInt
} yield i

product.run("23").value // "3"
```

Working with `State` and for-comprehension (`flatMap`), it's important to remember 2 things:

- the new state is automatically given to the next `State`, it's not magic (it's part of the `flatMap` implementation of `State`);
- according to the inner monad of `StateT` (`Eval` for `State` but could be anything like `Option`), it's possible to short-circuit the rest of the for-comprehension
  - `None.flatMap(x => ???)` is still `None`, it does nothing;
  - same for `Left("boom").flatMap(x => ???)`.

Back to our parsers: we'll create mini-parsers to parse digits, letters, words etc. We'll combine them to form the language we want.

# State to "parser"

## How to deal with errors

Back to our simple parser:

```scala
val c = State[String, Char](s => (s.tail, s.head))
c.run("").value

// BOOM!
// Exception in thread "main" java.lang.UnsupportedOperationException: empty.tail
```

We don't handle errors yet. It would be better to tail only if we have something to tail.

First, let's expand and use a for-comprehension to do the same exact thing, but more chunked:

```scala
val c: State[String, Char] = for {
  state <- State.get[String] // alias for: State(s => (s, s)), we want the current state
  _ <- State.modify[String](_.tail) // we alter the State's state
} yield state.head // the value of the State
```

We can add a condition to check if the state is empty before processing:

```scala
val c: State[String, Char] = for {
  state <- State.get[String]
  _ <- if (state.isEmpty)
    // ???
    // We need to short-circuit here to not evaluate yield state.head, how?
    // ().raiseError[State[String, ?], String] // ERR: no ApplicativeError instance available :(
  else
    State.modify[String](_.tail)
} yield state.head
```

The only is to short-circuit the `flatMap`ping to not evaluate yield state.head.

It should be possible if `Eval` (the monad inside `State`) is short-circuitable. Is it?
To be so, the monad needs to be a `MonadError`. It doesn't look like `Eval` is. ;(

Let's try to implement it nonetheless!

## ApplicativeError to the rescue?

We'll run into troubles if we try, because we can't set any value to the `State` when an error is raised:

```scala
implicit val stateAE = new ApplicativeError[State[String, ?], Unit] {
  override def raiseError[A](e: Unit): State[String, A] =
    State[String, A](s => ("", ???)) 
    // We can't construct any State because we can't construct any A!
  ...
}

().raiseError[State[String, ?], Unit].run("hey").value
// Exception scala.NotImplementedError
```

All this is because `State` depends upon `Eval`, which is not a `MonadError` as we said. It can't represent an error state.
We need to change our inner monad. :sunglasses:

## Distinguish empty result from an error

We'll need to go deeper and use `StateT` to change it. We'll naturally switch to `Option` which implements `MonadError` with `None` as "error" hence short-circuitable.

```scala
type Parser[A] = StateT[Option, String, A]

val c: Parser[Char] = for {
  state <- StateT.get[Option, String]
  _ <- if (state.isEmpty)
    ().raiseError[Parser, String]
    // same: ApplicativeError[Parser, Unit].raiseError(())
    // same: StateT.liftF[Option, String, Char](None)
  else
    StateT.modify[Option, String](_.tail)
} yield state.head

c.run("toto")
// Some((oto,t))

c.run("")
// None
```

It's working! Now, we can short-circuit our parsers when they can't match the content.

Note: we use `()` as error, because `Option` implements only the `Unit` type as "error": `MonadError[Option, Unit]`. It makes sense, because `None` can't contain any value, therefore, we can't provide any message or anything.{.info}

This tiny parser is the root of everything. It is the one that consumes a `Char` if it can.
Let's build more specific parsers on top of it and build a real parser.

# Implementing an arithmetic parser

## Tokens

We can use the same technique to build parsers that only recognize special characters (digits, letters etc.).

To make it reusable, we'll use a predicate and will rely on our first parser:

```scala
def matchChar(p: Char => Boolean): Parser[Char] = for {
  char <- c
  _ <- if (p(char))
    StateT.get[Option, String] // we don't use it, but we need to return a StateT!
  else
    ().raiseError[Parser, Unit]
} yield char

def digit = matchChar(_.isDigit)
def letter = matchChar(_.isLetter)
def space = matchChar(_.isWhitespace)

// We can create a parser that matches a specific character
def customChar(c: Char): Parser[Char] = matchChar(_ == c)
```

That gives:

```scala
digit.run("01") // Some(("1", "0"))
digit.run("ab") // None
letter.run("ab") // Some(("b", "a"))
```

Next, more than one character parsers:

```scala
def string(word: String) = StateT[Option, String, String](s =>
    if (s.startsWith(word))
        Some(s.drop(word.length), word)
    else
        None
)
// We can also reuse "customChar" to deal with errors (non-match)
def string2(s: String): Parser[String] = s.map(customChar).toList.sequence.map(_.mkString)

// same for numbers
def number = StateT[Option, String, String](s =>
    if (s.headOption.exists(_.isDigit)) // dealing with empty string
        Some(s.partition(_.isDigit).swap)
    else
        None
)
```

Usage:

```scala
string("toto").run("toto") // Some((,toto))
string("toto").run("titi") // None
number.run("123to") // Some((to,123))
```

## Combination using Applicatives

We need a way to combine them, in the sense of "concatenation" (not fallback).
This is where the `Applicative` magic shines, because it's its purpose to combine stuff.

`Monoid` also combines stuff. The `Applicative` has a monoidal structure: `def ap[A, B](ff: F[A => B])(fa: F[A]): F[B]`. It gives: `F -> F -> F`.{.info}

cats's `Applicative` offers us multiple functions to combine them (all of them rely on `ap`):

- `map2[A, B, Z](fa: F[A], fb: F[B])(f: (A, B) => Z): F[Z]` to combine two of them and chose what to do;
- `forEffect` alias `<*` alias `productL`: discard the right value;
- `followedBy` alias `*>` alias `productR`: discard the left value;
- `(...).mapN((A, B, C, ...) => Z)`: syntax sugar available on any tuples.

Let's play with them:

```scala
val totoAndTiti = string("toto") *> string("titi")
totoAndTiti.run("tototiti")
// Some((,titi)): has consumed "toto" then "titi"; kept the second value

val totoAndTiti2 = string("toto") <* string("titi")
totoAndTiti2.run("tototiti")
// Some((,toto)): has consumed "toto" then "titi"; kept the first value

(string("toto") <* string("titi") *> string("a")).run("tototitia")
// Some((,toto)): consumed everything; kept the first

((string("toto") <* string("titi")) *> string("a")).run("tototitia")
// Some((,a)): not the same! be careful of operators precedence

string("toto").forEffect(string("titi")).followedBy(string("a")).run("tototitia")
// Some((,a)): equivalent, but with a fluent code

val totoAndTiti3 = string("toto") *> string("titi") <* string("a")
totoAndTiti3.run("tototitia") // Some((,titi)): consumed everything; kept the middle
```

It's sometimes clearer to combine `Applicative`'s using `mapN`:

```scala
val array = (string("toto"), string("["), number, string("]")).mapN { (a,b,c,d) => (a,c) }
array.run("toto[42]")
// Some((,(toto,42)))
```

## Fallback using SemigroupK

In the same way we previously used `orElse` to "fallback" on another `PartialFunction` when the first one couldn't handle the input, it's possible to provide a fallback to our parsers (`StateT`). This is called _backtracking_: the 1st parser fails to match, then the 2nd parser starts from the same beginning.

```scala
val totoOrTiti = string("A") <+> string("B")
totoOrTiti.run("Axxx") // Some((xxx,A))
totoOrTiti.run("Bxxx") // Some((xxx,B))
totoOrTiti.run("C")    // None
```

`<+>` is syntax sugar coming from `SemigroupK`.
It is defined as `def <+>(y : F[A]) : F[A]`. It's just a synonym of `combineK`: combining two `F[A]`s to get an `F[A]`. (`Semigroup` combines two `A` only)

`List` is a simple example of that: `List(1) <+> List(2, 3)` is `List(1, 2, 3)`.

Without using the `SemigroupK` thing, we could also configure a simple fallback using `Option.orElse` (because our `F` is `Option`, that's not always the case!):

```scala
val aOrB = StateT[Option, String, String](s => string("A").run(s) orElse string("B").run(s))
aOrB.run("B") // Some((,B))
```

If the parsing for `"A"` fails (it will `raiseError`, ie: return `None`), then it will try with the other one.

## Recursion is at stake

For the sake of genericity, let's say we want to parse multiple digits without our custom `number` parser.
We know how to match a digit, so why not reuse this?

```scala
   val oneDigit = digit.map(_.toInt)
  val twoDigits = digit.flatMap(a => digit.map(b => s"$a$b".toInt))
val threeDigits = digit.flatMap(a => digit.flatMap(b => digit.map(c => s"$a$b$c".toInt)))

threeDigits.run("123") // Some((,123))
threeDigits.run("12f") // None
```

This is nice, but those parsers have a fixed length. Let's try to make one more dynamic (at most N digits):

```scala
// We can't do that, because there is no such thing as an "empty" Char
// val atMostTwoDigits = for {
//     a <- digit
//     b <- digit <+> ''.pure[Parser] // '' doesn't compile
//   } yield List(a, b).mkString.toInt
```

We don't want to short-circuit the whole thing if we don't find the 2nd digit.
Hence we need an "empty" Parser if the 2nd digit is not found (to handle the error that would lead to short-circuiting).

We can use a `List[Char]` that has a empty state: `List()`:

```scala
val atMostTwoDigits = for {
  a <- digit
  b <- digit.map(List(_)) <+> StateT.pure(List())
} yield s"$a${b.headOption.getOrElse("")}".toInt

atMostTwoDigits.run("1")
// Some((,1))

atMostTwoDigits.run("123")
// Some((3,12))
```

Clearly, something is recursive around here.
Let's make a function we'll call while we find digits:

```scala
val digits: StateT[Option, String, Int] = for {
  head <- digit
  rest <- digits <+> StateT.pure(0)
} yield head.toString.toInt * math.pow(10, nbDigits(rest)).toInt + rest

def nbDigits(rest: Int) = if (rest == 0) 0 else math.ceil(math.log10(rest))

digits.run("123a") // Some((a,123))
```

If we don't find a 2nd digit, we fallback to `0`. In the end, everything is summed up so `0` has no impact.

Because we decided that our `State` would be `Int`-based, we must do some maths to find back the number from a `Char` (`head`) + a number (`rest`).
Here, `123 = (1 * 100) + (2 * 10) + (3 * 1) + 0`.

Keeping a `List[Char]` as value is easier because we can aggregate at the end only:

```scala
val digits: StateT[Option, String, Int] = {
  def digits0: StateT[Option, String, List[Char]] = for {
    head <- digit
    tail <- digits0 <+> StateT.pure(List())
  } yield head :: tail
  digits0.map(_.mkString.toInt) // we don't mind the overflow!
}
```

Our `digits0` function can be made generic and reused for any parser.
We use a `List[A]` (`A` depends of the result of the given parser) to aggregate the results:

```scala
def many[A](s: Parser[A]): Parser[List[A]] = for {
  head <- s
  tail <- many(s) <+> StateT.pure(List())
} yield head :: tail

val digits: Parser[Int] = many(digit).map(_.mkString.toInt)

digits.run("123a") // Some((a, 123))
```

We may want to provide a "many or none" parser (like spaces, to ignore them between tokens):

```scala
def manyOrNone[A](s: Parser[A]): Parser[List[A]] =
    many(s) <+> StateT.pure(List())

val spaces: Parser[Unit] = manyOrNone(space).map(_ => ())
def ignoreSpaces[A](s: Parser[A]): Parser[A] =
    (spaces, s, spaces).mapN((_, v, _) => v)

// we make our digits parser to ignore space between and after numbers
val digits: Parser[Int] = ignoreSpaces(many(digit).map(_.mkString.toInt))

spaces.run("   a")   // Some((a,()))
digits.run("1a")     // Some((a,1))
digits.run("12 ")    // Some((,12))
digits.run("  123 ") // Some((,123))
```

Again, we can combine them:

```scala
(digits *> digits).run(" 123 456  ")
// Some((,456))

(digits *> word).run(" 123 toto  "))
// Some((,toto))

// :digits: "+" :digits:
val plus: Parser[Int] = (digits, customChar('+'), digits).mapN((lhs, _, rhs) => lhs + rhs)
plus.run("1+5")
// Some((,6))
```

It's getting there, our first operation!

We can generalize our `plus` with some recursion, to handle any amount of `+`:

```scala
// expr := digits [ '+' expr ]

def parseOrElse[A](s: Parser[A], default: A) = s <+> StateT.pure(default)

def plus(lhs: Int) = (customChar('+'), expr).mapN((_, rhs) => lhs + rhs)
def expr: Parser[Int] = for {
  lhs <- digits
  res <- parseOrElse(plus(lhs), lhs) // if we can't match "+ digits", we return the lhs only
} yield res

expr.run("1+5+8 + 13") // Some((,27))
```

Time to handle another operation: the multiplication!

## Multiplication

With the multiplication, we must be careful.
A lazy and wrong implementation is to just fallback on `'*'`:

```scala
def expr: Parser[Int] = for {
  lhs <- digits
  res <- parseOrElse(
    (customChar('+'), expr).mapN((_, rhs) => lhs + rhs) <+>
    (customChar('*'), expr).mapN((_, rhs) => lhs * rhs),
    lhs)
  } yield res

expr.run("1+2+3") // Some((,6)): OK!
expr.run("2*5")   // Some((,10)): OK!
expr.run("2*5+8") // Some((,26)): KO! It did: 2*(5+8)
expr.run("2*5+8*2") // Some((,42)): KO! It did: 2*(5 + (8*2)) = 2*(5 + 16) = 2*21
```

The arithmetic operator precedence is not respected. Our implementation tries to do `+` first, then `*`.
Inversing both lines won't do a thing neither: the fact is that the processing (the + or *) is done "backward" (recursion goes the deepest it can, then goes up).

A working implementation is to prioritize the multiplications first: we want to finish the `*` recursion first, to compute the value, before getting back to the other parsers (`+`):

```scala
// - product := digits [ '*' product ]
// - expr := product [ '+' expr ]

def expr: Parser[Int] = for {
  lhs <- product
  res <- parseOrElse((customChar('+'), expr).mapN((_, rhs) => lhs + rhs), lhs)
} yield res

def product: Parser[Int] = for {
  lhs <- digits
  res <- parseOrElse((customChar('*'), product).mapN((_, rhs) => lhs * rhs), lhs)
} yield res

expr.runA("1+2+3")     // Some(6)
expr.runA("2*5")       // Some(10)
expr.runA("2*5*2+8")   // Some(28)
expr.runA("2*5+8*2*2") // Some(42)
```

## Parens

We didn't introduce `(` or `)` in our grammar yet. Easy? Let's find out:

```scala
// - expr := product [ '+' expr ]
// - product := parens [ '*' product ]
// - parens := '(' + expr + ')' | digits

// first, a simple parser: '(' expr ')' => expr (">>" is `flatMap` ignoring the lhs value)
def parens: Parser[Int] = (ch('(') >> expr << ch(')')) <+> digits
```

Notice the difference here: we are NOT using `*>` but `>>`. `>>` is lazy (by-name parameter). It's just a `flatMap` ignoring the left value.
This is important because we must short-circuit asap otherwise `expr` will be evaluated again and again and we'll stackoverflow.

```scala
def product: Parser[Int] = for {
  lhs <- parens // we changed from "digits" to "parens" (which handles digits)
  res <- parseOrElse((ch('*'), product).mapN((_, rhs) => lhs * rhs), lhs)
} yield res

expr.run("(1)") // 1
expr.run("(2)*(5)") // 10
expr.run("(2*(4+1*1))") // 10
expr.run("(2*(3+2*1))+1*2") // 12
```

Yeah! Not that complicated, and we provided a great feature here.

Let's dive into troubles now.

## Minus troubles

To add `"-"`, we could do something like this:

```scala
def expr: Parser[Int] = for {
  lhs <- products
  res <- parseOrElse(
    (customChar('+'), expr).mapN((_, rhs) => lhs + rhs) <+>
    (customChar('-'), expr).mapN((_, rhs) => lhs - rhs),
    lhs)
} yield res

expr.runA("10-2")    // Some(8)
expr.runA("2*5-2")   // Some(8)
expr.runA("2*5-2+2") // Some(6) KO!
expr.runA("3-2-1")   // Some(2) KO!
```

It's more complicated because `"-"` is not associative.
Right now, our parser evaluates `"3-2-1"` as `(3-(2-1))` whereas it should be `((3-2)-1)`.

It's because we have a right-recursion. So it goes the deepest it can to the right, compute, then sends the values up. It's okay for '+' but not for '-'.

If we try to build the smallest parser, just to deal with `"-"`, it would be:

```scala
lazy val expr: Parser[Int] = {
  for {
    d <- digits
    e <- (customChar('-') >> expr) <+> StateT.pure(0)
  } yield d - e
}

expr.runA("10-2-1") // Some(9) KO!
```

Using a left-recursion would be something like this:

```scala
lazy val expr: Parser[Int] = {
  for {
    d <- expr
    e <- (customChar('-') >> digits) <+> StateT.pure(0)
  } yield d - e
}

expr.runA("10-2-1") // Boom!
```

We want this to evaluate `((10-2)-1)` but of course, this stackoverflows ad infinitum.
We can't really implement grammars with our classic recursion. (http://users.monash.edu/~lloyd/tildeProgLang/Grammar/Top-Down/)

If you have a simple way to deal with it, don't hesitate to send me a message; maybe I forgot about something. ;-)

## Trampolining

Another case of stackoverflow is with super long expression, because we are _flatMapping_ the hell out of them.

```scala
// Boom! StackOverflowError
expr.runA("1" + ("+1" * 1000)))
```

We are in trouble because `many` calls `many` which calls `many` etc. until the `head` is empty but it can take a long time and the stacking continues in memory...

I let the reader exercises its talent over this issue (probably using `IO`, or any stack-safe monad).

# A Whitespace parser

[Whitespace](https://en.wikipedia.org/wiki/Whitespace_(programming_language)) is a terrible programming language dealingonly with whitespaces! Three of them actually: " ", "\t", "\n". It can print to the screen, do some arithmetic operation, keep values in memory, do condition, etc.

Here is its documentation: https://hackage.haskell.org/package/whitespace-0.4/src/docs/tutorial.html. As you can see, not that complicated as language!

I spent some time to write a parser using `StateT` to understand Whitespace, you can check it out here: https://github.com/sderosiaux/whitespace-parser

The main "loop" is exactly as we saw:

```scala
def imp: StateT[F, (String, Stack), String] = for {
   output <- stackCommands.all <+>
     ioCommands.all <+>
     arithmeticCommands.all <+>
     heapCommands.all <+>
     flowCommands.all
   rest <- imp <+> StateT.pure[F, (String, Stack), String]("")
} yield output + rest
```

The State has:

- as state: the program and a Stack (where it holds the values on the stack filled by the program);
- as value: the output of the program.

Here is the "Hello, world!":

```scala
val helloWorld = "   \t  \t   \n\t\n     \t\t  \t \t\n\t\n     \t\t \t\t  \n\t\n     \t\t \t\t  \n\t\n     \t\t \t\t\t\t\n\t\n     \t \t\t  \n\t\n     \t     \n\t\n     \t\t\t \t\t\t\n\t\n     \t\t \t\t\t\t\n\t\n     \t\t\t  \t \n\t\n     \t\t \t\t  \n\t\n     \t\t  \t  \n\t\n     \t    \t\n\t\n  \n\n\n"
val Some(((rest, stack), output)) = new WhitespaceParser[Option].eval(helloWorld)

println(s"Stack: $stack")
println(s"Output: $output")

// Stack: List(33, 100, 108, 114, 111, 119, 32, 44, 111, 108, 108, 101, 72)
// Output: Hello, world!
```

As we can see, the inner monad is generic and given at call-site.
That complexifies a bit the code but it offers more latitude to use any `MonadError` as result, and forces us to use generic methods from the typeclasses, instead of relying on implementation details.

# A Brainfuck parser

One could also implement a Brainfuck parser with the State monad... It's already done! See: https://github.com/tomwadeson/brainfuck-scala.

Relying on [atto](http://tpolecat.github.io/atto/) for the parsing, this provides the _same_ kind of combinators we wrote:

```scala
import atto._, Atto._
import cats.implicits._

scala> int.parseOnly("123abc")
res0: atto.ParseResult[Int] = Done(abc,123)

scala> letter.parse("xyz")
res4: atto.ParseResult[Char] = Done(yz,x)

scala> (letter ~ digit).parse("a1")
res13: atto.ParseResult[(Char, Char)] = Done(,(a,1))
```

Here, `~` is _equivalent_ to our combinations like: `(digits *> word)`.

When we need to write lightweight parsers, then [atto](http://tpolecat.github.io/atto/) is definitely a good solution (ported from the Haskell world [attoparsec](http://hackage.haskell.org/package/attoparsec)).

The difference (and advantage) is that it separates the parsing and the evaluation of the program (like any lexical analysis then compiling processing).

Remember, in our case, we did both at the same time (booh!):

```scala
val plus: Parser[Int] = (digits, ch('+'), digits).mapN((lhs, _, rhs) => lhs + rhs)
```

In the case of atto, we first parse then _translate_ into some ADT and evaluate from the ADT:

```scala
val incrementPointer: Parser[Instruction] = char('>') >| IncrementPointer

// ...

def eval(i: Instruction): F[Unit] = i match {
    case IncrementPointer => incrementPointer()
    // ...
```

Splitting parsing and evaluation are better for tons of reasons:

- do one thing and do it well;
- more maintainable (less moving pieces);
- operations processing can be optimized (because we have the "full" view of what they contain) instead of working piece by piece.

# Alternatives

- Surprisingly, Scala stdlib already embeds parser combinators code:

```scala
import scala.util.parsing.combinator._

class SimpleParser extends RegexParsers {
    def word: Parser[String]   = """[a-z]+""".r       ^^ { _.toString }
    def number: Parser[Int]    = """(0|[1-9]\d*)""".r ^^ { _.toInt }
}

object TestSimpleParser extends SimpleParser {
    def main(args: Array[String]) = {
        parse(word, "johnny") match {
            case Success(matched, _) => println(matched)
            case Failure(msg, _) => println("FAILURE: " + msg)
            case Error(msg, _) => println("ERROR: " + msg)
        }
    }
}
```

The project has been separated from the Scala stdlib only recently: https://github.com/scala/scala-parser-combinators.

- [atto](http://tpolecat.github.io/atto/): lightweight, and the syntax is quite elegant.

- [fastparser](http://www.lihaoyi.com/fastparse/): according to the author, 100x faster than Scala stdlib combinators. It has many more features, handles streaming, positive & negative lookahead, "cuts" (marker to stop backtracking) etc.

Make your choice!

# Takeaways

When we work with text files or any structured file, it can sometimes be easier to write a little parser to process it instead of trying your best with `if` or regexes.

- You have something simple to parse? Use [atto](http://tpolecat.github.io/atto/);
- You want speed or special features? Use [fastparse](http://www.lihaoyi.com/fastparse/);
- You don't want any third-party, use the `State` monad! ;-)

The `State` monad can be used with tons of patterns, isolating the mutating state, making it easy to reason about, and to test.

Thanks to the monadic flow, we don't have to think about passing the current state again and again. We just act as if it was "given" and keep on writing our code without boilerplate.

It's important to be aware of the `Applicative`, `MonadError`, `SemigroupK` implications, because they provide great features around `State` to combine them and to handle errors. Always think which monad is contained inside the `State`, that will determine which "power" our `State` offers.