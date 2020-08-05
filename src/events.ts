// =============================================================================
// Boost.js | DOM Events
// (c) Mathigon
// =============================================================================


import {delay, Obj, words} from '@mathigon/core';
import {Point} from '@mathigon/fermat';
import {SVGParentView, $, $body, ElementView, CanvasView, InputView, SVGView} from './elements';
import {Browser} from './browser';


declare global {
  interface Window {
    IntersectionObserver?: IntersectionObserver;
    ResizeObserver: any;
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
export function pointerPosition(e: any) {
  if (e.touches) {
    const touches = e.targetTouches.length ? e.targetTouches : e.changedTouches;
    return new Point(touches[0].clientX, touches[0].clientY);
  } else {
    return new Point(e.clientX || 0, e.clientY || 0);
  }
}

function getTouches(e: any) {
  return e.touches || [];
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
  return $(document.elementFromPoint(posn.x, posn.y) || undefined);
}


// -----------------------------------------------------------------------------
// Click Events

function makeTapEvent($el: ElementView) {
  // TODO Support removing events.

  if ($el._data['tapEvent']) return;
  $el._data['tapEvent'] = true;

  let start: Point|undefined = undefined;

  $el.on('pointerdown', (e: ScreenEvent) => start = pointerPosition(e));

  $el.on('pointerup', (e: ScreenEvent) => {
    if (!start) return;
    const end = pointerPosition(e);
    if (Point.distance(start, end) < 6) $el.trigger('tap', e);
    start = undefined;
  });

  $el.on('pointercancel', () => start = undefined);
}

function makeClickOutsideEvent($el: ElementView) {
  // TODO Support removing events.

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
  down?: (p: Point) => void;
  start?: (p: Point) => void;
  move?: (p: Point, start: Point, last: Point) => void;
  end?: (last: Point, start: Point) => void;
  up?: (last: Point, start: Point) => void;
  click?: (p: Point) => void;
  justInside?: boolean;
  accessible?: boolean;
  $box?: ElementView;
}

export function slide($el: ElementView, fns: SlideEventOptions) {
  const $box = fns.$box || $el;
  let posn = pointerPosition;
  if ($box.type === 'svg') {
    posn = (e) => svgPointerPosn(e, ($box as SVGView).$ownerSVG);
  } else if ($box.type === 'canvas') {
    posn = (e) => canvasPointerPosition(e, $box as CanvasView);
  }

  const $parent = fns.justInside ? $el : $body;

  let startPosn: Point|undefined = undefined;
  let lastPosn: Point|undefined = undefined;

  let hasMoved = false;
  let pointerId = 0;

  if ($el.css('touch-action') === 'auto') $el.css('touch-action', 'none');
  $el.addClass('noselect');

  function start(e: ScreenEvent) {
    if (e.handled || getTouches(e).length > 1) return;
    e.preventDefault();

    hasMoved = false;
    pointerId = (e as any).pointerId || 0;

    $parent.on('pointermove', move);
    $parent.on('pointerstop', end);

    startPosn = lastPosn = posn(e);
    if (fns.down) fns.down(startPosn);
  }

  function move(e: ScreenEvent) {
    if (pointerId && (e as any).pointerId !== pointerId) return;
    e.preventDefault();

    const p = posn(e);
    if (Point.distance(p, lastPosn!) < 0.5) return;

    if (!hasMoved && fns.start) fns.start(startPosn!);
    if (fns.move) fns.move(p, startPosn!, lastPosn!);

    lastPosn = p;
    hasMoved = true;
  }

  function end(e: ScreenEvent) {
    if (pointerId && (e as any).pointerId !== pointerId) return;
    e.preventDefault();

    $parent.off('pointermove', move);
    $parent.off('pointerstop', end);

    if (fns.up) fns.up(lastPosn!, startPosn!);
    if (hasMoved && fns.end) fns.end(lastPosn!, startPosn!);
    if (!hasMoved && fns.click) fns.click(startPosn!);
  }

  $el.on('pointerdown', start);
  if (fns.justInside) $el.on('mouseleave', end);

  if (fns.accessible) {
    $el.setAttr('tabindex', '0');
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (![37, 38, 39, 40].includes(e.keyCode)) return;
      if ($el !== Browser.getActiveInput()) return;

      const center = $el.boxCenter;
      const start = posn({clientX: center.x, clientY: center.y});

      const dx = (e.keyCode === 37) ? -25 : (e.keyCode === 39) ? 25 : 0;
      const dy = (e.keyCode === 38) ? -25 : (e.keyCode === 40) ? 25 : 0;
      const end = start.shift(dx, dy);

      if (fns.down) fns.down(start);
      if (fns.start) fns.start(start);
      if (fns.move) fns.move(end, start, start);
      if (fns.end) fns.end(end, start);
    });
  }
}


// -----------------------------------------------------------------------------
// Slide Events

interface OverEventOptions {
  enter?: () => void;
  move?: (p: Point) => void;
  exit?: () => void;
}

export function pointerOver($el: ElementView, fns: OverEventOptions) {
  let posn = pointerPosition;
  if ($el.type === 'svg') {
    posn = (e) => svgPointerPosn(e, ($el as SVGView).$ownerSVG);
  } else if ($el.type === 'canvas') {
    posn = (e) => canvasPointerPosition(e, $el as CanvasView);
  }

  let over = false;

  $el.on('touchstart mouseenter', (e: Event) => {
    if (!over && fns.enter) fns.enter();
    if (fns.move) fns.move(posn(e));
    over = true;
  }, {passive: true});

  $el.on('pointermove', (e: Event) => {
    if (over && fns.move) fns.move(posn(e));
  });

  $el.on('touchend mouseleave', () => {
    if (over && fns.exit) fns.exit();
    over = false;
  }, {passive: true});
}


// -----------------------------------------------------------------------------
// Scroll Events

function makeScrollEvents($el: ElementView) {
  // TODO Support removing events.

  if ($el._data['scrollEvents']) return;
  $el._data['scrollEvents'] = true;

  let ticking = false;
  let top: number|undefined = undefined;

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

  $el._el.addEventListener('touchstart', function(e) {
    if (!e.handled) touchStart();
  });
}


// -----------------------------------------------------------------------------
// Hover Events

interface HoverEventOptions {
  enter?: () => void;
  exit?: () => void;
  preventMouseover?: () => boolean;
  canFocusWithin?: boolean;
  delay?: number;
  exitDelay?: number;
  $clickTarget?: ElementView;
}

export function hover($el: ElementView, options: HoverEventOptions) {
  const $clickTarget = options.$clickTarget || $el;

  let timeout = 0;
  let active = false;
  let wasTriggeredByMouse = false;
  let wasTriggeredByFocus = false;

  function enter() {
    if (active) return;
    if (options.enter) options.enter();
    active = true;
  }

  function exit() {
    if (!active) return;
    clearTimeout(timeout);
    if (options.exit) options.exit();
    active = false;
  }

  $el.on('mouseover', () => {
    if (options.preventMouseover && options.preventMouseover()) return;
    clearTimeout(timeout);
    timeout = delay(() => {
      enter();
      wasTriggeredByMouse = true;
    }, options.delay);
  });

  $el.on('mouseout', () => {
    if (!wasTriggeredByMouse) return;
    clearTimeout(timeout);
    timeout = delay(exit, options.exitDelay || options.delay);
  });

  $clickTarget.on('focus', () => {
    if (active || options.preventMouseover && options.preventMouseover()) return;
    clearTimeout(timeout);
    enter();
    wasTriggeredByFocus = true;
  });

  const onBlur = () => {
    if (!wasTriggeredByFocus) return;

    if (options.canFocusWithin) {
      // Special handling if the blur of the $clickTarget was caused by focussing
      // another child of $el (e.g. e <button> inside a popup).
      // Timeout required so that the new element has focussed.
      setTimeout(() => {
        const $newActive = Browser.getActiveInput();
        if ($newActive && $newActive.hasParent($el)) {
          $newActive.one('blur', onBlur);
        } else {
          exit();
        }
      });
    } else {
      exit();
    }
  };
  $clickTarget.on('blur', onBlur);

  $clickTarget.on('click', () => {
    if (active && (!wasTriggeredByMouse)) {
      exit();
    } else if (!active) {
      enter();
      wasTriggeredByMouse = false;
    }
  });

  $el.on('clickOutside', exit);
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
  // TODO Support removing events.

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
// Resize Events

function makeResizeEvents($el: ElementView, remove = false) {
  if (remove) {
    if ($el._data['resizeObserver']) $el._data['resizeObserver'].disconnect();
    $el._data['resizeObserver'] = undefined;
  }

  if ($el._data['resizeObserver']) return;

  if (window.ResizeObserver) {
    const observer = new window.ResizeObserver(() => $el.trigger('resize'));
    observer.observe($el._el);
    $el._data['resizeObserver'] = observer;

  } else if (window.MutationObserver) {
    const observer = new MutationObserver(() => $el.trigger('resize'));
    observer.observe($el._el, {attributes: true, childList: true, characterData: true, subtree: true});
    $el._data['resizeObserver'] = observer;
  }
}


// -----------------------------------------------------------------------------
// Pointer Events

function makePointerPositionEvents($el: ElementView) {
  // TODO Support removing events.

  if ($el._data['pointerPositionEvents']) return;
  $el._data['pointerPositionEvents'] = true;

  const parent = $el.parent!;
  let isInside: boolean|undefined = undefined;

  parent.on('pointerend', () => isInside = undefined);

  parent.on('pointermove', (e: ScreenEvent) => {
    const wasInside = isInside;
    const target = getEventTarget(e)!;
    isInside = target.equals($el) || target.hasParent($el);
    if (wasInside != undefined && isInside && !wasInside) $el.trigger('pointerenter', e);
    if (!isInside && wasInside) $el.trigger('pointerleave', e);
  });
}


// -----------------------------------------------------------------------------
// Mouse Events
// On touch devices, mouse events are emulated. We don't want that!

function makeMouseEvent(eventName: string, $el: ElementView) {
  // TODO Support removing events.

  if ($el._data['_' + eventName]) return;
  $el._data['_' + eventName] = true;

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
      $el.trigger('key', {code: undefined, key});
      ($el as InputView).value = '';
    });
  }
}


// -----------------------------------------------------------------------------
// Event Creation

const aliases: Obj<string> = {
  scrollwheel: 'DOMMouseScroll mousewheel',
  pointerdown: pointerSupport ? 'pointerdown' :
               touchSupport ? 'touchstart' : 'mousedown',
  pointermove: pointerSupport ? 'pointermove' :
               touchSupport ? 'touchmove' : 'mousemove',
  pointerup: pointerSupport ? 'pointerup' :
             touchSupport ? 'touchend' : 'mouseup',
  pointercancel: pointerSupport ? 'pointercancel' : 'touchcancel',
  pointerstop: pointerSupport ? 'pointerup pointercancel' :
               touchSupport ? 'touchend touchcancel' : 'mouseup',
};

const customEvents: Obj<($el: ElementView, remove: boolean) => void> = {
  scroll: makeScrollEvents,
  tap: makeTapEvent,
  clickOutside: makeClickOutsideEvent,
  key: makeKeyEvent,

  mousedown: makeMouseEvent.bind(undefined, 'mousedown'),
  mousemove: makeMouseEvent.bind(undefined, 'mousemove'),
  mouseup: makeMouseEvent.bind(undefined, 'mouseup'),

  pointerenter: makePointerPositionEvents,
  pointerleave: makePointerPositionEvents,

  enterViewport: makeIntersectionEvents,
  exitViewport: makeIntersectionEvents,
  resize: makeResizeEvents,
};

export function bindEvent($el: ElementView, event: string, fn: EventCallback,
    options?: EventListenerOptions) {
  if (event in customEvents) {
    customEvents[event]($el, false);
  } else if (event in aliases) {
    const events = words(aliases[event]);
    // Note that the mouse event aliases don't pass through makeMouseEvent()!
    for (const e of events) $el._el.addEventListener(e, fn, options);
  } else {
    $el._el.addEventListener(event, fn, options);
  }
}

export function unbindEvent($el: ElementView, event: string,
    fn?: EventCallback) {

  if (event in customEvents) {
    if (!$el._events[event] || !$el._events[event].length) {
      // Remove custom events only when there are no more listeners.
      customEvents[event]($el, true);
    }
  } else if (fn && event in aliases) {
    const events = words(aliases[event]);
    for (const e of events) $el._el.removeEventListener(e, fn);
  } else if (fn) {
    $el._el.removeEventListener(event, fn);
  }
}
