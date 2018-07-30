---
title: Browserify in-depth
date: "2015-02-14T16:57:32Z"
is_blog: true
path: "/articles/2015/02/14/browserify-in-depth/"
language: en
tags: ['javascript', 'nodejs', 'browserify']
description: "Browserify was a popular Javascript bundler, simpler than Webpack."
---

[Browserify](http://browserify.org/) popularity was raising^[Hey, it was Feb-2015 only :). I was still adding `<script>` manually into my `index.html`.], I did not fully understand what it was, what was its purpose, why would I need it. I decided to step ahead and learn how it works, what it does.

The blogs and articles I found were never crystal cleared and were always using some other tools I didn't want to use. (like Grunt or Bower, sorry)

We'll simply use [Node](http://nodejs.org/) and [npm](https://www.npmjs.com/) here, nothing fancy.

TOC

# What is Browserify ?

Browserify is a tool to create a Javascript bundle from multiple Javascript files.

At the same time, it can apply some transformations such as
- ~~[uglify](https://github.com/mishoo/UglifyJS)~~ [uglify2](https://github.com/mishoo/UglifyJS2) to minify the source code
- ~~[reactify](https://www.npmjs.com/package/reactify)~~ [babelify](https://github.com/babel/babelify) to convert React .jsx files to classic Javascript

The HTML pages^[Generally, we have an Single Page Application with only one `index.html`.] just need to reference one unique file `<script src="bundle.js"></script>`.

We don't have to worry about creating new Javascript files: they will be added to the bundle.

We also don't need to worry about the order of the Javascript files your insert.
Browserify is smart and know how to handle the dependencies (A needs B, B should be included before A).

In a sense, it does what nodejs does when you run a nodejs program.

# Modularization

A simple program in nodejs would be:

```js
var _ = require('lodash');
var arr = [3, 43, 24, 10 ];
console.log(_.find(arr, function(item) {
    return item > 10;
}));
```

We just have to install lodash using `npm install lodash` and run the program `$ node app.js`.

If we don't install lodash (that we required), nodejs will fail to resolve the dependency and will crash: `Error: Cannot find module 'lodash'`.

Browserify behaves the same to build a Javascript bundle containing all the dependencies inside, needed to run the whole application on a browser.

# The command line

We'll start with the command line to fully understand how browserify works.

We install it globally to have access to it anywhere in the console (this is not really a dependency of the program itself, it's *exterior* to the program):

```xml
$ npm install -g browserify
```
```xml
$ browserify
Usage: browserify [entry files] {OPTIONS}

Standard Options: 
  --outfile, -o Write the browserify bundle to this file.
                If unspecified, browserify prints to stdout. 
  --require, -r A module name or file to bundle.require()
                Optionally use a colon separator to set the target. 
    --entry, -e An entry point of your app 
   --ignore, -i Replace a file with an empty stub. Files can be globs. 
  --exclude, -u Omit a file from the output bundle. Files can be globs. 
 --external, -x Reference a file from another bundle. Files can be globs.
--transform, -t Use a transform module on top-level files. 
  --command, -c Use a transform command on top-level files. 
--standalone -s Generate a UMD bundle for the supplied export name.
                This bundle works with other module systems and sets the name
                given as a window global if no module system is found. 
     --debug -d Enable source maps that allow you to debug your files separately. 
     --help, -h Show this message For advanced options, type browserify --help advanced.
```

## The empty bundle

Let's try the simplest command (no entry files):

```xml
$ browserify -o bundle.js
```

This generates a file with this content inside:

```js
function e(t,n,r){
  function s(o,u){
    if(!n[o]){
      if(!t[o]){
        var a=typeof require=="function"&&require;
        if(!u&&a)return a(o,!0);
        if(i)return i(o,!0);
        var f=new Error("Cannot find module '"+o+"'");
        throw f.code="MODULE_NOT_FOUND",f
      }
      var l=n[o]={exports:{}};
      t[o][0].call(l.exports,function(e){
        var n=t[o][1][e];
        return s(n?n:e)
      },l,l.exports,e,t,n,r)
    }
    return n[o].exports
  }
  var i=typeof require=="function"&&require;
  for(var o=0;o<r.length;o++)s(r[o]);
  return s
})({},{},[]);
```

This is some ugly code, but it's also look like to be the base code of the dependencies management!
We can find the message of nodejs: *Cannot find module xxx*.

## A simple bundle

Let's try to add our Javascript file as entry:

```xml
$ browserify test.js -o bundle.js
```

`bundle.js` weights 376KB now.

We can find the whole `lodash` source code inside, and our `test.js`:

```js
(function e(t,n,r){ /* same thing as before */...return s})({
    1:[function(require,module,exports){
        /* ...lodash source code... */
    },{}], 
    2:[function(require,module,exports){
        var _ = require('lodash');
        var arr = [3, 43, 24, 10];
        console.log(_.find(arr, function(item) { return item > 10; }));
    }, {"lodash":1}]
},{},[2]);
```

It's quite clear to see what's going on:

- `1` is lodash, and does not depend on anything `{}`
- `2` is our code, and does depend on lodash `{"lodash":1}`
- The entry point of the program is `[2]`: our code.

As we can see, Browserify provides the function `require` that we are using in the code: `function(require,module,exports)`.
It does not exist in the browser, but only in the nodejs environment.

We already saw the implementation of `require` in the empty bundle (look closely):

```js
function(e){
    var n=t[o][1][e];
    return s(n?n:e)
}
```

Browserify also provides `module` and `exports` that we'll use later to expose reusable functions (that we will be able to `require()`).

The bundle can now work standalone.
[[info]]
|We can run in nodejs (without any external dependencies, no `node_modules`) or in a browser.

## Create a common bundle

```xml
--require, -r A module name or file to bundle.require()
```

It's possible to add any package, even if it is not `require()`.
For instance, if we want to add the [timeago](https://www.npmjs.com/package/timeago) package into our bundle:

```
$ browserify -r timeago test.js -o bundle.js
```

The package timeago will be append to my bundle.js.

It's useful to create a bundle with only common packages that we want to keep separated:

```xml
browserify -r timeago -r lodash -r ./custom-lib.js -o libraries.js
````

## Multiple entries

```xml
--entry, -e An entry point of your app
```

It is implicitly used when we just type `browserify test.js`. It's the same as `browserify -e test.js`.

Multiple files can be specified as entries, all of them will be taken into account to resolve the dependencies. 

## Replace a dependency an empty stub

```xml
--ignore, -i Replace a file with an empty stub. Files can be globs.
```

It replaces the content of the dependencies by an empty object.
For instance, if we ignore lodash, this is the bundle we get: 
```xml
$ browserify -i lodash test.js -o bundle.js
```

```js
(function e(t,n,r){ /* same thing as before */...return s})({
    1:[function(require,module,exports){ },{}], 
    2:[function(require,module,exports){
        var _ = require('lodash');
        var arr = [3, 43, 24, 10];
        console.log(_.find(arr, function(item) { return item > 10; }));
    }, {"lodash":1}]
},{},[2]);
```

The lodash module is empty. The program won't work:

```xml
console.log(_.find(arr, function(item) {
              ^
TypeError: Object #<Object> has no method 'find'
```

It's useful when some dependencies has been imported by transitivity and we know we don't use them.

## Exclude a dependency

```xml
--exclude, -u  Omit a file from the output bundle. Files can be globs.
```

It's a bit similar to `-ignore` but that totally wipe the module or the file out.

```xml
$ browserify -u lodash test.js  -o bundle.js
```

```js
(function e(t,n,r){ /* same thing as before */...return s})({
    1:[function(require,module,exports){
        var _ = require('lodash');
        var arr = [3, 43, 24, 10];
        console.log(_.find(arr, function(item) { return item > 10; }));
    }, {"lodash":undefined}]
},{},[1]);
```

We can see the difference with `–ignore`: no empty stub and `{"lodash":undefined}`.
It's not possible to run it standalone:

```
module.js:340
    throw err;
          ^
Error: Cannot find module 'lodash'
```

But, it's possible to run it where there is a `node_modules` with lodash inside. nodejs will successfully resolve the dependency.
`bundle.js` does not state that it contains the dependency, therefore nodejs fallback to `node_modules`.

## Dependency to another bundle

```xml
--external, -x  Reference a file from another bundle. Files can be globs.
```

It's a bit like `-exclude` but we tell to browserify that some dependencies are in another files we're going to ship too.
It slightly changes how it resolves things.

```
$ browserify -x common.js page1.js -o page1-bundle.js
$ browserify -x common.js page2.js -o page2-bundle.js
```

## Transformations are the things

```xml
--transform, -t  Use a transform module on top-level files.
```

Probably one of the most useful feature.

Transformations are intermediate processes that take an input, do something with it, and output something.
Multiple transformations can be glued together to form a pipeline.

There are a bunch of transformations possible, here are some:

- minify/uglify js/css/html
- compile `.jsx` or `.coffee` into `.js`
- compile `.less` or `.scss` into `.css`
- generate the Javascript source maps (to debug)
- convert ES6 to ES5
- remove `console.log` and `debugger` from the code

Here is [big list](https://github.com/substack/node-browserify/wiki/list-of-transforms) with almost everything that exists.

### Our own transformation

We can easily make our own.

For instance, let's do a transform that will comment out our code ?!
It's a bit complicated at first because transformations are using nodejs' [`Buffer`](https://nodejs.org/api/buffer.html) and [`Stream`](https://nodejs.org/api/stream.html).

```js
var through = require('through');
 
module.exports = function(filename, options) {
    // `through` returns a Stream.
    // The caller will call write() to give us content
    return through(write, end);

     // we got data!
    function write(chunk) {
        // `chunk` is just an array of integer (ascii codes).
        // We convert it into a string and we add `//` in front of it (and after newlines).
        // Finally, we queue our changes back to the stream.
        this.queue('// ' + new Buffer(chunk).toString('ascii').replace(/\n/g, '\n//'))
    }
 
    // No more data: we send a `null` to signal we are done.
    function end() {
        return this.queue(null);
    }
};
```

Our original file `test.js`:

```js
var timeago = require('timeago');
console.log(timeago(new Date()));
```

If we call:
```xml
$ browserify -t ./test-transform.js test.js
```

The result is :

```js
(function e(t,n,r){ /* same thing as before */ })({
    1:[function(require,module,exports){
      //var timeago = require('timeago');
      //console.log(timeago(new Date()));
    }, {}]
},{},[1]);
```

Our code has been commented out! What a nice transform.

[[info]]
|Because it has been commented out, no dependency was resolved (`timeago`): they are resolved after the transformations.

## UMD format
```xml
--standalone -s  Generate a UMD bundle for the supplied export name.
```

This encapsules our code into an [UMD](https://github.com/umdjs/umd) bundle. They are useful to work in node, in a browser with globals, and in AMD environments.

UMD is a system to make modules capable to work with any dependency system: CommonJS (nodejs), AMD, or Javascript globals.

With this option, Browserify adds support for `module.exports` (CommonJS), `define()` function (AMD), and `window` (globals).

## Source mapping

```xml
--debug -d  Enable source maps that allow you to debug your files
```

This generates the sourcemaps at the end of the bundle.

That is useful when we want to debug with minified/transformed version: we need the original code to know what's going on.
This is why the sourcemaps exist.
When we're debugging, the browsers automatically use them to display the original source, instead of the minified.

```js
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb...
```

[exorcist](https://www.npmjs.com/package/exorcist) is often used to put the sourcemap into another file instead of the bundle.

```json
{
  "version": 3,
  "sources": [ "test.js", "lib.js" ],
  "names": [],
  "mappings": "AAAA;ACAA;AACA;AACA;;ACFA;AACA;AACA;AACA",
...
```

## Other options

```xml
--list  Print each file in the dependency graph. Useful for makefiles.
```

If we do that on the base file React.js, we have its dependency graph:

```xml
$ browserify --list react.js
\npm\node_modules\browserify\node_modules\process\browser.js
lib\ReactCurrentOwner.js
lib\Object.assign.js
lib\ExecutionEnvironment.js
lib\ReactPerf.js
lib\ReactContext.js
lib\ReactElement.js
lib\ReactDOM.js
...
```

---

```xml
--bare
 
  Alias for both --no-builtins, --no-commondir, and sets --insert-global-vars
  to just "__filename,__dirname". This is handy if you want to run bundles in
  node.
```

If we want to run a bundle in nodejs, we can use this option.

It will weight less because a lot of dependencies are already part of nodejs itself (like `fs`, `http`, `process`, `stream` etc.), and they won't be added to the bundle.

# Browserifying a nodejs program

If we try to browserify a pure nodejs program, we're going to get troubles.

Some libraries just does not exist on the browser side.
Fortunately, most of the nodejs builtins libraries can work in a browser environment.

For instance, the `Buffer` class.
It's a builtin class in nodejs, we don't need to `require()` it.

```js
console.log(Buffer(0xBE).toString('hex'));
```
```
6500730074002d00b0d01102000000000200000000000000b8d011020000000001000000...
```

If we browserify it, we end up with a 42KB bundle.js.
It contains the implementation of the `Buffer` class and its dependencies, and it works in the browser.

What if we use the `fs` package that depends on the filesystem?
We can't access the host filesystem on a browser.

```js
require('fs').stat('.', function(err, stats) {
    console.log(err, stats);
});
```

The response in nodejs:
```
null { dev: 0,
  mode: 16822,
  nlink: 1,
  ...
```

If we browserify it, bundle.js is small.
`fs` was imported but is actually an empty stub.

We can find [here](https://github.com/substack/node-browserify/blob/master/lib/builtins.js) the list of supported and unsupported builtins dependencies.
Some resolve to `_empty.js` like `fs` or `child_process` (used to start other programs).

# Real use-cases

Let's work with real world use-cases, that depends on third-party libraries.

## jQuery

We have `index.js` that requires jquery:

```js
var $ = require('jquery');
$('body').append('hey!');
```

And we don't forget to install its module:

```xml
$ npm install --save jquery
```

We create `index.html` that contains a reference to the bundle:

```html
<html>
<body>
    <script src="bundle.js"></script>
</body>
</html>
```

To create `bundle.js`, we need to do something like:

```
$ browserify -e index.js -o bundle.js
```

It's working.

We are *lucky* because jQuery has its npm package.

## Custom modules

Let's create a module `helper.js` that exposes a stateful function to alter the DOM.

```js
var $ = require('jquery');
var counter = 0;
 
module.exports = function() {
    return $('<div>').text("you called me " + counter++);
};
```

It returns a new `<div>` element containing the number of times it was called.
We export this function using the CommonJS syntax: `module.exports = ...` to be able to `require()` it from somewhere else.

We modify our `index.js` to use it:

```js
var $ = require('jquery');
var help = require('./helper.js');
 
$('body').append(help());
$('body').append(typeof counter);
$('body').append(help());
```

That renders:

```
you called me 0
undefined
you called me 1
```

Our helper is called, we can see `counter` is well hidden in its module.

```js
  1:[function(require,module,exports){
    var $ = require('jquery');
    var counter = 0;
 
    module = module.exports = function() {
      return $('<div>').text("you called me " + counter++);
    };
  },{"jquery":3}],
  2:[function(require,module,exports){
    var $ = require('jquery');
    var myhelper = require('./helper.js');
 
    $('body').append(myhelper());
    $('body').append(typeof counter);
    $('body').append(myhelper());
 
  },{"./helper.js":1,"jquery":3}],
  3:[function(require,module,exports){
    // ... jquery code source ...
```

## Local CommonJS lib

Let's say we have a library not in npm but in `./libs/` that contains these lines at the beginning: ([d3js](https://d3js.org/) here):

```js
if (typeof module === "object" && module.exports) module.exports = d3;
```

`require()` can resolve this by specifying the full path:

```js
var d3 = require('./libs/d3.v3.js');

d3.select("body").selectAll("p")
    .data([4, 8, 15, 16, 23, 42])
    .enter().append("p")
      .text(function(d) { return "I'm number " + d + "!"; });
```

It works because CommonJS works with `module` and `module.exports`.

## Global encapsulation: (function(w) { … })(window)

Some libraries do not have the CommonJS compatibility code but are encapsulated into an anonymous function where the only parameter in `window`.
It is quite common to find this pattern, because a lot of libraries are created for the browser first.

For instance, if we look at a [colors.js](http://honyovk.com/Colors/), we have this structure^[It has changed since, but it's still a good example.]:

```js
(function(window) {
  var Colors = {};
  Colors.rand = function() { ... }
  ...
  window.Colors = Colors;
}(window));
```

It adds a new object `Colors` into the given `window` object.

We'd like to use it this way:

```js
var colors = require('colors');
document.body.innerHTML = colors.rand();
```

We have to tell browserify how it can find and use `Colors`.

One way is to pass a dummy item `window` to `colors.js`, and let it set its functions onto it.
The package [browserify-shim](https://github.com/thlorenz/browserify-shim) does exactly that.
It allows us to `require()` CommonJS incompatible libs.

To resolve our situation, we `npm install browserify-shim` and we update our `package.json` to add a transformation that will use browserify-shim:

```json
"browserify": {
    "transform": ["browserify-shim"]
},
 
"browserify-shim": {
    "./libs/colors.min.js": {
        "exports": "Colors"
    }
}
```

This declares that our lib `./libs/colors.min.js` exports a variable named `Colors` on the global object `window` (that browserify-shim will provide).
This is what we want `require()` to return.

## A more complex example: Highcharts

Let's finish with a more complex example: [Highcharts](http://www.highcharts.com/).

Highcharts client library is^[was] not in the npm registry. There is a package with this name but it's only a server-side rendering thingy. We want to use its client-side in our case and we want browserify to resolve the dependency when we `require()` it.

Our target is to run :

```js
require('Highcharts');
var $ = require('jquery');
 
$('body').highcharts({
    series: [{
        data: [13, 37, 42]
    }]
});
```

Because of how Highcharts is coded, it's not going to be straightforward.
We'll quickly see how it's coded to understand the solutions.

Here is a preview of `highcharts.src.js`:

```js
(function () {
  var win = window;
  Highcharts = win.Highcharts = {};
...
  (function ($) {
    win.HighchartsAdapter = win.HighchartsAdapter || ($ && {
      ...
    });
  }(win.jQuery));
 
  ...
  // check for a custom `HighchartsAdapter` defined prior to this file
  var globalAdapter = win.HighchartsAdapter,
      adapter = globalAdapter || {};
  ...
}());
```

- Everything is encapsulated into a `function()`
- This function takes no parameters (no `window`!)
- Explicit references to `Highcharts` (global)
- Explicit references to `window` (global)
- Explicit references to `window.jQuery` (global)

That's definitely not modular.

### Create another adapter

We update `package.json` to shim `Highcharts` and `HighchartsAdapter`:

```json
{
  "browser": {
    "Highcharts": "./libs/highcharts/highcharts.src.js",
    "HighchartsAdapter": "./libs/highcharts/standalone-framework.src.js"
  }, 
  "browserify-shim": {
    "Highcharts": {
      "depends": ["HighchartsAdapter:HighchartsAdapter"]
    },
    "HighchartsAdapter": {
      "exports": "HighchartsAdapter"
    }
  }
```

We export one global symbol `HighchartsAdapter` from `standalone-framework.src.js` (available in Highcharts) which is NOT jQuery dependent.

This file just defines a generic `var HighchartsAdapter = { ... }` that we export under the same name, for the condition `win.HighchartsAdapter = win.HighchartsAdapter || ($ && {...})` to use it. We tell to Browserify that `Highcharts` depends on it (to be imported first).

Because Highcharts just injects itself into `window` (`Highcharts = win.Highcharts = {}`), we have access to the global variable `Highcharts` to create our chart:

```js
// no jquery needed
require('Highcharts');
new Highcharts.Chart({
    chart: {
        renderTo: document.body
    },
    series: [{
        data: [13, 37, 42]
    }]
});
```

Problem solved with another adapter independent of jQuery.

If we already have jQuery in our page, we'd better use it.

### Default jQuery adapter

The default jQuery adapter is included by default in `highcharts.js`.
We need `window.jQuery` to be available when Highcharts is imported.
We need to export the module jquery into this symbol `jQuery`:

```json
{
  "browser": {
    "Highcharts": "./libs/highcharts/highcharts.src.js"
  }, 
  "browserify-shim": {
    "Highcharts": {
      "depends": ["jquery:jQuery"]
    }
  }
```

When we add the dependency to `jquery:jQuery`, we define that `global.jQuery = require('jquery')` (global being `window` in the browser), therefore Highcharts can find it.

# Conclusion

Browserify is a great tool and definitely worth using it for front-end development. It has no more secret for us !

It removes the need to add multiple `<script>` to the pages, to deal manually with dependencies, it can optimize the content of the bundle, add the source-mapping, and have a lot of plugins to enhance it.
It can be used with any type of library, CommonJS or not, there is always a way.

Its big competitor is [webpack](https://webpack.github.io/) which became more and more popular afterwards.
Its configuration can be hard to grasp at first but it can become a powerful ally.