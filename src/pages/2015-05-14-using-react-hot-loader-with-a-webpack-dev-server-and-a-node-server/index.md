---
title: "Using react-hot-loader with webpack"
date: "2015-05-14T01:17:33Z"
is_blog: true
path: "/articles/2015/05/14/using-react-hot-loader-with-a-webpack-dev-server-and-a-node-server/"
language: en
tags: ['javascript', 'reactjs']
description: "Stop refreshing the page when you just changed some background-color. Hot Reloading is a must to gain productivity."
---

I was working on a project running its own nodejs HTTP server, with [expressjs](http://expressjs.com/).
It had a ReactJS front-end, and was using webpack to create some bundles, all good. But it was lacking of Hot Reloading.

Not working with hot reloading nowadays in like being stuck in 2000. *F5*. *Maj+F5*. *Ctrl+R*.

You lose the current state of the page. You lose **your time** to get it back. You lose **your productivity**. You lose your patience. You start accusing people around, and the ambience quickly sucks.

HR is something we must work with nowadays, front-end side, and back-end side (you don't want to restart the API every time you add something).

It's even more true when you work with websites and web-applications with CSS and JS bundles. You don't want to rebundle the whole things over and over just because you changed a background-color or because you fixed an *undefined is not a function*.

We'll see how to enable HR from an existing application using webpack, expressjs and react-hot-loader. We'll start with the V1, then we'll update our code to use the latest **react-hot-loader V3**, still in [development](https://github.com/gaearon/react-hot-loader/pull/240), but already working (with React functional components!).

---

If you want to know more about how Webpack does HR (low-level), how `webpack-[hot|dev]-middleware` work, I suggest you to read: [Webpack Hot Reloading and React: how ?](https://www.sderosiaux.com/2015/12/29/webpack-hot-reloading-and-react-how/).

[[info]]
|A previous version of this post was using the `WebpackDevServer` with the `proxy` option. I decided to remove it and present this other solution instead, being simpler.

TOC

# The less, the better

Some background and constraints:

- In production, the front static resources will be served by some nginx not expressjs.
- The expressjs server (api) should not change and still be up on the same port :3000.
- The public assets paths and all other things that my expressjs is providing should not changed.
- The generated HTML should not changed.
- The whole HR thing to be quasi-transparent and can be disable in a production build (behind some environment variable).

# The existing code

[[info]]
|Note that we won't use babel, nor JSX, nor `import`/`export`. We keep it simple but we are still using ES2015 features (Chrome supports them now).

The expressjs server is running on `localhost:3000`, fairly simple:

```js
const express = require('express')
const path = require('path')

const app = express()
// Read "public/" physical folder as "/". eg: http://localhost:3000/index.html
app.use(express.static(path.join(__dirname, 'public')))
app.use('/dist', express.static(path.join(__dirname, 'dist'))) // JS bundles in /dist/bundle.js
app.get('/api', (req, res) => res.send('Hello World!'))
app.listen(3000, () => console.log("Listening to localhost:3000"))
```

We have an index and some components defined:

```js
var React = require('react')
var ReactDOM = require('react-dom')

ReactDOM.render(
    new React.createFactory(require('./Hello.js'))(),
    document.getElementById('app'));
```

[[warn]]
|For HR to work, `render` must refer to components defined in other files.

```js
var React = require('react')

module.exports = class Hello extends React.Component {
    constructor() { super(); this.state = { message: null } }
    componentWillMount() { // we call our classic expressjs api
        fetch('./api').then(res => res.text())
            .then(message => this.setState({ message }))
    }
    render() {
        return React.createElement("div", { style: { backgroundColor: 'orange' }},
                                          [ this.state.message || 'loading...' ])
    }
}
```

A classic `index.html` SPA:
```html
<body>
    <div id="app"></div>
    <script src="dist/bundle.js"></script>
</body>
```

And our initial and minimal `webpack.config.js`:

```js
var path = require('path')
var webpack = require('webpack')

module.exports = {
    entry: [ './src/index.js' ],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/dist/'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loaders: [],
            include: path.join(__dirname, 'src')
        }]
    }

}
```

# The addons

## package.json

We'll obviously start by adding the packages to handle HR:

- `react-hot-loader`: the plugin that catch HR events in the front-end and update the view.
- `webpack-dev-middleware`: recompiles the Javascript bundle when a source changes and serves the bundle up-to-date.
- `webpack-hot-middleware`: notify the front-end through SSE when the bundle has been recompiled.

```xml
$ npm install --save-dev react-hot-loader webpack-dev-middleware webpack-hot-middleware
```

```diff
+ "react-hot-loader": "^1.3.1",
+ "webpack-dev-middleware": "^1.9.0",
+ "webpack-hot-middleware": "^2.13.2"
```

## Webpack configuration

We tell webpack to:

- Inject the webpack HR API code in the bundle using the plugin `HotModuleReplacementPlugin`.
- Inject the `webpack-hot-middleware/client` code into the bundle (that is using the webpack HR API).
- Wrap the ReactJS components with some `react-hot-loader` code.

```diff
     entry: [
         './src/index.js',
+        'webpack-hot-middleware/client'
     ],

    loaders: [{
        test: /\.js$/,
-       loaders: [],
+       loaders: ['react-hot-loader'],
        include: path.join(__dirname, 'src'),
    }]

+   plugins: [
+       new webpack.HotModuleReplacementPlugin()
+   ],
```

## Expressjs

Finally, we must inject the middlewares into expressjs, to allow webpack to expose some special routes used for the HR piece.

Things like `__webpack_hmr`, `[guid].hot-update.js[on]` that contains the updated code.

Note that the bundle (parts) is recompiled into memory, the physical `bundle.js` is not updated (for the sake of performance).

```diff
// server.js

+var webpack = require('webpack');
+var webpackDevMiddleware = require("webpack-dev-middleware");
+var webpackHotMiddleware = require("webpack-hot-middleware");
+var config = require('./webpack.config.js');
+var compiler = webpack(config);
+app.use(webpackDevMiddleware(compiler, { quiet: true, publicPath: config.output.publicPath }));
+app.use(webpackHotMiddleware(compiler));
```

Be sure the `/dist` is removed, otherwise expressjs will serve `bundle.js` from it, and not the HR-enhanced version.
Or comment out `app.use('/dist', express.static(path.join(__dirname, 'dist')))` if you had something like this.

`publicPath` is necessary in the configuration of the `webpackDevMiddleware`, that indicates to the middleware what is the path of the HR bundle to serve by expressjs (`/dist/bundle.js`).

## HR is ready!

Now, we can `node server.js`:

- our expressjs API is working (`/api`).
- we can edit our components and they will be updated in live.

You can checkout the code here: https://github.com/sderosiaux/blog-react-hot-reloading

# react-hot-loader V3

RHL v3 is working a bit differently, it's more explicit.

Here are what we need to do:

```
npm install --save-dev react-hot-loader@next
```

```diff
   "devDependencies": {
-    "react-hot-loader": "^1.3.1",
+    "react-hot-loader": "^3.0.0-beta.6",
```

Our `webpack.config.js`:

```diff
    entry: [
+       'react-hot-loader/patch',
        'webpack-hot-middleware/client',
        './src/index.js',
    ],

    loaders: [{
        test: /\.js$/,
-       loaders: ['react-hot-loader'],
+       loaders: ['react-hot-loader/webpack'],
        include: path.join(__dirname, 'src'),
    }]
```

RHL needs to setup some code before all, so we can use `entry` to do that (but `require`/`import` the file in `index.js` would work too).


Most of the changes are in the `index.js` file:

```diff
 var React = require('react')
 var ReactDOM = require('react-dom')

+var AppContainer = require('react-hot-loader').AppContainer
 var Hello = require('./Hello.js')

 ReactDOM.render(
-  new React.createElement(Hello, null),
+  new React.createElement(AppContainer, null, React.createElement(Hello, null)),
+  // ie: <AppContainer><Hello></AppContainer>
+  document.getElementById('app'));
+
+if (module.hot) {
+  module.hot.accept('./Hello', () => {
+    const NextApp = require('./Hello')
+    // you could use `require('./Hello').default` if you're using import/export syntax
+    ReactDOM.render(
+      new React.createElement(AppContainer, null, React.createElement(NextApp, null)),
+      document.getElementById('app')
+    )
+  })
+}
```

- As it is the *way* to do things now, we import a *container* to wrap our App (higher-order component, HoC).
- We handle ourself webpack HR API by rerendering the container on changes.

And... it's done! the HR is working.

One of the big advantage is that functional components are now Hot Reloadable too, ie:

```diff
const Title = (props) => React.createElement("div", null, props.text)
...     
     render() {
-        return React.createElement("div", { style: { backgroundColor: 'orange' }},
-                                          [ this.state.message || 'loading...' ])
+        return React.createElement("div", null,
+                 React.createElement(Title, { text: this.state.message || 'loading...' }))
+        // <div><Title text={this.state.message || 'loading...'} /></div>
```

You can change the `title` component, the HR will follow, awesome.
