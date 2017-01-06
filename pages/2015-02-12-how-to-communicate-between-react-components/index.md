---
title: How to communicate between ReactJS components
date: "2015-02-12T15:30:57Z"
layout: post
path: "/2015/02/12/how-to-communicate-between-react-components/"
language: en
---

As a starter, I already wrote a smaller article about [Ownership and children in ReactJS](https://www.ctheu.com/2015/02/10/ownership-and-children-in-reactjs/) to differenciate between parent/child relationship and React ownership.

*How to communicate between React components?* That's a good question, and there are multiple answers.
It depends of the relationship between the components, and it depends on what we prefer.

There are 3 possible relationships:
- parent to child
- child to parent
- not directly related (brothers, cousins)

---
Summary {.summary}

[[toc]]

---

# Parent to children

We should talk about *Owner to ownees* but it's more clear to talk about parent and children.{.info}

This is the easiest case, very natural in React, we are using it everywhere.

We have a component that renders another one and we pass it some props:
```

var ToggleButton = React.createClass({
  render: function() {
    return <label>{this.props.text}:
              <input type="checkbox" checked={this.props.checked} />
           </label>;
  }
});

var MyContainer = React.createClass({
  getInitialState: function() {
    return { checked: true };
  },
  render: function() {
    return <ToggleButton text="Toggle me" checked={this.state.checked} />;
  }
});
```

Here is the 2016 version (using classes, destructuring, and [React functional components](https://facebook.github.io/react/docs/components-and-props.html)):

```js
const ToggleButton = ({ text, checked }) =>
  <label>{text}: <input type="checkbox" checked={checked} /></label>

class MyContainer extends React.Component {
  constructor() { super(); this.state = { checked: true } }
  render() {
    return <ToggleButton text="Toggle me" checked={this.state.checked} />
  }
}
ReactDOM.render(<MyContainer />, document.getElementById('root'))
```

`<MyContainer>` renders a `<ToggleButton>` passing it a `checked` property: that's communication.

We just have to pass a prop to the child component the component is rendering.
If the given value changes `this.state.checked`, the parent will re-render the child with the new value.

The `<ToggleButton>` has its `this.props` set by its parent, he cannot modify them: they are **immutable**. 

In this example, clicking on the checkbox has no effect and causes a warning{.info}

```xml
Warning: You provided a *checked* prop to a form field without an *onChange* handler.
This will render a read-only field.
If the field should be mutable use *defaultChecked*.
Otherwise, set either *onChange* or *readOnly*.
Check the *render* method of *ToggleButton*.
```

## Hierarchy problem

The complexity occurs when we want to pass down some props to a grand-child (we have a hierarchy of components): the direct child must handle it first, to be able to pass it down to its own child.

It's going to be complicated to maintain.

Here is an example with just one intermediate: 
```
var MyContainer = React.createClass({
  render: function() {
    return <Intermediate text="where is my son?" />;
  }
});
var Intermediate = React.createClass({
  render: function() {
    // Intermediate doesn't care of "text", but it has to pass it down nonetheless
    return <Child text={this.props.text} />;
  }
});
var Child = React.createClass({
  render: function() {
    return <span>{this.props.text}</span>;
  }
});
```
Here is the 2016 version (one liner ftw):

```
const MyContainer = () => <Intermediate text="where is my son?" />
const Intermediate = ({ text }) => <Child text={text} />
const Child = ({ text }) => <span>{text}</span>
```

There is solution to avoid this, to automatically have some data passed down, available to any component down in the hierarchy, without having to specify them: the [*context*](https://facebook.github.io/react/docs/context.html).

## Context

During a while, the context was an experimental feature, undocumented, unstable, but everybody was using it nonetheless because it was so helpful.{.info}

It is now documented but still experimental nonetheless. *The feature can break in any future release of React*.
The React team [insists](https://facebook.github.io/react/docs/context.html) that the context is probably not the best option, and should only be used when no other solution is available, and that we know what we're doing.

We would normally use a third-party framework like Redux or MobX to handle the data communication instead of using contexts.

But if we are coding a library, we may not want to bring another framework as dependency and instead rely on context which is pure React. (like [react-router](https://github.com/ReactTraining/react-router))

Context also brings its own set of problems: if it changes, the component that depends on it *may* not notified automatically.
Solutions exist to fix this but it's outside of React, such as explained [here](https://medium.com/@mweststrate/how-to-safely-use-react-context-b7e343eff076#.xn5cao4ti).{.warn}

Using the context is useful when:
- our tree of components is dynamic
- components are moving in the hierarchy
- we have a lot of properties to pass down : passing explicitely every props to every children is clearly not an option

A context is just a Javascript object a component exposes, and any child, grand-child and so on, can *register* to the context and grab the values using `this.context`: React takes care of the communication.

To use it, we must:
- define `getChildContext` on the **parent**: return a Javascript object
- define `childContextTypes` on the **parent**: define what are the properties types (`React.PropTypes`).
- define `contextTypes` on any **child**: define which properties we want to retrieve

This will allow React to check the properties are properly exposed on runtime (dev only).

If we take back our previous example, but using the context this time, we can avoid modifying the `<Intermediate>` component and still have `<Child>` reading some data coming from `<MyContainer>`:

```
var MyContainer = React.createClass({
  getChildContext: function() {
    // we exposes one property "text", any of the components
    // in its sub-hierarchy will be able to access it
    return { text: 'Where is my son?' };
  },
  // we declare we expose one property "text" which is a string
  childContextTypes: {
    text: React.PropTypes.string
  },
  render: function() {
    // we pass nothing to the intermediate component
    return <Intermediate />;
  }
});
```
```
// this component does nothing expect rendering a Child
var Intermediate = React.createClass({
  render: function() {
    return <Child />;
  }
});
```
```
var Child = React.createClass({
  // we declare we want to read the "text" property of the context
  // and we expect it to be a string
  contextTypes: {
    text: React.PropTypes.string
  },
  render: function() {
    return <span>{this.context.text}</span>;
  }
});
```

Here is the 2016 version:

```
class MyContainer extends React.Component {
  getChildContext() {
    return { text: 'Where is my son?' }
  }
  render() {
    return <Intermediate />
  }
}
MyContainer.childContextTypes = { text: React.PropTypes.string }

const Intermediate = () => <Child />

const Child = (props, context) => <span>{context.text}</span>
Child.contextTypes = { text: React.PropTypes.string }
```

We can see this code in action on this [jsbin](http://jsbin.com/vehucuyozu/1/edit?html,js,output).

# Children to parent

Now, let's say the `<ToggleButton>` has its own state and wants to tell its parent it has been clicked.
It has an initial state and an event handler on the `onChange` event of its `input`:

```
var ToggleButton = React.createClass({
  getInitialState: function() {
    return { checked: true };
  },
  onTextChanged: function() {
    console.log(this.state.checked); // it is always true for now
  },
  render: function() {
    return <label>{this.props.text}:
             <input type="checkbox" checked={this.state.checked}
                    onChange={this.onTextChanged}/>
           </label>;
  }
});
```

Here is the 2016 version:

```
class ToggleButton extends React.Component {
  constructor() {
    super();
    this.state = { checked: true }
  }
  onTextChanged() {
    console.log(this.state.checked) // it is always true for now
  }
  render() {
    return <label>{this.props.text}:
             <input type="checkbox" checked={this.state.checked}
                    onChange={() => this.onTextChanged()}/>
           </label>;
  }
}
```

We don't have anything that update `this.state.checked`, therefore the value is always `true`.
React doesn't update `checked` just because it's a checkbox. It only notifies us of the click, but the bound value is still in our control.
This is *not* a two-way binding.{.warn}

To modify `checked`, we update the our handler and we notify our parent of the change:

```
onTextChanged: function() {
  this.setState({ checked: !this.state.checked });
  // callbackParent(); // what should we call here??
},
```

We need a callback to communicate with our parent: he has to give it to its child.
To do that, we use what we already saw: the parent to child communication.

The parent can pass a callback through a prop: we can pass anything through them, not just strings or integers, but functions too. Functions are a first-class citizen in Javascript, we can pass them.

Here is an example where the `<ToggleButton>` notifies its parent that its state changed.
The parent listens to this event and update its own state:

```
// the parent
var MyContainer = React.createClass({
    getInitialState: function() {
        return { checked: false };
    },
    onChildChanged: function(newState) {
        this.setState({ checked: newState });
    },
    render: function() {
        return  <div>
                  <div>Are you checked ? {this.state.checked ? 'yes' : 'no'}</div>
                  <ToggleButton text="Toggle me"
                                initialChecked={this.state.checked}
                                callbackParent={this.onChildChanged} />
                </div>;
    }
});
 
// the child
var ToggleButton = React.createClass({
  getInitialState: function() {
    // we set our initial state from our props
    return { checked: this.props.initialChecked };
  },
  onTextChanged: function() {
    var newState = !this.state.checked;
    this.setState({ checked: newState }); // we update our state
    this.props.callbackParent(newState); // we notify our parent
  },
  render: function() {
    return <label>{this.props.text}: <input type="checkbox"
                                            checked={this.state.checked}
                                            onChange={this.onTextChanged}/></label>;
  }
});
```

Here is the 2016 version:
```
class MyContainer extends React.Component {
    constructor() {
      super();
      this.state = { checked: false }
    }
    onChildChanged(newState) {
      this.setState({ checked: newState })
    }
    render() { return <div>
      <div>Are you checked ? {this.state.checked ? 'yes' : 'no'}</div>
        <ToggleButton text="Toggle me"
                      initialChecked={this.state.checked}
                      callbackParent={(newState) => this.onChildChanged(newState) } />
      </div>
    }
}
 
class ToggleButton extends React.Component {
  constructor({ initialChecked }) {
    super();
    this.state = { checked: initialChecked }
  }
  onTextChanged() {
    const newState = !this.state.checked;
    this.setState({ checked: newState }); // we update our state
    this.props.callbackParent(newState); // we notify our parent
  }
  render() {
    return <label>{this.props.text}: <input type="checkbox"
                                            checked={this.state.checked}
                                            onChange={() => this.onTextChanged()}/></label>
  }
}
```

Here is the compiled version of `<MyContainer>` where we can see the props passed down in classic JS objects:

```
return React.createElement("div", null, 
  React.createElement("div", null, "Are you checked ? ", this.state.checked ? 'yes' : 'no'), 
  React.createElement(ToggleButton, {
    text: "Toggle me",
    initialChecked: this.state.checked,
    callbackParent: this.onChildChanged
  })
);
```

This raises the same problem as previously: if you have intermediate components in-between, you have to pass down the callbacks the intermediate components.

Let's take a break and look at how React handles DOM events.

# React has its own DOM events layer

When we handle events, like `onChange`, the handler can take has access to:

- `this`: this is your component
- one argument: the event (`onTextChanged(e)`). It's not a standard Javascript event, it's a React `SyntheticEvent`.

Here is what a `click` event looks like:

![events](img_54dc8c380d6c3.png)

React add its own layer on top of the Javascript events system.
It uses events delegation and bind events on the root of the DOM:

```js
document.on('change', 'input[data-reactid=".0.2"]', function() { ... })
```
This code is not from React, it's just an example to explain how React handles the events.{.info}

If I'm not mistaken, the React code that handles the events is^[Keep in mind I wrote this in 2015, things have changed since. You can still find some artefacts of this old code in the latest version! [here](https://github.com/facebook/react/blob/e36b38c1cad22f7dff557736cf4b0280106e937e/src/renderers/dom/stack/client/ReactDOMComponent.js#L139)]:

```
var listenTo = ReactBrowserEventEmitter.listenTo;
...
function putListener(id, registrationName, listener, transaction) {
...
  var container = ReactMount.findReactContainerForID(id);
  if (container) {
    var doc = container.nodeType === ELEMENT_NODE_TYPE ?
      container.ownerDocument :
      container;
    listenTo(registrationName, doc);
}
...
// at the very of end of the listenTo inner functions, we can find the core function:
target.addEventListener(eventType, callback, false);
```

Here is the [full list](http://facebook.github.io/react/docs/events.html) of the events React supports.

## Using the same callback for all our children

Back to our React communication, we'd like to have several `<ToggleButton>` and display the number of checked inputs in our container.

To do that, we'll pass down the same callback to every of our children.
When called, the parent will adjust its total.

```
var MyContainer = React.createClass({
    getInitialState: function() {
        return { default: false, totalChecked: 0 };
    },
    onChildChanged: function(newState) {
      // if newState is true, it means a checkbox has been checked otherwise unchecked
      var newTotal = this.state.totalChecked + (newState ? 1 : -1);
      this.setState({ totalChecked: newTotal });
    },
    render: function() {
        return  <div>
                  <div>How many are checked ? {this.state.default}</div>
                  <ToggleButton text="Toggle me" initialChecked={this.state.initialChecked}
                                                 callbackParent={this.onChildChanged} />
                  <ToggleButton text="Toggle me too" initialChecked={this.state.default}
                                                     callbackParent={this.onChildChanged} />
                  <ToggleButton text="And me" initialChecked={this.state.default}
                                              callbackParent={this.onChildChanged} />
                </div>;
    }
});
 
// Our ToggleButton did not change
var ToggleButton = React.createClass({
  getInitialState: function() {
    return { checked: this.props.initialChecked };
  },
  onTextChanged: function() {
    var newState = !this.state.checked;
    this.setState({ checked: newState });
    this.props.callbackParent(newState);
  },
    render: function() {
        return <label>{this.props.text}: <input type="checkbox"
                                                checked={this.state.checked}
                                                onChange={this.onTextChanged}/></label>;
    }
});
```
We didn't modify the code of the `<ToggleButton>`, it does not know it has brothers: it does not have to know.

This is where the composability of components shines.

# My components are not directly related!

When components are not related or are related but too far away in the hierarchy, we can use an external event system to notify anyone that wants to listen.

It is the basis of any event system:
- we can subscribe/listen to some events and be notify when they happen
- anyone can send/trigger/publish/dispatch an event of this kind to notify the ones who are listening

## Events systems

Multiple patterns exists to do that. You can find a comparison [here](https://github.com/millermedeiros/js-signals/wiki/Comparison-between-different-Observer-Pattern-implementations)

- Event Emitter/Target/Dispatcher : the listeners need a reference to the source to subscribe.
  - to subscribe: `otherObject.addEventListener('click', function() { alert('click!') })`
  - to dispatch: `this.dispatchEvent('click')`

- Signals: similar but you don't use any random strings here. Each *signal* is a specific object. You know exactly what events an object can handle.
  - to subscribe: `otherObject.clicked.add(function() { alert('click') })`
  - to dispatch: `this.clicked.dispatch()`

- Publish/Subscribe: you don't need a specific reference to the source that triggers the event, there is a global object accessible everywhere to handle all the events. It's like being anonymous.
You have the notion of `topic` (a string) where you can store and retrieve the events data.
  - to subscribe: `globalBroadcaster.subscribe('click', function(who) { alert('click from ' + who) })`
  - to dispatch: `globalBroadcaster.publish('click', 'me!')`
 
Implementations can be quite straightforward:

```js
// any object can just extends EventEmitter to have access to `this.subscribe` and `this.dispatch`
var EventEmitter = {
    _events: {},
    dispatch: function (event, data) {
        if (!this._events[event]) return; // no one is listening to this event
        for (var i = 0; i < this._events[event].length; i++)
            this._events[event][i](data);
    },
    subscribe: function (event, callback) {
      if (!this._events[event]) this._events[event] = []; // new event
      this._events[event].push(callback);
    }
    // note that we do not handle unsubscribe here
}

// Anywhere we have a reference to a Person (that extends EventEmitter)
person.subscribe('namechanged', function(data) { alert(data.name); });

// in the Person object
this.dispatch('namechanged', { name: 'John' });
```

To try the Publish/Subscribe system, a good implementation is [PubSubJS](https://github.com/mroderick/PubSubJS).

## Observables/MobX

Observables are another event system which is really powerful.
It looks like the EventEmitter system but with many more features. For instance, there is the notion of cold and hot Observables.

In our EventEmitter implementation, if we register after an event has been published, we'll never get notified.
Whereas with a cold Observable, the events are kept in memory, and are sent for any new registration.

This is just one feature among hundreds more. You should definitely look at the [documentation](http://reactivex.io/documentation/observable.html) to get a grasp of its power.

[MobX](https://github.com/mobxjs/mobx) is a framework that implement the Observable pattern to pass data between React components.

## Redux

[Redux](https://github.com/reactjs/redux) is a popular choice to handle the data and the events in a React application.
It's a *simplified* version of the Flux pattern Facebook originally brought.

Redux itself is not dependent of React.{.info}

We need to add a dependency to [`react-redux`](https://github.com/reactjs/react-redux) to have some helpers and higher-order components linked to Redux to help us out.

Redux follows the EventEmitter pattern (`subscribe`, `dispatch`).

It adds more features and provides *stores* with an initial state to keep the data outside of the components.
This way, multiple components can use the same store to get or alter the data through a unified way.

```js
import { createStore } from 'redux'

// a "reducer" that handle some events and return a state
function counter(state = 0, action) {
  return  action.type === 'INCREMENT' ? state + 1
        : action.type === 'DECREMENT' ? state - 1
        : state;
}

let store = createStore(counter)

store.subscribe(() =>
  console.log(store.getState())
)

store.dispatch({ type: 'INCREMENT' }) // 1
store.dispatch({ type: 'INCREMENT' }) // 2
store.dispatch({ type: 'DECREMENT' }) // 1
```

`createStore()` creates a store around our reducer, to keep a state, and provides some functions such as `subscribe()` and `dispatch()`, but also `getState()` to have a peek inside.

In React, you would share the store to any component that needs it: this is the exactly what `react-redux` provides, and it's using the famous **context** to do so.

What is powerful with Redux is that there are tons of middlewares that can be plugged to the stores, to enhance them.

A classic example is [redux-logger](https://github.com/evgenyrodionov/redux-logger) that `console.log` every changes made to a store.
You don't have to modify anything in the code, except the store.

```js
const logger = createLogger();
const store = createStore(counter, applyMiddleware(logger));
```

There are at least [408 middlewares available on npm](https://www.npmjs.com/search?q=redux+middleware).

# Where to register to events notifications

To register to the events systems in our components, we have to look at 2 functions React calls: `componentWillMount` and `componentWillUnmount`.

- We want to subscribe only if our component is mounted in the DOM: `componentWillMount`.
- We want to unsubscribe if our component is unmounted: we don't want to process the events anymore, the component is going to be removed from the DOM: `componentWillUnmount`.

---

Here is example using the PubSub system (this would be the same for Redux or other patterns).

Multiple products are displayed. When we click on one of them, it dispatches a message with its name to the topic "products".

Another component subscribes to this topic and updates its text when it got notified.

```
var ProductList = React.createClass({
  render: function() {
    return  <div>
              <ProductSelection />
              <Product name="product 1" />
              <Product name="product 2" />
              <Product name="product 3" />
            </div>
  }
});
```
```
// ProductSelection consumes messages from the topic 'products'
// and displays the selected product
var ProductSelection = React.createClass({
  getInitialState: function() {
    return { selection: 'none' };
  },
  componentWillMount: function() {
    // React will mount me, I can subscribe to the topic 'products'
    // `.subscribe()` returns a token used to unsubscribe
    this.token = PubSub.subscribe('products', (topic, product) => {
      this.setState({ selection: product });
    });
  },
  componentWillUnmount: function() {
    // React removed me from the DOM, I have to unsubscribe from the system using my token
    PubSub.unsubscribe(this.token);
  },
  render: function() {
    return You have selected the products: {this.state.selection};
  }
});
```
```
// A Product is just a <div> we use to publish a message to the topic 'products'
// when we click on it
var Product = React.createClass({
  onclick: function() {
    PubSub.publish('products', this.props.name);
  },
  render: function() {
    return <div onClick={this.onclick}>{this.props.name}</div>;
  }
});
 
React.render(<ProductList />, document.body);
```

# ES6 generators and js-csp

A more exotic and advanced feature to communicate is to use ES6 generators in combinaison with `js-csp`.
Be careful, here be dragons: https://github.com/ubolonton/js-csp.

We have a queue of messages and anyone having its reference can put data inside.
- Any object listening will be *stuck* until a message arrives. (principle of *yield*)
- When some data are sent, it will be *unstuck*, retrieve them, and continues its execution.

# Conclusion

There is no better solution.
It depends on the needs, on the application size, on the numbers of components.

For small applications, props and callback are fine. We generally start with those.

For bigger applications, some simple tools or a framework is necessary to avoid messy code and centralize the events and data.
Redux does a great job. MobX does a great job. Both are very different in the usage.

> We should use what we're at ease with and not look back.
