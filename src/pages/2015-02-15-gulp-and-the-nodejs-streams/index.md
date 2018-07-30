---
title: Why Gulp is so fast?
date: "2015-02-15T20:23:10Z"
is_blog: true
path: "/articles/2015/02/15/gulp-and-the-nodejs-streams/"
language: en
tags: ['javascript', 'nodejs', 'gulp']
description: "Gulp is a popular build system. Popular because it's fast thanks to its streams usage."
---

Gulp is a popular build system.

It has taken the lead over Grunt, the latter being more *raw*, not fluid enough, too much verbose with its configuration, and too slow.

A build system is used to organize, launch and automatize repetitive tasks like creating a Javascript bundle, optimize the images, move some files, deploy the application etc.
It generally depends on a community to develop tons of plugins to provide more tasks people can reuse.

We'll take a look at how Gulp works, why it's so *fluid* to use and why it's so fast: because it works with nodejs streams.

TOC

# How to start with Gulp

Gulp is a stream-based build system: a bunch of modules that take one input and output something, itself send as input to another module etc. until the whole pipeline is done.

The pipeline is defined in Javascript, in a file `gulpfile.js` at the root of our project.
As any Javascript file, we need to `require()` what we need: *gulp* itself.
Let's install it and use it.

```xml
$ npm install --global gulp-cli
$ npm install gulp
```

```js
var gulp = require('gulp')
gulp.task('default', function() {
    console.log('todo')
})
```
```xml
$ gulp
[14:16:44] Starting 'default'...
todo
[14:16:44] Finished 'default' after 85 µs
```

# What streams are all about?

To understand why streams matter, let's create something.

Gulp has some functions to read and write some files: `.src()` and `.dest()`.

```javascript
gulp.src('test.js')
```

That returns a `stream.Readable` object: a stream anyone can read from.

To consume it, we can listen to its *data* event.
To know if we have consumed everything, we can listen to the *end* event. 

More info here: [stream.Readable](http://nodejs.org/api/stream.html#stream_class_stream_readable).

```javascript
gulp.src('test.js')
    .on('data', function(chunk) { console.log(chunk) })
    .on('end', function() { console.log('no more data') })
```
```xml
<File "test.js" <Buffer 76 61 72 20 5f 20 3d 20 72 65 71 75 69 72 65 ...>>
no more data
```

This is the ASCII code of each letter of the file `test.js`.
The String representation shows us that the bytes are encapsulated into a [`Buffer`](http://nodejs.org/api/buffer.html) itself wrapped into a `File` (which is actually a [vinyl](https://github.com/gulpjs/vinyl-fs), a abstraction of a File that can be stored anymore: our computer, the network, in memory).

The event *data* is triggered for each file matched by `.src()`:

```javascript
gulp.src(['test.js', 'test2.js'])
    .on('data', function(chunk) { console.log('more data incoming:', chunk) })
    .on('end', function() { console.log('no more data') })
```

```xml
more data incoming: <File "test.js" <Buffer 76 61 72 20 5f 20 3d 20 72 65 71 ...>>
more data incoming: <File "test2.js" <Buffer 76 61 72 20 74 69 6d 65 61 67 6f ...>>
no more data
```

The event *data* is triggered several times, *end* once. 

The stream is the whole thing that transmits the data chunk by chunk until it reaches its end.
We'll see after why it's a powerful abstraction.

## The standard input is a stream

`process.stdin` is a readable stream: we can read keys from it.

It listens to the standard input of the program. The default would be the keyboard, but we can send anything into the stdin of a program, without keyboard.

To close this stream, we need to send an *End Of Transmission* signal (*EOT*) by typing `Ctrl+D` on an Unix machine, `Ctrl+Z` on Windows (sometimes, it doesn't work).

Or, as we just said, we can send some data directly into the stdin using: `echo TEST | gulp`.

Let's replace `gulp.src()` with `process.stdin`:

```javascript
process.stdin
       .on('data', function(chunk) { console.log('you typed: ', chunk) })
       .on('end', function() { console.log('no more typing') })
```
```xml
hey buddy
you typed: <Buffer 68 65 79 20 62 75 64 64 79 0d 0a>
^Dno more typing
```

We typed `hey buddy<enter>`, and it answers with our message.

That works the same way as `src()`, because both are readable streams. +1 for the reusability.

# Creating a pipeline

Creating a pipeline means linking different streams together (input to output) in line.

This is the purpose of the function `pipe`.

It acts simply as a ... pipe between a readable stream (input) and a [writable stream](http://nodejs.org/api/stream.html#stream_class_stream_writable) (output).

The data are transmitted between the source and the target through a simple string or a `Buffer`.
It can also be transmitted in a Javascript object if the stream is using the [*Object Mode*](http://nodejs.org/api/stream.html#stream_object_mode)).

[[info]]
|gulp is *simply* the manager of a bunch of stream readers/writers and processors (the *data* callbacks) that, one by one, transform their input (source code) and pass their result along to the next stream.

A simple pipeline is linking `stdin` to `stdout`:

```javascript
gulp.task('default', function() {
    process.stdin.pipe(process.stdout);
});
```
```xml
$ gulp
hey
hey
stop repeating me
stop repeating me
```

When we type something, it is echo'ed on the console.
`pipe()` listens to the readable stream `stdin`, redirect the content to `stdout` which prints the message.

`pipe()` automatically handles all the events: *data*, *end* for the readable part, and *write* for the writeable stream.

# Writing custom transformations

`src()` returns a readable stream of vinyl files (in *Object Mode*).

If we want to plug something, we need to connect another stream that can handle this kind of input.

For instance, let's create a simple `FileToString` to `console.log` the content of each file passing by the stream. To create it, you have to add `var stream = require('stream');` which is a standard node package.

To create a transform, you need to inherit from stream.Transform and implement the function `_transform` (it has an underscore because you should NOT called it yourself, it's kinda private), as shown in this example:

```javascript
var stream = require('stream');
var util = require('util');

function FileToString() {
    if (!(this instanceof FileToString)) return new FileToString(); // can be called without new
    stream.Transform.call(this, {
        objectMode: true // mandatory to work with vinyl file stream
    });
}
util.inherits(FileToString, stream.Transform);
 
FileToString.prototype._transform = function(chunk, encoding, callback) {
    console.log("| FileToString", chunk);
    var buf = chunk.contents; // refer to the internal Buffer of the File
    this.push(buf.toString()); // push back a String for the next stream
    callback(); // or callback(null, buf.toString()) : that does 2-in-1
};
 
gulp.src(['test.js', 'test2.js'])
    .pipe(FileToString())
```

```xml
| FileToString <File "test.js" <Buffer 76 61 72 20 5f 20 3d 20 72 65 71 75 69 ...>>
| FileToString <File "test2.js" <Buffer 76 61 72 20 74 69 6d 65 61 67 6f 20 3d ...>>
```

Again, we can see the content `src()` returns but this time, we handled it.

If we don't set the `objectMode` on our stream, we'll get an error:

```xml
events.js:72
        throw er; // Unhandled 'error' event
              ^
TypeError: Invalid non-string/buffer chunk
    at validChunk (_stream_writable.js:153:14)
    at FileToString.Writable.write (_stream_writable.js:182:12)
```

## toString() is not UTF-8 compliant

We used `buf.toString()` to get the content of the buffer but that's not the right way to do it.

If we deal with the UTF-8 charset, we could have non-terminated UTF-8 character at the end of your buffer (which will be spanned over the next buffer, check [this example](http://me.dt.in.th/page/StringDecoder/)). `toString` would render odd things.

We have to use a [StringDecoder](https://nodejs.org/api/string_decoder.html) and handle the `_flush` method in our transform to get the leftover (if any).

Here is a more example that deals with UTF-8 strings properly:

```js
var stream = require('stream');
var util = require('util');
var StringDecoder = require('string_decoder').StringDecoder;

function StringDecoderTransform() {
    if (!(this instanceof StringDecoderTransform)) return new StringDecoderTransform();
    stream.Transform.call(this, { objectMode: true });
    this.decoder = new StringDecoder('utf8');
}
util.inherits(StringDecoderTransform, stream.Transform);
 
StringDecoderTransform.prototype._transform = function(chunk, encoding, callback) {
    console.log("| StringDecoderTransform", chunk);
    var buf = chunk.contents;
    callback(null, this.decoder.write(buf)); // decoder.write returns a string
};
 
StringDecoderTransform.prototype._flush = function(callback) {
    var leftOver = this.decoder.end();
    console.log("| StringDecoderTransform flush", leftOver);
    callback(null, leftOver);
};
```

```xml
| StringDecoderTransform <File "test.js" <Buffer 76 61 72 20 5f 20 3d 20 ... >>
| StringDecoderTransform <File "big.js" <Buffer 72 65 71 75 69 72 65 3d ... >>
| StringDecoderTransform <File "utf8.txt" <Buffer 4d 6f 6e 6f 74 6f 6e ... >>
| StringDecoderTransform flush 
```
`_flush()` is called once, when the stream ends.

## A Transform reads and writes (Duplex)

A Transform has an input and an output. It reads and writes, it's a duplex stream.

We said `objectMode` must to be `true` to work with objects instead of string/buffers but that's not entirely true.
`objectMode` is actually the combinaison of 2 properties: `readableObjectMode` and `writableObjectMode`.

Nothing stops us to read an object, and output a string.

```js
gulp.src(['test.js']) 
    .pipe(FileToUppercaseStringArray()) // vinyl stream (object) -> strings[] (object)
    .pipe(StringsJoinerTransform())     // strings[] (object) -> string (non-object)
    .pipe(ExpectsStringTransform())     // string (non-object) -> /

```

```js
function FileToUppercaseStringArray() {
    if (!(this instanceof FileToUppercaseStringArray)) return new FileToUppercaseStringArray()
    stream.Transform.call(this, {
        writableObjectMode: true, // I accept objects
        readableObjectMode: true  // I send objects
    })
    this.decoder = new StringDecoder()
}
util.inherits(FileToUppercaseStringArray, stream.Transform)
FileToUppercaseStringArray.prototype._transform = function(chunk, encoding, callback) {
    console.log('| FileToUppercaseStringArray input', chunk.contents)
    callback(null, this.decoder.write(buf).toUpperCase().split(/\r?\n/)) // array
}
```

```js
function StringsJoinerTransform() {
    if (!(this instanceof StringsJoinerTransform)) return new StringsJoinerTransform();
    stream.Transform.call(this, {
        writableObjectMode: true, // I accept objects
        readableObjectMode: false // I send buffer/string
    })
}
util.inherits(StringsJoinerTransform, stream.Transform)
StringsJoinerTransform.prototype._transform = function(chunk, encoding, callback) {
    console.log('| StringsJoinerTransform input:', chunk)
    callback(null, chunk.join(' | ')) // string
}
``` 

```js 
function ExpectsStringTransform() {
    if (!(this instanceof ExpectsStringTransform)) return new ExpectsStringTransform()
    stream.Transform.call(this, {
        writableObjectMode: false // I accept buffer/string
    })
}
util.inherits(ExpectsStringTransform, stream.Transform);
ExpectsStringTransform.prototype._transform = function(chunk, encoding, callback) {
    console.log('| ExpectsStringTransform input:', chunk)
    callback()
}
```

```xml
| FileToUppercaseStringArray input <File "test.js" <Buffer 76 61 72 20 5f 20 3d... >>
| StringsJoinerTransform     input: [ 'VAR _ = REQUIRE(\'LODASH\');',
                                      'VAR ARR = [3, 43, 24, 10];',
                                      'CONSOLE.LOG(_.FIND(ARR, FUNCTION(ITEM) {',
                                      '    RETURN ITEM > 10;',
                                      '}));',
                                      '' ]
| ExpectsStringTransform     input: <Buffer 56 41 52 20 5f 20 3d 20 52 45 51 55 ... >
```

We can see each different inputs for each streams : Vinyl File > Array of strings > Buffer.

The official documentation of [Stream](https://nodejs.org/api/stream.html) is the perfect place to get more details, but don't lose yourself.

# Read and write into files with streams

Generally, at the end, we want to write some file as output.
We can use the [FileSystem API](https://nodejs.org/api/fs.html) of nodejs.

```
var fs = require('fs')
```

It contains many functions, sync and async, to do any kind of operations on files/folders/paths.
It also contains some functions streaming related.

We can create a basic read stream to check what are the raw events it handles:

```js
var reader = fs.createReadStream('big.js');
               .on('open',     function() { console.log('stream is opened'); });
               .on('close',    function() { console.log('stream is closed'); });
               .on('readable', function() { console.log('stream is readable') });
               .on('data',     function() { console.log('stream has data'); })
               .on('end',      function() { console.log('stream is ending'); });
               .on('error',    function() { console.log('stream is in error'); });
```

```xml
stream is opened
stream has data
stream has data
...
stream has data
stream is readable
stream is ending
stream is closed
```

We can pipe it into a writable stream, to copy a big file for instance :

```js
var reader = fs.createReadStream('big.js');
    .on('open', function() { console.log('reader is opened'); });
    .on('readable', function() { console.log('reader is readable'); });
    .on('data', function(chunk) { console.log('reader has data:', chunk.length, 'bytes'); })
    .on('end', function() { console.log('reader is ending'); });
    .on('close', function() {console.log('reader is closed'); });
    .on('error', function() { console.log('reader is in error'); });
 
var writer = fs.createWriteStream('huge_file.js');

// we monkey-patch `_write` to log something, then we call the original function
// (there is no event associated)
var originalWrite = writer._write.bind(writer);
writer._write = function(chunk, enc, cb) {
    console.log('-- writer is writing', chunk.length, 'bytes');
    originalWrite(chunk, enc, cb);
};
writer.on('open', function() {
    console.log('-- writer is opened | total bytes written:', this.bytesWritten); });
writer.on('drain', function() {
    console.log('-- writer is drained | total bytes written:', this.bytesWritten); });
writer.on('finish', function() {
    console.log('-- writer has finished | total bytes written:', this.bytesWritten); });
writer.on('pipe', function(readable) {
    console.log('-- writer is being piped by a readable stream'); });
writer.on('unpipe', function(readable) {
    console.log('-- writer is not more being piped by a readable stream'); });
writer.on('error', function(err) {
    console.log('-- writer failed | total bytes written:', this.bytesWritten); });

// Let's go!
reader.pipe(writer);
```

The output reveals when the events are triggered :

```xml
-- writer is being piped by a readable stream
reader is opened
-- writer is opened | total bytes written: 0
reader has data: 65536 bytes
-- writer is writing 65536 bytes
-- writer is drained | total bytes written: 65536
reader has data: 65536 bytes
-- writer is writing 65536 bytes
-- writer is drained | total bytes written: 131072
reader has data: 65536 bytes
-- writer is writing 65536 bytes
-- writer is drained | total bytes written: 196608
reader has data: 65536 bytes
-- writer is writing 65536 bytes
reader is readable
-- writer is drained | total bytes written: 262144
...
reader has data: 65536 bytes
-- writer is writing 65536 bytes
reader is readable
-- writer is drained | total bytes written: 524288
reader has data: 54398 bytes
-- writer is writing 54398 bytes
reader is readable
-- writer is drained | total bytes written: 578686
reader is ending
-- writer has finished | total bytes written: 578686
-- writer is not more being piped by a readable stream
reader is closed
```

If the content is already in memory or is not too big, `fs.writeFile()` and `fs.readFile()` are doing the job fine without streams.

---

To manually send data over a writable stream without `pipe()`, we can use the low-level `write()` (`pipe()` is probably using this):

```js
var writer = fs.createWriteStream('writer.js');
writer.write("it's a trap"); // string
writer.write(crypto.randomBytes(1000)); // randomBytes returns a Buffer
writer.close(); // never forget to flush
```

You can see that there a double write of the same sequence in this output :

```xml
-- writer is writing <Buffer 69 74 27 73 20 61 20 74 72 61 70> 11 bytes
-- writer is opened | total bytes written: 0
-- writer is writing <Buffer 69 74 27 73 20 61 20 74 72 61 70> 11 bytes
-- writer is writing <Buffer 02 81 f3 db e4 95 88 83 4c f4 ... > 1000 bytes
-- writer has finished | total bytes written: 1011
```

It is because it was not even opened when the first write was executed: nothing was written. nodejs opened it and the writer sent it again.
