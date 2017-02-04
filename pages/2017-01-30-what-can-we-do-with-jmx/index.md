---
title: "What can we do with JMX?"
date: "2017-02-01T01:32Z"
layout: post
path: "/2017/02/01/what-can-we-do-with-JMX/"
language: "en"
---

Oracle provides multiples tutorials, it's quite complete: https://docs.oracle.com/javase/8/docs/technotes/guides/jmx/tutorial/tutorialTOC.html.


http://www.oracle.com/technetwork/java/javase/compatibility-417013.html
http://docs.oracle.com/javase/8/docs/technotes/guides/management/agent.html



---
Summary {.summary}

[[toc]]

---

# What is JMX?

It's a standard issued of the JSR 003 with an addon for the remote management and monitoring in the [JSR 160: JavaTM Management Extensions (JMX) Remote API](https://jcp.org/en/jsr/detail?id=160).

It provides a system to call method and update variables values on the fly (such as configuration flags).
Instead of having to restart an application when we update its configuration, with JMX, no need to restart anything.

It's a bit like [Archaius]() when you are using DynamicProperty and polling a database for changes, or when we use Zookeeper when some znode is created or is updated. JMX can also be used to directly call methods on MBeans.

## MBeans and MXBeans

![](mxbean_memory.png)

Here, we are looking at the object `java.lang:type=Memory`.
The values we see in the screenshot are the exact as we can get in the code with:

```scala
val mem = ManagementFactory.getMemoryMXBean
mem.setVerbose(true)
mem.getNonHeapMemoryUsage.getUsed
mem.gc()
```

We can retrieve with its ObjectName but useless, because we just grab an instance of `ObjectInstance`, so we don't have any methods:

```scala
val obj = server.getObjectInstance(ObjectName.getInstance("java.lang:type=Memory"))
println(obj) // class javax.management.ObjectInstance
// behind it's a MemoryImpl but the visibility is package only
```

# How to use JMX?

## JMX Connectors

We can use:

- jconsole
- Java VisualVM
- Java Mission control

All three are packaged by default with the JVM installation and provide a connector to local or remote MBeans servers.

MBean Server (we register Managed Beans), it is the one that manage the objects and provides methods to register/unregister, invoke methods on the MBean.
The MBean Server is a JMX agent.

A MBean must have an object name composed of a _domain_ and key values pairs.

an interface with the "MBean" suffix is mandatory to be recognize and be able to register it into the JMX server.
Because we need get/set and we are working in Scala, we don't forget to annotate the properties with `@BeanProperty`.

MBean can be "standard", "dynamic", "open", or "model".


## Remote JMX

```bash
-Dcom.sun.management.jmxremote
-Dcom.sun.management.jmxremote.port=9010
-Dcom.sun.management.jmxremote.local.only=false
-Dcom.sun.management.jmxremote.authenticate=false
-Dcom.sun.management.jmxremote.ssl=false
-Djava.rmi.server.hostname=127.0.0.1
```



# Example: Kafka

Kafka exposes tons of MBeans.

![Kafka using JMX](jmx_kafka.png)

We can retrieve and set the logging level of all the loggers, get the start/end offsets of each partitions, get metrics about elections, logs flushing, queues size, messages/bytes per seconds (globally, per topic), and so much more.


# Akka Actors metrics to JMX

https://tersesystems.com/2014/08/19/exposing-akka-actor-state-with-jmx/


# Jolokia: JMX to HTTP

Jolokia is a Java agent used to expose JMX through HTTP (json), instead of using JMX Connectors (jconsole, Java Mission Control..).

A Java agent is some piece of code started when the JVM starts, that can instrument classes before the real application starts OR it can be plugged on any JVM application on the fly.{.info}

It supports attributes list, read, write, and methods execution. Jolokia simplifies how to use JMX because JSON through HTTP is way more accessible and can be used in any language. Jolokia [provides](https://jolokia.org/features/polyglot.html) some client libraries to simplify the flow (Java, Javascript (with jQuery, erk), Perl), but anything can query the HTTP endpoint, it's plain JSON.

The installation of Jolokia is quite straight-forward:

- We [download](https://jolokia.org/download.html) a `.jar` because we work with pure Java applications: [jolokia-jvm-1.3.5-agent.jar](http://search.maven.org/remotecontent?filepath=org/jolokia/jolokia-jvm/1.3.5/jolokia-jvm-1.3.5-agent.jar).
- We add `-javaagent` to the command line when we start Java to take our `.jar` into account ([it's also possible to start the agent on an already running JVM](https://jolokia.org/reference/html/agents.html#jvm-attach)). Configuring the command line can be done through the IDE project configuration or directly in `build.sbt` when we use `sbt run`:

```scala
fork in run := true
javaOptions += "-javaagent:jolokia-jvm-1.3.5-agent.jar=port=7777,host=localhost"
mainClass in (Compile, run) := Some("com.ctheu.JMXTest")
```

We'll get a log stating it's all good:
```xml
[info] I> No access restrictor found, access to any MBean is allowed
[info] Jolokia: Agent started with URL http://127.0.0.1:7777/jolokia/
```

Now, when we query `http://localhost:7777/jolokia/`, we get the agent version:
```js
{
    "request": {
        "type": "version"
    },
    "value": {
    "agent": "1.3.5",
    "protocol": "7.2",
    "config": {
        "maxDepth": "15",
        "discoveryEnabled": "true",
        ...
```

From there, we can list, read, or write any attributes and execute methods.

- List

When we are looking around:

```bash
http://localhost:7777/jolokia/list
# or a particular namespace
http://localhost:7777/jolokia/list/java.lang
# or particular attribute
http://localhost:7777/jolokia/list/java.lang/type=Memory/attr/HeapMemoryUsage
```

```js
{
    "request": { "type": "list" },
    "value": {
        "JMImplementation": {},
        "java.util.logging": {},
        "java.lang": {
        "name=PS Scavenge,type=GarbageCollector": {},
        "type=Threading": {},
        "name=PS Old Gen,type=MemoryPool": {},
        "type=Memory": {
            "op": { "gc": { "args": [], "ret": "void", "desc": "gc" } },
            "attr": {
                "ObjectPendingFinalizationCount": {},
                "Verbose": { "rw": true, "type": "boolean", "desc": "Verbose" },
                "HeapMemoryUsage": {
                    "rw": false,
                    "type": "javax.management.openmbean.CompositeData",
                    "desc": "HeapMemoryUsage"
                },
    ...
```

- Read

Perfect if we know what we are looking for.
The route to use when we want to monitor the metrics using a Monitoring System and have some nice charts.

```bash
http://localhost:7777/jolokia/read/java.lang:type=Memory
# or a particular attribute
http://localhost:7777/jolokia/read/java.lang:type=Memory/HeapMemoryUsage/used
```

```js
{
    "request": { "mbean": "java.lang:type=Memory", "type": "read" },
    "value": {
        "ObjectPendingFinalizationCount": 0,
        "Verbose": false,
        "HeapMemoryUsage": {
            "init": 268435456,
            "committed": 257425408,
            "max": 3814195200,
            "used": 59135648
        },
        "NonHeapMemoryUsage": {
            "init": 2555904,
            "committed": 17235968,
            "max": -1,
            "used": 16706800
        },
        "ObjectName": { "objectName": "java.lang:type=Memory" }
    },
    "timestamp": 1485728539,
    "status": 200
}
```

- Write

Let's say Jolokia has some MBeans that return these values:

```js
// http://localhost:7777/jolokia/read/jolokia:type=Config
{ "HistorySize": 82, "MaxDebugEntries": 100, "HistoryMaxEntries": 10, "Debug": false }

// http://localhost:7777/jolokia/list/jolokia/type=Config/attr/Debug
{ "rw": true, "type": "boolean", "desc": "Attribute exposed for management" }
```
We see `jolokia:type=Config > Debug` is writeable (`rw: true`) and we have its current value.


We can modify it with a classic GET (with the value at the end):
```xml
http://localhost:7777/jolokia/write/jolokia:type=Config/Debug/true
```
If we read it again:
```js
{ "HistorySize": 82, "MaxDebugEntries": 100, "HistoryMaxEntries": 10, "Debug": true }
```

- Method execution

There are already some existing MBeans in the JRE we can call:

```bash
http://localhost:7777/jolokia/exec/java.lang:type=Memory/gc
# or with arguments
http://localhost:7777/jolokia/exec/java.util.logging:type=Logging/setLoggerLevel/global/FINER
```

Those are truly useful when methods are doing complex operations. We can basically call any method remotely that will affect the process (or just return a result), thanks to JMX.


It's possible to do all those queries with POST when a GET is not enough to pass arguments properly (such as maps, arrays, complex types). GET has only a basic support of arrays based on the "a,b,c" notation.{.info}

Note that the agent has a lot of options available, we can get them by getting the help from the agent.jar itself:
```xml
$ java -jar jolokia-jvm-1.3.5-agent.jar --help
    ...
    --host <host>                   Hostname or IP address to which to bind on
                                    (default: InetAddress.getLocalHost())
    --port <port>                   Port to listen on (default: 8778)
    --agentContext <context>        HTTP Context under which the agent is reachable (default: /jolokia)
    ...
    --user <user>                   User used for Basic-Authentication
    --password <password>           Password used for Basic-Authentication
    --quiet                         No output. "status" will exit with code 0 if the agent is running, 1 otherwise
    --verbose                       Verbose output
    ...
```
As we can see, the endpoint security is builtin in Jolokia.
All the options are also listed on the [reference guide](https://jolokia.org/reference/html/agents.html#agents-jvm).

# Camel: ???

http://camel.apache.org/camel-jmx.html

# JMXTrans: JMX metrics to anywhere

https://github.com/jmxtrans/jmxtrans/wiki/Queries

JMXTrans is based on quartz for the scheduling piece.
The default schedule (`runPeriod`) is 60s by default and is configurable: `-s 10` for 10s interval.

Download here http://central.maven.org/maven2/org/jmxtrans/jmxtrans/263/:

[jmxtrans-263-dist.tar.gz](http://central.maven.org/maven2/org/jmxtrans/jmxtrans/263/jmxtrans-263-dist.tar.gz)

Then we can execute it:

```xml
$ tar zxvf jmxtrans-263-dist.tar.gz
$ java -jar jmxtrans-263/lib/jmxtrans-all.jar --help
```

The important options are:

```bash
-f, --json-file
-q, --quartz-properties-file
    The Quartz server properties.
-s, --run-period-in-seconds
    The seconds between server job runs.
    Default: 60
```
- `-f`: the main configuration to provide to JMXtrans to know the source, and the sink(s).

For instance, it can listen to the JMX data on `localhost:9010` and send the results to `stdout`:

```js
{
  "servers" : [ {
    "port" : "9010",
    "host" : "localhost",
    "queries" : [ {
      "outputWriters" : [ {
         "@class" : "com.googlecode.jmxtrans.model.output.StdOutWriter"
      } ],
      "obj" : "java.lang:type=OperatingSystem",
      "attr" : [ "SystemLoadAverage", "AvailableProcessors", "TotalPhysicalMemorySize",
                "FreePhysicalMemorySize", "TotalSwapSpaceSize", "FreeSwapSpaceSize",
                "OpenFileDescriptorCount", "MaxFileDescriptorCount" ]
    } ],
    "numQueryThreads" : 2
  } ]
}
```

JMXTrans will watch the given properties of the JMX "node" `java.lang:type=OperatingSystem`:

```xml
Result(attributeName=SystemLoadAverage,
    className=sun.management.OperatingSystemImpl,
    objDomain=java.lang,
    typeName=type=OperatingSystem,
    values={SystemLoadAverage=-1.0},
    epoch=1485905825980,
    keyAlias=null)
Result(attributeName=FreePhysicalMemorySize,
    className=sun.management.OperatingSystemImpl,
    objDomain=java.lang,
    typeName=type=OperatingSystem,
    values={FreePhysicalMemorySize=5871636480},
    epoch=1485905825980,
    keyAlias=null)
...
```

- `-q`: if we want to specify some quartz properties.
JMXTrans has some defaults in the file `quartz-server.properties`.
Quartz has [tons of options](http://www.quartz-scheduler.org/documentation/quartz-2.2.x/configuration/) such as its threadpool config, listeners, plugins, misc thresholds..

- `-s`: change the default poll interval of 60s.

# Programatically

```scala
JMXServiceURL u = new JMXServiceURL(
  "service:jmx:rmi:///jndi/rmi://" + hostName + ":" + portNum +  "/jmxrmi");
  JMXConnector c = JMXConnectorFactory.connect(u); 
```


???
```
static final String CONNECTOR_ADDRESS =
 "com.sun.management.jmxremote.localConnectorAddress";
 
// attach to the target application
VirtualMachine vm = VirtualMachine.attach(id);
 
// get the connector address
String connectorAddress =
    vm.getAgentProperties().getProperty(CONNECTOR_ADDRESS);
 
// no connector address, so we start the JMX agent
if (connectorAddress == null) {
   String agent = vm.getSystemProperties().getProperty("java.home") +
       File.separator + "lib" + File.separator + "management-agent.jar";
   vm.loadAgent(agent);
 
   // agent is started, get the connector address
   connectorAddress =
       vm.getAgentProperties().getProperty(CONNECTOR_ADDRESS);
}
 
// establish connection to connector server
JMXServiceURL url = new JMXServiceURL(connectorAddress);
JMXConnector = JMXConnectorFactory.connect(url);
```

# Resources

A implementation in Scala: https://github.com/dacr/jajmx that can query a MBean server directly in an application.

