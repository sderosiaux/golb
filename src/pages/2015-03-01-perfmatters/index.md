---
title: "How to avoid website jank: a lot of performance tips"
date: "2015-03-01T23:48:39Z"
is_blog: true
path: "/articles/2015/03/01/perfmatters/"
language: en
tags: ['javascript', 'perfmatters']
---

We see more and more websites that do not care of the performances.

They are slow, fat, embed lots of resources, make you download several MBs, are not fluid when you scroll down, are not fluid when you click on something, are not responsive, have slow animations.
It's easy to make a website, but it's harder to make it good.
A slow website will have a big churn in its users, because the navigation was crappy.

Performance matters.

Premature optimization is the root of all evil.
This is why it should not be premature and just become the de facto standard.
A bad Javascript can have a huge impact on the performance.
A bad CSS can have a huge impact on the performance.

Here is a bunch of *advices* or at least, things to be aware of.

TOC

# Goal: be jank-free at 60fps

Jank is when frames are drop when we navigate a website: we don't want that.

Here is a website anti-jank: http://jankfree.org/.
We can find a lot of talks and articles from Paul Lewis, Tom Wiltzius and Nat Duca, who explain clearly how to avoid jank, how to diagnose it, and how to fix it. 

We'll resume quickly what I've learned from a lot of different sources, in order to be aware of the mistakes we can do that causes jank.

We'll start with general Javascript concepts, then we'll continue with deeper concepts such as the layout/painting/layers processes the browser do and how to optimize them. Finally, we'll talk about the network impact.

[[info]]
|Some of the items may be irrelevant nowadays because it was optimized since.

# Javascript

## Object instances

When we have a bunch of object to create, we should go the simplest pattern: no module pattern.
Prototypes are faster to create, or even plain simple object. <http://jsperf.com/prototypal-performance/55>

Another option is to use object pools.

## Objects pooling

When we are creating and destroying a lot of objects/references, we should consider using an object pool.

This way, we won't trigger the Garbage Collection which can *Stop the World* (precious milliseconds or more lost at random times).

For instance, the [deePool library](https://github.com/getify/deePool) can help with that.

http://www.html5rocks.com/en/tutorials/speed/static-mem-pools/ for more details. 

## Holey/sparse arrays

Sparse arrays are arrays with *holes* inside: `[1, 2,,,, 6]`

It is bad because they can be converted to a dictionary internally thus being way slower.

We should also not use the `delete` keyword. It will change the *internal class* of the object.
For instance, an array from which we `delete` something in the middle will be transformed into a map.

http://jsperf.com/packed-vs-holey-arrays

## Memory management/variable scoping

We should never global variables.

- It's a bad pattern.
- We should always declare variables in the smaller scope we can to release them the soonest.

With ES2015, we should only use `let` and not `var` to reduce the scope to the minimum.

We should remove the event listeners we don't use anymore.
We should watch our closures: they can contain references that will never be released.

## Async JS scripts

Inline `<script>`s and `<script src="main.js"></script>`s block the DOM construction when the browser encounters them: that will delay the initial rendering.

We should put our `<script>` at the end of the `<body>` for the browser to render it first. Moreover, the scripts often references DOM parts (in `<head>` nothing is constructed yet).
We can add the `async` and `defer` flags on the `<script>` tag to defer its loading. The browser won't block, download them in parallel, and will continue it's parsing and rendering.



# HTML/DOM

## Image resizing

We should resize our images exactly as the size we are using on the page. Why give the browser more data it needs? We want to avoid the browser to resize the image itself (it's cpu consuming).

We should consider using `srcset` on `<img>` or use `<picture>` if we want to handle high DPI devices.

## DocumentFragments

When we want to append several items to the DOM, we should consider using `document.createFragment()`.

It's available in all browsers since a while (jQuery uses it when we call `append()` with an array). We can use traditional DOM operations on a fragment (`appendChild`, style etc.). The browser won't do a thing. When it's complete, we can just append it to the DOM in one shot.

## DOM element count

We should not have too many DOM nodes on our pages.

1000 for a mobile application is a good number.

For reference:

Desktop versions:
- 4000 for twitter.com
- 2500 for amazon and facebook

Mobile versions:
- 1000 for m.twitter.com
- 1700 for m.facebook





# CSS

## Background-size

`background-size` is the same story. Instead of using it and let the browser handle the resizing, we can create multiple versions of the same image.

We can also create a spritesheet image of several images to do only one HTTP request.

## CSS gradients

Repeating gradients are performance consuming.
They slows down a lot the browser rendering.

If we put some on the background of a page we can scroll, it will be noticeable.
We should always prefer to use a tiled background image.

## :hover and scrolling

`:hover` effects can cause awful slowdowns in the middle of a scrollable page.

If the user scrolls using its mousewheel on top of those elements, they will trigger their `:hover` state at the same time the scrolling is occurring. If the `:hover` effect is to add some shadow, that will kill the fps and we'll have jank.

A solution is to add a `class` on the container when it's scrolling, and configure the `:hover` rule of the elements inside to not be trigger if it's active: `:not(.scrolling) div:hover`. 

## CSS classes on body

We should consider not adding add classes on `body` or on a top tag if that only affect an item deep in the DOM. This could cause a full repainting from the parent that will be propagated to all its children. We should always try to target the element or a nearest parent.

## Fixed elements

If we have a top header in fixed position on our website, we should consider putting it in its own layer. It often causes performance troubles easily fixable.

Otherwise, scrolling the content below causes the element to be repainted each time. It's easily spottable with the `Show Paint Rectangle` toggle in the DevTools.

## CSS stylesheets

CSS are blocking resources in the browser.

It has to wait for them to be loaded and parsed before rendering anything: to avoid a flickering effect.

We must keep them light, and avoid to load unnecessary css rules.
We can split our stylesheets by media. The browser is smart, and won't wait for them if it's useless:

```html
<link href="style.css" rel="stylesheet">
<link href="print.css" rel="stylesheet" media="print">
<link href="other.css" rel="stylesheet" media="(min-width: 40em)">
```

We should avoid using `@import` in stylesheets: this blocks again the browser.




# Resources loading

## Custom fonts instead of image

We can use nice custom fonts instead of images to draw symbols.

[FontAwesome](http://fortawesome.github.io/Font-Awesome/icons/) is a nice example of font. It will save bandwidth and designer time.

We can even use unicode characters if our font supports them.

[[info]]
|svgs are being preferred to custom fonts. They are more targeted and very lightweight.

## Image lazy loading

We should consider using an image lazy loading library to load some images only if the user can see them or if everything else (more important) has been loaded first.

If by default the image is not displayed in the first view at loading time, we can defer its request when the user will scroll into.

If we have a carousel of images, we can consider not loading every images of the carousel at first, but only when the user hovers it, or again, wait for everything else to be loaded. The point is: if the user does not even use the carousel, it's useless to load the other images. 

## Resources caching

We should use the browser cache to avoid sending several times our static resources.

For instance, we can use the `ETag` response header. The browser will then use a `If-None-Match` request header to ask the server the next time.

We can also leverage the `Cache-Control` response header.

https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching?hl=en



# Events

## Event listeners

We should not try to bind event listeners on the whole document just to handle some events on a deep child.

We should try to bind listeners on the element we target or a nearest parent. The *compositor* —a thread dedicated to handle inputs and scrolling— will be called for nothing each time the event is triggered on the whole document.

## Events throttling

We should always throttle the events that can be called numerous times: `onscroll`, `onmousemove`, `onresize`, `ondragover`.

Without throttling, if we do some Javascript each time we get one events, that will considerably slow down the whole thing.
Throlling the events we only send us few events here and there and that will be enough. 

## Event handlers

We should never do any complex logic in the event handlers.

A good pattern is to save somewhere the values we care about (`scrollTop`, mouse position...) in the handlers, and let the browser continue its events pipeline.
Then, `requestAnimationFrame(fn)` will use them when it can.

If we are doing a heavy process in a handlers, we will delay all other events handling, and we will delay the rendering.

## Browser events

We need to understand the events the browser expose when it's accessing our website.

The most known is probably `DOMContentLoaded`.
It is called when all resources have been requested and parsed but not processed yet.

The event `load` is when all resources has been processed (even images).

The associated event handlers must to be as short and fast as possible.

![](dom-navtiming.png)
![](img_54f3a1914e8c2.png)

https://developers.google.com/web/fundamentals/performance/critical-rendering-path/measure-crp?hl=en

For the browsers that implements the Performance API, we can get a bunch of metrics with some Javascript: http://googlesamples.github.io/web-fundamentals/samples/performance/critical-rendering-path/measure_crp.html

## Navigation delay

We should never delay the unloading event of our website.

It is triggered when the user is navigating to another page, not just only when the user closes the tab.

Instead of sending a classic ajax request and add some trick to wait (as a empty for loop! people did it), we an use `navigator.sendBeacon`, it exists for that.
The browser will send them later, even tab closed.




# Animations and transitions

## requestAnimationFrame() is our best friend

We should never use `setTimeout()` or `setInterval()` to throttle event handlers such as `onscroll` or `onresize`.

`requestAnimationFrame()` is there to do that. It is triggered only when a frame is going to be rendered.

This is useless to compute something that renders something between 2 frames: it will never be rendered.
This is particularly true for animations.

http://www.html5rocks.com/en/tutorials/speed/animations/
 
## Avoid Layout Trashing

When we need to read some positions or sizes from the DOM, like `.offsetTop`, `.offsetWidth`, we must not alternate them with writes on the DOM, like `element.style.width = width`. 

That would cause *Layout Trashing*. Each time a size or a position changed in the DOM, a forced synchronous layout (painting) happens.

All your readings then all the writings should be batched together.

Multiple solutions exist:
- we can call `requestAnimationFrame()` to read values, then inside, call another `requestAnimationFrame()` to write the transformations.
- we can use [fastdom](https://github.com/wilsonpage/fastdom) that batches reads and writes together.

To know if we provoke some Layout Tracking, we can check the timeline in the DevTools and look for cycles of: recalculate style, layout, recalculate style, layout, ...

We can know what property triggers what on http://csstriggers.com/

## transformZ(0) aka the null transform hack

There is a trick called the *null transform hack* to force the browser to create a distinct layer containing a DOM element, that will be painted using the hardware acceleration (and independently of the other layers). It's done by using `transform: translateZ(0)` or `transform: translate3d(0,0,0)`.

Visually, nothing changes, but that can really boost the fps.
Combined to elements with box-shadows, we can clearly see the difference.

[[warn]]
|Mobiles do not have the same capability than desktops, and the performances could be worse.

## will-change

Instead of this hack, we should consider implementing a fairly new css property:

```css
will-change: [transform|scroll-position|contents|any css property]
```

That gives a hint to the browser, and it will probably create a distinct composite layer for this element.

If we know we are going to change the text of some element, we can set `will-change: contents.`
https://dev.opera.com/articles/css-will-change-property/

It's a good idea to to remove this css property when we are done with the changes.

We should not try to apply it on a global rule, but just before it's needed.

For instance, we can listen use `:hover` on its container to set it `will-change` on its child. No `:hover` on parent = no `will-change` on the child.

## Composite layer

- `translationZ`, `translation3d` create a new composite layer for their element.
- `<canvas>` and `<video>` are automatically embedded in a new layer.
- transitions with `opacity` and `transform`, some css filters that use hardware acceleration also.

Note: It has nothing to do with z-index layers.

http://www.html5rocks.com/en/tutorials/speed/layers/

## Animation/Transitions in Javascript

We should never animate with Javascript. This is why we have CSS animations/transitions.

They will be processed by another dedicated thread. Even if Javascript does complex calculations and slows down the main thread, the animations/transitions won't be impacted.

## Transform to animate position

When we have an element which position is dynamic, we should not use CSS `top`/`left` but `transform: translate(...)`.

`top`/`left` should be reserved for initial positioning only, just to organize the layout.

CSS `transform` exists for the transformations: it does not reflow/redraw whereas updating `top`/`left` does.

In the DevTools, we can enable `Show Paint Rectangle` (Timeline > Rendering) to see what is repainting on our page when we are navigating.

[[info]]
|Note: `translate: transform` transition is using *subpixel* rendering instead of pixel per pixel rendering as with `top`/`left` transitions: a smoother rendering.

## FLIP

It's a technique used to animate an element the cheapest way possible when the positions/dimensions are unknown/dynamic.

Paul Lewis has a great explanation: http://aerotwist.com/blog/flip-your-animations/

It stands for: First, Last, Invert, Play.

From the initial state:
- we set directly its last state
- read some values from it (position, size)
- apply an inverted `transform` to put it back where it was
- clear the transform style to trigger the animation

## Reading values from the DOM

Calling `getComputedStyle(`) (or `.css()` in jQuery) is a bad idea.

That's triggering a *Recalculate Style* process.

Generally, we can store the value somewhere beforehands.

## getBoundingClientRect()

This magic function returns in one call the position and the dimension of an element: height, width, top, left, bottom, right.

## Meta viewport

If we want to deal with mobiles (how doesn't?), we should add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in our `<head>`.

That could enable the GPU rasterization on some phone (Androids).

## User reaction time

When a user clicks on a button, we have about 100ms before doing any animation: it's the reaction time.

Therefore, we can prepare anything we need (get sizes, positions…) and have an ugly 100ms frame if we need, he won't notice. ;-)











## Page load time and runtime performance

We have to take care of these 2 metrics.

The page load time is the time to get the initial rendering of the website.
The runtime performance is the performance when the user is navigating on the website.

At loading time, we should ensure to not have too many redirects (or any): each one of them add a noticeable delay.
A real example:

```
example.com --> m.example.com --> m.example.com/start
```

We should also consider gzipping the content the server sends.
It can easily reduce by 80%-90% the size of the js/css files (they are text based, gzip crushes them).



# Misc

## Chrome DevTools <3

In Chrome DevTools, we can press `h` on an element to toggle its visibility. This avoids us to add an extra `display: none` manually.

There is a special page when we want to record low-level events, when we are desperate: `chrome://tracing/`.

There is an option to enable the *continuous painting mode*. Combined to the toggle element visibility trick, it can be used to see which element is causing a slowdown (by hiding some element here and there, and see if that enhances performances). There is also a fps meter available, when we want some numbers, if we are not sure.

## Browser extensions

We have to be careful with our browser extensions: they can have a big impact on the loading time!

We should not forget to disable them when we measure something.
