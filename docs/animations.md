# Animations

## Simple Loops

If you want to run a custom animation loop, use the `animate` function which is a wrapper around
`requestAnimationFrame`:

```ts
import {animate, $} from '@mathigon/boost';

const myAnimation = animate((p: number, dt: number) => {
	console.log('progress:', p);  // Progress of the animation (between 0 and 1)
  console.log('dt', dt);  // Time in ms since this callback was run last
}, 2000);  // animation takes 2s

// Cancel the animation when you click the .stop button
$('.stop')!.on('click', () => myAnimation.cancel());

// Wait for the animation to complete
myAnimation.promise.then(() => console.log('done'));
```

If you don't provide second argument for the duration of the animation, it will run forever (or
until `.cancel()` is called). In that case the `p` argument of the callback is not a progress
value between 0 or 1, but instead the total time passed (in ms) since the start of the animation.

## Animating Elements

To animate CSS properties of an individual DOM elements, you can use the following, which is a
wrapper around the WebAnimations API:

```ts
$el.animate(
  {
    transform: 'translate(10px, 10px)',  // End CSS value
    opacity: [0, 1],  // Start and end CSS value
    height: 'auto'
  },
	400,   // Duration (optional)
  1000,  // Delay (optional)
);
```

Note that while normal CSS/Web animations don't support transitions to/from `auto` height values,
we have overridden that behaviour, and automatically calculate the correct absolute value just
before starting the animations.

## Hiding or showing elements

If you want to hide or show an element, there are even a few built-in effects:

```ts
$el.enter('fade', 400);   // 400s fade transition
$el.exit('pop');
$el.enter('draw');  // Can be used with SVG <path> elements
```

## Chaining animations

If you want to chain multiple animations or transitions, it is recommended to use promises with the
async/await syntax:

```ts
await $el.enter('fade').promise;
await $el.animate({background: 'red'}).promise;
await $el.exit('pop').promise;
console.log('done!');
```
