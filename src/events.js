// =============================================================================
// Boost.js | DOM Events
// (c) 2017 Mathigon
// =============================================================================



// TODO Try simplifying code using el.setPointerCapture(e.pointerId);

import * as Elements from 'elements';
import { isString } from 'types';
import { without } from 'arrays';


// -----------------------------------------------------------------------------
// Utilities

export function isSupported(event) {
  event = 'on' + event;
  let $el = $N('div');
  let result = (event in $el._el);
  if (!result) {
    $el.attr(event, 'return;');
    result = (typeof $el._el[event] === 'function');
  }
  $el.delete();
  return result;
}

export function pointerPosition(e) {
  if ('touches' in e) {
    let touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    return {x: touches[0].clientX, y: touches[0].clientY};
  } else {
    return { x: e.clientX, y: e.clientY };
  }
}

export function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function svgPointerPosn(event, $svg) {
  // TODO cache values more efficiency
  let matrix = $svg._el.getScreenCTM().inverse();
  let posn = pointerPosition(event);

  let point = $svg._el.createSVGPoint();
  point.x = posn.x;
  point.y = posn.y;

  point = point.matrixTransform(matrix);
  return { x: point.x, y: point.y };
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
  let posn = $el.is('svg') ? (e => svgPointerPosn(e, $el)) : pointerPosition;
  let startPosn, lastPosn;

  $el.css('touch-action', 'none');

  function start(e) {
    e.preventDefault();
    if(e.handled || (e.touches && e.touches.length > 1)) return;

    if ('move' in fns) Elements.$body.on('pointermove', move);
    Elements.$body.on('pointerstop', end);
    startPosn = lastPosn = posn(e);
    if ('start' in fns) fns.start(startPosn);
  }

  function move(e) {
    e.preventDefault();
    if(isAnimating) return;
    isAnimating = true;

    window.requestAnimationFrame(function() {
      if(!isAnimating) return;
      lastPosn = posn(e);
      fns.move(lastPosn, startPosn);
      isAnimating = false;
    });
  }

  function end(e) {
    e.preventDefault();
    if(e.touches && e.touches.length > 0) return;
    isAnimating = false;

    if ('move' in fns) Elements.$body.off('pointermove', move);
    Elements.$body.off('pointerstop', end);

    if ('end' in fns) fns.end(lastPosn, startPosn);
  }

  $el.on('pointerdown', start);
}


// -----------------------------------------------------------------------------
// Scroll Events

function makeScrollEvents(element) {
  if (element._data._scrollEvents) return;
  element._data._scrollEvents = true;

  if (!element._isWindow) element.fixOverflowScroll();

  let ticking = false;

  function scroll() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        element.trigger('scroll', { top: element.scrollTop });
        ticking = false;
      });
    }
    ticking = true;
  }

  // Mouse Events
  let target = element._isWindow ? window : element._el;
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
  element._el.addEventListener('touchstart', touchStart);
}


// -----------------------------------------------------------------------------
// Event Bindings

const customEvents = {
  change: 'propertychange keyup input paste',
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerstop: 'pointerup pointercancel',

  mousedown($el) { makeMouseEvent($el, 'mousedown', 'pointerdown'); },
  mousemove($el) { makeMouseEvent($el, 'mousemove', 'pointermove'); },
  mouseup($el) { makeMouseEvent($el, 'mouseup', 'pointerup'); },

  click: makeClickEvent,  // no capture!
  clickOutside: makeClickOutsideEvent,  // no capture!

  scrollStart: makeScrollEvents,  // no capture!
  scroll: makeScrollEvents,  // no capture!
  scrollEnd: makeScrollEvents  // no capture!
};

export function createEvent($el, event, fn, options) {
  let custom = customEvents[event];

  if (isString(custom)) {
    $el.on(custom, fn, options);
  } else if (custom) {
    custom($el);
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
