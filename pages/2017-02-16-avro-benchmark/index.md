---
title: "How to use the Avro API with a Schema Registry, and benchmarks"
date: "2017-02-14T00:45Z"
layout: post
path: "/2017/02/14/avro-benchmark/"
language: "en"
tags: scala, avro, benchmark, schema registry, confluent
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

- Encoders and decoders accept a nullable `reuse` parameter, to avoid to create new encoder/decoder instances in memory every time they write/read, and reuse (reconfigure) an existing one.

```java
public BinaryEncoder binaryEncoder(OutputStream out, BinaryEncoder reuse) {}
public BinaryDecoder binaryDecoder(byte[] bytes, BinaryDecoder reuse) {}
```

- There is an additional "reuse" parameter available when we deserialize a record: the `GenericDatumReader` (which uses a `Decoder`) also accepts a nullable `reuse` argument to update an existing instance object (which class must implement `IndexedRecord`) instead of creating a new instance as result:
```java
public D read(D reuse, Decoder in) throws IOException {}
```

- Finally, encoders and decoders also have a configurable `bufferSize` (passed down by their factory).
Their defaults are:
  - 2048 bytes for the encoders: to bufferize serialized data before flushing them into the output stream.
  - 8192 bytes for the decoders: to read that much data from the input stream, chunk by chunk.

## Test Cases

We are going to test all the "reuse" combinaisons and play with the size of the data to serialize/deserialize at once, and see the impact of the `bufferSize`.

- `binaryEncoder` and `directBinaryEncoder`: with and without encoder reuse, 1/10/1000 records.
- `binaryDecoder` and `directBinaryDecoder`: with and without decoder reuse, with and without record reuse, 1/10/1000 records.

We will use a 80-Strings-containing-10-digits-each record in all cases.

Note that Strings are slower to handle than Doubles for instance. 80x-Doubles records offer ~20% more throughput than 80x-Strings records.{.info}

## Schema Registry

Finally, we will use a Schema Registry (AVRO-1124 with [schema-repo](https://github.com/schema-repo/schema-repo) and [Confluent's](https://github.com/confluentinc/schema-registry)) to deal with schema versioning.

- To read data, we will need grab the schema ID contained inside the data, get the corresponding schema, and read the data using it.
- To write data, we will need to push our schema to the Schema Registry (if not done yet) and write the corresponding schema ID in the data.

We will also see how the schema registry client API deals with schema caching (we won't do a HTTP request for each message).

# Results

## Encoders

As previously said, we are going to test:
- `binaryEncoder` and `directBinaryEncoder`: with and without encoder reuse, 1/10/1000 records.

This represents 12 tests, and they look like this:

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

The other 4 tests just loop on the `write` to write multiple records in the same iteration.

Here are the results:

```
> withoutReuse1record         thrpt   40  80384,958 ± 208,405  ops/s
withReuse1record              thrpt   40   3722,074 ± 174,148  ops/s
withoutReuse1recordDirect     thrpt   40   3777,333 ± 175,610  ops/s
withReuse1recordDirect        thrpt   40   3759,544 ± 172,830  ops/s

> withoutReuse10record        thrpt   40   1190,944 ±   7,053  ops/s
withReuse10record             thrpt   40   1085,234 ±  11,785  ops/s
withoutReuse10recordDirect    thrpt   20   1096,232 ±   8,400  ops/s
withReuse10recordDirect       thrpt   20   1097,405 ±   4,614  ops/s

> withoutReuse1000record      thrpt   40     54,020 ±   0,359  ops/s
withReuse1000record           thrpt   40     54,490 ±   0,292  ops/s
withoutReuse1000recordDirect  thrpt   20     52,407 ±   0,383  ops/s
withReuse1000recordDirect     thrpt   20     51,923 ±   0,280  ops/s
```

The bufferized and the direct encoders have the same performance, except for the 1 record processing where the direct encoder is always bad.

If we look at the buffered encoder, without reuse, and normalize by records/s, we get:

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

Using `reuse` with the encoders and 1 record seems useless or just totally broken (see withReuse1record).{.warn}

I guess (I didn't measured) it is because of the reflection in `EncoderFactory.binaryEncoder`:

```java
public BinaryEncoder binaryEncoder(OutputStream out, BinaryEncoder reuse) {
  if (null == reuse || !reuse.getClass().equals(BufferedBinaryEncoder.class)) {
    ...
  }
}
```

To conclude:
- The `directBinaryEncoder` has no buffer, and directly writes its data into the output stream. It's only useful if no buffer is really needed (short live) or if the stream is not compatible.
- Do not use the `reuse` param for the encoders
- It seems useless to batch the writes using the same encoder (poor gain) but if you do, increase greatly the `bufferSize`.

## Decoders

As previously said, we are going to test:

- `binaryDecoder` and `directBinaryDecoder`: with and without decoder reuse, with and without record reuse, 1/10/1000 records.

This represents 24 tests! and they look like this:

```scala
@Benchmark
def withoutRecordwithoutReuse1(s: AvroState, bh: Blackhole) = {
  s.decoder = s.decFactory.binaryDecoder(bytes, null)
  bh.consume(reader.read(null, s.decoder))
}

@Benchmark
def withRecordwithoutReuse1(s: AvroState, bh: Blackhole) = {
  s.decoder = s.decFactory.binaryDecoder(bytes, null)
  bh.consume(reader.read(record, s.decoder))
}
...
```

... with all the variations with/without, and with 1/10/1000 records tests using a simple loop.

Here are the results:

```
withRecordwithReuse1           thrpt   20  185953,460 ± 1111,831  ops/s
withRecordwithoutReuse1        thrpt   20  187475,498 ±  979,138  ops/s
withoutRecordwithReuse1        thrpt   20  185662,697 ±  919,191  ops/s
withoutRecordwithoutReuse1     thrpt   20  187440,727 ±  966,958  ops/s

withRecordwithReuse10          thrpt   20   19025,723 ±   46,294  ops/s
withRecordwithoutReuse10       thrpt   20   19048,485 ±   54,986  ops/s
withoutRecordwithReuse10       thrpt   20   18506,429 ±   64,043  ops/s
withoutRecordwithoutReuse10    thrpt   20   18422,282 ±   62,241  ops/s

withRecordwithReuse1000        thrpt   20     190,376 ±    1,287  ops/s
withRecordwithoutReuse1000     thrpt   20     184,054 ±    2,828  ops/s
withoutRecordwithReuse1000     thrpt   20     188,073 ±    1,671  ops/s
withoutRecordwithoutReuse1000  thrpt   20     187,071 ±    0,922  ops/s
```

We can see that reuse or not, multiple records or not, with a bigger buffer, it's the same performance! Around 190k record/s, no matter how many records in a row (with the same reader and decoder).
I didn't test the `directBinaryDecoder`, do you really want me to?

To conclude: do how you want when you deserialize the records, it does not matter, except on the memory and GC pressure probably, so reusing encoders and records seems like a good idea.

# Versioning the Avro schemas

When we use Avro, we must deal with a Schema Registry (_SR_)

There are two main choices:
- [Confluent's](http://docs.confluent.io/3.1.2/schema-registry/docs/index.html): integrated with the Confluent's Platform.
- [schema-repo](https://github.com/schema-repo/schema-repo) which is the implementation of [AVRO-1124](https://issues.apache.org/jira/browse/AVRO-1124).

Dealing with a SR enforces to code the version of the schema into the message payload, in the first bytes.

- On serialization: we contact the SR to register (if not already) the Avro schema of the data we're going to write (to get an ID). We write this ID as the first bytes in the payload, then we append the data.

- On deserialization: we read the first bytes of the payload to know what is the version of the Avro schema that was used to write the data. We contact the SR with this ID to grab the Schema (as JSON), then we parse it to a `org.apache.Schema` and we read the data using it. (or a compatible's one if we ensure backward/forward compatibility)

To resume, the serialization/deserialization of the data must now deal with another step for each and every message, this will reduce performances.
Hopefully, the client API of the SR is always caching the requested schemas, to not call the SR server every time (HTTP API).

## Subjects

We need to introduce the notion of _Subject_ when we are using SR.

A subject represents a collection of _compatible_ (according to custom validation rules) schemas in the SR.

The versions we talked about are only unique per subject:
- a subject A can have v1, v2.
- a subject B can have v1, v2, v3.

A version is not sufficient to retrieve a schema: the key `(subject, version)` is necessary.

A schema registry is not specialized for Avro Schemas. The "schemas" (which are simply the value of the key `(subject, version)`) can actually be anything we want (integers, strings, whatever), using Avro Schemas is only one of their usage.{.info}

## With schema-repo

It's not maintained anymore because it works perfectly! The repo: [schema-repo](https://github.com/schema-repo/schema-repo).

It's a simple HTTP service that can store and retrieve schemas on disk, in memory (for development purpose only), or in Zookeeper.
We can download [a jar with all dependencies](https://oss.sonatype.org/content/repositories/releases/org/schemarepo/schema-repo-bundle/0.1.3/schema-repo-bundle-0.1.3-withdeps.jar), it just needs a simple configuration file to declare where to store the schemas.

```xml
$ cat sr.config
schema-repo.class=org.schemarepo.InMemoryRepository
schema-repo.cache=org.schemarepo.InMemoryCache

$ java -jar schema-repo-bundle-0.1.3-withdeps.jar sr.config
...
00:46:50 INFO  [o.e.jetty.server.AbstractConnector] Started SelectChannelConnector@0.0.0.0:2876
```

Let's describe the available route to understand clearly its purpose:

- The Human Interface, to browse the subjects:
  - http://localhost:2876/schema-repo-browser/

![schema-repo browser](schemarepo.png)

- The Json interface (that will be used by the Java client API of schema-repo):
  - GET http://localhost:2876/schema-repo: list all the subjects.
  - GET http://localhost:2876/schema-repo/{subject}: 200 if the subject exists.
  - GET http://localhost:2876/schema-repo/{subject}/all: list all the (version+schema) of the subject.
  - GET http://localhost:2876/schema-repo/{subject}/config: display the config of the subject.
  - GET http://localhost:2876/schema-repo/{subject}/latest: get the latest schema of the subject.
  - GET http://localhost:2876/schema-repo/{subject}/id/{id}: get a specific version of the subject.
  - PUT http://localhost:2876/schema-repo/{subject}: create a new subject
  - POST http://localhost:2876/schema-repo/{subject}/schema: check if the schema in this subject exists
  - PUT http://localhost:2876/schema-repo/{subject}/register: add a schema to the subject. It can fail if the schema is not compatible with the previous one (according to the validator rules of the subject, if set).
  - PUT http://localhost:2876/schema-repo/{subject}/register_if_latest/{latestId}: add a schema only if the given version was the latest.

It's basically a `Map[String, (Map[Int, Any], Config)]` (!).

- The whole configuration of the schema registry:
  - http://localhost:2876/config?includeDefaults=true
```
Configuration of schema-repo server:

schema-repo.start-datetime: Wed Feb 22 00:46:50 CET 2017
schema-repo.class: org.schemarepo.InMemoryRepository
schema-repo.cache: org.schemarepo.InMemoryCache
schema-repo.validation.default.validators:
schema-repo.jetty.buffer.size: 16384
schema-repo.jetty.header.size: 16384
schema-repo.jetty.host:  
schema-repo.jetty.port: 2876
schema-repo.jetty.stop-at-shutdown: true
schema-repo.jetty.graceful-shutdown: 3000
schema-repo.rest-client.return-none-on-exceptions: true
schema-repo.json.util-implementation: org.schemarepo.json.GsonJsonUtil
schema-repo.logging.route-jul-to-slf4j: true
schema-repo.zookeeper.ensemble:  
schema-repo.zookeeper.session-timeout: 5000
schema-repo.zookeeper.connection-timeout: 2000
schema-repo.zookeeper.path-prefix: /schema-repo
schema-repo.zookeeper.curator.number-of-retries: 10
schema-repo.zookeeper.curator.sleep-time-between-retries: 2000
```

Hopefully, there is a Java API to deal with all the endpoints and totally ignore them.


## With Confluent's Schema Registry

It's part of a much much bigger platform and is tightly linked to Kafka, using it as a storage.

http://packages.confluent.io/archive/3.1/confluent-oss-3.1.2-2.11.zip




# Having fun: Custom Encoder and OutputStream.

Observable? Akka Streams?


# Conclusion

Buffers, caches, and a proper usage of the OutputStream is probably our best bet to get the better performance.
