---
title: "murmur3 hash function usages"
date: "2017-08-20T02:08Z"
layout: post
path: "/2017/08/20/murmur3-hash-function-usages/"
language: "en"
tags: scala, murmur, hashtable
---

> "A hash function is any algorithm or subroutine that maps large data sets of variable length, called keys, to smaller data sets of a fixed length."

Basically:

![hash](hash.png)

Notice that a hash function is expected to have collisions (you could map N*2 keys into a space N (a _bucket_)) but its goal is to reduce them at the maximum while distributing (spreading) the hashes the most it can. Therefore, you can't just "go back" from a hash to its key, because a hash has an infinite number of corresponding keys.

"murmur" stands for multiply, rotate, multiply, rotate, because it's exactly what it does! Along some XORs and bit-shifting operations.
murmur3 is well-known hash function, largely used, because of its simplicity, speed, and features (good distribution, good avalanche effect).


It is used across several domains: ids generator, checksums, hash tables, bloom filters, hyperloglog.. anywhere you need to get a fairly unique fixed-length numerical ID (from anything, a string, some bytes[], an object) to be used inside those data-structures.

---
Summary {.summary}

[[toc]]

---

# Murmur3

murmur1 exists since 2008 and murmur3 is the 3rd version (better, stronger, faster!). It fixes some flaws of murmur2 and has a 128-bit variant for x64 processors (default is 32-bit encoding).

murmur3 is NOT a cryptographic hash function: meaning it MUST NOT be used when security is at stake. It's _easy_ for an attacker to provoke murmur3 collisions and use them at its advantage. (Hash Denial Of Service attack explained with... [cats](https://www.anchor.com.au/blog/2012/12/how-to-explain-hash-dos-to-your-parents-by-using-cats/)).

![HashDOS](hashdos.png)

murmur3 is mostly used for lookups (in datastructures that supports it, such as hashtables, bloom filters etc.).

## Principle

As said, "murmur" stands for multiply, rotate, and actually XOR and bit-shifting operations.

It relies on:
- A seed, to start with. It is often customizable BUT it has to be carefully set because a different seed will lead to a different hash for the same key (hence careful of multi-threading environments etc.).
- Some fixed constants, determined empirically (through a simulated-annealing algorithm).

It's possible to give a try [online](http://murmurhash.shorelabs.com/). Note that the constants are different for both platforms x86 and x64, thus being the hashes (for a same key).

## Goals

- Simple and fast: it needs to use as few instructions as possible, while being as fast as possible and remaining statistically strong.
- Distribution: it needs to pass the Chi-Square distribution tests for all keysets and bucket sizes to ensure there is no correlation whatsoever and is similar to pure randomness. The hash space should be filled randomly.
- Avalanche Effect: when one bit in the key changes, at least half the bits should changes in the hash. It is to ensure the funtion has a good randomization and no forecast is possible (or hardly).
- Collision Resistance: a good hash function should almost never have collisions. In the 128-bit variant, the hash space is quite huge: 3.4028237e+38: it should be nearly impossible to have a collision. Moreover, 2 different keys should have only a random chance to collision, no more.

## Avalanche effect

As we know, murmur3 has a good avalanche effect.

When one bit in the key is flip, then at least half of the bits in the hash should change.

- Key: `0001` ⇨ `2484513939` (32-bit) / `e0f2f4fbd96bb1d5d96bb1d5d96bb1d5` (128-bit)
- Key: `0010` ⇨ `0019522071` (32-bit) / `9dd4f4e73df769b33df769b33df769b3` (128-bit)
- Key: `0011` ⇨ `0264741300` (32-bit) / `34164a823c142feb3c142feb3c142feb` (128-bit)

The _finalizer_ (or _bit mixer_) of a hash function takes care of the avalanche effect, it's the last part of the process.

In Scala, murmur3 is part of the standard library, and it's defined using the 32-bit finalizer (`Int`):

```scala
private final def avalanche(hash: Int): Int = {
  var h = hash
  h ^= h >>> 16
  h *= 0x85ebca6b
  h ^= h >>> 13
  h *= 0xc2b2ae35
  h ^= h >>> 16
  h
}
```

We can use it with different types of objects:
```scala
val hash: Int = MurmurHash3.stringHash("hello")
MurmurHash3.productHash((1, 2))
MurmurHash3.arrayHash(Array(1, 2))
MurmurHash3.bytesHash("hello".getBytes(Charset.forName("utf8")))
```

It's also possible to use Guava, which implements both 32-bit and 128-bit variant, with the 64-bit finalizer (`long`):

```java
private static long fmix64(long k) {
  k ^= k >>> 33;
  k *= 0xff51afd7ed558ccdL;
  k ^= k >>> 33;
  k *= 0xc4ceb9fe1a85ec53L;
  k ^= k >>> 33;
  return k;
}
```

Example of usages:

```scala
val m32 = Hashing.murmur3_32()
val m128 = Hashing.murmur3_128()
m32.hashBytes("hello".getBytes(Charsets.UTF_8)).asInt()
m128.hashBytes("hello".getBytes(Charsets.UTF_8)).asInt()
m128.hashString("hello", Charsets.UTF_8)
m128.hashInt(10)
case class Foo(a: Int)
m128.hashObject(Foo(2), (from: Foo, into: PrimitiveSink) => into.putInt(from.a))
```

The finalizers constants were determined through a simulated-annealing algorithm, but it seems possible to get slightly better results as shown [here](http://zimbry.blogspot.fr/2011/09/better-bit-mixing-improving-on.html) (by removing the random part).

Here is a small program to test the Avalanche effect (sure it can be simplified!).

It picks a random number, then alter one of its bits at each iteration. It does it 10M times and counts how many times it got more than 16 identical bits between the previous hash and the new hash (with the altered key), to know when the avalanche was not good enough:

```scala
val MAX_ITERATIONS = 1e7
val rnd = ThreadLocalRandom.current()
val start = rnd.nextInt()
val pows = (0 to 31).map(Math.pow(2, _).toInt)

def countIdenticalBits(a: Int, b: Int): Int = pows.count(p => (a & p) == (b & p))
def flipRandomBit(a: Int): Int = a ^ (1 << Math.pow(2, rnd.nextInt(32)).toInt)

// we need to convert out Int to bytes[]
def murmurize(a: Int): Int = MurmurHash3.bytesHash(ByteBuffer.allocate(4).putInt(a).array())

// Here we go
def test(threshold: Int) = {
  @tailrec
  def testRecursive(iteration: Int, value: Int, count: Int): Int = iteration match {
    case MAX_ITERATIONS => count
    case _ =>
      val newValue = flipRandomBit(value)
      val same = countIdenticalBits(murmurize(value), murmurize(newValue))
      testRecursive(iteration + 1, newValue, count + (if (same > threshold) 1 else 0))
  }
  val belowThreshold = testRecursive(0, start, 0)
  println("At least ${belowThreshold*100/MAX_ITERATIONS}% got ${threshold} bits changed each time")
}

test(16)
```
If we test several thresholds, we get:

```c
At least 96% got 10 bits changed each time
At least 94% got 11 bits changed each time
At least 89% got 12 bits changed each time
At least 80% got 13 bits changed each time
At least 69% got 14 bits changed each time
At least 61% got 15 bits changed each time
At least 41% got 16 bits changed each time
At least 21% got 17 bits changed each time
At least 12% got 18 bits changed each time
At least  8% got 19 bits changed each time
At least  5% got 20 bits changed each time
```

If we look at the threshold 16, it means that 41% of the hashes had more than half (32/2) of their bits changed.
"Only" 5% had more than 20 bits changed each time. Most of them had almost always at least 10 bits changed.

Not sure it's normal to be this "low". Am I wrong somewhere? I would expect nearly 100% for 16. (half of the bits should always changed)

To take a closer look at the relations between the input bits and the output bits, [here is a good place](https://research.neustar.biz/tag/murmur-hash/). We can see clearly some patterns emerging among others hash functions but not with murmur3.

## Distribution and collisions

As we said, murmur3 is NOT a cryptographic hash function.

Hash DOS attacks can provoke murmur3 collisions and create slow hashtable lookups (O(n)) by making inserts into the same bucket (by generating tons of values with the same hash), thus making the service unstable.

The murmur3 distribution is "simili-random"; the Chi-Square distribution test is used to prove it.

To test the collisions, let's create our own "hash table", and insert tons of values inside. At the end, we'll check how many buckets with collision (several values inside) we have generated:

```scala
def murmurize(a: Long): Int = MurmurHash3.bytesHash(ByteBuffer.allocate(8).putLong(a).array())

val m = mutable.Map[Int, mutable.ListBuffer[Long]]()
(1 to 1000000).foreach { _ =>
  val r = rnd.nextLong() // we'll ignore the same random values
  val hash = murmurize(r)
  m.get(hash) match {
    case Some(v) => if (!v.contains(r)) m(hash) += r
    case None => m(hash) = mutable.ListBuffer(r)
  }
}

println(m.values.count(_.length > 1) + " buckets with collisions")
```

By inserting around 1M random numbers, we always get around ~100 buckets with collisions (with just 2 items inside), meaning 200 keys collided, from a base of 1M random Longs, thus 0.02%.

It was not that meaningful to test with random numbers, let's try with real data:

- [4M passwords](https://github.com/danielmiessler/SecLists/blob/master/Passwords/openwall_all.txt): No collision ✔
- [40k IPs](https://lists.blocklist.de/lists/all.txt): No collision ✔
- 2M file paths^[I indexed my system, the file containing all the path takes 220M!]: More than 400 collisions ✖

Those paths have the same hash for instance:
- `c:\Windows\SoftwareDistribution\Download\905d46ae330597577d57284aac989979\package_235_for_kb4032188~31bf3856ad364e35~amd64~~10.0.1.9.cat` and `c:\Windows\System32\msxml3.dll`
- `c:\Program Files\iTunes\CoreFoundation.resources\th.lproj\Error.strings` and `c:\Windows\SysWOW64\usbperf.dll`

## The Seed

We must be especially aware that in a multi-thread or distributed processes environment that need to get the same hash for a given key: they must use the same seed!

If the seed is different, the hash will be different, for the same key:

```scala
// def stringHash(str: String, seed: Int): Int
println(MurmurHash3.stringHash("hello", 987))
println(MurmurHash3.stringHash("hello", 988))
// -1515933371
// 3185560
```

Most implementations provides a fixed seed (and NOT `System.currentTimeMillis()` for instance) but also generally provides a signature to set it manually.


# Benchmarks

Parler de SMHasher (la testing suite des hash functions), à noter les forks  https://github.com/rurban/smhasher avec + de functinos

benchmark speed
- + compare with md5
https://softwareengineering.stackexchange.com/questions/49550/which-hashing-algorithm-is-best-for-uniqueness-and-speed

# Use-cases

- [Cassandra](https://www.datastax.com/dev/blog/the-most-important-thing-to-know-in-cassandra-data-modeling-the-primary-key): it is using murmur3 to hash the partition key to  determine where to send the data (which node and replicas).
- Spark: [HashingTF](https://github.com/apache/spark/blob/master/mllib/src/main/scala/org/apache/spark/mllib/feature/HashingTF.scala) (term frequency, in SparkML), [Bloom Filter](https://github.com/apache/spark/blob/master/common/sketch/src/main/java/org/apache/spark/util/sketch/BloomFilterImpl.java#L87) 
- usage pour password?

## Unique Id

- used to generate uniq id of a byte[]

## Hash tables

==> Hash table (memcached)
you hash, them take only a few bits or just modulo (otherwise you can end up with 2^32 buckets)
generally you have even a prime number of slot, to prevent biasing
Pigeonhole principle
resizing => need to rehash the whole set (into to a new table often)

## HyperLogLog

==> HyperLogLog (hive, druid, voltdb, solr)

## Bloomfilter

It's a "Sketch".
==> BloomFilter (hive)
Elasticsearch: as type of mapping, to speedup cardinality aggregation.
https://github.com/google/guava/wiki/HashingExplained
http://llimllib.github.io/bloomfilter-tutorial/

# Other hash functions

xxHash64 (especially on x86-64)
SpookyHash
https://github.com/vnmakarov/mum-hash

Jenkins lookup3
Hsieh SuperFastHash
City Hash
FNV1/1a
SDBM


The Go versions: https://github.com/dgryski/dgohash


# Perfect generator

There are even a program called [gperf](http://savannah.gnu.org/projects/gperf/) to generate a perfect hash function (no collision) from a given set of keys.