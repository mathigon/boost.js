# Elements

This library comes with a custom wrapper around native DOM element classes, that should make
working with the DOM much easier. It is our convention that all the name of a variable that holds
such a DOM element wrapper always starts with a `$` symbol.

Much of the syntax may be similar to popular libraries like jQuery, but there are a number of
important differences.

## Selecting elements

The `$` and `$$` functions can be used to select one or more DOM elements using a CSS query string:

```ts
import {$, $$, $N} from '@mathigon/boost';

// Select the first element with ID my-element. The ! is required to tell
// Typescript that this element cannot be undefined.
const $el = $('#my-element')!;

// Selects an array of ALL elements that match the .my-class selector.
const $els = $$('.my-class');
````

Once you have selected an element, you can use the `.$` and `.$$` methods to select further elements
that are children of the existing one:

```ts
// Selects one child of $el that matches the .child selector.
const $child = $el.$('.child');
```

## Creating elements

```ts
// Creates a new <button> element with the specified attributes, and appends it to
// the $el element.
const $btn = $N('button', {
  class: 'btn-red',
  text: 'Button Label',
  style: 'background: red'
}, $el);
```

TODO…

## Different element types

TODO…

## Methods and properties

TODO…

## SVG and Canvas drawing

TODO…
