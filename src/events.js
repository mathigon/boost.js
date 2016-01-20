// =============================================================================
// Boost.js | DOM Events
// (c) 2015 Mathigon
// =============================================================================



// TODO Improve performance after removing click, pointer and scroll events

import * as Elements from 'elements';
import Browser from 'browser';
import { uid } from 'utilities';
import { isString } from 'types';
import { without } from 'arrays';
import { animate } from 'animate';


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
    return {
        x: e.touches ? e.touches[0].clientX : e.clientX,
        y: e.touches ? e.touches[0].clientY : e.clientY
    };
}

export function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
}

export function svgPointerPosn(event, $svg) {
    // TODO cache values fr efficiency
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

    let waitForEvent = false;
    let startX, startY;
    let preventMouse = false;

    $el._el.addEventListener('mousedown', function(e){
        if (preventMouse) return;
        waitForEvent = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    $el._el.addEventListener('mouseup', function(e){
        if (preventMouse) {
            preventMouse = false;
            return;
        }
        if (waitForEvent) {
            let endX = e.clientX;
            let endY = e.clientY;
            if (Math.abs(endX - startX) < 2 && Math.abs(endY - startY) < 2) {
                $el.trigger('fastClick', e);
            }
        }
        waitForEvent = false;
    });

    $el._el.addEventListener('touchstart', function(e){
        preventMouse = true;
        if (e.touches.length === 1) {
            waitForEvent = true;
            startX = e.changedTouches[0].clientX;
            startY = e.changedTouches[0].clientY;
        }
    });

    $el._el.addEventListener('touchend', function(e){
        if (waitForEvent && e.changedTouches.length === 1) {
            let endX = e.changedTouches[0].clientX;
            let endY = e.changedTouches[0].clientY;
            if (Math.abs(endX - startX) < 5 && Math.abs(endY - startY) < 5) {
                $el.trigger('fastClick', e);
            }
        }
        waitForEvent = false;
    });

    $el._el.addEventListener('touchcancel', function(){
        waitForEvent = false;
    });
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
// Pointer Events
// TODO Make pointer more efficient more efficient using *enter and *leave

function checkInside(element, event) {
    var c = pointerPosition(event);
    return (element._el === document.elementFromPoint(c.x, c.y));
}

function makePointerPositionEvents(element) {
    if (element._data._pointerEvents) return;
    element._data._pointerEvents = true;

    let parent = element.parent;
    let isInside = null;
    parent.on('pointerEnd', function(e) { isInside = null; });

    parent.on('pointerMove', function(e) {
        let wasInside = isInside;
        isInside = checkInside(element, e);
        if (wasInside != null && isInside && !wasInside) element.trigger('pointerEnter', e);
        if (!isInside && wasInside) element.trigger('pointerLeave', e);
        if (isInside) element.trigger('pointerOver', e);
    });
}

export function slide($el, fns) {

    function start(e) {
        e.preventDefault();
        if ('start' in fns) fns.start(pointerPosition(e));
        Elements.$body.on('pointerMove', move);
        Elements.$body.on('pointerEnd', end);
    }

    function move(e) {
        e.preventDefault();
        if ('move' in fns) fns.move(pointerPosition(e));
    }

    function end() {
        if ('end' in fns) fns.end();
        Elements.$body.off('pointerMove', move);
        Elements.$body.off('pointerEnd', end);
    }

    $el.on('pointerStart', start);
}


// -----------------------------------------------------------------------------
// Scroll Events

function simpleAnimate(callback) {
    let running = true;

    function getFrame() {
        if (running) window.requestAnimationFrame(getFrame);
        callback();
    }

    getFrame();
    return { stop: function() { running = false; } };
}


function makeScrollEvents(element) {
    if (element._data._scrollEvents) return;
    element._data._scrollEvents = true;

    let scrollTimeout = null;
    let scrolling = false;
    let scrollAnimation;
    let scrollTop;

    function onScroll() {
        var newScrollTop = element.scrollTop;

        if (Math.abs(newScrollTop - scrollTop) > 1) {
            if (scrollTimeout) window.clearTimeout(scrollTimeout);
            scrollTimeout = null;
            element.trigger('scroll', { top: newScrollTop });
            scrollTop = newScrollTop;
        } else if (!scrollTimeout) {
            scrollTimeout = window.setTimeout(end, 100);
        }
    }

    function start(e) {
        if (scrolling || e.deltaX === 0) return;
        scrolling = true;
        scrollTop = element.scrollTop;
        scrollAnimation = simpleAnimate(onScroll);
        element.trigger('scrollstart');
    }

    function end() {
        if (!scrolling) return;
        scrolling = false;
        scrollAnimation.stop();
        element.trigger('scrollend');
    }

    function touchStart() {
        window.addEventListener('touchmove', start);
        window.addEventListener('touchend', touchEnd);
    }

    function touchEnd() {
        window.removeEventListener('touchmove', start);
        window.removeEventListener('touchend', touchEnd);
    }

    if (!element._isWindow) element.fixOverflowScroll();

    let target = element._isWindow ? window : element._el;
    target.addEventListener('wheel', start);

    element._el.addEventListener('touchstart', touchStart);
}


// -----------------------------------------------------------------------------
// Event Bindings

const customEvents = {
    pointerStart: 'mousedown touchstart',
    pointerMove:  'mousemove touchmove',
    pointerEnd:   'mouseup touchend mousecancel touchcancel',

    change: 'propertychange keyup input paste',

    scrollwheel: 'DOMMouseScroll mousewheel',

    fastClick: makeClickEvent,  // no capture!
    clickOutside: makeClickOutsideEvent,  // no capture!

    pointerEnter: makePointerPositionEvents,  // no capture!
    pointerLeave: makePointerPositionEvents,  // no capture!
    pointerOver: makePointerPositionEvents,  // no capture!

    scrollStart: makeScrollEvents,  // no capture!
    scroll: makeScrollEvents,  // no capture!
    scrollEnd: makeScrollEvents  // no capture!
};

export function createEvent($el, event, fn, useCapture) {
    let custom = customEvents[event];

    if (isString(custom)) {
        $el.on(custom, fn, useCapture);
    } else if (custom) {
        custom($el);
    } else {
        $el._el.addEventListener(event, fn, !!useCapture);
    }

    if (event in $el._events) {
        if ($el._events[event].indexOf(fn) < 0) $el._events[event].push(fn);
    } else {
        $el._events[event] = [fn];
    }
}

export function removeEvent($el, event, fn, useCapture) {
    let custom = customEvents[event];

    if (isString(custom)) {
        $el.off(custom, fn, useCapture);
        return;
    } else if (!custom) {
        $el._el.removeEventListener(event, fn, !!useCapture);
    }

    if (event in $el._events) $el._events[event] = without($el._events[event], fn);
}
