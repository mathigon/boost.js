# Boost.ts

[![Build Status](https://travis-ci.org/mathigon/boost.js.svg?branch=master)](https://travis-ci.org/mathigon/boost.js)
[![npm](https://img.shields.io/npm/v/@mathigon/boost.svg)](https://www.npmjs.com/package/@mathigon/boost)
[![npm](https://img.shields.io/github/license/mathigon/boost.js.svg)](https://github.com/mathigon/boost.js/blob/master/LICENSE)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmathigon%2Fboost.js.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmathigon%2Fboost.js?ref=badge_shield)

Bost.ts is a library that makes working with browsers easier: everything from DOM manipulation to
web components, event handling, animations, routing, multi-threading and AJAX requests. It was
developed for [Mathigon.org](https://mathigon.org), an award-winning mathematics education project.


## Features

* [DOM elements](docs/elements.md): selection, creation, manipulation, and styling
* [SVG and Canvas drawing](docs/elements.md#svg-and-canvas-drawing)
* [Event handling](docs/events.md): gestures, pointers, scroll, hover, intersections, draggable
  elements, and more
* [Animations and transitions](docs/animations.md)
* [Custom web components](docs/webcomponents.md)
* [Template and observables](docs/webcomponents.md#templates-models-and-observables)
* AJAX utilities
* Browser load and resize events, Cookies and Local Storage, Keyboard events
* Router for single-page sites
* Multi-threading using WebWorkers


## Usage

First, install Boost.ts from [NPM](https://www.npmjs.com/package/@mathigon/boost)
using

```
npm install @mathigon/boost
```

Now, simply import all functions and classes you need, using

```js
import {$, CustomElement, Browser} from '@mathigon/boost'
```


## Contributing

We welcome community contributions: please file any bugs you find or send us pull requests with
improvements. You can find out more on [Mathigon.io](https://mathigon.io).

Before submitting a pull request, you will need to sign the [Mathigon Individual Contributor
License Agreement](https://gist.github.com/plegner/5ad5b7be2948a4ad073c50b15ac01d39).


## Copyright and License

Copyright © Mathigon ([dev@mathigon.org](mailto:dev@mathigon.org))  
Released under the [MIT license](LICENSE)


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmathigon%2Fboost.js.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmathigon%2Fboost.js?ref=badge_large)