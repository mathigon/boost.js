# Boost.js

Bost.js is a library that makes working with browsers easier: everything from
DOM manipulation to web components, event handling, animations, routing,
multi-threading and AJAX requests. It was developed for
[Mathigon.org](https://mathigon.org), an award-winning mathematics education
project.

[![npm](https://img.shields.io/npm/v/@mathigon/boost.svg)](https://www.npmjs.com/package/@mathigon/boost)
[![npm](https://img.shields.io/github/license/mathigon/boost.js.svg)](https://github.com/mathigon/boost.js/blob/master/LICENSE)


## Features

* AJAX utilities
* Advanced animations and transitions
* Audio and Speech Recognition utilities
* Browser load and resize events, Cookies and Local Storage, Keyboard events
* Colour utilities, gradients and interpolation
* Draggable elements
* DOM Element Utilities: classes, dimensions, scrolling, styling,
  DOM manipulation, events, animations, cursors, SVG and Canvas tools
* Events: click, slide, scroll, hover, intersection, pointer and mouse events
* Router for single-page sites
* Template and expression parsing
* Multi-threading using WebWorkers
* Custom webcomponents wrapper


## Usage

First, install boost.js from [NPM](https://www.npmjs.com/package/@mathigon/boost)
using

```npm install @mathigon/boost --save```

Boost.js uses [ES6 imports](http://2ality.com/2014/09/es6-modules-final.html).
While some browsers and platforms now support this feature, we recommend using
a transpiler such as [Babel](http://babeljs.io/) or [Rollup](https://rollupjs.org/). 
Make sure that you configure your compiler to correctly resolve these imports.
For Rollup, we recommend using the
[rollup-plugin-node-resolve](https://github.com/rollup/rollup-plugin-node-resolve)
plugin.

Now, simply import all functions and classes you need, using

```js
import { $,  } from '@mathigon/boost'
```


## Contributing

We welcome community contributions: please file any bugs you find or send us
pull requests with improvements. You can find out more on
[Mathigon’s contributions page](https://mathigon.org/contribute).


## Copyright and License

Copyright © Mathigon ([dev@mathigon.org](mailto:dev@mathigon.org))  
Released under the [MIT license](LICENSE)
