---
title: ReactJS tips and tricks
date: "2015-02-09T02:48:59Z"
layout: post
path: "/2015/02/09/react-tips/"
language: en
---

React is full of tricks, is based on important principles, and comes with its own downsides and its own complexity.
Thinking in React is a bit different than thinking in pure Javascript or jQuery.
Here are some tips.

---
Summary {.summary}

[[toc]]

---

# HTML to JSX

To see what is the React syntax for a particular piece of HTML, take a look at http://magic.reactjs.net/htmltojsx.htm.
We just paste some HTML and it shows the result in a React component.

We can see some attributes have different names:
- `className` for `class`
- `htmlFor` for `for` (in `<label>`)

The properties are also differently formatted: `style="border: 1px solid red"` becomes `style={{border: '1px solid red'}}`.

# setState() does not modify this.state right away

When we code a component and we need to access its state, we need to be sure to override `getInitialState()` to return something.
`this.state` is `null` by default.
`this.props` is an `{}` (empty object) by default.

When we update the state of a component with:

```js
setState({ done: true })
```

- `this.state.done` is not modified right away.

React aggregates all the `setState()` calls and only apply them before rendering again (in the next *tick*).
This avoids multiple rendering in ABA situation (in the same tick):
```js
setState({ done: false });
setState({ done: true });
setState({ done: false });
// at the end, the "true" never made it into the UI
```

# Why immutability is important ?

When we have to modify an array in our state, we can't just `push` into it: that's won't trigger the re-rendering because React cannot just listen to an array changes.

It was possible with the method `Array.observe(arr, callback)` but it has been deprecated since.{.warn}

That's why we have to call `this.setState({...})` to tell React something has changed.

There are multiple ways to work with it:

- We force our way: we modify our array directly with `push`, then we call `forceUpdate()` to trigger the rendering:
```js
this.state.mylist.push(5);
this.forceUpdate();
```
- We `slice()` our array to clone it, then modify it, then update the state:
```js
var copy = this.state.values.slice(); // this.state.values reference in NOT modified here
copy.push(5);
this.setState({ values: copy }); // the reference changes, React notices it
```
- We use [the React way](https://facebook.github.io/react/docs/update.html), using its immutability helpers from ~~`React.addons`~~ `immutability-helper`. This is a bit like `slice()` but it works on any objects and sub-objects. The syntax is inspired by MongoDB's query language: `{$push:..}`, `{$set:...}`:
```js
this.setState({ values: update(this.state.values, {$push: [4]}) });
```

# How to communicate between components ?

I've written a whole post about that: https://www.sderosiaux.com/2015/02/12/how-to-communicate-between-react-components/

# How to handle the data coming from a webservice ?

Here is a simple component that calls a webservice to get a `name`.
It handles a `loading` state and an `error` state.

```js
var HelloWho = React.createClass({
    getInitialState: function() {
        return { loading: true, error: false, name: null };
    },
    componentDidMount: function() {
        this.callWS();
    },
    callWS: function() {
        $.ajax({
            url: 'http://api.randomuser.me/',
            dataType: 'json',
            context: this,
            success: function(data) {
                if (this.isMounted()) {
                    this.setState({ loading: false, name: data.results[0].user.username });
                }
            },
            error: function() {
                if (this.isMounted()) {
                    this.setState({ loading: false, error: true });
                }
            }
        });
    },
    render: function() {
        if (this.state.loading) {
            return <div>Loading...</div>;
        }
        if (this.state.error) {
            return <div>Error retrieving the data</div>;
        }
        return  <div>Hello {this.state.name}</div>;
    }
});
 
React.render(<HelloWho />, document.getElementById('container'));
```

Consider using `fetch` now, which is part of Javascript, instead of `jQuery.ajax`.{.warn}

- The method `componentDidMount` is called when the component is mounted into the DOM: time to call the webservice.

- `isMounted` is used to ensure the component is still on the page when the response comes back.
If it's not and `setState` is called, we'll end up with an error
```xml
Uncaught Error: Invariant Violation: replaceState(...):
Can only update a mounted or mounting component
```

`isMounted` is now considered as an [antipattern](https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html) and `componentWillUnmount` should be used to cancel the ajax request.

Because the component calls a webservice, we must add 2 properties to its state `loading` and `error` to be able to render something different according to the 3 states: *loading*, then (*error* or *success*).


# How to use a third party plugin that updates the DOM directly, such as Highcharts?

Highcharts needs a reference to a DOM element to do its job.
It turns out that we have access to the DOM reference of we are rendering in React.

This is what the `ref`s in React are used for.

We can't add Highcharts code in `render()` because the DOM elements are not rendered yet.
What `render()` returns are not DOM elements but just plan Javascript objects.

`return <div></div>` is compiled to `React.createElement('div')` which is a `ReactElement` object.{.info}

We have to wait for `componentDidMount` to be called because it is called after the DOM elements are created.

First, we must store this reference, it's not magically available in this function.
It's possible in the `render()` method, by passing a callback to the property `ref` of any virtual DOM element.
React will call it asap, when the reference is available.

Here is a example that first renders a chart using `this.props` values, then one second later, update itself and uses `this.state` values:

```js
var DrawMeAChart = React.createClass({
    getInitialState: function() {
        return {};
    },
    componentDidMount: function() {
        // the DOM element is available!
        $(this.chart).highcharts({
            series: [{ data: [this.props.start, this.props.end]}]
        });
 
        // in one second, componentDidUpdate() will be called
        setTimeout(() => { this.setState({ start: 37, end: 13 }) }, 1000);
    },
    componentDidUpdate: function() {
        // the DOM is still there
        $(this.chart).highcharts({
            series: [{ data: [this.state.start, this.state.end]}]
        });
    },
    render: function() {
        return  <div ref={(div) => { this.chart = ref; }}></div>;
    }
});
 
React.render(<DrawMeAChart start={13} end={37} />, document.getElementById('container'));
```

# What about React/DOM Performance ?

## Less mutations

Let's say we have a table with thousands rows, and some clickable headers that can collapse hundreds of rows below.

Here is the `render()` of a `<Table>` component:

```js
getInitialState: function() {
    // multiply the numbers of records by 99999
    return { rows: [ { header: true, name: 'Group A'},
                     { value: 5 }, // one value in Group A
                     { header: true, name: 'Group B', collapsed: true },
                     { value: 10 }, { value: 20 }] }; // two values in Group B
},
render: function() {
    var isCollapsed = false;
    return  <table>
              {this.state.rows.map(function(row) {
                if (row.header) { // render the row `header: true`
                  isCollapsed = row.collapsed; // save the state for the next row
                  return <MyGroupHeader groupName={row.name} />;
                }
                if (!isCollapsed) { // render a row if the previous header was NOT collapsed
                  return <MyRow value={row.value} />;
                } else {
                  return null; // the header of the row is collpased, nothing to render
                }
              })}
            </table>;
}
```

We simply return `null` to not display the row of the headers that are collapsed.
Unfortunately, with large collections, the performance are ugly due to the mass mutation of the DOM.

Instead, hiding/showing the cells (à la CSS) works flawlessly:

```js
// always returns a <MyRow> but with an prop `hidden`
return <MyRow hidden={isCollapsed} value={row.value} />;
```
 
Then `MyRow` takes the prop `hidden` into account and add a css class:
```js
return <tr className={this.props.hidden ? 'hidden' : ''}> ...
```

This is WAY faster.

## Should Component Update ?

If we know a component does not need to pass through `render()` because its state didn't change (in case its parent re-`render()` itself, that calls `render()` on every of its children by default), we should consider implementing `shouldComponentUpdate`.

That could give us a big performance boost because we are just saying to React: *don't bother with your virtual DOM, I know what I'm doing, just forget about me!*.

In a general manner, this method should always be implemented to shortcut the more `render()` we can.

```js
shouldComponentUpdate: function(nextProps) {
    // if my visibility didn't change, no need to call my `render()` to verify
    return this.props.hidden !== nextProps.hidden;
}
```

There is also a [PureRenderMixin](https://facebook.github.io/react/docs/pure-render-mixin.html) that can help to do that automatically.

We can find out where we could implement them using [react-addons-perf](https://facebook.github.io/react/docs/perf.html), that gives us the time React passed to `render()` components that didn't changed for instance:

![perf](perf.png)

