// =============================================================================
// Boost.js | DOM Events
// (c) Mathigon
// =============================================================================


import {delay, Obj, words} from '@mathigon/core';
import {Point} from '@mathigon/fermat';
import {SVGParentView, $, $body, ElementView, CanvasView, SVGBaseView, WindowView, InputView, SVGView} from './elements';
import {Browser} from './browser';


declare global {
  interface Window {
    IntersectionObserver?: IntersectionObserver;
  }

  interface Event {
    handled?: boolean;
  }
}


// -----------------------------------------------------------------------------
// Utilities

export type ScreenEvent = PointerEvent|TouchEvent|MouseEvent;
export type ScrollEvent = {top: number};
export type EventCallback = (e: any) => void;

const touchSupport = ('ontouchstart' in window);
const pointerSupport = ('onpointerdown' in window);


/** Gets the pointer position from an event. */
export function pointerPosition(e: ScreenEvent) {
  if (e instanceof TouchEvent) {
    const touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    return new Point(touches[0].clientX, touches[0].clientY);
  } else {
    return new Point(e.clientX, e.clientY);
  }
}

function getTouches(e: ScreenEvent) {
  return (e instanceof TouchEvent) ? e.touches : [];
}

/**
 * Gets the pointer position from an event triggered on an `<svg>` element, in
 * the coordinate system of the `<svg>` element.
 */
export function svgPointerPosn(event: ScreenEvent, $svg: SVGParentView) {
  const posn = pointerPosition(event);
  return posn.transform($svg.inverseTransformMatrix);
}

/**
 * Gets the pointer position from an event triggered on an `<canvas>` element,
 * in the coordinate system of the `<canvas>` element.
 */
export function canvasPointerPosition(event: ScreenEvent, $canvas: CanvasView) {
  const posn = pointerPosition(event);
  const bounds = $canvas.bounds;

  const x = (posn.x - bounds.left) * $canvas.canvasWidth / bounds.width;
  const y = (posn.y - bounds.top) * $canvas.canvasHeight / bounds.height;
  return new Point(x, y);
}

/**
 * Get the target element for an event, including for touch/pointer events
 * that started on a different element.
 */
export function getEventTarget(event: ScreenEvent) {
  if (event instanceof PointerEvent && event.pointerType === 'mouse') {
    // Only pointer mouse events update the target for move events that started
    // on a different element.
    return $(event.target as Element);
  }

  const posn = pointerPosition(event);
  return $(document.elementFromPoint(posn.x, posn.y));
}


// -----------------------------------------------------------------------------
// Click Events

function makeTapEvent($el: ElementView) {
  if ($el._data['tapEvent']) return;
  $el._data['tapEvent'] = true;

  let start: Point|null = null;

  $el.on('pointerdown', (e: ScreenEvent) => start = pointerPosition(e));

  $el.on('pointerup', (e: ScreenEvent) => {
    if (!start) return;
    const end = pointerPosition(e);
    if (Point.distance(start, end) < 6) $el.trigger('tap', e);
    start = null;
  });

  $el.on('pointercancel', () => start = null);
}

function makeClickOutsideEvent($el: ElementView) {
  if ($el._data['clickOutsideEvent']) return;
  $el._data['clickOutsideEvent'] = true;

  $body.on('pointerdown', (e: ScreenEvent) => {
    const $target = $(e.target as Element);
    if ($target && ($target.equals($el) || $target.hasParent($el))) return;
    $el.trigger('clickOutside', e);
  });
}


// -----------------------------------------------------------------------------
// Slide Events

interface SlideEventOptions {
  start?: (p: Point) => void;
  move?: (p: Point, start: Point, last: Point) => void;
  end?: (last: Point, start: Point) => void;
  justInside?: boolean;
}

export function slide($el: ElementView, fns: SlideEventOptions) {
  let isAnimating = false;

  let posn = pointerPosition;
  if ($el.type === 'svg') {
    posn = (e) => svgPointerPosn(e, ($el as SVGView).$ownerSVG);
  } else if ($el.type === 'canvas') {
    posn = (e) => canvasPointerPosition(e, $el as CanvasView);
  }

  const $parent = fns.justInside ? $el : $body;

  let startPosn: Point|null = null;
  let lastPosn: Point|null = null;

  if ($el.css('touch-action') === 'auto') $el.css('touch-action', 'none');

  function start(e: ScreenEvent) {
    e.preventDefault();
    if (e.handled || getTouches(e).length > 1) return;
    e.handled = true;

    if ('move' in fns) $parent.on('pointermove', move);
    $parent.on('pointerstop', end);
    startPosn = lastPosn = posn(e);
    if (fns.start) fns.start(startPosn);
  }

  function move(e: ScreenEvent) {
    e.preventDefault();
    if (isAnimating) return;
    isAnimating = true;

    window.requestAnimationFrame(function () {
      if (!isAnimating) return;
      const p = posn(e);
      if (fns.move) fns.move(p, startPosn!, lastPosn!);
      lastPosn = p;
      isAnimating = false;
    });
  }

  function end(e: ScreenEvent) {
    e.preventDefault();
    if (getTouches(e).length > 0) return;
    isAnimating = false;

    if (fns.move) $parent.off('pointermove', move);
    $parent.off('pointerstop', end);

    if (fns.end) fns.end(lastPosn!, startPosn!);
  }

  $el.on('pointerdown', start);
  if (fns.justInside) $el.on('mouseleave', end);
}


// -----------------------------------------------------------------------------
// Scroll Events

function makeScrollEvents($el: ElementView) {
  if ($el._data['scrollEvents']) return;
  $el._data['scrollEvents'] = true;

  let ticking = false;
  let top: number|null = null;

  function tick() {
    const newTop = $el.scrollTop;
    if (newTop === top) {
      ticking = false;
      return;
    }

    top = newTop;
    $el.trigger('scroll', {top});
    // TODO Scroll should trigger mousemove events.
    window.requestAnimationFrame(tick);
  }

  function scroll() {
    if (!ticking) window.requestAnimationFrame(tick);
    ticking = true;
  }

  // Mouse Events
  const target = $el.type === 'window' ? window : $el._el;
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

  $el._el.addEventListener('touchstart', function (e) {
    if (!e.handled) touchStart();
  });
}


// -----------------------------------------------------------------------------
// Hover Events

interface HoverEventOptions {
  enter?: () => void;
  exit?: () => void;
  preventMouseover?: () => boolean;
  delay?: number;
  exitDelay?: number;
  $clickTarget?: ElementView;
}

export function hover($el: ElementView, options: HoverEventOptions) {
  let timeout = 0;
  let active = false;
  let wasTriggeredByMouse = false;

  $el.on('mouseover', () => {
    if (options.preventMouseover && options.preventMouseover()) return;
    clearTimeout(timeout);
    timeout = delay(() => {
      if (active) return;
      if (options.enter) options.enter();
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
      if (options.enter) options.enter();
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

let observer: IntersectionObserver;

function intersectionCallback(entries: IntersectionObserverEntry[]) {
  for (const e of entries) {
    const event = e.isIntersecting ? 'enterViewport' : 'exitViewport';
    setTimeout(() => $(e.target)!.trigger(event));
  }
}

function makeIntersectionEvents($el: ElementView) {
  if ($el._data['intersectionEvents']) return;
  $el._data['intersectionEvents'] = true;

  // Polyfill for window.IntersectionObserver
  if (!window.IntersectionObserver) {
    let wasVisible = false;
    $body.on('scroll', () => {
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

function makePointerPositionEvents($el: ElementView) {
  if ($el._data['pointerPositionEvents']) return;
  $el._data['pointerPositionEvents'] = true;

  const parent = $el.parent!;
  let isInside: boolean|null = null;

  parent.on('pointerend', () => isInside = null);

  parent.on('pointermove', (e: ScreenEvent) => {
    const wasInside = isInside;
    const target = getEventTarget(e)!;
    isInside = target.equals($el) || target.hasParent($el);
    if (wasInside != null && isInside && !wasInside) $el.trigger('pointerenter', e);
    if (!isInside && wasInside) $el.trigger('pointerleave', e);
  });
}


// -----------------------------------------------------------------------------
// Mouse Events
// On touch devices, mouse events are emulated. We don't want that!

function makeMouseEvent(eventName: string, $el: ElementView) {
  if ($el._events['_' + eventName]) return;
  $el._events['_' + eventName] = true;

  if (pointerSupport) {
    $el.on(eventName.replace('mouse', 'pointer'), (e) => {
      if (e.pointerType === 'mouse') $el.trigger(eventName, e);
    });
  } else if (!touchSupport) {
    $el._el.addEventListener(eventName, (e) => $el.trigger(eventName, e));
  }
}


// -----------------------------------------------------------------------------
// Keyboard Events

function makeKeyEvent($el: ElementView) {
  // On Android, the keydown event always returns character 229, except for the
  // backspace button which works as expected. Instead, we have to listen to the
  // input event and get the last character of the typed text. Note that this
  // only works if the cursor is at the end, or if the input field gets cleared
  // after every key.

  // Note that e.keyCode is deprecated, but iOS doesn't support e.key yet.

  $el.on('keydown', (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    if (Browser.isAndroid && e.keyCode === 229) return;

    const key = (e.key || String.fromCharCode(e.which)).toLowerCase();
    $el.trigger('key', {code: e.keyCode, key});
  });

  if (Browser.isAndroid && $el.type === 'input') {
    $el.on('input', (e) => {
      const key = e.data[e.data.length - 1].toLowerCase();
      $el.trigger('key', {code: null, key});
      ($el as InputView).value = '';
    });
  }
}


// -----------------------------------------------------------------------------
// Event Creation

const aliases: Obj<string> = {
  change: 'propertychange keyup input paste',
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerdown: pointerSupport ? 'pointerdown' :
               touchSupport ? 'touchstart' : 'mousedown',
  pointermove: pointerSupport ? 'pointermove' :
               touchSupport ? 'touchmove' : 'mousemove',
  pointerup: pointerSupport ? 'pointerup' :
             touchSupport ? 'touchend' : 'mouseup',
  pointercancel: pointerSupport ? 'pointercancel' : 'touchcancel',
  pointerstop: pointerSupport ? 'pointerup pointercancel' :
               touchSupport ? 'touchend touchcancel' : 'mouseup'
};

const customEvents: Obj<($el: ElementView) => void> = {
  scroll: makeScrollEvents,
  tap: makeTapEvent,
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

export function bindEvent($el: ElementView, event: string, fn: EventCallback,
                          options?: EventListenerOptions) {
  if (event in aliases) {
    const events = words(aliases[event]);
    // Note that the mouse event aliases don't pass through makeMouseEvent()!
    for (const e of events) $el._el.addEventListener(e, fn, options);
  } else if (event in customEvents) {
    customEvents[event]($el);
  } else {
    $el._el.addEventListener(event, fn, options);
  }
}

export function unbindEvent($el: ElementView, event: string,
                            fn: EventCallback) {

  if (event in aliases) {
    const events = words(aliases[event]);
    for (const e of events) $el._el.removeEventListener(e, fn);
  } else if (event in customEvents) {
    // TODO Remove custom events.
  } else {
    $el._el.removeEventListener(event, fn);
  }
}
