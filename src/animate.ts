// =============================================================================
// Boost.js | Animations
// (c) Mathigon
// =============================================================================


import {defer, delay, total, toCamelCase, Obj} from '@mathigon/core';
import {ElementView, HTMLView, SVGView} from './elements';
import {Browser} from './browser';


// Prevent animations on page load.
let isReady = false;
setTimeout(() => isReady = true);

const BOUNCE_IN = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
const BOUNCE_OUT = 'cubic-bezier(0.68, -0.275, 0.825, 0.115)';


// -----------------------------------------------------------------------------
// Simple Animations

export type AnimationCancel = () => void;
export type AnimationCallback = (p: number, dt: number, cancel: AnimationCancel) => void;
export type AnimationResponse = {cancel: AnimationCancel, promise: Promise<void>};

export const ResolvedAnimation = {cancel: () => undefined, promise: Promise.resolve()};


/**
 * Runs an animation. If no duration is provided, the animation will run
 * indefinitely, and call `callback` with the time since start as first
 * argument. If a duration is provided, the first callback argument is instead
 * the proportion of the duration passed (between 0 and 1). The second callback
 * argument is the time difference since the last animation frame, and the
 * third callback argument is a `cancel()` function to stop the animation.
 */
export function animate(callback: AnimationCallback, duration?: number): AnimationResponse {

  if (duration === 0) {
    callback(1, 0, () => undefined);
    return ResolvedAnimation;
  }

  const startTime = Date.now();
  const deferred = defer<void>();

  let lastTime = 0;
  let running = true;

  const cancel = () => {
    running = false;
    deferred.reject();
  };

  function getFrame() {
    if (running && (!duration || lastTime <= duration)) {
      window.requestAnimationFrame(getFrame);
    }

    const time = Date.now() - startTime;
    callback(duration ? Math.min(1, time / duration) : time, time - lastTime, cancel);
    if (duration && time >= duration) deferred.resolve();
    lastTime = time;
  }

  getFrame();
  return {cancel, promise: deferred.promise};
}


// -----------------------------------------------------------------------------
// Easing

function easeIn(type: string, t = 0, s = 0) {
  switch (type) {
    case 'quad':
      return t ** 2;

    case 'cubic':
      return t ** 3;

    case 'quart':
      return t ** 4;

    case 'quint':
      return t ** 5;

    case 'circ':
      return 1 - Math.sqrt(1 - t ** 2);

    case 'sine':
      return 1 - Math.cos(t * Math.PI / 2);

    case 'exp':
      return (t <= 0) ? 0 : Math.pow(2, 10 * (t - 1));

    case 'back':
      if (!s) s = 1.70158;
      return t * t * ((s + 1) * t - s);

    case 'elastic':
      if (!s) s = 0.3;
      return -Math.pow(2, 10 * (t - 1)) *
             Math.sin(((t - 1) * 2 / s - 0.5) * Math.PI);

    case 'swing':
      return 0.5 - Math.cos(t * Math.PI) / 2;

    case 'spring':
      return 1 - (Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6));

    case 'bounce':
      if (t < 1 / 11) return 1 / 64 - 7.5625 * (0.5 / 11 - t) * (0.5 / 11 - t);  // 121/16 = 7.5625
      if (t < 3 / 11) return 1 / 16 - 7.5625 * (2 / 11 - t) * (2 / 11 - t);
      if (t < 7 / 11) return 1 / 4 - 7.5625 * (5 / 11 - t) * (5 / 11 - t);
      return 1 - 7.5625 * (1 - t) * (1 - t);

    default:
      return t;
  }
}

/**
 * Applies an easing function to a number `t` between 0 and 1. Options include
 * `quad`, `cubic`, `quart`, `quint`, `circ`, `sine`, `exp`, `back`, `elastic`,
 * `swing`, `spring` and `bounce`, optionally followed by `-in` or `-out`. The
 * `s` parameter is only used by `back` and `elastic` easing.
 */
export function ease(type: string, t = 0, s = 0) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const [name, direction] = type.split('-');

  if (direction === 'in') return easeIn(name, t, s);
  if (direction === 'out') return 1 - easeIn(name, 1 - t, s);
  if (t <= 0.5) return easeIn(name, 2 * t, s) / 2;
  return 1 - easeIn(name, 2 * (1 - t), s) / 2;
}


// -----------------------------------------------------------------------------
// Element Animations

type AnimationValue = string|number;
export type AnimationProperties = Obj<AnimationValue|AnimationValue[]>;


export function transition($el: ElementView, properties: AnimationProperties,
    duration = 400, _delay = 0,
    easing = 'ease-in-out'): AnimationResponse {

  // Don't play animations while the page is loading.
  if (!isReady) {
    Object.keys(properties).forEach(k => {
      const p = properties[k];
      $el.css(k, Array.isArray(p) ? p[1] : p);
    });
    return ResolvedAnimation;
  }

  if (easing === 'bounce-in') easing = BOUNCE_IN;
  if (easing === 'bounce-out') easing = BOUNCE_OUT;

  let oldTransition = '';
  if (Browser.isSafari) {
    oldTransition = $el._el.style.transition;
    $el.css('transition', 'none');
    Browser.redraw();
  }

  // Cancel any previous animations
  const currentAnimation = $el._data['animation'];
  if (currentAnimation) (currentAnimation as AnimationResponse).cancel();

  const to: Keyframe = {};
  const from: Keyframe = {};
  const deferred = defer<void>();

  const style = window.getComputedStyle($el._el);
  Object.keys(properties).forEach((k) => {
    const p = properties[k];
    const k1 = toCamelCase(k);
    from[k1] = Array.isArray(p) ? p[0] : style.getPropertyValue(k);
    to[k1] = Array.isArray(p) ? p[1] : p;
    // Set initial style, for the duration of the delay.
    if (_delay) $el.css(k, from[k1]!);
  });

  // Special rules for animations to height: auto
  const oldHeight = to.height;
  if (to.height === 'auto') {
    to.height =
        total($el.children.map($c => ($c as HTMLView).outerHeight)) + 'px';
  }

  let player: Animation;
  let cancelled = false;

  delay(() => {
    if (cancelled) return;

    player = $el._el.animate([from, to], {duration, easing, fill: 'forwards'});
    player.onfinish = () => {
      if ($el._el) {
        Object.keys(properties).forEach(k => $el.css(k, k === 'height' ? oldHeight! : to[k]!));
      }
      if (Browser.isSafari) $el.css('transition', oldTransition);
      deferred.resolve();
      player.cancel();  // bit ugly, but needed for Safari...
    };
  }, _delay);

  const animation = {
    cancel() {
      cancelled = true;
      if ($el._el) Object.keys(properties).forEach(k => $el.css(k, $el.css(k)));
      if (player) player.cancel();
    },
    promise: deferred.promise,
  };

  // Only allow cancelling of animation in next thread.
  setTimeout(() => $el._data['animation'] = animation);
  return animation;
}


// -----------------------------------------------------------------------------
// Element CSS Animations Effects

// When applying the 'pop' effect, we want to respect all existing transform
// except scale. To do that, we have to expand the matrix() notation.
const CSS_MATRIX = /matrix\([0-9.\-\s]+,[0-9.\-\s]+,[0-9.\-\s]+,[0-9.\-\s]+,([0-9.\-\s]+),([0-9.\-\s]+)\)/;

export function enter($el: ElementView, effect = 'fade', duration = 500,
    _delay = 0): AnimationResponse {

  $el.show();
  if (!isReady) return ResolvedAnimation;
  const opacity = (+$el.css('opacity')!) || 1;

  if (effect === 'fade') {
    return transition($el, {opacity: [0, opacity]}, duration, _delay);

  } else if (effect === 'pop') {
    const transform = $el.transform.replace(/scale\([0-9.]*\)/, '')
        .replace(CSS_MATRIX, 'translate($1px,$2px)');

    // TODO Merge into one transition.
    transition($el, {opacity: [0, opacity]}, duration, _delay);
    return transition($el, {
      transform: [transform + ' scale(0.5)', transform + ' scale(1)'],
    }, duration, _delay, 'bounce-in');

  } else if (effect === 'descend') {
    const rules = {opacity: [0, 1], transform: ['translateY(-50%)', 'none']};
    return transition($el, rules, duration, _delay);

  } else if (effect.startsWith('draw')) {
    const l = ($el as SVGView).strokeLength;
    $el.css('stroke-dasharray', l + 'px');
    if (!$el.css('opacity')) $el.css('opacity', 1);
    // Note that Safari can't handle negative dash offsets!
    const end = (effect === 'draw-reverse') ? 2 * l + 'px' : 0;
    const rules = {'stroke-dashoffset': [l + 'px', end]};
    const animation = transition($el, rules, duration, _delay, 'linear');
    animation.promise.then(() => $el.css('stroke-dasharray', ''));
    return animation;

  } else if (effect.startsWith('slide')) {
    const rules = {opacity: [0, opacity], transform: ['translateY(50px)', 'none']};
    if (effect.includes('down')) rules.transform[0] = 'translateY(-50px)';
    if (effect.includes('right')) rules.transform[0] = 'translateX(-50px)';
    if (effect.includes('left')) rules.transform[0] = 'translateX(50px)';
    return transition($el, rules, duration, _delay);

  } else if (effect.startsWith('reveal')) {
    const rules: AnimationProperties = {opacity: [0, opacity], height: [0, 'auto']};
    if (effect.includes('left')) rules.transform = ['translateX(-50%)', 'none'];
    if (effect.includes('right')) rules.transform = ['translateX(50%)', 'none'];
    return transition($el, rules, duration, _delay);
  }

  return ResolvedAnimation;
}

export function exit($el: ElementView, effect = 'fade', duration = 400,
    delay = 0, remove = false): AnimationResponse {
  if (!$el._el) return ResolvedAnimation;

  if (!isReady) {
    $el.hide();
    return ResolvedAnimation;
  }
  if ($el.css('display') === 'none') return ResolvedAnimation;

  let animation: AnimationResponse;

  if (effect === 'fade') {
    animation = transition($el, {opacity: [1, 0]}, duration, delay);

  } else if (effect === 'pop') {
    const transform = $el.transform.replace(/scale\([0-9.]*\)/, '');

    transition($el, {opacity: [1, 0]}, duration, delay);
    animation = transition($el, {
      transform: [transform + ' scale(1)', transform + ' scale(0.5)'],
    }, duration, delay, 'bounce-out');

  } else if (effect === 'ascend') {
    const rules = {opacity: [1, 0], transform: ['none', 'translateY(-50%)']};
    animation = transition($el, rules, duration, delay);

  } else if (effect.startsWith('draw')) {
    const l = ($el as SVGView).strokeLength;
    $el.css('stroke-dasharray', l);
    const start = (effect === 'draw-reverse') ? 2 * l + 'px' : 0;
    const rules = {'stroke-dashoffset': [start, l + 'px']};
    animation = transition($el, rules, duration, delay, 'linear');

  } else if (effect.startsWith('slide')) {
    const rules = {opacity: 0, transform: 'translateY(50px)'};
    if (effect.includes('up')) rules.transform = 'translateY(-50px)';
    animation = transition($el, rules, duration, delay);

  } else if (effect.startsWith('reveal')) {
    const rules: AnimationProperties = {opacity: 0, height: 0};
    if (effect.includes('left')) rules.transform = 'translateX(-50%)';
    if (effect.includes('right')) rules.transform = 'translateX(50%)';
    animation = transition($el, rules, duration, delay);
  }

  animation!.promise.then(() => remove ? $el.remove() : $el.hide());
  return animation!;
}
