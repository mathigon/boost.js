// =============================================================================
// Boost.js | DOM Events
// (c) Mathigon
// =============================================================================



// TODO Try simplifying code using el.setPointerCapture(e.pointerId);
// TODO Scroll should trigger mousemove events

import { isString, without, isOneOf, delay } from '@mathigon/core';
import { Point } from '@mathigon/fermat';
import * as Elements from './elements';
import { Browser } from './browser';


// -----------------------------------------------------------------------------
// Utilities

export function isSupported(event) {
  event = 'on' + event;
  let $el = Elements.$N('div');
  let result = (event in $el._el);
  if (!result) {
    $el.setAttr(event, 'return;');
    result = (typeof $el._el[event] === 'function');
  }
  $el.delete();
  return result;
}

export function pointerPosition(e) {
  if ('touches' in e) {
    let touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    return new Point(touches[0].clientX, touches[0].clientY);
  } else {
    return new Point(e.clientX, e.clientY);
  }
}

export function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function svgPointerPosn(event, $svg) {
  // TODO Better cache results!
  const matrix = $svg._el.getScreenCTM().inverse();
  let posn = pointerPosition(event);
  let point = $svg._el.createSVGPoint();

  // Firefox doesn't account for the CSS transform of parent elements when
  // computing getScreenCTM().
  // TODO Handle scale and rotation, not just transform.
  if (Browser.isFirefox) {
    let transform = $svg.computedTransformMatrix;
    posn = {x: posn.x - transform[2][0], y: posn.y - transform[2][1]}
  }

  // TODO implement matrixTransform for custom Point class

  point.x = posn.x;
  point.y = posn.y;
  point = point.matrixTransform(matrix);
  return new Point(point.x, point.y);
}

export function canvasPointerPosition(e, $el) {
  let posn;

  if ('touches' in e) {
    let touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    posn = new Point(touches[0].offsetX, touches[0].offsetY);
  } else {
    posn = new Point(e.offsetX, e.offsetY);
  }

  // TODO Better cache results!
  return posn.scale($el._el.width/$el.width, $el._el.height/$el.height);
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
    if (e.touches.length == 1) start = pointerPosition(e);
  });

  $el._el.addEventListener('touchend', function(e){
    if (!start) return;
    let end = pointerPosition(e);
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

  Elements.$body.on('click', function(e) {
    if (Elements.$(e.target).hasParent($el)) return;
    $el.trigger('clickOutside');
  });
}

function makeMouseEvent($el, event, pointerEvent) {
  if ($el._events['_' + event]) return;
  $el._events['_' + event] = true;

  $el._el.addEventListener(pointerEvent, function(e) {
    if (e.pointerType == 'mouse') $el.trigger(event, e);
  });
}


// -----------------------------------------------------------------------------
// Slide Events

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

  let $parent = fns.justInside ? $el : Elements.$body;

  let startPosn, lastPosn;

  if ($el.css('touch-action') == 'auto') $el.css('touch-action', 'none');

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
    let newTop = $el.scrollTop;
    if (newTop == top) { ticking = false; return; }

    top = newTop;
    $el.trigger('scroll', { top });
    window.requestAnimationFrame(tick);
  }

  function scroll() {
    if (!ticking) window.requestAnimationFrame(tick);
    ticking = true;
  }

  // Mouse Events
  let target = $el instanceof Elements.WindowElement ? window : $el._el;
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

  $el.on('mouseover', () => {
    clearTimeout(timeout);
    timeout = delay(() => {
      if (active) return;
      options.enter();
      active = true;
    }, options.delay);
  });

  $el.on('mouseout', () => {
    clearTimeout(timeout);
    timeout = delay(() => {
      if (!active) return;
      options.exit();
      active = false;
    }, options.delay);
  });

  const $clickTarget = options.$clickTarget || $el;
  $clickTarget.on('click', () => {
    if (active) {
      options.exit();
      active = false;
    } else {
      options.enter();
      active = true;
    }
  });

  $el.on('clickOutside', () => {
    if (!active) return;
    options.exit();
    active = false;
  });
}


// -----------------------------------------------------------------------------
// IntersectionEvents

let observer;

function intersectionCallback(entries) {
  for (let e of entries) {
    const event = e.isIntersecting ? 'enterViewport' : 'exitViewport';
    setTimeout(() => Elements.$(e.target).trigger(event));
  }
}

function makeIntersectionEvents($el) {
  if ($el._data.intersectionEvents) return;
  $el._data.intersectionEvents = true;

  if (!window.IntersectionObserver) {
    return $el.trigger('enterViewport');
  }

  if (!observer) observer = new IntersectionObserver(intersectionCallback);
  observer.observe($el._el);
}


// -----------------------------------------------------------------------------
// Event Bindings

const customEvents = {
  change: 'propertychange keyup input paste',
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerstop: 'pointerup pointercancel',

  // On touch devices, mouse events are simulated. We don't want that!
  mousedown($el) { makeMouseEvent($el, 'mousedown', 'pointerdown'); },
  mousemove($el) { makeMouseEvent($el, 'mousemove', 'pointermove'); },
  mouseup($el) { makeMouseEvent($el, 'mouseup', 'pointerup'); },

  hover: makeHoverEvent,
  click: makeClickEvent,
  clickOutside: makeClickOutsideEvent,
  scroll: makeScrollEvents,

  enterViewport: makeIntersectionEvents,
  exitViewport: makeIntersectionEvents
};


// -----------------------------------------------------------------------------
// Pointer Events Polyfill

if (!window.PointerEvent) {
  function checkInside(event, element) {
    let c = pointerPosition(event);
    let current = document.elementFromPoint(c.x, c.y);
    return isOneOf(element._el, current, current.parentNode, current.parentNode.parentNode);
  }

  function makePointerPositionEvents(element) {
    if (element._data._pointerEvents) return;
    element._data._pointerEvents = true;

    let parent = element.parent;
    let isInside = null;
    parent.on('pointerend', function () {
      isInside = null;
    });

    parent.on('pointermove', function (e) {
      let wasInside = isInside;
      isInside = checkInside(e, element);
      if (wasInside != null && isInside && !wasInside) element.trigger('pointerenter', e);
      if (!isInside && wasInside) element.trigger('pointerleave', e);
      if (isInside) element.trigger('pointerover', e);
    });
  }

  let touchEnabled = false;
  document.addEventListener('touchstart', function() { touchEnabled = true; });

  function makeFallbackMouseEvent(event, $el) {
    if ($el._events['_' + event]) return;
    $el._events['_' + event] = true;
    $el._el.addEventListener(event, function(e) {
      if (!touchEnabled) $el.trigger(event, e);
    });
  }

  customEvents.pointerdown = 'mousedown touchstart';
  customEvents.pointermove = 'mousemove touchmove';
  customEvents.pointerup = 'mouseup touchend';
  customEvents.pointercancel = 'touchcancel';
  customEvents.pointerenter = makePointerPositionEvents;
  customEvents.pointerleave = makePointerPositionEvents;
  customEvents.pointerover = makePointerPositionEvents;

  customEvents.mousedown = makeFallbackMouseEvent.bind(null, 'mousedown');
  customEvents.mousemove = makeFallbackMouseEvent.bind(null, 'mousemove');
  customEvents.mouseup = makeFallbackMouseEvent.bind(null, 'mouseup');
}

// End of Polyfill
// -----------------------------------------------------------------------------


export function createEvent($el, event, fn, options) {
  let custom = customEvents[event];

  if (isString(custom)) {
    $el.on(custom, fn, options);
  } else if (custom) {
    custom($el, fn);
  } else {
    $el._el.addEventListener(event, fn, options);
  }

  if (event in $el._events) {
    if ($el._events[event].indexOf(fn) < 0) $el._events[event].push(fn);
  } else {
    $el._events[event] = [fn];
  }
}

export function removeEvent($el, event, fn, options) {
  let custom = customEvents[event];

  if (isString(custom)) {
    $el.off(custom, fn, options);
    return;
  } else if (custom) {
    // TODO remove scroll, click and mouse events when possible.
  } else {
    $el._el.removeEventListener(event, fn, options);
  }

  if (event in $el._events) $el._events[event] = without($el._events[event], fn);
}
