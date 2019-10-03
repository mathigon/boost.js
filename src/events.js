// =============================================================================
// Boost.js | DOM Events
// (c) Mathigon
// =============================================================================



import { without, delay , words} from '@mathigon/core';
import { Point } from '@mathigon/fermat';
import * as Elements from './elements';
import {Browser} from "./browser";


// -----------------------------------------------------------------------------
// Utilities

const touchSupport = ('ontouchstart' in window);
const pointerSupport = ('onpointerdown' in window);

/**
 * Gets the pointer position from an event.
 * @param {Event} e
 * @returns {Point}
 */
export function pointerPosition(e) {
  if ('touches' in e) {
    const touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    return new Point(touches[0].clientX, touches[0].clientY);
  } else {
    return new Point(e.clientX, e.clientY);
  }
}

/**
 * Gets the pointer position from an event triggered on an `<svg>` element, in
 * the coordinate system of the `<svg>` element.
 * @param {Event} event
 * @param {SVGElement} $svg
 * @returns {Point}
 */
export function svgPointerPosn(event, $svg) {
  const posn = pointerPosition(event);
  return posn.transform($svg.inverseTransformMatrix);
}

/**
 * Gets the pointer position from an event triggered on an `<canvas>` element,
 * in the coordinate system of the `<canvas>` element.
 * @param {Event} event
 * @param {SVGElement} $canvas
 * @returns {Point}
 */
export function canvasPointerPosition(event, $canvas) {
  const posn = pointerPosition(event);
  const bounds = $canvas.bounds;

  const x = (posn.x - bounds.left) * $canvas.canvasWidth / bounds.width;
  const y = (posn.y - bounds.top) * $canvas.canvasHeight / bounds.height;
  return new Point(x, y);
}

/**
 * Get the target element for an event, including for touch/pointer events
 * that started on a different element.
 * @param {Event} event
 * @returns {Element}
 */
export function getEventTarget(event) {
  // Only pointer mouse events update the target for move events that started
  // on a different element.
  if (event.pointerType === 'mouse') return Elements.$(event.target);
  const posn = pointerPosition(event);
  return Elements.$(document.elementFromPoint(posn.x, posn.y));
}


// -----------------------------------------------------------------------------
// Click Events

function makeClickEvent($el) {
  if ($el._events._click) return;
  $el._events._click = true;

  if (!navigator.userAgent.match(/iP(ad|hone|od)/g)) {
    $el._el.addEventListener('click', function(e) { $el.trigger('click', e); });
    return;
  }

  let start;

  $el._el.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) start = pointerPosition(e);
  });

  $el._el.addEventListener('touchend', function(e){
    if (!start) return;
    const end = pointerPosition(e);
    if (Math.abs(end.x - start.x) < 5 && Math.abs(end.y - start.y) < 5) {
      $el.trigger('click', e);
    }
    start = null;
  });

  $el._el.addEventListener('touchcancel', function() { start = null; });
}

function makeClickOutsideEvent($el) {
  if ($el._events._clickOutside) return;
  $el._events._clickOutside = true;

  Elements.$body.on('pointerdown', function(e) {
    const $target = Elements.$(e.target);
    if ($target.equals($el) || $target.hasParent($el)) return;
    $el.trigger('clickOutside', e);
  });
}


// -----------------------------------------------------------------------------
// Slide Events

/**
 * @param {Element} $el
 * @param {{start: Function?, move: Function?, end: Function?}} fns
 */
export function slide($el, fns) {
  let isAnimating = false;

  let posn = pointerPosition;
  if ($el.tagName === 'SVG') {
    posn = (e) => svgPointerPosn(e, $el);
  } else if ($el.tagName === 'CANVAS') {
    posn = (e) => canvasPointerPosition(e, $el);
  } else if ($el instanceof Elements.SVGElement) {
    const $svg = $el.parents('svg')[0];
    posn = (e) => svgPointerPosn(e, $svg);
  }

  const $parent = fns.justInside ? $el : Elements.$body;

  let startPosn, lastPosn;

  if ($el.css('touch-action') === 'auto') $el.css('touch-action', 'none');

  function start(e) {
    e.preventDefault();
    if(e.handled || (e.touches && e.touches.length > 1)) return;
    e.handled = true;

    if ('move' in fns) $parent.on('pointermove', move);
    $parent.on('pointerstop', end);
    startPosn = lastPosn = posn(e);
    if ('start' in fns) fns.start(startPosn);
  }

  function move(e) {
    e.preventDefault();
    if(isAnimating) return;
    isAnimating = true;

    window.requestAnimationFrame(function() {
      if(!isAnimating) return;
      const p = posn(e);
      fns.move(p, startPosn, lastPosn);
      lastPosn = p;
      isAnimating = false;
    });
  }

  function end(e) {
    e.preventDefault();
    if(e.touches && e.touches.length > 0) return;
    isAnimating = false;

    if ('move' in fns) $parent.off('pointermove', move);
    $parent.off('pointerstop', end);

    if ('end' in fns) fns.end(lastPosn, startPosn);
  }

  $el.on('pointerdown', start);
  if (fns.justInside) $el.on('mouseleave', end)
}


// -----------------------------------------------------------------------------
// Scroll Events

function makeScrollEvents($el) {
  if ($el._data._scrollEvents) return;
  $el._data._scrollEvents = true;

  let ticking = false;
  let top = null;

  function tick() {
    const newTop = $el.scrollTop;
    if (newTop === top) { ticking = false; return; }

    top = newTop;
    $el.trigger('scroll', { top });
    // TODO Scroll should trigger mousemove events.
    window.requestAnimationFrame(tick);
  }

  function scroll() {
    if (!ticking) window.requestAnimationFrame(tick);
    ticking = true;
  }

  // Mouse Events
  const target = $el instanceof Elements.WindowElement ? window : $el._el;
  target.addEventListener('scroll', scroll);

  // Touch Events
  function touchStart() {
    window.addEventListener('touchmove', scroll);
    window.addEventListener('touchend', touchEnd);
  }
  function touchEnd() {
    window.removeEventListener('touchmove', scroll);
    window.removeEventListener('touchend', touchEnd);
  }

  $el._el.addEventListener('touchstart', function(e) {
    if (!e.handled) touchStart();
  });
}


// -----------------------------------------------------------------------------
// Hover Events

function makeHoverEvent($el, options) {
  let timeout = null;
  let active = false;
  let wasTriggeredByMouse = false;

  $el.on('mouseover', () => {
    if (options.preventMouseover && options.preventMouseover()) return;
    clearTimeout(timeout);
    timeout = delay(() => {
      if (active) return;
      options.enter();
      wasTriggeredByMouse = true;
      active = true;
    }, options.delay);
  });

  $el.on('mouseout', () => {
    if (!wasTriggeredByMouse) return;
    clearTimeout(timeout);
    timeout = delay(() => {
      if (!active) return;
      if (options.exit) options.exit();
      active = false;
    }, options.exitDelay || options.delay);
  });

  const $clickTarget = options.$clickTarget || $el;
  $clickTarget.on('click', () => {
    if (active && (!wasTriggeredByMouse)) {
      if (options.exit) options.exit();
      active = false;
    } else if (!active) {
      options.enter();
      wasTriggeredByMouse = false;
      active = true;
    }
  });

  $el.on('clickOutside', () => {
    if (!active) return;
    if (options.exit) options.exit();
    active = false;
  });
}


// -----------------------------------------------------------------------------
// Intersection Events

let observer;

function intersectionCallback(entries) {
  for (const e of entries) {
    const event = e.isIntersecting ? 'enterViewport' : 'exitViewport';
    setTimeout(() => Elements.$(e.target).trigger(event));
  }
}

function makeIntersectionEvents($el) {
  if ($el._data.intersectionEvents) return;
  $el._data.intersectionEvents = true;

  // Polyfill for window.IntersectionObserver
  if (!window.IntersectionObserver) {
    let wasVisible = false;
    Elements.$body.on('scroll', () => {
      const isVisible = $el.isInViewport;
      if (wasVisible && !isVisible) {
        $el.trigger('exitViewport');
        wasVisible = false;
      } else if (isVisible && !wasVisible) {
        $el.trigger('enterViewport');
        wasVisible = true;
      }
    });
    return;
  }

  if (!observer) observer = new IntersectionObserver(intersectionCallback);
  observer.observe($el._el);
}


// -----------------------------------------------------------------------------
// Pointer Events

function makePointerPositionEvents(element) {
  if (element._data._pointerPositionEvents) return;
  element._data._pointerPositionEvents = true;

  const parent = element.parent;
  let isInside = null;

  parent.on('pointerend', () => isInside = null);

  parent.on('pointermove', (e) => {
    const wasInside = isInside;
    const target = getEventTarget(e);
    isInside = target.equals(element) || target.hasParent(element);
    if (wasInside != null && isInside && !wasInside) element.trigger('pointerenter', e);
    if (!isInside && wasInside) element.trigger('pointerleave', e);
  });
}


// -----------------------------------------------------------------------------
// Mouse Events
// On touch devices, mouse events are emulated. We don't want that!

function makeMouseEvent(eventName, $el) {
  if ($el._events['_' + eventName]) return;
  $el._events['_' + eventName] = true;

  if (pointerSupport) {
    $el.on(event, (e) => {
      if (e.pointerType === 'mouse') $el.trigger(eventName, e);
    })
  } else if (!touchSupport) {
    $el._el.addEventListener(eventName, (e) => $el.trigger(eventName, e));
  }
}


// -----------------------------------------------------------------------------
// Keyboard Events

function makeKeyEvent($el) {
  // On Android, the keydown event always returns character 229, except for the
  // backspace button which works as expected. Instead, we have to listen to the
  // input event and get the last character of the typed text. Note that this
  // only works if the cursor is at the end, or if the input field gets cleared
  // after every key.

  // Note that e.keyCode is deprecated, but iOS doesn't support e.key yet.

  $el.on('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    if (Browser.isAndroid && e.keyCode === 229) return;

    const key = (e.key || String.fromCharCode(e.which)).toLowerCase();
    $el.trigger('key', {code: e.keyCode, key});
  });

  if (Browser.isAndroid) {
    $el.on('input', (e) => {
      const key = e.data[e.data.length - 1].toLowerCase();
      $el.trigger('key', {code: null, key});
      $el.value = '';
    });
  }
}


// -----------------------------------------------------------------------------
// Event Creation

const aliases = {
  change: 'propertychange keyup input paste',
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerdown: pointerSupport ? 'pointerdown' : touchSupport ? 'touchstart' : 'mousedown',
  pointermove: pointerSupport ? 'pointermove' : touchSupport ? 'touchmove' : 'mousemove',
  pointerup: pointerSupport ? 'pointerup' : touchSupport ?  'touchend' : 'mouseup',
  pointercancel: pointerSupport ? 'pointercancel' : 'touchcancel',
  pointerstop: pointerSupport ? 'pointerup pointercancel' : touchSupport ? 'touchend touchcancel' : 'mouseup'
};

const customEvents = {
  scroll: makeScrollEvents,
  hover: makeHoverEvent,
  click: makeClickEvent,
  clickOutside: makeClickOutsideEvent,
  key: makeKeyEvent,

  mousedown: makeMouseEvent.bind(null, 'mousedown'),
  mousemove: makeMouseEvent.bind(null, 'mousemove'),
  mouseup: makeMouseEvent.bind(null, 'mouseup'),

  pointerenter: makePointerPositionEvents,
  pointerleave: makePointerPositionEvents,

  enterViewport: makeIntersectionEvents,
  exitViewport: makeIntersectionEvents
};

export function createEvent($el, event, fn, options) {
  if (event in $el._events) {
    if ($el._events[event].indexOf(fn) < 0) $el._events[event].push(fn);
  } else {
    $el._events[event] = [fn];
  }

  if (event in aliases) {
    const events = words(aliases[event]);
    // Note that the mouse event aliases don't pass through makeMouseEvent()!
    for (let e of events)  $el._el.addEventListener(e, fn, options);
  } else if (event in customEvents) {
    customEvents[event]($el, fn);
  } else {
    $el._el.addEventListener(event, fn, options);
  }
}

export function removeEvent($el, event, fn) {
  if (event in $el._events) $el._events[event] = without($el._events[event], fn);

  if (event in aliases) {
    const events = words(aliases[event]);
    for (let e of events)  $el._el.removeEventListener(e, fn);
  } else if (event in customEvents) {
    // TODO Remove custom events.
  } else {
    $el._el.removeEventListener(event, fn);
  }
}
