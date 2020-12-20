# Events

## Overview

TODO…

## Slide Events

The `slide()` function is a useful utility for listening to pointer event gestures, e.g. to make
an element draggable:

```ts
import {Point} from '@mathigon/fermat';
import {slide, $} from '@mathigon/boost';

const $target = $('.my-element');
slide($target, {
  down: (posn: Point) => {
    // Executed on mouse/touch/pointerdown
  },
  start: (posn: Point) => {
    // Executed just before starting to move the pointer
  },
  move: (posn: Point, start: Point, last: Point) => {
    // Executed on every frame while sliding, including outside of the original $target.
    // You can always access the start position of the gesture, and the last position
    // with which the move() function was called as arguments of this function.
    const distance = Point.distance(posn, last);
  },
  end: (posn: Point) => {
    // Executed on mouse/touch/pointerup, after a sliding gesture.
  },
  click: (posn: Point) => {
    // Executed on mouse/touch/pointerup, if there was no sliding gesture and the
    // user simply clicked.
  }
});
```

If `$target` is a simple HTML element, the `posn` values will always be pixel distanced from the
top-left corner of the browser. if `$target` is an SVG or CANVAS element, the `posn` values will be
in the coordinate system of that element. This includes automatically inverting any transformations
applied to the element (e.g. scaling).

## Attributes

You can watch changes to element attributes using the `.onAttr()` method:

```ts
import {slide, $} from '@mathigon/boost';

const $target = $('.my-element');
$target.onAttr('style', (style: string) => {
  console.log(style);
});
```

The callback is executed once immediately when binding the event listener, with the current value of
the corresponding attribute. In that case, a second `initial: boolean` parameter is passed to the
callback with value `true`.

## Other event types

TODO…

## Draggable elements

TODO…
