// =============================================================================
// Boost.js | DOM Events
// (c) Mathigon
// =============================================================================



import { without, isOneOf, delay } from '@mathigon/core';
import { Point } from '@mathigon/fermat';
import * as Elements from './elements';


// -----------------------------------------------------------------------------
// Utilities

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
  let posn = pointerPosition(event);
  return posn.transform($svg.inverseTransformMatrix);
}

export function canvasPointerPosition(event, $el) {
  const posn = pointerPosition(event);
  const bounds = $el.bounds;

  const x = (posn.x - bounds.left) * $el._el.width / bounds.width;
  const y = (posn.y - bounds.top) * $el._el.height / bounds.height;
  return new Point(x, y);
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
    let newTop = $el.scrollTop;
    if (newTop == top) { ticking = false; return; }

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
    }, options.delay);
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
  for (let e of entries) {
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
      let isVisible = $el.isInViewport;
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
  });
}


// -----------------------------------------------------------------------------
// Mouse Events
// On touch devices, mouse events are emulated. We don't want that!

let touchEnabled = false;
document.addEventListener('touchstart', () => touchEnabled = true);

function makeMouseEvent(eventName, $el) {
  if ($el._events['_' + eventName]) return;
  $el._events['_' + eventName] = true;

  $el._el.addEventListener(eventName, function(e) {
    // TODO Support devices with both touch and mouse (e.pointerType == 'mouse')
    if (!touchEnabled) $el.trigger(eventName, e);
  });
}


// -----------------------------------------------------------------------------
// Event Creation

const aliases = {
  change: 'propertychange keyup input paste',
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerdown: 'mousedown touchstart',
  pointermove: 'mousemove touchmove',
  pointerup: 'mouseup touchend',
  pointercancel: 'touchcancel',
  pointerstop: 'mouseup touchend touchcancel'
};

const customEvents = {
  scroll: makeScrollEvents,
  hover: makeHoverEvent,
  click: makeClickEvent,
  clickOutside: makeClickOutsideEvent,

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
    $el.on(aliases[event], fn, options);
  } else if (event in customEvents) {
    customEvents[event]($el, fn);
  } else {
    $el._el.addEventListener(event, fn, options);
  }
}

export function removeEvent($el, event, fn, options) {
  if (event in $el._events) $el._events[event] = without($el._events[event], fn);

  if (event in aliases) {
    $el.off(aliases[event], fn, options);
  } else if (event in customEvents) {
    // TODO Remove custom events.
  } else {
    $el._el.removeEventListener(event, fn, options);
  }
}
