---
title: "Consuming Kafka's __consumer_offsets topic"
date: "2017-08-07T02:08Z"
layout: post
path: "/2017/08/07/consuming-kafka-consumer-offsets-topic/"
language: "en"
tags: scala, avro, benchmark, schema registry, confluent
---

Never wondered what what inside the famous `__consumer_offsets` topic, coming in Kafka 0.9 ?


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

classical tools........

Because it's an _internal_ Kafka topic, we must ask the consumer to not exclude it (default is true).

We must add to the consumer's props: `exclude.internal.topics` -> `false`.

# To JSON

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


