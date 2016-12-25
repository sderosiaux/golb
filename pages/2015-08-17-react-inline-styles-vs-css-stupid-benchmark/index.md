---
title: "ReactJS inline styles VS CSS : benchmark"
date: "2015-08-17T23:41:27Z"
layout: post
path: "/2015/08/17/react-inline-styles-vs-css-stupid-benchmark/"
language: en
---

I was wondering what are the performance downsides when we are using ReactJS (it's the same for any other framework) with inline styles only, against using external CSS stylesheets.

We know that the size of inline styles can be huge (especially if we repeat elements). This is exactly the situation we are going to test here.
This way, we can *test* browser performance when it comes to parse, save, and apply a bunch of inlines styles, against a unique CSS stylesheet.

---
Summary {.summary}

[[toc]]

---

# When use one against the other?

I think both ways are useful and have a specific area of application.

As Michael Chan said at [React Europe](https://speakerdeck.com/chantastic/inline-styles-react-europe) ([video](https://www.youtube.com/watch?v=ERB1TJBn32c)):

- CSS stylesheets can be used for the layout: such as the bootstrap layout classes: `row-fluid`, `span*`. They are fixed and form the *static* part of the website.
- The inline styles should be used for the *state-styles*: the style that can change according to a state. They form the *dynamic* part of the website.

# It's not relevant

I decided to try something stupid and not truly relevant to a real business case:

- Generate two big `<table>`s: one with inline styles, one with CSS stylesheets. Same content.
- Check the performance/smoothness/size/time of rendering for both.

It's not relevant because we would **not** generate a big table in our DOM.
We should have some kind of virtual scrolling/lazy rendering.

But, what about a harmless test, just to check if that's more slow when I scroll or not, and what about the rendering times ?

Chrome 45b, React 0.13.3{.info}

# The experience

So we generate a `<table>` of 1,000 rows with 9 columns. All of them with the same content my.email@example.com.
We do the same with 10,000 rows to check the "trend".

We're going to test :

- The *smoothness* when I scroll down the page through Chrome DevTools Timeline.
- The *size* of the DOM: it's useful to know for ~~isomorphic~~ universal Javascript application (server-side rendering).
- The time to *mount the DOM*: I'm going to use `componentDidMount`: this is where the DOM is available after `render` is called.
- The time to be *rendered*: I'm going to use `requestAnimationFrame` to know when the next frame after `render` is ready.

The skeleton of the ReactJS component is : 

```
const createOneInlineStyleRow = (i) => <tr key={i}>
                                        <td style={style}>my.email@example.com</td>
                                        ...repeat...
                                       </tr>

export default class AppInline extends React.Component {
    componentDidMount() {
        console.timeEnd('didMount')
    }
    render() {
        console.time('render');
        console.time('didMount');
        requestAnimationFrame(function() { console.timeEnd('render'); })
        
        const rows = times(NB_ROWS, createOneInlineStyleRow)
        return <table style={TABLE_STYLE}><tbody>{rows}</tbody></table>
    }
}
```

Some random style for the `<td>`: 

```js
const style = {
    fontFamily: 'Consolas',
    padding: 10,
    color: "#444",
    border: "3px solid orange",
    position: "relative",
    width: "15%",
    height: "25px",
    letterSpacing: 0,
    overflow: "hidden",
    fontSize: 10,
    fontVariant: "small-caps"
}
```

And the same in CSS for the stylesheet: 

```css
.tableCss td {
    font-family: Consolas;
    padding: 10px;
    color: #444;
    border: none;
    border: 3px solid orange;
    position: relative;
    width: 15%; height: 25px;
    letter-spacing: 0;
    overflow: hidden;
    font-size: 10px;
    font-variant: small-caps;
}
```

Basically, here is this beautiful design : ![](http://ctheu.com/wp-content/uploads/2015/08/img_55d25fa31b0f7.png)

# Results

## Timeline

I found no difference when scrolling.

Chrome DevTools timeline supports my perception: no difference, no fps drop.

The fact that the DOM is inline or in an external CSS stylesheet does not matter.
I guess it's already in the browser memory when it's rendered so it does not influence the smoothness. 

## Size of the DOM

No surprise: the DOM size is huge with the inline styles and is linearly proportional to the number of rows. 

| Type   | 1,000 rows      | 10,000 rows       | Ratio |
|--------|-----------------|-------------------|-------|
| CSS    | 517,725 chars   | ~5,177,250 chars  | x10   |
| Inline | 2,283,742 chars | ~22,837,420 chars | x10   | 
|        | x4.4            | x4.4              |       |

That's clearly something to take into account if you do some universal javascript. 2,000,000 chars is 2MB of data. (but who sends a big table anyway?!) 

As calebwright pointed out in the comments, over the network, we are generally gzipping the content. Without random content in the table, the 2MB DOM compresses to 200k.

Also, as Daniel Meneses said, with SSR, the inline styles will be downloaded each and every time (part of the HTML), whereas a CSS stylesheet will be downloaded once. (thanks to the browser's cache)

## Time to mount the DOM

We start a timer in the `render` method and end it when `componentDidMount` is called.

React has done its job converting the virtual DOM into DOM and has injected it into our mounted node.

I let the times with the development version of React, because I started with and used the production version afterwards. They should not be taken into account, it's not relevant in our case.{.info}

| Type | 1,000 rows | 10,000 rows | Ratio | 
|------|------------|-------------|-------| 
| ~~CSS (debug)~~ | 650ms-750ms | 6,000ms | ~x10 | 
| ~~Inline (debug)~~ | 1,000ms-1100ms | 10,000ms | ~x10
| CSS | 310ms | 2,300ms | ~x7.5 | 
| Inline | 600ms | 4,900ms | ~x8 | 
|  | x2 | x2.1 |  |
 
It takes twice the time to convert our virtual DOM with inline styles to DOM and mount it.

The delta decreases with less rows but it's still *significant*: 70ms (css) against 105ms (inline) for 100 rows (x1.5). 

## Rendering time

The DOM is mounted, the browser needs to render the table.

We assume it will take longer to render the inline styles, because it has more to parse and store every `style` attribute of every `td`. 

| Type | 1,000 rows | 10,000 rows | Ratio | 
|------|------------|-------------|-------| 
| ~~CSS (debug)~~ | 1,100ms-1,200ms | 9,500ms | ~x10 | 
| ~~Inline (debug)~~ | 1,500-1,600ms | 14,000ms | ~x10 | 
| CSS | 720ms | 6,000ms | ~x8 | 
| Inline | 1,080ms | 9,400ms | ~x8.7 | 
|  | x1.5 | x1.56 |  | 

There is still a small overhead.

I guess those performances are quite browser-dependent.

## What about another browser ? Let's try with Edge.

I gave a try on Edge with 10,000 rows: 

| Type | mount time | rendering time | 
|------|------------|----------------| 
| CSS | 4,115ms | 11,591ms | 
| Inline | 11,418ms | 21,113ms | 
|  | x2.7 | x1.8 |  |

The numbers are the double of Chrome's numbers. :cry: 

# Conclusion

That was the expected behavior. At least, we have some numbers now.

Inline styles take way more size in the DOM, are converted more slowly from VDOM (have probably a bigger impact on memory), and take more time to be handled by the browser.

But they have no impact on performance once it's rendered.
