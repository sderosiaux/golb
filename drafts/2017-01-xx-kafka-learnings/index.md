
## Incompatibilité

Attention à utiliser les bonnes versions d'API compatible avec serveur. Ex: la high level API des Consumers en 0.9 ne fonctionnent pas avec un serveur kafka 0.8.
Aucun message de pop si c'est le cas, ça ne fait rien.

Attention à bien matcher les Key/Value serializer.
[Integer,Integer] d'un côté et de l'autre.
Aucun message de pop si ce n'est pas le cas, ça ne fait juste rien, aucun message n'est consommé par exemple (si produit en String,String et consommé en Integer,Integer).

## Principe

Les producers push leurs data vers le broker kafka.

Les consumers pull les data du broker kafka (Apache Flume fait du push par exemple lui, du broker vers le sink). 

## Topic

Quand on passe par l'API Producer de kafka, le topic est crée tout seul avec des paramètres par défaut (pas de partionnement, pas de replicas.. mais ces défaut sont overridable au niveau de la config du broker kafka). 

## Partitionnement

Si on veut lancer plusieurs consumers sur un même topic et qu'ils ne consomment pas les mêmes messages, il faut partitioner le topic. Si ça n'est pas déjà fait et qu'il existe déjà : 
    
    
    $ .\kafka-topics.bat --zookeeper localhost:2181 --topic elo --partitions 10 --alter
    WARNING: If partitions are increased for a topic that has a key, the partition logic or ordering of the messages will be affected
    Adding partitions succeeded!

Les messages published le sont sur une partition "random" (voir plus loin): 
    
    
    produce 410 ...offset 38 / partition 6 / topic elo
    produce 411 ...offset 40 / partition 7 / topic elo
    produce 412 ...offset 1480 / partition 0 / topic elo
    produce 413 ...offset 38 / partition 1 / topic elo
    produce 414 ...offset 41 / partition 7 / topic elo
    produce 415 ...offset 1481 / partition 0 / topic elo
    produce 416 ...offset 38 / partition 9 / topic elo

Et les consumers consomment des partitions données : Note: le topic elo est divisé en 10 partitions. 
    
    
    # Consumer 1
    ConsumerRecord(topic = elo, partition = 0, offset = 1480, key = 412, value = 412)
    ConsumerRecord(topic = elo, partition = 0, offset = 1481, key = 415, value = 415)
    ConsumerRecord(topic = elo, partition = 1, offset = 38, key = 413, value = 413)
    
    
    # Consumer 2
    ConsumerRecord(topic = elo, partition = 6, offset = 38, key = 410, value = 410)
    ConsumerRecord(topic = elo, partition = 7, offset = 40, key = 411, value = 411)
    ConsumerRecord(topic = elo, partition = 7, offset = 41, key = 414, value = 414)

Chaque partition a son propre offset. 
    
    
    produce 17431 ...offset 41848 / partition 1 / topic elo
    produce 17432 ...offset 41849 / partition 1 / topic elo
    produce 17433 ...offset 41774 / partition 4 / topic elo
    produce 17434 ...offset 41850 / partition 1 / topic elo

Si on rajoute des consumers sur un même topic/même group.id, automatiquement, la charge se répartie entre les consumers, (ie: les partitions affectées à chacun des consumers), on parle de rebalancing. Il faut toujours avoir plus de threads consumers que de partitions, sinon certains threads ne verront aucune message. 

## Zookeeper

Côté Zookeeper, on voit kafka stocker son stuff. Par exemple : 
    
    
    > get /brokers/ids/0
    {"jmx_port":-1,"timestamp":"1459199184439","endpoints":["PLAINTEXT://Rlyeh:9092"],"host":"Rlyeh","version":2,"port":9092}
    
    
    > get /brokers/topics/elo
    {"version":1,"partitions":{"8":[0],"4":[0],"9":[0],"5":[0],"6":[0],"1":[0],"0":[0],"2":[0],"7":[0],"3":[0]}}
    
    
    > ls /brokers/topics/elo/partitions
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    
    
    > get /brokers/topics/elo/partitions/0/state
    {"controller_epoch":1,"leader":0,"version":1,"leader_epoch":0,"isr":[0]}
    
    
    > get /config/topics/elo
    {"version":1,"config":{"retention.ms":"10000","max.message.bytes":"500","retention.bytes":"500"}}
     group.id

Si 2 consommateurs consomment un topic et ont un group.id différent, ils consommeront les mêmes messages. Pour paralléliser la consommation et ne pas dupliquer la consommation, il leur faut le même group.id. 

## A quoi sert la key d'un message

Quand on envoie un message en kafka, on a besoin d'une key et d'un payload : 
    
    
    producer.send(new ProducerRecord[Integer, String]("elo", i, msg))

Elle peut être nulle. Si non nulle, elle sert à déterminer dans quelle partition le message doit aller. (par défault, le partitioner utilise un algo classique de hash sur la key: murmur2). Si null, le partitionnement se fait en mode round-robin. On remarque la répétition exacte des partitions (random sorted au début). 
    
    
    produce 18 ...offset 40077 / partition 7 / topic elo
    produce 19 ...offset 40084 / partition 1 / topic elo
    produce 20 ...offset 40038 / partition 9 / topic elo
    produce 21 ...offset 39492 / partition 3 / topic elo
    produce 22 ...offset 40651 / partition 6 / topic elo
    produce 23 ...offset 41925 / partition 0 / topic elo
    produce 24 ...offset 40490 / partition 8 / topic elo
    produce 25 ...offset 40807 / partition 2 / topic elo
    produce 26 ...offset 40609 / partition 5 / topic elo
    produce 27 ...offset 40035 / partition 4 / topic elo
    
    
    produce 28 ...offset 40078 / partition 7 / topic elo
    produce 29 ...offset 40085 / partition 1 / topic elo
    produce 30 ...offset 40039 / partition 9 / topic elo
    produce 31 ...offset 39493 / partition 3 / topic elo
    produce 32 ...offset 40652 / partition 6 / topic elo
    produce 33 ...offset 41926 / partition 0 / topic elo
    produce 34 ...offset 40491 / partition 8 / topic elo

Alors qu'avec une key, c'est beaucoup plus random : 
    
    
    produce 10 ...offset 40087 / partition 1 / topic elo
    produce 11 ...offset 40041 / partition 9 / topic elo
    produce 12 ...offset 40079 / partition 7 / topic elo
    produce 13 ...offset 39497 / partition 3 / topic elo
    produce 14 ...offset 40042 / partition 9 / topic elo
    produce 15 ...offset 40493 / partition 8 / topic elo
    produce 16 ...offset 40043 / partition 9 / topic elo

Elle sert également pour la compaction des messages. Quand kafka compacte, il garde la dernière value pour une key donnée. Si on envoie (A, 12), (A, 34), (A, 16) dans un topic, alors post-compaction on aura juste (A, 16). 

## Logs

Par défaut, les logs vont dans /tmp/kafka-logs (config du broker) : 
    
    
    $ ls \tmp\kafka-logs\
    __consumer_offsets-0/
    ...
    __consumer_offsets-41/
    elo-0/
    ...
    elo-9/
    meta.properties
    recovery-point-offset-checkpoint
    replication-offset-checkpoint
    
    
    $ ls -lh \tmp\kafka-logs\__consumer_offsets-9\
    total 10M
    -rw-r--r-- 1 Cthulhu None 10M Mar 28 18:48 00000000000000000000.index
    -rw-r--r-- 1 Cthulhu None 0 Mar 28 01:43 00000000000000000000.log
    
    
    $ ls -lh \tmp\kafka-logs\elo-9
    total 12M
    -rw-r--r-- 1 Cthulhu None 10M Mar 28 18:48 00000000000000000000.index
    -rw-r--r-- 1 Cthulhu None 1.8M Mar 28 21:39 00000000000000000000.log

## Retention

Un topic peut avoir une retention niveau size ou niveau temps. (retention.ms et retention.bytes) 
    
    
    $ kafka-run-class.bat kafka.admin.ConfigCommand --zookeeper localhost:2181 --entity-type topics --entity-name elo --alter --add-config retention.ms=10000
    Updated config for topic: "elo".
    $ kafka-run-class.bat kafka.admin.ConfigCommand --zookeeper localhost:2181 --entity-type topics --entity-name elo --alter --add-config retention.bytes=500
    Updated config for topic: "elo".

A noter que sous Windows, nous avons droit à de belles exceptions quand kafka essaie de supprimer les logs : 
    
    
    kafka.common.KafkaStorageException: Failed to change the log file suffix from to .deleted for log segment 0

Problème couvert dans le ticket KAFKA-1194. 

## Config

Il y a une config pour : 

  * les brokers kafka (server.config). C'est une config générale qui est overridable par chacun des composants qui suivent
  * les producers
  * les consumers
  * les topics

## Admin

On peut voir les offsets et les adresses des consumers d'un group via la classe ConsumerGroupCommand : 
    
    
    $ kafka-run-class.bat kafka.admin.ConsumerGroupCommand --bootstrap-server localhost:9092 --new-consumer --group elo-group --describe
    GROUP, TOPIC, PARTITION, CURRENT OFFSET, LOG END OFFSET, LAG, OWNER