# Boost.ts

> 🚨 Vulnerabilities found in `compile` and `evaluate`, these functions should not be used until this notice is removed after further testing!

[![Build Status](https://github.com/mathigon/boost.js/workflows/CI%20Tests/badge.svg)](https://github.com/mathigon/boost.js/actions?query=workflow%3A%22CI+Tests%22)
[![npm](https://img.shields.io/npm/v/@mathigon/boost.svg)](https://www.npmjs.com/package/@mathigon/boost)
[![npm](https://img.shields.io/github/license/mathigon/boost.js.svg)](https://github.com/mathigon/boost.js/blob/master/LICENSE)

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


## Components

Importing the webcomponents `<x-modal>`, `<x-popup>`, `<x-icon>`, `<x-alert>` and `<x-select>` works
a bit different from other functions exported by this module. Because they are just static classes
with no side effects, they would usually be removed by tree-shaking. We also want to avoid duplicate
component declarations, or any globally-running code.

* The __types__ can be imported like all other classes from `@mathigon/boost`.
* The actual __code__ is not included in the CJS or ESM bundles. needs to be included using
  something like `import '@mathigon/boost/dist/components.js'`.
* The SCSS styles can be imported in other SCSS files using
  `@import node_modules/@mathigon/boost/src/components/components`.


## Contributing

We welcome community contributions: please file any bugs you find or send us pull requests with
improvements. You can find out more on [Mathigon.io](https://mathigon.io).

Before submitting a pull request, you will need to sign the [Mathigon Individual Contributor
License Agreement](https://gist.github.com/plegner/5ad5b7be2948a4ad073c50b15ac01d39).


## Copyright and License

Copyright © Mathigon ([dev@mathigon.org](mailto:dev@mathigon.org))  
Released under the [MIT license](LICENSE)
