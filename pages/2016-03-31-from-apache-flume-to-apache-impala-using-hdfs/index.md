---
title: "From Flume to Avro to Impala Parquet"
date: "2016-03-31T12:05:27Z"
layout: post
path: "/2016/03/31/from-apache-flume-to-apache-impala-using-hdfs/"
language: "en"
tags: flume, hdfs, avro, hive, impala, cloudera, oozie
---

We have a Flume agent getting some Avro timestamped data.

We want to be able to query them in a scalable manner, using a time dimension, without using HBase or any other database, because it's too much overhead in our case: we just want simple files to put them anywhere.

- We can use HDFS: Flume has a HDFS sink that handle partitioning.
- We can create a Hive table on top of the Avro files to query the data.
- Because we want something efficient and fast, we'd like to use Impala on top of Parquet: we'll use Apache Oozie to export the Avro files to Parquet files.

---
Summary {.summary}

[[toc]]

---

# Flume

## Configuration

We said we have an Avro source where some service is sending data:

```
# Bindings
agent1.sources = so
agent1.channels = c
agent1.sinks = si

# Avro source
agent1.sources.so.type = avro
agent1.sources.so.bind = 0.0.0.0
agent1.sources.so.port = 9876
agent1.sources.so.channel = c

# Channel
agent1.channels.c.type = file
```

We'll configure the [Flume HDFS sink](https://flume.apache.org/FlumeUserGuide.html#hdfs-sink) where we are going to export our events. The configuration is rather long but every piece has its importance:

```
agent1.sinks.si.type = hdfs
agent1.sinks.si.hdfs.path = /user/flume/events/ymd=%Y-%m-%d/h=%H
agent1.sinks.si.hdfs.inUsePrefix = .
agent1.sinks.si.hdfs.fileType = DataStream
agent1.sinks.si.hdfs.filePrefix = events
agent1.sinks.si.hdfs.fileSuffix = .avro
agent1.sinks.si.hdfs.rollInterval = 300
agent1.sinks.si.hdfs.rollSize = 0
agent1.sinks.si.hdfs.rollCount = 0
agent1.sinks.si.serializer = com.company.CustomAvroSerializer$Builder
agent1.sinks.si.channel = c
```

We'll explain each bit of this configuration next.

### Partitioning

Because of our important volume of data, we'd like to partition them on a `year-month-day`-then-`hour` basis.
Flume manages that just by specifying some custom format string in the HDFS path we'd like the output.

`ymd=` and `h=` in the `path` represent the *column* names of the time dimensions that will be queryable later. The SQL meta will reference them: `(ymd STRING, h INT)`.

The Flume source must have set a `timestamp` in the events header for Flume to know what is the time dimension.

Sometimes, we don't have this info so we can set `hdfs.useLocalTimeStamp = true` to use the ingestion time as time dimension. It's discouraged because it's not the real time the event was generated in the service, and because we're going to get stuck later with Impala because we won't be able to query `ymd` and `h` to make our job.

### Roll interval

We decide to roll a new file every 5 minutes (`300` seconds), and not based on size nor count: they have to be explicitely set to `0` because they have some default value.

Flume buffers (append) into some `.tmp` file we can't use for querying (it's incomplete).
Because we want to access the fresh data quickly, 5 minutes is a good start.

This is going to generate 144 per day, but we don't really care because we are going to export them later into some big Parquet file at the end and clean up the old HDFS Avro files.

If Flume crashes, it's possible to lose the last buffered file: meaning a maximum 5 minutes of data.
Stopping properly Flume flushes the buffers.

### File name

`inUsePrefix` is set to `.`: this is to hide them from Hive during a query (Hive ignores the *hidden* files).

If we don't do that, MapReduce jobs (Hive) can fail:
- At first, Hive saw a `.tmp` and took it into account.
- The time to execute the MR, it was not there anymore (it was flushed): the MR fails.
    
```xml
Caused by: java.io.FileNotFoundException:
File does not exist:
hdfs://hadoop01:8020/user/flume/events/ymd=2016–03–17/h=15/events.1458223202146.avro.tmp
```

### File type

By default, the file type is SequenceFile.
We don't want that, because Flume will convert the output stream to a SequenceFile that Hive will not be able to read (the Avro schema won't be inside).

Setting the file type to `DataStream` let the data sent unaltered.

We can recognize it's a SequenceFile when it contains some Java class references:

```xml
SEQ♠!org.apache.hadoop.io.LongWritable"org.apache.hadoop.io.BytesWritable ▒c(g▒s▒▒►▒▒▒|TF..
```

On the other hand, a snappy compressed Avro file contains a Avro schema:

```
Obj♦avro.schema▒8{"type":"record","name":"Order",...}avro.codecsnappy ▒▒T▒▒▒▒♣
```

### Avro Serializer

We can add a serializer to do some conversion of the original event, and simply emit back some Avro using a `DataFileWriter` with the `snappyCodec`:

```java
DatumWriter<Object> writer = new GenericDatumWriter<>(schema);
dataFileWriter = new DataFileWriter<>(writer)
                  .setCodec(CodecFactory.snappyCodec())
                  .create(schema, out);
```

## Multiple Flume?

We have to be careful if there are multiple Flume sinks (or agents) that are writing to the same location (for scalability purpose): the buffered file is not shared and we could have name conflicts.

Flume named the buffered file with a timestamp (in milliseconds).
That's fine most of the time but we never know if they are going to collide one day.

We should always consider having two different configurations with a different `filePrefix` or `fileSuffix` in the HDFS sink.

## Performance consideration

Some closed Flume monitoring should be done when adding a HDFS sink.

The overhead is noticeable: there are a lot more I/O threads (by default it's 10 but I noticed way more threads with VisualVM), and the CPU usage slightly increases.


# Checking the HDFS Avro files

We have our Flume properly sinking Avro data to HDFS, let's check how it goes.

First thing is to verify that the data are correct and readable.

We check if the partitioning works:

```
$ hdfs dfs -ls /user/flume/events/ymd=2016-01-29
/user/flume/events/ymd=2016-01-29/h=00
/user/flume/events/ymd=2016-01-29/h=01
```

We check a file to see if it's parsable :

```
$ hdfs dfs -cat /user/flume/events/ymd=2016–03–14/h=15/events.1458147890641.avro
Objavro.schema�8{"type":"record","name":"OrderRecord","namespace":"com.company.avro","fields":[...
```

Our Avro schema is there, it's not a SequenceFile, good.

We'll use some Avro tools to deserialize the content.
It's simply a `.jar` with some useful functions (`getschema`, `tojson`), downloadable on [apache.org](http://www.apache.org/dyn/closer.cgi/avro/).

```
$ curl -sLO http://apache.crihan.fr/dist/avro/avro-1.7.7/java/avro-tools-1.7.7.jar
$ java -jar avro-tools-1.7.7.jar getschema events.1458147890641.avro
{
  "type" : "record",
  "name" : "Order",
  "namespace" : "com.company",
  "fields" : [ {
    "name" : "type",
    "type" : "string"
    }, { ...
$ java -jar avro-tools-1.7.7.jar tojson logs.1458147890641.avro
{"type":"AD12","customer_id":2458189, ...
{"type":"AD12","customer_id":9515711, ...
```

Our HDFS is in place and get streamed new data. Let's now configure Hive to create a table on top of the files.

# Setup the Hive table

Avro is standard in Hadoop and Hive has everything needed to read Avro files and create some table from them.

## AvroSerDe

The *magic* happens when we use the `AvroSerDe` (*Avro Serializer Deserializer*).

It is used to read Avro files to create a table, and vice-versa, to create Avro files from a table.
It also detects and uncompresses the files when compressed with Snappy.

Under the hood, it's using the classes `DataFileReader<GenericRecord>` and `DataFileWriter<GenericRecord>`  to read/write Avro data.

https://cwiki.apache.org/confluence/display/Hive/AvroSerDe

### Create the table

We create a Hive *external* table mapped on our `.avro` files using `AvroSerDe`.

We specify an Avro schema to read the data: it will probably be the same that the writer schema BUT it could be different. It could be just a slice of it, and just because the writer schema evolved.

```sql
CREATE EXTERNAL TABLE avro_events
PARTITIONED BY (ymd STRING, h INT)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.avro.AvroSerDe'
STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat'
LOCATION '/user/flume/events/'
TBLPROPERTIES ('avro.schema.literal' = '
{
 "type" : "record",
 "name" : "Order",
 "namespace" : "com.company",
 "fields" : [ {
   "name" : "type",
   "type" : "string"
 } ]
}');
```

`PARTITIONED BY` matches our structure:

```
$ hdfs dfs -ls /user/flume/events/ymd=2016–03–17/h=12 
/user/flume/events/ymd=2016–03–17/h=12/events.1458212422229.avro
/user/flume/events/ymd=2016–03–17/h=12/events.1458212456756.avro
```

It's possible to put the schema into a file to use it:

```sql
TBLPROPERTIES ('avro.schema.url' = '/user/flume/Order.avsc');
```

Note that we can generate a reader schema from any `.avro` file:

```
$ java -jar avro-tools-1.7.7.jar getschema events.avro > Order.avsc
$ hdfs dfs -put Order.avsc /user/flume/
```

### ERR: Long schemas

If we have a long schema, therefore a long query, we could end up with this error:

```xml
FAILED: Execution Error, return code 1 from org.apache.hadoop.hive.ql.exec.DDLTask.
MetaException(message:javax.jdo.JDODataStoreException: Put request failed :
INSERT INTO "TABLE_PARAMS" ("PARAM_VALUE","TBL_ID","PARAM_KEY") VALUES (?,?,?)

org.datanucleus.store.rdbms.exceptions.MappedDatastoreException:
INSERT INTO "TABLE_PARAMS" ("PARAM_VALUE","TBL_ID","PARAM_KEY") VALUES (?,?,?)

Caused by: org.postgresql.util.PSQLException:
ERROR: value too long for type character varying(4000)
```

We must use an external schema in this case, the Hive query is just too long.

In Hue, the error are not properly exposed on the UI. It's better to use the hive shell.{.warn}

### ERR: Partition and field names conflicts

It's not possible to have a column in our data with the same name as the partition dimensions (`ymd` and `h` in our case):

```xml
FAILED: Execution Error, return code 1 from org.apache.hadoop.hive.ql.exec.DDLTask.
org.apache.hadoop.hive.ql.metadata.HiveException:
Partition column name hour conflicts with table columns.
```

### Notify Hive of the new partitions

Hive need to discover the data now: it's not automatic because we are inserting data in HDFS without any contact with Hive.

`msck repair table` to the rescue: it looks in the folder to discover new directories and add them to the metadata.

```xml
hive> msck repair table avro_events;
OK
Partitions not in metastore: avro_events:ymd=2016–03–17/hour=12
Repair: Added partition to metastore avro_events:ymd=2016–03–17/h=12
Time taken: 2.339 seconds, Fetched: 1 row(s)
```

We are not going to do that manually each time we need to query the data: we are going to use Oozie later in the process, and query directly via Impala.

### Drop partitions

It's possible to get some `Partitions missing from filesystem` when doing a `msck repair` and playing a bit too much with the data.

Hopefully, we can remove the partitions (metadata) manually :

```
hive> ALTER TABLE avro_events DROP IF EXISTS PARTITION (ymd='2016–03–21') PURGE;
Dropped the partition ymd=2016–03–21/h=13
Dropped the partition ymd=2016–03–21/h=14
Dropped the partition ymd=2016–03–21/h=15
Dropped the partition ymd=2016–03–21/h=16
Dropped the partition ymd=2016–03–21/h=17
Dropped the partition ymd=2016–03–21/h=18
Dropped the partition ymd=2016–03–21/h=19
Dropped the partition ymd=2016–03–21/h=20
Dropped the partition ymd=2016–03–21/h=21
Dropped the partition ymd=2016–03–21/h=22
Dropped the partition ymd=2016–03–21/h=23
```

### Querying

Now we can use Hive to query our data.

For instance, if we have a column `timestamp`, it's useful to check the latest ingested data time:

```sql
select max(`timestamp`) from avro_events;
```

Also, Hive has some magic columns we can use to get more insights about the table data.

To know how many records each partition contains, we can use the virtual column `INPUT__FILE__NAME`:

```sql
SELECT INPUT__FILE__NAME, COUNT(*)
FROM events
GROUP BY INPUT__FILE__NAME
ORDER BY INPUT__FILE__NAME;
```
Output:
```
hdfs://hadoop:8020/events/ymd=2016-03-22/h=00/x.avro      910
hdfs://hadoop:8020/events/ymd=2016-03-22/h=00/y.avro      1572
hdfs://hadoop:8020/events/ymd=2016-03-22/h=00/z.avro      4884
```

Because we are not crazy enough to query through Hive, let's focus on querying the data through Impala to get blazing fast responses.

# Setup the Impala table

We can use Impala to query the avro table, but for performance reason, we are going to export it into a Parquet table afterwards. This step is mostly to be aware that it's possible.

## Querying the Hive Avro table

If right now, in Impala, we do:

```sql
SHOW TABLES;
```
We won't see the Hive table yet. You need to make Impala aware it's there:

```sql
INVALIDATE METADATA avro_events;
```

When it's done, we'll be able to query it, but with frozen data still: it's the same problem we had with Hive.

For Impala to see the latest data of the existing partitions, we can use `REFRESH`:

```sql
REFRESH avro_events;
```

Unfortunately, that won't discover the new partitions (if Flume just created a new hourly partition).

We have to use the equivalent of Hive's `MSCK REPAIR`, but for Impala:

```sql
ALTER TABLE avro_events RECOVER PARTITIONS;
```

`RECOVER PARTITIONS` will do what `REFRESH` does (see the latest data of the existing partitions), but it will also discover the new partitions. I don't know the impact and process time on tables with tons of partitions.

## Querying the Parquet table

We want to store our data into Parquet files to query them through Impala and get fast responses, Avro was just a step to get there.

Parquet files store data in columns rather in rows, and support über-fast filtering because the Parquet engine doesn't need to parse every rows. The Parquet format can also compress the data way better and is optimized for CPU and memory efficiency.{.info}

We first create a partitioned Impala table `STORED AS PARQUETFILE`:

```sql
CREATE TABLE avro_events_as_parquet (type STRING, ...)
PARTITIONED BY(ymd STRING, h INT)
STORED AS PARQUETFILE;
```

It doesn't have to follow the same partitioning as the Hive table but for the sake of simplicity, it does.
It's empty, we are going to fill it with the Avro table.

We are going to use the `timestamp` column we have in our data.

It's not possible to retrieve the values of the Hive partition dimensions (`ymd=`, `h=`), they are not queryable.{.warn}

```sql
-- We ensure we're viewing the latest partitions of the Hive table
ALTER TABLE avro_events RECOVER PARTITIONS;
REFRESH avro_events;
 
-- We overwrite the partitions to be sure we don't dupliate data
INSERT OVERWRITE avro_events_as_parquet
PARTITION(ymd, h)
  SELECT type, ..., 
    FROM_UNIXTIME(FLOOR(`timestamp`/1000), 'yyyy-MM-dd') AS ymd,
    CAST(FROM_UNIXTIME(FLOOR(`timestamp`/1000), 'HH') AS INT) AS h
  FROM avro_events
  [ WHERE `timestamp` < $min AND `timestamp` > $max ];
 
-- We compute the stats of the new partitions for faster queries
COMPUTE INCREMENTAL STATS avro_events_as_parquet;
```

- We specify the partition values doing some transformation on our `timestamp` column (note: `FROM_UNIXTIME` uses the current locale).
- The `WHERE` clause is not necessary the first time, we just want to load everything. Later, a scheduled job will filter which partition to overwrite.

The end result is something like:

```
$ hdfs dfs -ls .../avro_events_as_parquet/ymd=2016–03–23/h=13
78.5 M avro_events_as_parquet/ymd=2016–03–23/h=13/64.._data.0.parq
```

A nice `.parq` file combining all the 5 minutes ranges of the multiple Avro files (of the previous hour for instance).

Last step: we want to query Impala without doing all the manual updates ourself, we'll use Oozie to schedule a recurrent job.

# Create a recurrent job with Oozie

We define a coordinator running every hour that will write the previous hour partition.

The coordinator could trigger the workflow every 5 minutes to have less lag in Impala: the same Parquet partition would just be overwritten 12 times per hour with more and more data each time.{.info}

We take care of adding a small lag in the scheduling: we want a workflow to run at 12:05 to be sure Flume has flushed the data < 12:00. The `:05` is not random, it's the same value as Flume `rollInterval`.

We can define a property in `coordinator.xml`:

```xml
<property>
  <name>partitionDate</name>
  <value>
    ${coord:dateOffset(
        coord:dateOffset(coord:nominalTime(), -1, 'HOUR'),
        -5, 'MINUTE')}
  </value>
</property>
```

Example:

- If the workflow runs at `12:05`, then `partitionDate=2016–03–31T11:00Z`.
- The partition `ymd=2016–03–31/h=11` contains every data in `[11:00, 12:00)`. This is what we want to move into a Parquet file.

Finally, in the worflow, we create a `<shell>` action where we pass this variable, to execute a script to does exactly the `INSERT OVERWRITE` we talked about:

```xml
<shell xmlns="uri:oozie:shell-action:0.2">
    <job-tracker>${jobTracker}</job-tracker>
    <name-node>${nameNode}</name-node>
 
    <exec>${insertOverwriteScript}</exec>
    <argument>${partitionDate}</argument>
    ...
```

The script can use `partitionDate` to set the `WHERE` condition of the SQL, and select only the latest hour data for instance.

A script executed by Oozie should never rely on the current time.
Oozie can replay past tasks (on failures for instance), meaning it can throw 5 tasks in 10min that should have been scheduled every hour.{.warn}

# Improvements

The stack could be simplified using a Parquet serializer to save into HDFS directly.
That would create a bunch of tiny Parquet files we would need to still merge at the end.

The problem with Parquet is its immutability, so if we want real-time querying, that's not possible without some contortionism like we saw.

A better solution would be to sink into a database that supports time based data without hot spots at ingestion time.
