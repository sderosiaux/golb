how to consume large records

- blocking on consumers with default config (reuse conduktor stuff)
- tuning consumer & broker side

- explain the pattern Claim Check https://www.enterpriseintegrationpatterns.com/patterns/messaging/StoreInLibrary.html
https://docs.microsoft.com/en-us/azure/architecture/patterns/claim-check

+ OOM

I have to deal with large ( 16M) text messages in my Kafka system, so i
increased several message limit settings on broker/producer/consumer site
and now the system is able to get them through....I also tried to enable
compression in producer:
"compression.type"= "gzip"
but to my surprise ended up with OOM exceptions on producer side:
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space at
java.lang.StringCoding$StringEncoder.encode(StringCoding.java:300) at
java.lang.StringCoding.encode(StringCoding.java:344) at
java.lang.String.getBytes(String.java:918) at
org.apache.kafka.common.serialization.StringSerializer.serialize(StringSerializer.java:43)

Looking deeper
into StringCoding.encode, it's first allocating a byte array to fit your
string, and this is where your OOM is occurring, line 300 of
StringCoding.java is  byte[] ba = new byte[en];

==> increase heap size



