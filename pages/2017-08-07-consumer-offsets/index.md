---
title: "Consuming Kafka's __consumer_offsets topic"
date: "2017-08-07T02:08Z"
layout: post
path: "/2017/08/07/consuming-kafka-consumer-offsets-topic/"
language: "en"
tags: scala, avro, benchmark, schema registry, confluent
---

Never wondered what what inside the famous `__consumer_offsets` topic, that came in Kafka 0.9?

Before that, consumers offsets were stored in Zookeeper. Now, Kafka is eating its own dog food. Why is that?

---
Summary {.summary}

[[toc]]

---


# Why is it useful?

`__consumer_offsets` stores the offsets of the ... consumers (sic!).
But consumers and offsets are actually formed of several components:

- A consumer consumes a `topic`.
- A consumer belongs to a `groupId`. (Note that the same `groupId` can be used to consume different topics)
- A consumer consumes topic's `partitions`. (and can consume only some of them)
- Each consumed partitions has its own `offset` for the whole tuple `(topic, groupId)`.

`__consumer_offsets` is therefore the storage of the combinaison of all these things.

# How to read it?

## ConsumerGroupCommand

It's probably the simplest human-friendly way to do so. You don't even have to know it's coming from this topic. (it's an implementation detail after all).

```
$ kafka-run-class kafka.admin.ConsumerGroupCommand --bootstrap-server localhost:9092 --group mygroup --new-consumer --describe

GROUP              ** **           TOPIC                          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             OWNER
hadoopslave05.stg.ps:9092 (id: 2147483536) for group mygroup.
mygroup           mytopic             0          unknown         6971670         unknown         consumer-1_/137.74.23.1
mygroup           mytopic             1          6504514         6504514         0               consumer-1_/137.74.23.1
mygroup           mytopic             2          unknown         6507388         unknown         consumer-1_/137.74.23.1
mygroup           mytopic             3          6175879         6969711         793832          consumer-1_/172.16.10.5
mygroup           mytopic             4          unknown         6503476         unknown         consumer-1_/172.16.10.5
```

Notice the `--new-consumer` and the kafka address, it does not need a Zookeeper address as before.

## Trick: sum up the lag

When we have several partitions, it's sometimes useful to just care about the sum of each partition's lag (0 meaning the group has catched up the latest messages):

```
$ kafka-run-class kafka.admin.ConsumerGroupCommand --bootstrap-server localhost:9092 --new-consumer --group mygroup --describe 2>/dev/null  | awk 'NR>1 { print $6 }' | paste -sd+ - | bc
```

## Consuming __consumer_offsets

Because it's a topic, it's possible to just consume it as any other topic.

First of all, because it's an _internal_ Kafka topic, by default, the consumers can't see it, therefore they can't consume it.
We must ask them to not exclude it (default is true). We must add to the consumer's props:
```
$ echo "exclude.internal.topics=false" > /tmp/consumer.config`
```
Then use it to consume the topic:
```
$ kafka-console-consumer --consumer.config /tmp/consumer.config --zookeeper localhost:2181 --topic __consumer_offsets
```

Output:
```
     ▒k    ]▒▒▒▒  ]▒▒▒▒
     ▒kg    ]▒▒▒▒  ]▒▒▒▒
     ▒▒▒    ]▒▒▒▒  ]▒▒▒▒
```
WHAT KIND OF SORCERY IS THIS?

Because it's saved as binary data, we need some kind of formatter to help us out:

```
$ kafka-console-consumer --consumer.config /tmp/consumer.config --formatter "kafka.coordinator.GroupMetadataManager\$OffsetsMessageFormatter" --zookeeper localhost:2181 --topic __consumer_offsets
``

Here it is:
```
[mygroup1,mytopic1,11]::[OffsetMetadata[55166421,NO_METADATA],CommitTime 1502060076305,ExpirationTime 1502146476305]
[mygroup1,mytopic1,13]::[OffsetMetadata[55037927,NO_METADATA],CommitTime 1502060076305,ExpirationTime 1502146476305]
[mygroup2,mytopic2,0]::[OffsetMetadata[126,NO_METADATA],CommitTime 1502060076343,ExpirationTime 1502146476343]
```

We can't really make some use of it, except playing with some regexes. Would it be better to get some nice JSON instead? (yes!)

## Kafka Streams: convert it to JSON

I've written a [Kafka's Streams app](https://github.com/chtefi/kafka-streams-consumer-offsets-to-json) that reads this topic and convert its `(key, val)` to another topic, JSON-readable.


A typical converted message is:

```json
{
    "topic":"WordsWithCountsTopic",
    "partition":0,
    "group":"console-consumer-26549",
    "version":1,
    "offset":95,
    "metadata":"",
    "commitTimestamp":1501542796444,
    "expireTimestamp":1501629196444
}
```

It's a recording that the group `console-consumer-26549` which consumes the topic `WordsWithCountsTopic` has read until the offset `95` of its partition `0`.


# Who sends messages inside ?

Who and when actually?


...


# Compaction

`__consumer_offsets` is a compacted topic.

It's VERY useful, otherwise it could be very huge for no reason.

# Usage of the JSON version

It's another mean to monitor the evolution of the consumed offsets, and can easily be processed by any third-party program or database (such as timeseries database), because it's plain JSON.


