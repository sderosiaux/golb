same typeclass in different instances?
=> Use type dependent path!

here are 3 evolutions

// wrong, =:= works with types, not instances!
  object A {

    trait Toto[A] {
      type TC
    }

    def toto[A: Order](v: A): Toto[A] = new Toto[A] {
      type TC = Order[A] /* wrong but for the example */
    }

    val x = toto(1)
    val y = toto(2)
    //implicitly[x.TC =:= y.TC] // cannot prove
  }
}

object V1 extends App {

  // main flaw: the impl is inside the typeclass: not modular (

  trait TC[A] { self =>
    class Inner {
      def mix(t2: self.Inner) = ()
    }
  }

  def make[A](v: A)(implicit tc: TC[A]): tc.Inner = { // can't use bound context, it won't be able to type properly
    new tc.Inner()
  }

  val ref = new TC[Int] {}
  val a: ref.Inner = make(5)(ref) // IntelliJ wants to type as "TC[Int]#Inner" but it's wrong. And even there, it complains but scalac compiles.
  val b: ref.Inner = make(6)(ref) // IntelliJ wants to type as "TC[Int]#Inner" but it's wrong. And even there, it complains but scalac compiles.
  a.mix(b)

  val anotherRef = new TC[Int] {}
  val c: anotherRef.Inner = make(6)(anotherRef) // it's quite clear the type is different when annotated manually!
  //b.another(c) // ERROR! Can't compile!

}

object V2 extends App {


// good enough?

  trait TC[A] {
    def mix(a: A, b: A): A
  }

  class InnerMaker[A: TC] { self =>
    abstract class Inner(val a: A) {
      def mix(other: Inner): Inner
    }
    private class InnerImpl(a: A) extends Inner(a) {
      override def mix(t2: Inner): Inner =
        make(implicitly[TC[A]].mix(this.a, t2.a))
    }
    def make(a: A): Inner = new InnerImpl(a)
  }

  val makerA = new InnerMaker[Int]()(new TC[Int] {
    override def mix(a: Int, b: Int): Int = a + b
  })
  val a: makerA.Inner = makerA.make(5) // IntelliJ find the right type here!
  val b: makerA.Inner = makerA.make(6)
  println(a.mix(b))

  val makerB = new InnerMaker[Int]()(new TC[Int] {
    override def mix(a: Int, b: Int): Int = a * b
  })
  val c: makerB.Inner = makerB.make(6) // it's quite clear the type is different when annotated manually!
  // b.mix(c) // ERROR! Can't compile!
}
