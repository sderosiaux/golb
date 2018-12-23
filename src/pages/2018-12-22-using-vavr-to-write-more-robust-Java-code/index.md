---
title: "Using vavr to write more robust Java code"
description: "Exceptions are ubiquitous in Java, but they have many downsides. We'll see how to deal with errors in a functional way, using vavr datatypes."
date: "2018-12-23T12:00Z"
is_blog: true
path: "/articles/2018/12/22/using-vavr-to-write-more-robust-Java-code"
language: "en"
tags: ['java', 'scala', 'either', 'exceptions', 'throws']
category: 'Java'
background: '0_75QcNGthkA6PGdeL.jpg'
---

Working with my team, I had to deal with some business errors which were Exceptions. I was a bit nervous about them, and was having a “not good enough”, “not expressive enough” feeling. Having a Scala background, I decided to show them how we could handle errors differently.

Let’s look at how we are generally dealing with errors in Java. We’ll see what are the downsides, and why’s important to properly handle all of our errors in a more type-safe way.

We'll work from a base solution and improve it using [vavr](http://www.vavr.io/) and some of its functional types: `Either`, then a combination of `Either` and `Option` while keeping a fluent style.

Finally, we'll work at combining our different error types into a more global type, and see that it's not going to be straightforward.

TOC

# Exceptions: The classic way of handling errors

`Exception`s are ubiquitous in Java. There are of two kinds:

- checked `Exception`s that need `throws` where they pass.
- unchecked `Exception`s which are `RuntimeException`s and do not necessitate to specify `throws`.

## Throwing throws

In Java, it's common to throw `Exception`s and just deal with errors "later" in some try/catch up upon the hierarchy. It's a common practice to just throw or convert to `RuntimeException` to avoid adding `throws` on every functions—which s a bad smell anyway. Often, the "later" is the main function, and the program will simply exit.

```java
catch (Exception e) {
  throw new RuntimeException();
}
```

## Exceptions in constructor

The worst part is throwing an exception from a constructor. We don't have the choice but to return an instance of the class here: Exceptions are the only way to escape this. It's definitely a bad smell: this is where we should use a *factory method* also known as a *smart constructor*.

If we want to check for the nullity and to ensure a given pattern, we can do:

```java
public Country(String iso3) {
  if (iso3 == null || !countryPattern.matcher(iso3).matches())
    throw new UnsupportedOperationException("The country does not look like an iso3");
  this.iso3 = iso3;
}
```

## Guava's Preconditions

It's also common to see projects using `Preconditions` to ensure arguments are not null or respect some business rules. If they don't, `Preconditions` will just throw an `IllegalArgumentException` or similar.

```java
Preconditions.checkState(data == null, "data must not be null");
```

## Either this or that

Coming from Scala, I'm used to use `Either` to enforce the management of the errors. The compiler will not compile if I don't explicitely deal with it. It's like forgetting to add throws or a try/catch in Java to deal with checked exceptions.

```scala
def country(iso3: String): EitherCountryParsingError, Country]
```

We are going to see step by step the improvements we can apply to make our code more robust and type-safe.

# A use-case: Country

## The initial code

We want to represent a `Country` as an proper entity in our program instead of having a String everywhere. The command-line gives us the initial `String` that we want to turn into a `Country` asap. We enforce a business rule to ensure the country code looks like an iso3 ("FRA", "POL").

```java
public Country(String iso3) {
  if (iso3 == null || !countryPattern.matcher(iso3).matches())
    throw new UnsupportedOperationException("The country does not look like an iso3");
  this.iso3 = iso3;
}
```

To use it, somewhere, we need to wrap it into a try-catch to handle the `Exception`:

```java
try {
  Country c = new Country(cli.options.country);
  program(c);
} catch (Exception e) {
  logger.error(e);
  System.exit(-1);
}
```

## A factory method

I don't want to throw exceptions in a constructor. *A constructor should not process anything, contains no business rules, nor do side-effects*. It just sets the instance properties from the parameters. Therefore, we'll move the error management into a proper factory method, for isolation purpose.

We must not forget the set our constructor as *private*, to ensure everybody to use the factory method, otherwise that would defeat its purpose.

```java
private Country(String iso3) { this.iso3 = iso3; }

public static Country from(String iso3) {
  if (iso3 == null || !countryPattern.matcher(iso3).matches())
    throw new UnsupportedOperationException("The country does not look like an iso3");
  return new Country(iso3);
}

Country c = Country.from(cli.options.country);
```

Now we have a proper type to return from our simili-constructor. Right now, it's still `Country`, but we'll quickly change that to be more *expressive*.

## Compiler help us

The compiler won't enforce us to deal with this exception because it's a `RuntimeException`. And that's bad. We are just totally ignoring, discarding, and throwing the error to the trash.

Errors are part of the code. *Errors are not meant to be ignored*, they are meant to be deal with. Errors should be explicit. A code is way more read than written.

> WORM: Write Once Read Many.

Help everybody by expressing the possible outcome of the functions, similar to `throws` for checked exceptions but without its downsides.

## Why throws is not good enough

- it follows a different path than the return type, why having 2 tracks?
- no polymorphism
- implementing an interface enforces us to add the `throws` declaration of exceptions we are often not even throwing. Edit: this is false, an implementation doesn't have to `throws` the same `Exception`s and it can't add new ones. We say interface is a "contract" but up to a point.
- if your implementation needs to throw an `Exception` not present in the interface, you must wrap it into a `RuntimeException` because you can't add it in `throws`.
- Lambdas can't throw checked `Exception`s but only unchecked ones, because all the functional interfaces don't `throws` anything. But lambdas are because ubiquitous with Java 8, meaning you are just hiding tons of unchecked errors in your code. This is why https://github.com/pivovarit/throwing-function or https://projectlombok.org/features/SneakyThrows exist.
- to let the code "clean", a lot of people cast them into `RuntimeException` defeating their purpose
- no composition
- it has to be `Exception`: what if I prefer to have a custom class not related to `Exception`?

`throws` is clearly to throw out because of all of those issues, hence `Exception` propagation with it. We know the compiler type-checks the program to ensure it makes sense. We must rely on it to help us ensuring we handle our errors properly.

# Either is in the place

## A return type with error

*We must express that our function can fail*. Because a function already returns some result `A`, we must express the fact that it can also return another type `E` (an Exception or another class). We want our functions to be *total*: we know its outcome by reading the types. It's basically a tuple, but a tuple doesn't offer us any "smart" functions. There is a way better type to express this: `Either`.

So Either is a "smart tuple" polymorphic in 2 types: `Either<E, A>` and contains two sides: a `Left` (of type `E`) and a `Right` (of type `A`). `Left` and `Right` are called projections of `Either`.

[[info]]
| `Either` is not part of the JDK. We'll use http://www.vavr.io/ which is a Java library containing some functional types to make the development more robust.

By convention:

- Failures are on its left side: `Either.left(new Exception("boo"))`
- Successes are on its right side: `Either.right(42)` (right because it's the right result, right? ;-)

Both of those expressions can be represented by a single type: `Either<Exception, Integer>` (that would be the return type of the function)

[[info]]
| There are other such types to express errors: `Try<A>`, `Validated<E, A>` or even `Option<A>`.
| Each has different "qualities" and drawbacks. We won't explore them here, but feel free to take a look at their documentation.

If we adapt our code with `Either`, that gives:

```java
private Country(String iso3) { this.iso3 = iso3; }

public static Either<Exception, Country> from(String iso3) {
  if (iso3 == null || !countryPattern.matcher(iso3).matches())
    return Either.left(new UnsupportedOperationException("The country does not look like an iso3"));
  return Either.right(new Country(iso3));
}

Either<Exception, Country> c = Country.from(cli.options.country);
```

Our `Country` constructor is now free of logic and just acts as a wrapper of values.

The `Exception` is part of the return type of the factory method. We must deal with it now: we don't have access to the `Country` directly because it may not be available.

We can be "smart" and unwrap the `Country` from the `Either` by throwing an exception (here, the left part) by using `getOrElseThrow`:

```java
Country c = Country.from(cli.options.country).getOrElseThrow(t -> t);
```

That gives us the same behavior as before but here *it's the caller choice now to throw the exception, not the callee choice*.

This is not what we should do because we just lost track of our error here: it became a flying `Exception` in our program again. If we have a part of our program that depends on the `Country`, we can call it only if we are sure we have a `Country` available. This is where we must use `.map`:

```java
Either<Exception, Boolean> b = Country.from(cli.options.country).map(c -> flyTo(c))

boolean flyTo(Country c) { ... }
```

What happened here, our result type is now `Either<Exception, Boolean>`! Where is our `Country`?

`map` passed the `Right` part (`Country`) to `flyTo` that returns a `boolean`. Hence the `Right` part became a `Boolean`. This is how we can deal with errors without losing them.

## Either composes

What if our `flyTo` could itself crash due to some errors? This is where the composition of `Either`s is interesting. When we want to `map` our `Either` with a function that itself returns an `Either`, we must use `flatMap` instead:

```java
Either<Exception, Distance> d = Country.from(cli.options.country).flatMap(c -> flyTo(c))

Either<Exception, Distance> flyTo(Country c) { ... }
```

[[warn]]
| `flatMap` does `map` and _flatten_ the given result otherwise we would get `Either<Exception, Either<Exception, Distance>>`.

This code handles two errors path and one success path that gives a `Distance` at the end.

## Being fluent with Options and Eithers

Let's go back to our factory method to add more logic: we must ensure our iso3 exists and we want to grab its corresponding iso2. The JDK has the list available through `Locale`.

We'll combine more FP constructions here: `Option` and `List` (from vavr, not `java.util`) to adopt a fluent style. Let's show the code and explain:

```java
public static Either<Exception, Country> from(String iso3) {
  if (!countryPattern.matcher(iso3).matches()) {
    return Either.left(new UnsupportedOperationException("Country should be 3 uppercase letters"));
  }

  return List.ofAll(Arrays.stream(Locale.getISOCountries()))
    .filter(iso2 -> new Locale("", iso2).getISO3Country().equalsIgnoreCase(iso3))
    .headOption()
    .map(iso2 -> new Country(iso3))
    .toEither(new IllegalArgumentException("Missing iso3 alpha-2 for country " + iso3));
}
```

- We still have our initial regex check of 3 characters
- We loop through all ISOCountries (they are iso2): `List<String>`
- We only keep (`filter`) the iso2 which has the corresponding iso3 we are looking for. This still returns a `List<String>`
- We grab the first element if it exists: this returns an `Option<String>`
- `Option<A>` is a simpler type than `Either<E, A>`: it can be projected to `Some<A>` or `None`. It also contains `map` and `flatMap` to transform the value if it exists.
- If it exists, we build our `Country` from it with our iso3 and iso2 Strings, that returns an `Option<Country>`
- To match the function signature, we transform our `Option<Country>` into an `Either<Exception, Country>` by providing the `Left` (used if the `Option` is `None`)

Tada, we handle all possible failures explicitely, no exceptions are thrown, no if/else, no free variables, only lambdas. It's a fluent way of coding: just follow the path, there is no alternate track.

## Beyond Exceptions

Notice that we don't care our errors are of type Exception because we are not throwing them.
We should substitute them to a proper type of ours to be more specific and expressive:

```java
interface CountryError {}
class WrongPattern implements CountryError {}
class UnknownCountry implements CountryError {
  private String iso3;
  public UnknownCountry(String iso3) { this.iso3 = iso3; }
}


public static Either<CountryError, Country> from(String iso3) { ... }
```

Here, we implement our error type as an ADT (Algebraic Data Type), also known as _sum type_ because `CountryError = WrongPattern + UnknownCountry` (`+` meaning _or_).

We are returning a proper subset of errors, explicitely reduced to the smallest scope, which has nothing to do with Exceptions.

It's always a good thing to reduce to the maximum what the types can do. It's easier to reason about, and it's less bug-prone.

If you're a bit into Scala, I suggest you to take a look at my other article that goes deeper into this subject (Connascence, Free Theorems, Typeclasses…): [Types: Never commit too early](/articles/2018/08/15/types-never-commit-too-early-part1/)

# Combining types of errors

The difficulty arises when we need to combine several types of errors.

Let's say we have our `flyTo` that handles its own error type `FlyError`:

```java
interface FlyError {}
class NoPilot implements FlyError {}
class TooFarAway implements FlyError {}

Either<FlyError, Distance> flyTo(Country c) { ... }
```

We can't compose them with `flatMap` anymore:

```java
// does NOT compile!
Either<?, Distance> d = from("FRA").flatMap(c -> flyTo(c))
// Incompatible equality constraint: CountryError and FlyError
```

First, it does not compile. Second, what would be our error type? We have two of them! Several solutions:

- Make `CountryError` and `FlyError` inherits a common base such as `BusinessError`. We could have several "main type of errors" (per domain) we could inherit from. We'll need to do that for all our error types, because we never know when we'll need to combine them.
- When it's time to handle it (like in the root of our application), we'll probably need to distinguish between those types. Languages often provide *pattern matching* to do that. It's the equivalent of a bunch of if/else checking for the type of class and casting it, to adapt the treatment.
- Combine them into an `Either` itself! That gives something more complicated in Java:

```java
Either<Either<CountryError, FlyError>, Distance> d = from ("FRA")
    .mapLeft(Either::<CountryError, FlyError>left)
    .flatMap(c -> flyTo(c).mapLeft(Either::right));
```

We are mapping the errors to Either with `mapLeft`, each on a distinct side. We must help the Java compiler to find the good type, hence the hint in-between.

Even Scala does not offer us a nice solution on a silver plate:

```scala
// for-comprehension
val d = for {
  c <- from("FRA").leftMap(_.asLeft[FlyError])
  d <- flyTo(c).leftMap(_.asRight[CountryError])
} yield d

// pattern matching
val d = from("FRA") match {
  case Left(ex) => Left(Left(ex))
  case Right(c) => flyTo(c) match {
    case Left(ex) => Left(Right(ex))
    case Right(d) => Right(d)
  }
}
```

It's shorter and clearer just because we are using the type inference and [cats](https://typelevel.org/cats/) library (to provide `leftMap` in the for-comprehension).

But `Either` won't scale. What we are looking for is a *co-product* (also called a sum-type or disjoint union `type—Either` looks like one) to represent a super-type of all our errors without inheritance and without a particular order. In Scala (there is no such thing in Java), using [shapeless](https://github.com/milessabin/shapeless), we could do:

```scala
type Errors = CountryError :+: FlyError :+: CNil
val d: Either[Errors, Distance] = ???
```

Combining errors can land us in a complex territory. This is why we often have a base `Error` type or we are just using `Exception` as base class.

# Wrap-up

We saw that Errors are better handled with `Either`s because *error management is made explicit* into the code. It is type-checked by the compiler, we can't just forget it.

We often only care about the "happy-path" where everything works as expected. A program has way more "not-happy-paths" (errors) to deal with. Thus *it's important to build around errors* to make a program robust.

Functional Programming libraries have several abstractions available to work with errors: `Either`, `Try`, `Option`, `Validated`. Thanks to them, we can always work with a fluent style and avoid "side tracks". Those types can always be combined, useful when different function return types needs to be mixed-in. This combination forces the developer to be explicit about the error handling. It's not just forsaken to the caller and its caller and so on.

This is easier for anyone to read the code and know about the possibilities of failures, and how they are handled. This makes the code maybe not more readable (especially when several types of error must be handled), but more robust because explicit. We are not going to forget to handle an error during a refactor: the compiler will warn us!

Is it better to write vavr-ified code than idiomatic Java code? I’m sure yes.

This article was originally posted on my medium: don't hesitate to clap it! https://medium.com/@sderosiaux/using-vavr-to-write-more-robust-java-code-87ccb0be12d7