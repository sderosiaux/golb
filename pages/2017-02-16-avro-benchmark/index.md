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


# The basics

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

# Performances

We'll do some benchmark to see how many records/s we can encode/decode.

Here are the benchmarks conditions:

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

---

We are going to test all the "reuse" combinaisons and play with the size of the data to serialize/deserialize at once, and see the impact of the `bufferSize`.

- `binaryEncoder` and `directBinaryEncoder`: with and without encoder reuse, 1/10/1000 records.
- `binaryDecoder` and `directBinaryDecoder`: with and without decoder reuse, with and without record reuse, 1/10/1000 records.

We will use a 80-Strings-containing-10-digits-each record in all cases.

Note that Strings are slower to handle than Doubles for instance. 80x-Doubles records offer ~20% more throughput than 80x-Strings records.{.info}

## JMH Results

### Encoders

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

### Decoders

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

When we use Avro, we *must* deal with a Schema Registry (shortcut: _SR_).

It's useful to not associate a message to a full schema each time (not space and network efficient!), but just to an ID. This is necessary for systems where applications talk to each other and are never shutdown at the same time, or when we have a message broker (like Kafka) where the consumers are never stopped and can read messages with the new schemas (and won't need to read the new columns because they don't care for instance).

[Confluent had written a nice article about them](https://www.confluent.io/blog/schema-registry-kafka-stream-processing-yes-virginia-you-really-need-one/).

There are two main schema registries out there:
- [Confluent's](http://docs.confluent.io/3.1.2/schema-registry/docs/index.html): integrated with the Confluent's Platform.
- [schema-repo](https://github.com/schema-repo/schema-repo) which is the implementation of [AVRO-1124](https://issues.apache.org/jira/browse/AVRO-1124).

Dealing with a SR enforces to code the version of the schema into the message payload, in the first bytes.

- On serialization: we contact the SR to register (if not already) the Avro schema of the data we're going to write (to get an ID). We write this ID as the first bytes in the payload, then we append the data.

- On deserialization: we read the first bytes of the payload to know what is the version of the Avro schema that was used to write the data. We contact the SR with this ID to grab the Schema (as JSON), then we parse it to a `org.apache.Schema` and we read the data using it. (or a compatible's one if we ensure backward/forward compatibility)

To resume, the serialization/deserialization of the data must now deal with another step for each and every message, this will reduce performances.
Hopefully, the client API of the SR is always caching the requested schemas, to not call the SR server every time (HTTP API).

## Subjects

We need to introduce the notion of _Subject_ when we are using a SR.

A subject represents a collection of _compatible_ (according to custom validation rules) schemas in the SR.

The versions we talked about are only unique per subject:
- a subject A can have v1, v2.
- a subject B can have v1, v2, v3.

## With schema-repo

It's not maintained anymore because it works perfectly! The repo: [schema-repo](https://github.com/schema-repo/schema-repo).

It's a simple HTTP service that can store and retrieve schemas on disk, in memory (for development purpose only), or in Zookeeper.
We can download [a jar with all dependencies](https://oss.sonatype.org/content/repositories/releases/org/schemarepo/schema-repo-bundle/0.1.3/schema-repo-bundle-0.1.3-withdeps.jar), it just needs a simple configuration file to declare where to store the schemas.

schema-repo is not necessarily specialized for Avro Schemas. The "schemas" (which are simply the value of the key `(subject, version)`) can actually be anything we want (integers, strings, whatever), using Avro Schemas is only one of their usage.{.info}

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

- The JSON API (that will be used by the Java client API of schema-repo):
  - `GET /schema-repo`: list all the subjects.
  - `GET /schema-repo/{subject`}: 200 if the subject exists.
  - `GET /schema-repo/{subject}/all`: list all the (version+schema) of the subject.
  - `GET /schema-repo/{subject}/config`: display the config of the subject.
  - `GET /schema-repo/{subject}/latest`: get the latest schema of the subject.
  - `GET /schema-repo/{subject}/id/{id}`: get a specific version of the subject.
  - `PUT /schema-repo/{subject}`: create a new subject
  - `POST /schema-repo/{subject}/schema`: check if the schema in this subject exists
  - `PUT /schema-repo/{subject}/register`: add a schema to the subject. It can fail if the schema is not compatible with the previous one (according to the validator rules of the subject, if set).
  - `PUT /schema-repo/{subject}/register_if_latest/{latestId}`: add a schema only if the given version was the latest.

It's basically a `Map[String, (Map[Int, Any], Config)]` (!).

Note that there is now way to remove a schema from a subject, it's immutable. It's only possible by removing them manually from their storage.{.warn}

- The whole configuration of the schema registry:
  - http://localhost:2876/config?includeDefaults=true
```xml
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

Hopefully, there is a Java API to deal with all the endpoints.

### Client API

The client API is really just a wrapper that contact the schema registry using Jersey client.

Here are the necessary sbt dependencies to add:

```scala
libraryDependencies += "org.schemarepo" % "schema-repo-client" % "0.1.3"
libraryDependencies += "org.slf4j" % "slf4j-simple" % "1.7.23"
libraryDependencies += "com.sun.jersey" % "jersey-client" % "1.19"
libraryDependencies += "com.sun.jersey" % "jersey-core" % "1.19"
```

And here is a simple example where we create a new subject with 2 schemas:

```scala
val repo = new RESTRepositoryClient("http://localhost:2876/schema-repo", new GsonJsonUtil(), false)

// register create a new subject/schema or return the existing one if one matches
val subject = repo.register("toto-" + Math.random(), SubjectConfig.emptyConfig())
subject.register("SCHEMA A")
subject.register("SCHEMA B")
println(s"entries: ${subject.allEntries()}")
println(s"latest: ${subject.latest()}")
```

Output:

```xml
[main] INFO org.schemarepo.client.RESTRepositoryClient -
Pointing to schema-repo server at http://localhost:2876/schema-repo
[main] INFO org.schemarepo.client.RESTRepositoryClient -
Remote exceptions from GET requests will be propagated to the caller

entries: [1 SCHEMA B, 0 SCHEMA A]
latest: 1 SCHEMA B
```

### Subject wrappers: read-only, cache, validating

schema-repo provides 3 `Subject` wrappers:

- A read-only subject, to pass it down safely:
```scala
// wrap the subject into a read-only container to ensure nothing can register schemas on it
val readOnlySubject = Subject.readOnly(subject)
// readOnlySubject.register("I WILL CRASH")
```

- A cached subject, to avoid doing HTTP requests:
```scala
// cache the schemas id+value in memory the first time they are accessed through the subject.
// This is to avoid contacting the HTTP schema registry if it was already seen.
val cachedSubject = Subject.cacheWith(subject, new InMemorySchemaEntryCache())
val schemaC = cachedSubject.register("SCHEMA C") // HTTP call, creating ID "2"
// ...
val schemaC = cachedSubject.lookupById("2")      // No HTTP call, it was in the cache
```

- A validating subject, to ensure a compatibility with the existing schemas of the subject. For instance, we can forbid the new schema to be shorter than the existing ones (?!):

```scala
// wrap the subject with the default validators
val alwaysLongerValidator = new ValidatorFactory.Builder()
  .setValidator("my custom validator", new Validator {
    override def validate(schemaToValidate: String, schemasInOrder: Iterable[SchemaEntry]): Unit = {
      if (!schemasInOrder.asScala.forall(_.getSchema.length <= schemaToValidate.length)) {
        throw new SchemaValidationException("A new schema can't be shorter than the existing ones")
      }
    }
  })
  .setDefaultValidator("my custom validator")
  .build()

val validatingSubject = Subject.validatingSubject(subject, alwaysLongerValidator)
validatingSubject.register("SCHEMA 4")
validatingSubject.register("SHORT") // Exception !
```

Let's use this validator thing to do something truly useful in our case..

### Ensure Avro schemas full compatibility

We can ensure that any new Avro schema is compatible (forward and backward) with all the existing Avro schemas of a subject:

```scala
val avroValidators = new ValidatorFactory.Builder()
  .setValidator("avro full compatibility validator", new Validator {
    override def validate(schemaToValidate: String, schemasInOrder: Iterable[SchemaEntry]): Unit = {
      // We must NOT use the same Parser because a Parser stores which schema it has already parsed
      // and throw an exception if we try to parse 2 schema with the same namespace/name
      val writerSchema = new Schema.Parser().parse(schemaToValidate)
      schemasInOrder.asScala
        .map(s => new Schema.Parser().parse(s.getSchema))
        .map(s => SchemaCompatibility.checkReaderWriterCompatibility(s, writerSchema))
        .find(_.getType == SchemaCompatibilityType.INCOMPATIBLE)
        .foreach(incompat => throw new SchemaValidationException(incompat.getDescription))
    }
  })
  // The subject can set which validator to use in its config.
  // The default validators are used if they are not defined explicitely.
  .setDefaultValidator("avro full compatibility validator")
  .build()
```

It means that we ensure any event written with the new schema can be read by the existing schemas, AND, that the new schema can read the events written by any existing schemas.

Here is an example where we try at the end to insert an incompatible schema:

It's incompatible because we removed a field: the old schemas are not compatible anymore. If an app was still reading events using the original schema, it wouldn't be able to deserialize the new events because it expects a `first` property (no default value).{.info}

```scala
// we can specify which validator to use, and not rely on the default validators of the factory
val config = new SubjectConfig.Builder().addValidator("avro full compatibility validator").build()
val avroSubject = Subject.validatingSubject(
                    client.register("avro-" + Math.random(), config),
                    avroValidators)

println(avroSubject.register("""
    |{
    |     "type": "record",
    |     "namespace": "com.example",
    |     "name": "Person",
    |     "fields": [
    |       { "name": "first", "type": "string" }
    |     ]
    |}
  """.stripMargin)) // OK!

println(avroSubject.register("""
    |{
    |     "type": "record",
    |     "namespace": "com.example",
    |     "name": "Person",
    |     "fields": [
    |       { "name": "first", "type": "string" },
    |       { "name": "last", "type": "string" }
    |     ]
    |}
  """.stripMargin)) // OK!

println(avroSubject.register("""
    |{
    |     "type": "record",
    |     "namespace": "com.example",
    |     "name": "Person",
    |     "fields": [
    |       { "name": "last", "type": "string" }
    |     ]
    |}
  """.stripMargin)) // INCOMPATIBLE, WILL FAIL!
```
Output:

```js
0	{ "type": "record", ... }
1	{ "type": "record", ... }
Exception in thread "main" org.schemarepo.SchemaValidationException:
Data encoded using writer schema:
{
  "type" : "record",
  "name" : "Person",
  "namespace" : "com.example",
  "fields" : [ {
    "name" : "last",
    "type" : "string"
  } ]
}
will or may fail to decode using reader schema:
{
  "type" : "record",
  "name" : "Person",
  "namespace" : "com.example",
  "fields" : [ {
    "name" : "first",
    "type" : "string"
  }, {
    "name" : "last",
    "type" : "string"
  } ]
}
```

In a company, it's quite straightforward to create a small custom framework around those pieces to ensure any application pointing to the same schema repository won't break rules and inject bad Avro schemas.

## With Confluent's Schema Registry

The schema registry of Confluent is part of a much much bigger platform and is tightly linked to Kafka, using it as a storage.
It's way more maintained than schema-repo as you can see on Github: [confluentinc/schema-registry](https://github.com/confluentinc/schema-registry). It is dedicated to Avro schemas and nothing else.

The platform with its schema registry is downloable here on Confluent's website: [confluent-oss-3.1.2-2.11.zip](http://packages.confluent.io/archive/3.1/confluent-oss-3.1.2-2.11.zip).

Let's go into the wild and try to start the schema registry. We first need to start Zookeeper and Kafka. The schema registry depends on Zookeeper and look for Kafka brokers. If it can't find one, it won't start.

Confluent provides some default config files we can use to start the whole stack:

```xml
$ cd confluent-3.1.2
$ ./bin/zookeeper-server-start -daemon ./etc/kafka/zookeeper.properties
$ ./bin/kafka-server-start -daemon ./etc/kafka/server.properties
$ ./bin/schema-registry-start ./etc/schema-registry/schema-registry.properties
[2017-02-24 00:01:47,667] INFO SchemaRegistryConfig values:
        ...
        kafkastore.topic = _schemas
        metrics.jmx.prefix = kafka.schema.registry
        schema.registry.zk.namespace = schema_registry
        avro.compatibility.level = backward
        port = 8081
        ...
[2017-02-24 00:01:53,858] INFO Started @7282ms (org.eclipse.jetty.server.Server:379)
[2017-02-24 00:01:53,860] INFO Server started, listening for requests...
```

I've kept only the interesting parts:
- It stores the schemas modifications into a kafka topic `_schemas`.
- We can use JMX to check the internals of the registry.
- In Zookeeper, we'll find the data in `/schema_registry`.
- We can only insert backward compatible Avro schemas (in the subject) and it's configurable.

We can check in Zookeeper:

```bash
$ ./bin/zookeeper-shell localhost
> ls /schema_registry
[schema_registry_master, schema_id_counter]
> get /schema_registry/schema_registry_master
{"host":"00-666-99.eu","port":8081,"master_eligibility":true,"version":1}
```

The schema registry is using Zookeeper to coordinate with another schema registries (master writer/slave readers) to ensure scaling, HA and unique global IDs.
It also listens to Kafka to load up the data on startup, and write updates into it (the master): this is why those elements are mandatory.

Let's do like with schema-repo and list the useful routes:

- `GET/PUT /config`: retrieve/set the global Avro compabitility level
- `GET/PUT /config/{subject}`: retrieve/set this subject Avro compabitility level
- `GET  /subjects`: list all the subjects
- `POST /subjects/{subject}`: check if a schema belongs to a subject
- `GET   /subjects/{subject}/versions`: list all the schemas of this subject
- `GET   /subjects/{subject}/versions/{version}`: retrieve this schema version of this subject
- `POST /subjects/{subject}/versions`: register a new schema for this subject
- `GET   /schemas/ids/{id}`: get the schema with this ID (globally unique).
- `POST /compatibility/subjects/{subject}/versions/{version}`: Test if the given schema (in the payload) is compatible with the given version.

All the POST/PUT must send the header: `Content-Type: application/vnd.schemaregistry.v1+json` to be taken into account.{.warn}

- `{version}` starts at 1 or can be "latest".
- In this schema registry, the ID is globally unique per distinct schema. We don't need the subject and the version to retrieve a schema, we just need its ID.

If we register some subjects and schemas, we can see all our changes in Kafka:

```xml
$ ./bin/kafka-console-consumer --bootstrap-server localhost:9092 --topic _schemas \
                               --from-beginning --property print.key=true
{"magic":0,"keytype":"NOOP"}    null
{"subject":"subject_test","version":1,"magic":0,"keytype":"SCHEMA"}     {"subject":"subject_test","version":1,"id":21,"schema":"\"string\""}
{"subject":"subject_test2","version":1,"magic":0,"keytype":"SCHEMA"}    {"subject":"subject_test2","version":1,"id":21,"schema":"\"string\""}
...
```

Hopefully, we have also a Java Client API to deal with it.

### Client API

Here are the sbt changes and a small application to play with the client API:

```scala
resolvers += "Confluent" at "http://packages.confluent.io/maven"
libraryDependencies += "io.confluent" % "kafka-schema-registry-client" % "3.1.2"
```

```scala
val client = new CachedSchemaRegistryClient("http://vps:8081", Int.MaxValue)
val s1 = SchemaBuilder.builder("com.ctheu").record("Transaction").fields()
  .requiredString("uuid").endRecord()
val s2 = SchemaBuilder.builder("com.ctheu").record("Transaction").fields()
  .requiredString("uuid")
  .optionalDouble("value")
  .endRecord()

val id1 = client.register("MY_SUBJECT", s1)
val id2 = client.register("MY_SUBJECT", s2)

println(id1, id2)
//(41,42)

val metadata = client.getLatestSchemaMetadata("MY_SUBJECT")
println(s"latest: ${metadata.getSchema}")
// latest: {"type":"record","name":"Transaction","namespace":"com.ctheu","fields":[...]}

// helper methods:
println("fully compatible? " + AvroCompatibilityChecker.FULL_CHECKER.isCompatible(s1, s2))
// fully compatible? true
```

By default, the client caches the schemas passing by to avoid querying the HTTP endpoint each time.

And that's it, nothing more is provided. The schema validation is done on the schema registry itself according to its configuration.
There is no custom configuration as with schema-repo, because it's only Avro-based.

### With a nice UI

There is an unofficial UI to go along: [Landoop/schema-registry-ui](https://github.com/Landoop/schema-registry-ui/).

We'll need to enable CORS on the Schema Registry server of allow cross-domain requests if needed:

```
$ cat >> etc/schema-registry/schema-registry.properties << EOF
access.control.allow.methods=GET,POST,PUT,OPTIONS
access.control.allow.origin=*
EOF
```
Then we can simply run a Docker image to get the UI working:

```
$ docker run -d -p 8000:8000 -e "SCHEMAREGISTRY_URL=http://vps:8081" landoop/schema-registry-ui
```

![Schema Registry UI](schemaregistry_ui.png)

We have a nice UI to create/update schemas, access the configuration and so on. Much more practical than plain REST routes.

# Scala code generation to the rescue

Because we don't want to write the Avro schema ourself, we need something to write them for us, that can't do typos: the Scala macros.

Here are 2 nice projects along this way:

- [avro4s](https://github.com/sksamuel/avro4s)
- [avrohugger](https://github.com/julianpeeters/avrohugger)

Generally, in our application, we have some `case class` and we want the Avro conversion to be transparent, this is the purpose of such projects.

They don't provide the full power of Avro (aliases, defaults, enums, maps..) but still, they can come in handy for most cases.

## avro4s

avro4s can:
- generate the Avro schema from any case class.
- handle serialization/deserialization of case classes to Avro raw data (using the Avro encoders).

It also comes with an sbt plugin [sbt-avro4s](https://github.com/sksamuel/sbt-avro4s) that can generate case classes from existing Avro schemas.
There are some limitations, like with nested generics, cycle references, but it works flawlessly for most cases.

Here are some quick examples (the README of the project already covers everything):

```scala
libraryDependencies += "com.sksamuel.avro4s" %% "avro4s-core" % "1.6.4"
```

```scala
import com.sksamuel.avro4s.AvroSchema
case class User(firstName: String, lastName: String, age: Int)
val schema: Schema = AvroSchema[User] // replaced with Macros
println(schema)
// {"type":"record","name":"User","namespace":"com.ctheu",
//  "fields":[{"name":"firstName","type":"string"},...] }
```

Serialization and deserialization in a nutshell:
```scala
// NO schema written. Uses Avro binaryEncoder.
// Useful when combined to a Schema Registry that provides an ID instead.
val bin = AvroOutputStream.binary[User](System.out)
 // Schema written. Uses Avro jsonEncoder.
val json = AvroOutputStream.json[User](System.out)
// Schema written. Store the schema first, then the records.
val data = AvroOutputStream.data[User](System.out) 

val u = Seq(User("john", "doe", 66), User("mac", "king", 24))
json.write(u)
bin.write(u)
data.write(u)

val bytes: Array[Byte] = ???
AvroInputStream.binary[User](bytes).iterator.foreach(println)
AvroInputStream.json[User](bytes).iterator.foreach(println)
AvroInputStream.data[User](bytes).iterator.foreach(println)
```

It's also possible to work with `GenericRecord` directly:

```scala
val u = User("john", "doe", 66)

val genericRecord = RecordFormat[User].to(u)
val u2 = RecordFormat[User].from(genericRecord)
assert(u == u2)
```

There are a few more features available, take a peek at the [README](https://github.com/sksamuel/avro4s) (type precision, custom mapping).

### Generate the case class from the schema

As we said, it's also possible to do the reverse transformation using [sbt-avro4s](https://github.com/sksamuel/sbt-avro4s), ie: generate the case class from a schema.

In `project/plugins.sbt`:
```
addSbtPlugin("com.sksamuel.avro4s" % "sbt-avro4s" % "1.0.0")
```

In `src/main/resources/avro/Usr.avsc` (AVro SChema, using a JSON notation):
```json
{
    "type":"record",
    "name":"Usr",
    "namespace":"com.ctheu",
    "fields":[
        {"name":"firstName","type":"string"},
        {"name":"lastName","type":"string"},
        {"name":"age","type":"int"}
    ]
}
```

A dependent task will be associated to `sbt compile` but it's also possible to call this task directly to run the generation:
```scala
avro2Class
[info] [sbt-avro4s] Generating sources from [src\main\resources\avro]
[info] --------------------------------------------------------------
[info] [sbt-avro4s] Found 1 schemas
[info] [sbt-avro4s] Generated 1 classes
[info] [sbt-avro4s] Wrote class files to [target\scala-2.11\src_managed\main\avro]
```

The `Usr` case class is generated in `target\scala-2.11\src_managed\main\avro`.
We can use it:

```scala
val u = Usr("john", "doe", 66)
```

## avrohugger

Avrohugger does not rely on macros but on [treehugger](http://eed3si9n.com/treehugger/), which generates scala source code directly (whereas macros evaluation is just another phase in the compiler processing).

Avrohugger is a set of libraries and tools:
- `"com.julianpeeters" %% "avrohugger-core" % "0.15.0"`: generate Scala source code from Avro schemas. It can generates case classes but also `SpecificRecordBase` classes and `scavro` case classes ([scavro](https://github.com/oedura/scavro) is another library to generate case classes from schemas).

```scala
import avrohugger._

val schema: Schema = ???

println(new Generator(format.Standard).schemaToStrings(schema))
// case class Usr(firstName: String, lastName: String, age: Int)

println(new Generator(format.SpecificRecord).schemaToStrings(schema))
// case class Usr(var firstName: String, var lastName: String, var age: Int)
//   extends org.apache.avro.specific.SpecificRecordBase { ... }

println(new Generator(format.Scavro).schemaToStrings(schema))
// case class Usr(firstName: String, lastName: String, age: Int)
//   extends org.oedura.scavro.AvroSerializeable { ... }

// More useful, it can generate to files directly:
new Generator(format.Standard).schemaToFile(schema /*, outDir = "target/generated-sources"*/)
```

It handles properly Scala enums (avro4s too) and has some options to map the generated case classes:

```scala
val schema = new Schema.Parser().parse(
"""
  |{
  |    "type":"record",
  |    "name":"Usr",
  |    "namespace":"com.ctheu",
  |    "fields":[
  |        {"name":"firstName","type":"string"},
  |        {"name":"lastName","type":"string"},
  |        {"name":"age","type":"int"},
  |        {"name": "suit", "type": { "name": "Suit", "type": "enum",
  |         "symbols" : ["SPADES", "HEARTS", "DIAMONDS", "CLUBS"] } }
  |    ]
  |}
""".stripMargin)

println(new Generator(format.Standard,
  avroScalaCustomTypes = Map("int" -> classOf[Double]),
  avroScalaCustomNamespace = Map("com.ctheu" -> "com.toto"),
  avroScalaCustomEnumStyle = Map(),
  restrictedFieldNumber = false
).schemaToStrings(schema))

/* Output:
object Suit extends Enumeration {
  type Suit = Value
  val SPADES, HEARTS, DIAMONDS, CLUBS = Value
}

case class Usr(firstName: String, lastName: String, age: Double, suit: Suit.Value))
*/
```

- [sbt-avro-hugger](https://github.com/julianpeeters/sbt-avrohugger) `addSbtPlugin("com.julianpeeters" % "sbt-avrohugger" % "0.15.0")`: a plugin just to automatize these generations using sbt tasks.

- [avro-scala-macro-annotations](https://github.com/julianpeeters/avro-scala-macro-annotations) `"com.julianpeeters" % "avro-scala-macro-annotations_2.11" % "0.11.1"`: _fills_ an existing empty `case class` at compilation time, with the fields found in an avro schema or in an avro data file, eg:
```scala
// From a schema:
@AvroTypeProvider("avro/user.avsc")
case class User()
// => case class User(firstName: String, age: Int)

// OR from the data:
@AvroTypeProvider("avro/user.avro")
case class User()
// => case class User(firstName: String, age: Int)
```

# TODO: schema registry and binary message? how to encode ??? 

http://docs.confluent.io/3.1.2/schema-registry/docs/serializer-formatter.html

schema registry:
producer:
props and "schema.registry.url"
props.put("key.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("value.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");

consumer:
props.put("schema.registry.url", url);
props.put("specific.avro.reader", true);
KafkaAvroDecoder avroDecoder = new KafkaAvroDecoder(vProps);
GenericRecord genericEvent = (GenericRecord) messageAndMetadata.message();
LogLine event = (LogLine) SpecificData.get().deepCopy(LogLine.SCHEMA$, genericEvent);

Raw "protocol":

| | | |
|-|-|-|
| 0 | Magic Byte | Confluent serialization format version number; currently always 0. |
| 1-4 | Schema ID | 4-byte schema ID as returned by the Schema Registry |
| 5-... | Data | Avro serialized data in Avro’s binary encoding. The only exception is raw bytes, which will be written directly without any special Avro encoding. |


# Having fun: Custom Encoder and OutputStream.

Observable? Akka Streams?


# Conclusion

Buffers, caches, and a proper usage of the OutputStream is probably our best bet to get the better performance.
