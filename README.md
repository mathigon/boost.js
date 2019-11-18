# Boost.ts

Bost.ts is a library that makes working with browsers easier: everything from
DOM manipulation to web components, event handling, animations, routing,
multi-threading and AJAX requests. It was developed for
[Mathigon.org](https://mathigon.org), an award-winning mathematics education
project.

[![npm](https://img.shields.io/npm/v/@mathigon/boost.svg)](https://www.npmjs.com/package/@mathigon/boost)
[![npm](https://img.shields.io/github/license/mathigon/boost.js.svg)](https://github.com/mathigon/boost.js/blob/master/LICENSE)


## Features

* AJAX utilities
* Advanced animations and transitions
* Browser load and resize events, Cookies and Local Storage, Keyboard events
* Draggable elements
* DOM Element Utilities: classes, dimensions, scrolling, styling,
  DOM manipulation, events, animations, SVG and Canvas tools
* Events: click, slide, scroll, hover, intersection, pointer and mouse events
* Router for single-page sites
* Template and expression parsing
* Multi-threading using WebWorkers
* Custom webcomponents wrapper


## Usage

First, install Boost.ts from [NPM](https://www.npmjs.com/package/@mathigon/boost)
using

```npm install @mathigon/boost```

We recommend using Boost.ts together with [Rollup](https://rollupjs.org/), using
using the [rollup-plugin-node-resolve](https://github.com/rollup/rollup-plugin-node-resolve)
plugin.

Now, simply import all functions and classes you need, using

```js
import {$, CustomElement, Browser} from '@mathigon/boost'
```


## Contributing

We welcome community contributions: please file any bugs you find or send us
pull requests with improvements. You can find out more on
[Mathigon.io](https://mathigon.io).

Before submitting a pull request, you will need to sign the [Mathigon Individual
Contributor License Agreement](https://gist.github.com/plegner/5ad5b7be2948a4ad073c50b15ac01d39).


## Copyright and License

Copyright © Mathigon ([dev@mathigon.org](mailto:dev@mathigon.org))  
Released under the [MIT license](LICENSE)
