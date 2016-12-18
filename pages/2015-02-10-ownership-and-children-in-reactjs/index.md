---
title: Ownership and children in ReactJS
date: "2015-02-10T01:10:59Z"
layout: post
path: "/2015/02/10/ownership-and-children-in-reactjs/"
language: en
---

Let's explore how does the ownership works in React.
What exactly is a child in React's world by looking at the special property : `this.props.children`. 

---
Summary {.summary}

[[toc]]

---

# Luke, I'm your.. owner?

When we do:

```js
var MyContainer = React.createClass({
  render: function() {
    return <MyChild value={this.props.value} />
  }
});
// Or in ES6
const MyContainer = (props) => <MyChild value={props.value} />
```

- `<MyContainer>` is the *owner* of `<MyChild>`
- `<MyChild>` is the *ownee* of `<MyContainer>`

We don't talk about parent/child, which refers to the DOM relationships.

If we wrap a `<div>` around `<MyChild>`:

```js
var MyContainer = React.createClass({
  render: function() {
    return <div><MyChild value={this.props.value} /></div>
  }
});
// Or in ES6
const MyContainer = (props) => <div><MyChild value={props.value} /></div>
```

`<MyContainer>` is not the parent of `<MyChild>` (the `<div>` is in between), but it's more generally its owner.

In the DOM hierarchy, the `<div>` is the representation of `<MyContainer>` which is the parent of whatever `<MyChild>` can represent.

You can see it through the [React Chrome Developer Tools](http://facebook.github.io/react/blog/2014/01/02/react-chrome-developer-tools.html):

![devtools](http://ctheu.com/wp-content/uploads/2015/02/img_54d9434073e95.png)

- `<MyContainer>` does not have any owner
- The owner of `<MyChild>` is `<MyContainer>`, not the `<div>` in-between (the owner of the `<div>` is also `<MyContainer>`).
- The owner of the `<span>` is `<MyChild>`

To resume:
- an owner is a *React Element*
- an ownee can be anything (a React element or a pure HTML tag).

To find the owner of a node, we need to look for its closest React element through its ancestors hierarchy.
It's the one that `render()` it (and sets its `props` if any). 

# There are many types of children

Let's focus on the special property `this.props.children`.

This is a property automatically set by React on our components that contains the children of the current component.

Don't use `children` as a name for your own props, you might have troubles (ie: it will be override if you really have children in your component).

Here is a simple component that includes its children into a `<div>`.

```js
var Parent = React.createClass({
  render: function () {
    return <div>{this.props.children}</div>;
  }
});
React.render(<Parent>
              <span className="child">whining</span>
             </Parent>, document.getElementById('container'));
```

That renders:
```html
<div id="container">
  <div data-reactid=".0">
    <span class="child" data-reactid=".0.0">whining</span>
  </div>
</div>
```

`this.props.children` corresponds to the content put inside the `<Parent></Parent>` where it was rendered.
In this example, `this.props.children` is a single `ReactElement` (type `span`).

But `this.props.children` can also be an `array` of two `ReactElement` of type `span`:

```js
React.render(<Parent>
              <span className="child">whining</span>
              <span className="child">whining more</span>
            </Parent>, document.getElementById('container'));
```

More generally, `this.props.children` can contains: 

- `undefined`:
  - `<Component />`
  - `<Component></Component>`
- a single `ReactElement`: 
  - `<Component><span></span></Component>`
  - `<Component><ChildComponent></ChildComponent><Component>`
- an array of `ReactElement`s :
  - `<Component> <span></span> <ChildComponent></ChildComponent> </Component>`
- a string:
  - `<Component>i'm a nice string</Component>`
 
Because of all the types, it can be complicated to work with this property without bloating the code.

## React Children helpers

Hopefully, the React team had created some helpers to do the dirty job and make our code cleaner: 

- [React.Children.map](https://facebook.github.io/react/docs/react-api.html#react.children.map) : iterate through them calling your function, and returns an array (or undefined if no child) as result
- [React.Children.forEach](http://facebook.github.io/react/docs/react-api.html#react.children.foreach) : iterate through them calling your function
- [React.Children.count](http://facebook.github.io/react/docs/react-api.html#react.children.count) : number >= 0
- [React.Children.only](http://facebook.github.io/react/docs/react-api.html#react.children.only) : if you don't have one child exactly, it throws the error `Uncaught Error: Invariant Violation: onlyChild must be passed a children with exactly one child` (even if I have a string a child which I think is a bug, because `.count` returns `1`), otherwise returns it

Here is a small example that renders only children of type `span` or `MyComponent`:
```js
var ShowOnlySpansOrMyComponent = React.createClass({
  render: function() {
    var onlySpans = React.Children.map(this.props.children, function(child) {
      if (child.type === 'span' || child.type === MyComponent.type) {
        return child;
      }
    });
    return <div>{ onlySpans }</div>;
  }
});

React.render(<ShowOnlySpansOrMyComponent>
              you have to <span>work</span>
              <div>AB</div>
              <MyComponent />
              <span>now</span>
             </ShowOnlySpansOrMyComponent>, document.getElementById('container'));
```

Here is the list of the children:

```xml
" you have to " : no type
ReactElement : span
" " : no type
ReactElement : div
" " : no type
ReactElement : function (props) // MyComponent's (ReactElement's) constructor
" " : no type
ReactElement : span
" " : no type
```

Only the `<span>` and `<MyComponent>` appear in the rendering.

To grab the type of components, we used `MyComponent.type` which is the base `ReactElement` constructor.{.info}
