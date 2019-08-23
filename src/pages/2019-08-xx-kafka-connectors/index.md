https://docs.confluent.io/current/connect/devguide.html
https://docs.confluent.io/3.2.0/connect/managing.html

https://enfuse.io/a-diy-guide-to-kafka-connectors/
https://hackernoon.com/writing-your-own-sink-connector-for-your-kafka-stack-fa7a7bc201ea

How to build a custom Kafka Connect Connector

1. abstract config (kafka clients) + valiodators
    configdef config

2. source connector: depends on TaskType
- task class: Class :(
- task configs: test[Pprops] :(

3. task "SourceTask" (or SinkTask)
- poll of SourceRecords (source par, source offset), metadata on the source (files, twitter, anything), to know where to start back
  - source records are stored in Kafka (?)
- ~> ConnectRecords (key: obj + scheme, value: obj+scheme, ts, headers, topic, partition)

3. can use CountDownLatch (or Phaser) to pause during the polling (according to the type of source)
 - stop would batch, release to stop
 - await(duration): true if countdown(), good to know if task must stop
                    - false if timeout
