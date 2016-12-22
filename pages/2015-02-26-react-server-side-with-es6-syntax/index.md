---
title: ReactJS and ES2015/JSX transpilation
date: "2015-02-26T00:45:29Z"
layout: post
path: "/2015/02/26/react-server-side-with-es6-syntax/"
language: en
---

This article is an artefact. If you want to remember, now is the time.


- React was in version 0.13.0rc1.
- nodejs was still using *harmony* flags to enable ES2015 features.
- Babel was not modular yet.
- We were still using Browserify.

It will definitely bring back some memories !

Nonetheless, if you want to know more about V8 "Harmony" features, ES2015 features, and React transpilation result, I suggest you to keep reading, it's still valid.{.info}

---
Summary {.summary}

[[toc]]

---

# How to enable ES2015 ? [artefact]

Just for the record, it was known as ES6 (or "Harmony" which are V8 unstable features) or ES.next (there is always an ES.next!).{.info}

This paragraph pre-dated the full implementation of ES2015 is nodejs.
It's talking about things that are not true anymore.
Those flags do not exist anymore.
It is just left as a forgotten artefact. You can skip ahead or try to remember.{.warn}

Even if ES2015 is not fully standardized yet, and should get out mid-2015, we can already find several *transpilers*^[A transpiler is a tool that converts a source code to another source code. Whereas a compiler translates to a more low-level language. It's still a compiler nonetheless, but just another fancy word.] that are able to translates ES2015 syntax to ES5 syntax (the *old* version of Javascript)

This is needed because our browsers and nodejs only know the ES5 syntax for now.

Soon, it will be even useless to transpile our programs because some browsers and nodejs has already begun the implementation of some ES2015 features.

## Harmony

nodejs has already the following features implemented thanks to V8 (available under a feature flag):

```
--harmony_scoping: enable harmony block scoping
--harmony_modules: enable harmony modules (implies block scoping)
--harmony_proxies: enable harmony proxies
--harmony_generators: enable harmony generators
--harmony_numeric_literals: enable harmony numeric literals (0o77, 0b11)
--harmony_strings: enable harmony string
--harmony_arrays: enable harmony arrays
--harmony_arrow_functions: enable harmony arrow functions
--harmony: enable all harmony features (except proxies)
```

To see the list of the available unstable V8 "Harmony" features in nodejs, we can always do:

```
$ node --v8-options | grep "harmony"
  --es_staging (enable test-worthy harmony features (for internal use only))
  --harmony (enable all completed harmony features)
  --harmony_shipping (enable all shipped harmony features)
  --harmony_default_parameters (nop flag for "harmony default parameters")
  --harmony_destructuring_assignment (nop flag for "harmony destructuring assignment")
  ...
```

To know which V8 version is running:

```
$ node -p process.versions.v8
5.1.281.84
```

## Transpilation automation

It's possible to translate ES2015 source code to ES5 on the fly with browserify (check out [Browserify in depth](https://www.ctheu.com/2015/02/14/browserify-in-depth/)).

In particular, applications using React must be converted anyway, because they rely on the JSX syntax, which is outside of ES2015 scope.

We need to use [react-tools](https://www.npmjs.com/package/react-tools) that has a tool can translate JSX to ES5, and [reactify](https://www.npmjs.com/package/reactify) to use with browserify (and can translate ES2015 to ES5 at the same time):

```js
browserify('app.jsx').transform({ es6: true }, reactify)
```

To know more about ES2015 features, take a peek at [this page](https://babeljs.io/learn-es2015/).

## Babel has become the de facto transpiler

The *best* transpiler, because it implements most of the ES2015 features is [Babel](https://babeljs.io/)^[Formerly, it was named _es5to6_, but they changed this name because it was planned to go further than ES6, ES7 being on its way !].

We can take a look at this [ES2015 compatibility table](https://kangax.github.io/compat-table/es6/) to check what are the supported features of the different transpilers: [Traceur](https://github.com/google/traceur-compiler) from Google, [Babel](https://babeljs.io/docs/using-babel/), [es6-transpiler](https://github.com/termi/es6-transpiler), jsx. (*All dead since, except Babel*)

Currently (Feb-2015), Babel is 78% compatible with the ES2015 syntax. jsx being far away at 16%, nodejs at 25%. (*Babel is now at... 71% (?), nodejs at 97%!*)

Client-side, Chrome is around 50% (*97% now*) and Firefox around 65% (*94% now*).

Let's quickly go through some ES2015 features to use them in our React applications.

## Some neat ES2015 features

### let and const

`var` is almost deprecated thanks to `let` and `const`.

The major problem of `var` is the scoping, the hoisting, and the lack of intent. Will it change? Where is it used?

- `let` uses block-scoping, and still hoists the varible in the block, but it creates a temporal dead zone where we can't use the variable before its declaration (it would crash an exception). We state the variable is going to change over time in this scope.
- `const` is similar and differ by the intent: *the variable will always reference this value*. The *reference*. It means if the value is an array, its content can change. `const` does not declare the immutability of what the variable holds.

```
let i = 0
const PI = 3.14
const arr = [1, 2]
arr = [2, 4] // KO
arr[0] = 3 // OK
```

### Object Literals

```js
var name = "henry"
var phone = "+333456789"
var person = { name, phone } // = { name: name, phone: phone }
```

Sugar to avoid retyping the variable names and be consistent. 

### Template Strings

```js
var what = "awesome"
console.log(`it's so ${what}`)
```

Backquotes are now used to create a basic template engine where we can evaluate any JavaScript variable/function inside.

This avoid unreadable syntax such as:
```js
var s = "my name is " + name + " and I'm " + yearOld + " year" + (yearOld > 1 ? "s" : "") + " old"
var s = `my name is ${name} and I'm ${yearOld} year${yearOld > 1 ? "s" : ""} old`
```

### Arrow functions

```js
arr.map(item => item.value)
// arr.map(function(item) { return item.value })
```

It provides:
- A short syntax to create anonymous functions
- The current `this` in the scope is implicitly passed to the function: this avoids to `bind` it or to create a `var self = this` in the outer scope.

### Class

```js
class TopBarComponent extends React.Component {
    constructor() {
        super(props) // mandatory. We must call the parent class ctor.
        this.state = { value: props.initialValue }
    }
    render() {
        return <div>Look ma, no `function` keyword</div>
    }
    ...
```

Finally, a `class` keyword in Javascript! Brace yourself, Object Oriented programming is coming in Javascript. No more stupid prototype legos, no more module patterns.
Note that Javascript does not handle multiple classes inheritance.

Functions is classes must use the *short function* syntax: `render() { ... }`.

As far as React is concerned, we don't need to use the syntax `React.createClass` anymore but we can create a class that extends `React.Component` and provide its `state` in the `constructor`. Note that we're losing the ability to use mixins. (deprecated anyway)

### Destructuring

Destructing is nice to avoid to create temporary variables and parameters when only its properties matters:

```js
var obj = { age: 12, name: 'henry', phone: '+333456789' }

(function({ name, age }) {
    console.log(`hi ${name}, ${age}`) // "hi henry, 12"
})(obj)

var { name } = obj
console.log(name) // "henry"
```

### Modules

Javascript is getting its own module dependencies feature and keywords:

```js
import React from 'react'
```

That replaces the CommonJS syntax:

```js
var React = require('react')
```

Destructuring can be used to import several items:

```js
import { Component, cx } from 'react'
```

There are a lot of features we didn't talked about: the promises, the generators (in ES2016), the spread parameters, the default arguments, the symbols, the iterators. There are also new data structures: `Map`, `Set`, `WeakMap`, `WeakSet`. New functions on `String`, `Math`, `Number`.

So many things. [More details and examples on the Babel website](https://babeljs.io/learn-es2015/). 

# React and ES2015 [artefact]

We'll use Babel to use the latest features.

Consider this was written when React was at version 0.13.0rc1. I keep it here for historical reasons, for everybody to remember. Nobody should do like this anymore. The world remembers.{.warn}

- `npm install -g babel`: to have babel available on the command line to transpile any source code.
- `npm install react`:  it should be at least `react>=0.13` otherwise Babel is going to fail with this error : 

```xml
TypeError: Super expression must either be null or a function, not undefined
```

If the 0.13 is not yet available (it's not yet at this time), we force the version: `npm install react@0.13.0rc1`.

Notice that Babel provides an executable `babel-node` that starts nodejs with all the ES2015 features available + JSX, backed by Babel:

```xml
$ babel-node es2015.js
```

Here is a ES2015 program that renders a React component to a string (we are server side, on nodejs):

```
// app.js
import React from 'react'
import MyComponent from './MyComponent.jsx'
console.log(React.renderToString(<MyComponent multiplier={3} />))
```

```
// MyComponent.jsx
import React from 'react'
export default class MyComponent extends React.Component {
    constructor(props) 
        super()
        this.state = { mul: props.multiplier }
    }
    render() {
        var items = [ 1, , 3 ].map(x =>
            <span key={x}>{x * this.state.mul}</span>
        )
        return <div>{items}</div>
    }
}
```

The result is the generated DOM:

```html
<div data-reactid=".1310hszb7y8" data-react-checksum="-2059327314">
    <span data-reactid=".1310hszb7y8.$1">3</span>
    <span data-reactid=".1310hszb7y8.$3">9</span>
</div>
```

This tiny example already use classes, modules, destructuring and arrow functions.

This is the base template if we want to start playing with React in nodejs while being ES2015 compliant.

Check out this React post about this version 0.13 for more details: http://facebook.github.io/react/blog/2015/01/27/react-v0.13.0-beta-1.html

It brings back some memories: January 27, 2015; React v0.13.0 Beta 1{.info}
 
# What does React looks like when it's transpiled to ES5 ?

Instead of executing the program, we can just use `$ babel es2015.js` to get the transpiled source code.
It's pretty interesting to see how Babel translates ES2015 to ES5.

With our previous sample, it gives:

```js
// app.js
"use strict";
 
var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
var React = _interopRequire(require("react"));
var MyComponent = _interopRequire(require("./MyComponent.jsx"));
 
console.log(React.renderToString(React.createElement(MyComponent, { initialValue: "3" })));
```

- The `import` feature is translated to CommonJS `require`.
- JSX is translated to `React.createElement`.

The translation of `MyComponent.jsx` is more complex. Let's chop it in bits:

```js
// MyComponent.jsx
"use strict";
 
var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
var _prototypeProperties = function (child, staticProps, instanceProps) {
    if (staticProps) Object.defineProperties(child, staticProps);
    if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};
var _inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " +
                             typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass, enumerable: false, writable: true, configurable: true
        }
    });
    if (superClass) subClass.__proto__ = superClass;
};
var _classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
};
```
Babel create common functions to handle class inheritance and constructor.
It's using ES5's `Object.defineProperties` and `Object.create` to add properties to objects.

```js
var React = _interopRequire(require("react"));
 
var MyComponent = (function (_React$Component) {
  function MyComponent(props) {
    _classCallCheck(this, MyComponent);
 
    this.state = { value: props.initialValue };
  }
 
  _inherits(MyComponent, _React$Component);
```

This creates the "class" structure with its "inheritance" into an object.

```js
  _prototypeProperties(MyComponent, null, {
    render: {
      value: function render() {
        var _this = this;
 
        var items = [1,, 3].map(function (x) {
          return React.createElement(
            "span",
            { key: x },
            x * _this.state.value
          );
        });
        return React.createElement(
          "div",
          null,
          items
        );
      },
      writable: true,
      configurable: true
    }
  });
 
  return MyComponent;
})(React.Component);
 
module.exports = MyComponent;
```
This add our functions into the object and convert JSX.
It ends with the CommonJS default export.

Notice we used the `default` keyword when we defined our React component:

```js
export default class MyComponent {
```

If we omit it, we get this:

```js
Object.defineProperty(exports, "__esModule", {
  value: true
});
```

To import our component, we would need to use this syntax:

```
import { MyComponent } from './MyComponent.jsx'
// instead of import MyComponent from './MyComponent.jsx'
```

`default` is the *default* export of the file itself (there can be only one *default* export).
If there are multiple items to export, then we should omit `default` and use the destructuring `import` syntax.

Note that we can import the `default` *and* standalone exports in `import`:

```js
import React, { Component } from `react`
```

If we try to import a component without the destructuring syntax, which was not `export default`, it will fail with an odd error:

```xml
Warning: React.createElement: type should not be null or undefined.
It should be a string (for DOM elements) or a ReactClass (for composite components).
Warning: Only functions or strings can be mounted as React components.
 
C:\test\node_modules\react\lib\ReactDefaultInjection.js:53
    tagName: type.toUpperCase(),
                 ^
TypeError: Cannot read property 'toUpperCase' of undefined
```

# ES2015 is not enough, we want ES2016 !

It's already all over the place.

Check the compabitility table: http://kangax.github.io/compat-table/es2016plus/
