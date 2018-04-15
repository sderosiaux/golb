---
title: "Scala SAM, compatibility with Java 8"
date: "2017-09-01T02:08Z"
layout: post
path: "/2017/09/01/scala-sam-compatibility-with-java-8/"
language: "en"
tags: scala, java
---


Install sbt 1.0.0

sbt console: it will download a few things globally

We know have Scala 2.12.3 running!

```scala
scala> val t: Runnable = () => println("in thread")
t: Runnable = $$Lambda$3681/1587250725@33635859
```
The cast to `Runnable` is necessary to not end with a `Function1`.
Scalac is smart enough to "convert" it to a lambda, without implementing the interface, à la Java 8.

```scala
scala> :javap -c -p t
Compiled from "<console>"
public class $line3.$read$$iw$$iw$ {
  public static $line3.$read$$iw$$iw$ MODULE$;

  private final java.lang.Runnable t;

  public static {};
    Code:
       0: new           #2                  // class $line3/$read$$iw$$iw$
       3: invokespecial #24                 // Method "<init>":()V
       6: return

  public java.lang.Runnable t();
    Code:
       0: aload_0
       1: getfield      #27                 // Field t:Ljava/lang/Runnable;
       4: areturn

  public static final void $anonfun$t$1();
    Code:
       0: getstatic     #34                 // Field scala/Predef$.MODULE$:Lscala/Predef$;
       3: ldc           #36                 // String in thread
       5: invokevirtual #40                 // Method scala/Predef$.println:(Ljava/lang/Object;)V
       8: return

  public $line3.$read$$iw$$iw$();
    Code:
       0: aload_0
       1: invokespecial #41                 // Method java/lang/Object."<init>":()V
       4: aload_0
       5: putstatic     #43                 // Field MODULE$:L$line3/$read$$iw$$iw$;
       8: aload_0
       9: invokedynamic #59,  0             // InvokeDynamic #0:run:()Ljava/lang/Runnable;
      14: putfield      #27                 // Field t:Ljava/lang/Runnable;
      17: return
}
```

However, to remove the overhead of the console, we'll compile simple Apps.

```scala
// 'App2$.class'   App2.class
object App2 {
  def main(args: Array[String]) = {
    val t: Runnable = () => 1
  }
}
```
```scala
public final class App2$ {
  public static App2$ MODULE$;

  public static {};
    Code:
       0: new           #2                  // class App2$
       3: invokespecial #12                 // Method "<init>":()V
       6: return

  public void main(java.lang.String[]);
    Code:
       0: return

  public static final void $anonfun$main$1();
    Code:
       0: return

  private App2$();
    Code:
       0: aload_0
       1: invokespecial #19                 // Method java/lang/Object."<init>":()V
       4: aload_0
       5: putstatic     #21                 // Field MODULE$:LApp2$;
       8: return
}
```





- `$anonfun$t$1` is the code inside the lambda

# Lambdas

 The Scala 2.12 type checker accepts a  function literal as a valid expression for any Single Abstract Method (SAM) type

"A function literal, such as x => x is now accepted when a
Single Abstract Method (SAM) type is expected, "

https://blog.ippon.fr/2016/11/30/scala-2-12-lambda-expression/

invokedynamic in scala => java.lang.invoke.LambdaMetaFactory
 in most cases, the compiler does not need to generate an anonymous class for each closure.
 Compiling with -Ypartial-unification improves type constructor inference with support for partial unification, fixing the notorious SI-2712. 


https://gist.github.com/retronym/0178c212e4bacffed568

Scala 2.12 emits bytecode for functions in the same style as Java 8, whether they target a FunctionN class from the standard library or a user-defined Single Abstract Method (SAM) type.

 adding a second abstract method remove the SAM "qualification": test it!

LambdaMetaFactory (LMF) is not aware of Scala's trait encoding, it can only properly instantiate traits that correspond to "pure" Java interfaces
=> if we add a println(..) in the trait it will need to create a proper class etc..: TO TEST!

=> test a Scala 2.12 class in Java (should be useable with lambda, whereas compiled in 2.11 it was not)

-Xsource:2.11

# Traits and default interfaces

trait =!= interface java
https://blog.ippon.fr/2016/11/23/scala-2-12-unification-interface-et-trait/

# Lazy val made easier

# 
SCALA-JAVA8-COMPAT ?

# Macros and SAM ?
https://github.com/scala/scala/blob/v2.12.0/test/files/run/indy-via-macro-with-dynamic-args/macro_1.scala


https://github.com/scala/scala/pull/4971
https://github.com/scala/scala/pull/3616

