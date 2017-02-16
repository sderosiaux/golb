---
title: "Avro Benchmark"
date: "2017-02-14T00:45Z"
layout: post
path: "/2017/02/14/avro-benchmark/"
language: "en"
tags: scala, avro, benchmark, schema registry
---

I was intrigued by...

---
Summary {.summary}

[[toc]]

---

# Test Cases and conditions

Even if that does not matter a lot for the types of benchmarks done here, the tests conditions:

- Windows 10
- Started from IntelliJ IDEA Community Edition 2016.3
- jdk1.8.0_121
- SBT 0.13.8
- `"sbt-jmh" % "0.2.21"`
- 1 iteration, 1 warmup iteration, 2 forks, 1 thread: `-i 1 -wi 1 -f2 -t1`

We are going to test a lot of conditions:

## Encoders tests

- `binaryDecoder`: 8 cases
  - with and without the same `byte[]`
  - with and without encoder reuse
  - with and without record reuse
- `directBinaryDecoder`: 4 cases
  - with and without encoder reuse
  - with and without record reuse

## Decoders tests

- `binaryEncoder`: 2 cases
  - with and without encoder reuse
- `directBinaryEncoder`: 2 cases
  - with and without encoder reuse

## Schema Registry integration

Then we are going to add the integration of Schema Registry (AVRO-1124) and therefore special code to deal with the schema ID contained inside the data.


# Avro Fixtures

## How to generate an Avro Schema and Record

Let's remember how to write a Avro `Schema` and how to generate an associated `GenericRecord`:

We create a `User` schema with 80 columns:

```
val schema: Schema = {
    val fa = SchemaBuilder.record("User").namespace("com.ctheu").fields()
    (0 to 80).foldLeft(fa) { (fields, i) => fields.optionalString("value" + i) }
    fa.endRecord()
}
```

We can generate a typical record from this schema with random values:

```
val record = new GenericData.Record(schema)
(0 to 80).foreach(i => record.put("value" + i, math.random.toString))
```

We are going to use it for (reading/writing) (from/to) (input/output)streams or bytes.

## The types matter

Strings are slower to deserialize than Double. I did some benchmarks, 80 `Double`s offer ~20% more throughput than 80 `String`s.
But here, we'll only deal with Strings, to stay focus and keep our benchmarks consistent.

# Results

```
[info] BenchAvroDecoder.withRecordwithReuseDifferentBytes        thrpt   40  146761,403 ± 1483,324  ops/s
[info] BenchAvroDecoder.withRecordwithReuseSameBytes             thrpt   40  151928,116 ±  999,925  ops/s
[info] BenchAvroDecoder.withRecordwithoutReuseDifferentBytes     thrpt   40  145862,759 ±  553,193  ops/s
[info] BenchAvroDecoder.withRecordwithoutReuseSameBytes          thrpt   40  155424,672 ± 1176,485  ops/s

[info] BenchAvroDecoder.withoutRecordwithReuseDifferentBytes     thrpt   40  127987,146 ± 1083,477  ops/s
[info] BenchAvroDecoder.withoutRecordwithReuseSameBytes          thrpt   40  133838,137 ±  502,263  ops/s
[info] BenchAvroDecoder.withoutRecordwithoutReuseDifferentBytes  thrpt   40  128667,044 ± 1029,019  ops/s
[info] BenchAvroDecoder.withoutRecordwithoutReuseSameBytes       thrpt   40  130546,352 ±  731,799  ops/s
```

## DirectDecoder approach

The tests:

```scala
@Benchmark
def withRecordwithoutReuse(): Unit = {
    decoder = factory.directBinaryDecoder(is, null)
    reader.read(record, decoder)
}

@Benchmark
def withRecordwithReuse(): Unit = {
    decoder = factory.directBinaryDecoder(is, decoder)
    reader.read(record, decoder)
}

@Benchmark
def withoutRecordwithoutReuse(): Unit = {
    decoder = factory.directBinaryDecoder(is, null)
    reader.read(null, decoder)
}

@Benchmark
def withoutRecordwithReuse(): Unit = {
    decoder = factory.directBinaryDecoder(is, decoder)
    reader.read(null, decoder)
}
```

The DirectDecoder reads from an `InputStream` only (no `byte[]`), and does not read by "batch" (no internal buffer).
It does not offer the best throughput but can work with such streams.

```
[info] BenchDirectDecoder.withRecordwithReuse        thrpt   40  108643,480 ± 1558,473  ops/s
[info] BenchDirectDecoder.withRecordwithoutReuse     thrpt   40  106254,714 ± 2548,940  ops/s
[info] BenchDirectDecoder.withoutRecordwithReuse     thrpt   40  100771,416 ±  314,145  ops/s
[info] BenchDirectDecoder.withoutRecordwithoutReuse  thrpt   40  101595,279 ±  623,656  ops/s
```

In our case, the performance are ~20% worse than the buffered approach (`binaryDecoder`).

## NEVER REUSE the encoder!

The tests:

```scala
@Benchmark
def withoutReuse(): Array[Byte] = {
    encoder = encFactory.binaryEncoder(os, null)
    writer.write(record, encoder)
    os.toByteArray
}

@Benchmark
def withReuse(): Array[Byte] = {
    encoder = encFactory.binaryEncoder(os, encoder)
    writer.write(record, encoder)
    os.toByteArray
}
```
One reuse the previous encoder, the other does not.

Surprise, the throughput with the reuse is just totally off:

```
[info] BenchAvroEncoder.withReuse     thrpt   40   2218,477 ± 100,031  ops/s
[info] BenchAvroEncoder.withoutReuse  thrpt   40  59246,717 ± 228,516  ops/s
```

I guess (I didn't measured) it is because of the reflection in `EncoderFactory.binaryEncoder`:
```java
  public BinaryEncoder binaryEncoder(OutputStream out, BinaryEncoder reuse) {
    if (null == reuse || !reuse.getClass().equals(BufferedBinaryEncoder.class)) {
        ...
    }
  }
```