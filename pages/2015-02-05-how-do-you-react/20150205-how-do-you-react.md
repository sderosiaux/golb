---
title: "ReactJS: A new way to build a website"
description: The React javascript framework just revolutioned the front-end development
date: "2015-02-05T00:31:57Z"
layout: post
path: "/2015/02/05/how-do-you-react/"
---


The React team has held a 2-days conference few days ago (Jan-2015) to share the current state of art of their library. Here is its schedule http://conf.reactjs.com/schedule.html^[Because the conference is held every year, what we see is not the 2015's one anymore.].

I barely heard about React before that (shame!).

Stumbled upon this, I looked at all the conference videos. The more I watched, the more I was getting interested in. It was just **amazing**.
React is not a *yet another Javascript framework*, definitely not. 

Let's explore a bit why this is a revolution&trade;.

---
Summary {.summary}

[[toc]]

---


# The manual way

When we develop with HTML/JS, we have data in some kind of Javascript structure (object, array) coming from a server API, and we want to represent them in our HTML.

We can use vanilla Javascript or jQuery to access and alter the DOM:

- first we insert a big HTML
- we bind some event handlers
- according to the events, we call some functions to alter only a specific part of the HTML

```javascript
var containerDOM = document.getElementById("container")
var html = renderHTML(data)
containerDOM.innerHTML = html
bindEvents(containerDOM)

function bindEvents(dom) { ... }
function updateText(dom) { ... }
function updatePhoto(dom) { ... }
```

We have the full control of what's going on, it *can't* be faster, no fancy stuff between my click and my call to `updateText()`.

A lot of jQuery plugins work this way.

It can be very difficult to maintain.

We are never sure of what the DOM looks like after the first render and other methods are called: they update only specific part of the DOM, and we are not the only one to work on the project.

The code can grow quickly to handle different situations. And we can heard in the background: _"I forgot to callback a method"_, _"I can't re-render the whole thing, it's too big and it's blinking"_, _"Yes, that resets the scroll position"_.

# The bindings way

*Recent* frameworks often use two-way bindings and have an easy way to bind events, such as [AngularJS](https://angularjs.org/) or [KnockoutJS](http://knockoutjs.com/).

We have a *model* with some properties, and its associated view:
```javascript
var model = { name: "Henry" }
<input type="text" ng-model="name" placeholder="Enter a name here" />
```

The framework ensures the synchronization between them.
- we change the javascript object ? the view changes
- we type something in the input ? the model changes
That's a two-way binding.

It's very easy to start with. It automatically handles standard events. It can deal with list of items. Common behaviors can be coded and reused.

It's a good opportunity to have clean code, and to keep logic separated.

Of course, this brings its own set of troubles:
- scopes
- controllers
- DOM references
- integration with third-party libraries
- performance issues (long lists, frequent updates, large DOM changes)
- artefacts on the UI side

# The component way: React

Then we have [React](http://facebook.github.io/react/).

That does not solve everything, has its own problems too, but it's a very fresh new way to handle model/view synchronization.

It's a library developed by Facebook.

They are using it on the small dialogs here and there (if we inspect the DOM of the Facebook messenger, we will see some `data-reactid` all over the place^[That's not true anymore, React team did a great job to avoid them]).
Instagram uses it too.
In 2016, thousands of websites and webapps use it.

React is a framework to render things, it does not manage how to organize the data and such, it's agnostic and can be integrated into larger websites (as Facebook does).

It is based on components. Anything we want to render should be a component.

A component has some characteristics:

- its properties `props`, which are **immutable**
- a `state` (**mutable**)
- a `render` function that contains some "kind" of HTML to explain how to render it

## When is the view updated ?

We didn't talked yet about events and how this `render` function is called. This is because it's the magic of React and of its virtual DOM (the "kind" of HTML).

We have an component `Person` with a state `{ name: "John" }`, and its `render()` function:
```javascript
function render() {
  return <input type="text" value={this.state.name} />
}
```

Each time `this.state.name` change, `render()` will automatically be called.
If it renders something else that the current DOM state then the DOM will be modified: we don't have to do it ourself.

`return <input ...>` is not Javascript'ish, it's an *extension* the React framework brings (optional) to simplify our life: **JSX**.

It's a special syntax provided to write a simili-DOM easily in a Javascript file. It a sort of templating language, we'll talk about it later.

At first, it can be scary: re-render the whole thing for each tiny modification of the state ? What about the performances ?
It's going to call my `render` functions each time something changes and re-renders everything on top ?

The answer is no, because it's smart.

React only update the DOM if it needs to. It does not check the real DOM (which is slow). Instead, it keeps in memory a *virtual DOM*, and does its comparaison with.
Moreover, it is optimized and can shortcut the checks according to some situations.
At the end, only the minimal set of DOM mutation operations is applied (no idempotence).

There is a way to tell to React that a component does not need to be re-render and diff again (no call to `render()`) because we know it's not _dirty_.
This is the purpose of the function `shouldComponentUpdate` we can implement on our component.

If it return `false`, React won't do a thing and pass to another component.

```javascript
function shouldComponentUpdate() {
  return this.props.important && this.state.visible;
}
```

The big advantage of React is to have a **unique** way to render a component.
We know exactly what to expect visually from a given component state. No external alteration is possible^[Well, we can still play the DOM on the side, but we won't!].
Moreover, unit testing is made easy, because we know exactly the output of the `render` function according to its `props` and `state` (if it does not rely on globals or side-effects, meaning it's pure).

## Example

```javascript
var NameComponent = React.createClass({
  getInitialState: function() { return { name: '???' }; },
  render: function() {
    return (
      <div>
        <input type="text" value={this.props.prefix + this.state.name} readOnly />
        <button type="text" onClick={this.changeName}>Push me</button>
      </div>
    );
  },
  changeName: function() {
    this.setState({ name: Math.random() > .5 ? 'Henry' : 'John' });
  }
});

var vdom = <NameComponent prefix="Hello I'm " />
React.render(vdom, document.body); // ReactDOM.render in recent versions
```

<div>
  <input type="text" value="Hello I'm ???" readonly="">
  <button type="text">Push me</button>
</div>

Here is the [jsbin](http://jsbin.com/fotorediqe/1/edit?html,js,output).

When we push the button, we have a fifty-fifty chance of displaying either "Hello I'm Henry" or "Hello I'm John" in the `<input>`.
We can push it as many times as we want, the DOM will be updated.

1. We create an instance of `NameComponent` with `{ prefix: "Hello I'm" }` as its props (immutable). This return a classic Javascript object structure React understands (a `ReactElement`).
2. `React.render` sees that this instance has not been used yet, so it calls `getInitialState()` to set its `state`
3. Then, it calls `render()` on our component. This returns some Javascript object representing a virtual DOM (a type "div" containing a type "input" and a type "button")
4. Because this is the first time `render()` was called, React creates the whole DOM: it converts the virtual DOM to real DOM objects and set the `document.body`.

We have our initial UI.

5. When the button is pushed, React knows there is an event handler `onClick` bound, so it calls `changeName()` on our instance.
6. We update the state: React calls `render()`. (not right away, we can `setState` multiple times, `render()` will be call only once at the end of the "cycle")
6. The VDOM from `render()` is compared to the latest used VDOM: React finds out that the only difference is the `value` of the input, therefore it updates just this property in the DOM, nothing else.

The browser DOM looks like :

```html
<div data-reactid=".0">
  <input type="text" value="Hello I'm ???" readonly="" data-reactid=".0.0">
  <button type="text" data-reactid=".0.1">Push me</button>
</div>
```

We can just see some extra `data-reactid` that represent the hierarchy (`.0` contains `.0.0` and `.0.1` etc.).

The `data-reactid` has been removed since React v15 (Mar-2016).{.info}

## Components are everywhere

Let's think of a bigger application such as a webstore. We could have components such as :

- `<ProductList>` that contains a list of `<Product>`
- `<Product>` contains `<ProductPhotos>`, `<ProductDetails>` and `<ProductButtons>`
- on another page, we have a `<Cart>` that contains a list of `<Product>` (the same component as the one used in the `<ProductList>`)

`render()` can return reference to other components, not only classic HTML controls (`<div>`, `<span>` etc.) :

```javascript
var User = React.createClass({
  // ...
  render: function() {
    return (
      <div className="large">
        <UserPhoto url={this.props.photoUrl} size={32} />
        Your details: <UserDetails data={this.props.userData} />
        <CurrentDateTime format="YYYY-MM-DD HH:mm:ss" />
      </div>
    );
  }
});

var UserPhoto = React.createClass({
  // ...
  render: function() {
    return <img src={this.props.url} width={this.props.size} className="userPhoto" />
  }
});
```

This forces us to code reusable parts and separate the logic. 

Reusable parts means that we can publish our components in npm (the package manager) for people to reuse them. And there are A LOT of React components available now.
[Carousel](https://github.com/akiran/react-slick), [syntax highlighting](https://github.com/akiran/react-highlight), [datepicker](https://github.com/Hacker0x01/react-datepicker), [treeview](https://github.com/chenglou/react-treeview), even [bootstrap](http://react-bootstrap.github.io/components.html), calendars, widgets, graphs, everything can be reusable and small components forms bigger components.

A component should just exposed some inputs (the `props`), some events (to get updates), and anybody can reuse them, without thinking about the implementation.

## Errors management

React provides very detailed errors in the console.

For instance, rendering `<input>` without `onChange` gives :
```xml
Warning: You provided a value prop to a form field without an onChange handler.
This will render a read-only field. If the field should be mutable use defaultValue.
Otherwise, set either onChange or readOnly. Check the render method of MyComponent
```

There are TONS of possible errors. React worked a lot to get us a clear feedback.

## Server-side rendering

The same React codebase can be used on the client side AND on the server side (with nodejs).
The only difference is that the server returns a string instead of mutating the DOM. (there is no DOM server-side)

Why would we want that ? SEO.

- On the first call, the server returns the whole page in a string (as in PHP).
- Therefore the search engines have content to process^[Actually, Google parses Javascript so it's not mandatory.].
- Then, in the front-end, React does all the `render()` still, but it sees that the DOM is already there, so it does nothing. (this is the *reconcialiation* step)
- It plugs the event handlers on the existing DOM.

Take a look [here](https://scotch.io/tutorials/build-a-real-time-twitter-stream-with-node-and-react-js) to see a real-time Twitter feed using this technique.

[Meteor](https://www.meteor.com/) is a powerful platform to handle this for us and much more (handle the data updates, the communication with servers, etc.).

## Extensibility

We can extend our components by adding mixins to them, such as

```javascript
React.createClass({
  mixins: [PureRenderMixin],
  ...
```

This one automatically implements `shouldComponentUpdate` to return `false` if the `state` did not changed.
Thus, this avoid `render()` to be called. [More details](https://facebook.github.io/react/docs/pure-render-mixin.html).

As of 2016, mixins are deprecated for several reasons (there were too messy and error-prone when several mixins where... mixed).
Higher-order Component (HoC) are preferred. Those are just components encapsulating other components.
This way, we can alter a component behavior (changing its props, avoid its rendering etc.) without changing its code source or interact with its implementation.{.info}

## DevTools

Using Chrome (or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)), we can install this extension : [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi).
It will add a new tab `React` in the debugger tools if we are looking at a React website.

This way, we can inspect the virtual DOM (the React component hierarchy), the properties of the components etc. Very instructive and good for debuggability.

![devtools](devtools.png)

## Testing

As we said, unit testing is made easy, because we know exactly the output of the `render` function according to the `props` and `state` of the component. (if `render()` is pure)

Facebook has developed and is using [Jest](https://facebook.github.io/jest/) which has becomed the de-facto testing framework for React components.

```javascript
it('CheckboxWithLabel changes the text after click', () => {
  // Render a checkbox with label in the document
  const checkbox = TestUtils.renderIntoDocument(<CheckboxWithLabel labelOn="On" labelOff="Off" />);
  const checkboxNode = ReactDOM.findDOMNode(checkbox);

  // Verify that it's Off by default
  expect(checkboxNode.textContent).toEqual('Off');

  // Simulate a click and verify that it is now On
  TestUtils.Simulate.change(TestUtils.findRenderedDOMComponentWithTag(checkbox, 'input'));
  expect(checkboxNode.textContent).toEqual('On');
});
```

2016: [Enzyme](https://github.com/airbnb/enzyme) combined to Jest is probably the best bet to test React components.{.info}

## Router

React is often use in SPA (Single Page Application). This avoid to rerender the whole page each time, and fetch all the data again.

Because we can still navigate inside the SPA, we probably need a router to handle this for us.

This is the purpose of [react-router](https://github.com/ReactTraining/react-router).

It handle the page location (using the hash or the browser history API), and notify the right components to render themselves.

## What about the data?

As we said, React is only about the UI.

About the data, [Facebook has its ideas too](https://www.youtube.com/watch?v=9sc8Pyc51uU).

### GraphQL and Relay

They developed a framework called [Relay](https://facebook.github.io/relay/) to use React components with GraphQL (which is a query language they created).
It fetches and handles the data of the React components.

It was necessary because of the composability of the components.
We end up with a hierarchy of components, often top components must pass down necessary infos to its children and so on.

At the end, it's a nightmare to maintain.
- We have to pass a lot of properties the intermediate components do not care (and just pass down).
- We don't know anymore where the data are used.
- It's hard to refactor, because we are going to break the chain and we'll need to fix where the data comes from.

GraphQL and Relay are all about making that totally transparent and easy to maintain.

### Flux

An alternative to Relay is the Flux architecture they created and used before Relay.

http://facebook.github.io/flux/docs/in-depth-overview.html#content

2016: It's not very used nowadays, simpler solutions have emerged.{.info}

### Edit: Redux, MobX, [insert your framework here]

A lot of frameworks to handle the data appeared since, because Flux had a lot of boilerplate and was a bit complex to maintain.

The de-facto is probably [Redux](https://github.com/reactjs/redux), [MobX](https://github.com/mobxjs/mobx) is gaining a lot of traction too.


Enjoy React !