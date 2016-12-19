title: #perfmatters
link: https://www.ctheu.com/2015/03/01/perfmatters/
author: ctheu
description: 
post_id: 883
created: 2015/03/01 23:48:39
created_gmt: 2015/03/01 23:48:39
comment_status: open
post_name: perfmatters
status: publish
post_type: post

# #perfmatters

## Goal : be jank-free at 60fps

Jank is when missed frame appears when navigating a website, you don’t want that. <http://jankfree.org/> You can find a lot of talks and articles from Paul Lewis, Tom Wiltzius and Nat Duca, who are great speakers btw, that explain clearly how to avoid jank, how to diagnose it, and how to fix it. Check the resources at the end of this post to have some pointers. I decided to resume quickly everything I learned from a lot of different sources in order to not do those mistakes again and help you and me to understand what can cause this jank. I don’t explain in details everything, every term I use, check out the resources of the post to have a better understanding if needed. I’ll start with general javascript concepts and then I’ll continue with deeper concepts such as the layout/painting/layers processes the browser do and how to optimize them, then I’ll finish with some network advices. Some of the items are maybe not relevant anymore nowadays for certain browsers because it was optimized since. I tried to filter them but still. Feel free to correct me if I’m wrong. 

## Object instances

If you have a bunch of object to create, forget about module pattern, prototypes are faster to create, or create plain simple object. <http://jsperf.com/prototypal-performance/55>

## Holey array

Don’t do holey array (it can be converted to a dictionary internally thus being way slower). Try to not use the `delete` keyword. It can change on the fly the internal class being used for the object you just deleted from (for instance, an array with a `delete` in the middle can transform it into a map). <http://jsperf.com/packed-vs-holey-arrays>

## Objects pooling

If you are creating and destructing a lot of objects/references, consider using an object pool to avoid triggering the Garbage Collector (which would make you lose some precious ms at random times). Check <http://www.html5rocks.com/en/tutorials/speed/static-mem-pools/> for more details. 

## Image resizing

Resize your image exactly as the size you are using in your page (we are not talking about multi-support here) to avoid the browser to resize the image itself (cpu consuming). Consider using `srcset` on `<img>` or use `<picture>` if you want to handle high DPI devices. 

## Background-size

Beware of `background-size`, keep the image at the original size instead of asking the browser to resize on the fly. Create multiple version of the same image if needed. You can also create a spritesheet image of your images to do only one HTTP request (and maybe have a faster memory access but don’t take this into consideration, that’s way too insignificant to be considered). 

## CSS gradients

Beware of repeating gradients. That slows down a lot the browser rendering. For instance, if you put it on the background of your page in which you can scroll. Prefer to use a tiled background image. 

## Custom fonts instead of image

Don’t forget that you can use nice custom fonts instead of images to draw symbolish things. Such as FontAwesome. You will save bandwidth and designer time. <http://fortawesome.github.io/Font-Awesome/icons/> Or you can use unicode characters (it has a lot of icons, not only characters) or svg (light and scalable). 

## Image lazy loading

Consider using an image lazy loading plugin to load images only if the user can see them of if everything else has been loaded first. If by default the image is not displayed in the first view at loading time, you can defer its request when the user is scrolling into for instance. If you have a carousel of images, consider to not load every images of the carousel at the beginning. Either wait the user to hover it or load them after everything else is loaded. If the user does not even use the carousel, it's useless to load the other images. 

## Event listeners

Try to not bind event listeners on the whole document just to handle the event on a deep child. Try to bind listeners on the element you need or a nearest parent. Otherwise the `compositor` (a thread dedicated to handle inputs and scrolling) will be triggered for nothing each time the event will happen on the page, that could have no link with your element. 

## Memory management / variable scoping

Try to not use global variables. Release what you can when you can. With ES6, use only `let`, no more `var`. Remove the event listeners you don’t need. Be especially careful with closures, they can contain a lot of references that will never be released if you are careless. 

## Events throttling

Throttle the events that can be called numerous times : `onscroll`, `onmousemove`, `onresize`, `ondragover`. They will be called only a few times and that will be enough. 

## requestAnimationFrame() is your best friend

Do not use `setTimeout()` or `setInterval()` to throttle event handlers such as `onscroll` or `onresize`. Use `requestAnimationFrame()` to only change the visual state when a new frame is going to be rendered, to not compute things that won’t be render in-between 2 frames. Check <http://www.html5rocks.com/en/tutorials/speed/animations/> for more details. 

## Event handlers logic

Don’t do any complex logic in the event handlers. Just save somewhere the values which you care of the current state (`scrollTop`, mouse position…), and let the browser pursues its events pipeline. If you are doing something heavy in a handlers, you will delay every other events to be handle and will delay the rendering (then you call a `requestAnimationFrame(fn)` to use those saved values). Try to bind global events only once, such as `onscroll` or `mousemove`. Just save their positions in those handlers and when you need them, just call functions in `requestAnimationFrame()` using those saved values. 

## :hover and scrolling

Be careful with `:hover` effect on elements in the middle of a scrollable page. If the user scrolls using its mousewheel on top of those elements, they will trigger the `:hover` at the same time the scrolling is occurring. That can slow down dramatically the fps and you end with jank (missed frames during scrolling becausee of a lot of restyle/paint/composite layers operations). You can for instance add a class on the container when it’s scrolling to not trigger the `:hover` effect while it’s present. 

## Dynamic class adds

Don’t add classes on top of your document if that only change an item deep in the DOM (that could cause a full repainting from the parent). Try to target specifically the element or a near parent. 

## Avoid Layout Trashing

When you need to read some positions or sizes from the DOM (`.offsetTop`, `.offsetWidth` …), don’t alternate them with writes of positions or sizes on the DOM (`element.style.width = width`). That would cause what is called “Layout Trashing” because each time you change a size or position on the DOM, that triggers a forced synchronous layout (painting). Do all your readings at the beginning, store them into variables, then do your writings. You can call a `requestAnimationFrame()` to read those values, then inside, call another `requestAnimationFrame()` to write your transformations. To know if have to kind of cycles, check your timeline in the debugger and look for cycles of : \- recalculate style \- layout

## Comments

**[Stephane D](#8 "2015-03-26 17:05:00"):** Hi Newell, Yes, Google has been a great part of my inspiration and I know a lot about webperf thanks to them. :-) Their teams are really pushing hard to make everyone understands and deals with their apps performance (such as the tremendous work on the Chrome DevTools).

**[Newell Stark](#7 "2015-03-26 16:28:00"):** ctjeu, Liked your summary "tricks" to improve browser side speed have you seen https://developers.google.com/speed/pagespeed/module ?

