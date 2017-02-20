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


# The Avro API

First, let's remember how to use the Avro Java API to deal with `Schema`, `GenericRecord`, and serialization/deserialization.

## How to generate an Avro Schema and some records

- Create a `User` schema with 80 columns:

```scala
val schema: Schema = {
  val fa = SchemaBuilder.record("User").namespace("com.ctheu").fields()
  (0 to 80).foldLeft(fa) { (fields, i) => fields.optionalString("value" + i) }
  fa.endRecord()
}
```

- Generate a record from this schema with random values:

```scala
val record = new GenericData.Record(schema)
(0 to 80).foreach(i => record.put("value" + i, math.random.toString))
```

We are going to use it for (reading/writing) (from/to) (input/output)streams or bytes during the benchmarks.

## How to convert Avro records to bytes and vice-versa

To serialize a record, we need a few pieces:

- An Avro `GenericRecord` (basically, this is a Map) we're going to convert.
- An `EncoderFactory` to provide an implementation of `org.apache.avro.io.Encoder` (we'll use both `BufferedBinaryEncoder` and `DirectBinaryEncoder`, but a `JsonEncoder` also exists). The encoder contains a bunch of low-level methods `writeFloat`, `writeString` and so on. The impl can write them where it desires. The default Avro encoders write them only into an `OutputStream` (in which you can only write bytes).
- This is why we need to provide a `OutputStream` that will be filled with bytes by the `Encoder`. We can only write into a `OutputStream` or convert it to bytes.
- Because the `Encoder` is low-level, we need a more high-level component to call the methods `write*` for us: it's the role of the `DatumWriter` that needs an `Encoder` to write something. The `DatumWriter` just knows how to parse the object.

```scala
def toBytes(record: GenericRecord, schema: Schema): Array[Byte] = {
  val writer = new GenericDatumWriter[GenericRecord](schema)
  val out = new ByteArrayOutputStream()
  val encoder = EncoderFactory.get().binaryEncoder(out, null)
  writer.write(record, encoder)
  encoder.flush() // !
  out.toByteArray
}
```

Same story to deserialize some bytes into a record, except we use an `InputStream` and a `Decoder` (that can `readInt`, `readString` etc. from the stream):

```scala
def toRecord(buffer: Array[Byte], schema: Schema): GenericRecord = {
  // Note that we can provide 2 schemas here: the writer schema and the reader schema
  val reader = new GenericDatumReader[GenericRecord](schema)
  val in = new ByteArrayInputStream(buffer)
  val decoder = DecoderFactory.get().binaryDecoder(in, null)
  reader.read(null, decoder)    
}
```

Don't reuse those implementations, they are not optimized at all and create a whole stack of objects every time.
A same writer/reader can be used as many times as we want, as long as the data fits its schema.{.warn}

# Test Cases and conditions

To start properly a benchmark, we need to specify the tests conditions and versions:

- CPU i5 2500k, 3.30GHz, 4 cores.
- jdk1.8.0_121
- sbt 0.13.8 and Scala 2.11.8
- `"org.apache.avro" % "avro" % "1.8.1"`
- `"sbt-jmh" % "0.2.21"`
- JMH configured with: 1 iteration, 1 warmup iteration, 2 forks, 1 thread.

## What we'll test: encoders, decoders, reuse, bufferSize

We are going to test the default decoder `binaryDecoder` (buffered) and its unbuffered version `directBinaryDecoder`.
Same for the encoders `binaryEncoder` and `directBinaryEncoder`.

Encoders and decoders accept a nullable `reuse` parameter, to avoid to create new encoder/decoder instances in memory every time they write/read, and reuse (reconfigure) an existing one.

```java
public BinaryEncoder binaryEncoder(OutputStream out, BinaryEncoder reuse) {}
public BinaryDecoder binaryDecoder(byte[] bytes, BinaryDecoder reuse) {}
```

There is an additional reuse parameter available when we deserialize a record: the `GenericDatumReader` (which uses a `Decoder`) also accepts a nullable `reuse` argument to update an existing instance object (which class must implement `IndexedRecord`) instead of creating a new instance:
```java
public D read(D reuse, Decoder in) throws IOException {}
```

Finally, encoders and decoders also have a configurable `bufferSize` (through their factory).
Their defaults are:
- 2048 bytes for the encoders: to bufferize serialized data before flushing them into the output stream.
- 8192 bytes for the decoders: to read that much data from the input stream, chunk by chunk.

## Test Cases

- `binaryDecoder`:
  - with and without encoder reuse
  - with and without record reuse
- `directBinaryDecoder`:
  - with and without encoder reuse
  - with and without record reuse

- `binaryEncoder`:
  - with and without encoder reuse
- `directBinaryEncoder`:
  - with and without encoder reuse

We will use a 80-Strings-containing-10-digits-each record in all cases.

Note that Strings are slower to handle than Doubles for instance. 80x Doubles offer ~20% more throughput than 80x Strings.{.info}

## Schema Registry

Finally, we will use a Schema Registry (AVRO-1124 and Confluent's) to deal with schema versioning.

- To read data, we will need grab the schema ID contained inside the data, get the corresponding schema, and read the data using it.
- To write data, we will need to push our schema to the Schema Registry (if not done yet) and write the corresponding schema ID in the data.

We will see how the schema registry client API deal with schema caching.

# Results

## Encoders

There are 6 tests, and they look like this:

```scala
@Benchmark @Fork(2)
def withoutReuse1record(s: AvroState, bh: Blackhole) = {
  s.encoder = s.encFactory.binaryEncoder(s.os, null)
  writer.write(record, s.encoder)
  bh.consume(s.os.toByteArray)
}

@Benchmark @Fork(2)
def withReuse1record(s: AvroState, bh: Blackhole) = {
  s.encoder = s.encFactory.binaryEncoder(s.os, s.encoder)
  writer.write(record, s.encoder)
  bh.consume(s.os.toByteArray)
}
```

The other tests just loop on the `write` to write multiple records in the same iteration.

Here are the results:

```
withReuse1record        thrpt   40   3722,074 ± 174,148  ops/s
withoutReuse1record     thrpt   40  80384,958 ± 208,405  ops/s

withReuse10record       thrpt   40   1085,234 ±  11,785  ops/s
withoutReuse10record    thrpt   40   1190,944 ±   7,053  ops/s

withReuse1000record     thrpt   40     54,490 ±   0,292  ops/s
withoutReuse1000record  thrpt   40     54,020 ±   0,359  ops/s
```

- 1000 records: 54 ops/s, hence 54000 records/s.
- 10 records: 1190 ops/s, 11900 records/s.
- 1 record: 80384 record/s: the highest!

Writing multiple records did not improve our throughput because the buffer was still 2048 bytes.
If we increase it to 1024*1024, we get much better results:
```
withoutReuse10record    thrpt   20  5116,433 ± 30,456  ops/s
withoutReuse1000record  thrpt   40  82,362 ± 0,238  ops/s
```
- 10 records: 5116 ops/s, hence 51160 records/s. 
- 1000 records: 82 ops/s, hence 82000 records/s, we achieve the best throughput here.

Note that using `reuse` with the encoders seems useless or just totally broken (with 1 record to serialize).
I guess (I didn't measured) it is because of the reflection in `EncoderFactory.binaryEncoder`:

```java
public BinaryEncoder binaryEncoder(OutputStream out, BinaryEncoder reuse) {
  if (null == reuse || !reuse.getClass().equals(BufferedBinaryEncoder.class)) {
    ...
  }
}
```

## Decoders

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

# With a Schema Registry

When we use Avro, we must deal with a Schema Registry (SR)

There are two choices:
- [Confluent's](http://docs.confluent.io/3.1.2/schema-registry/docs/index.html)
- [schema-repo](https://github.com/schema-repo/schema-repo) which is the implementation of [AVRO-1124](https://issues.apache.org/jira/browse/AVRO-1124). We'll go with the latter, because it's simpler to integrate.

Dealing with a SR enforces to code the version of the schema into the payload, as the first bytes.

- On serialization: we contact the SR to register (if not already) the Avro schema of the data we're going to write (to get an ID). We write this ID as the first bytes, then we append the data.
- On deserialization: we read the first bytes of the payload to know what is the version of the Avro schema that was used to write the data. We contact the SR with this ID to grab the Schema, then we used this Schema to read the data. (or a compatible's one if we ensure backward/forward compatibility)

Anyway, the serialization/deserialization now must deal with another step for each and every message.
Generally, the client API of the SR has a cache, to not call the SR server every time.



# Having fun: Custom Encoder and OutputStream.

Observable? Akka Streams?


# Conclusion

Buffers, caches, and a proper usage of the OutputStream is probably our best bet to get the better performance.
