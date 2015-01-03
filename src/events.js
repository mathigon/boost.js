// =================================================================================================
// Boost.js | Events
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================



(function() {

    // =============================================================================================
    // EVENT UTILITIES

    M.events = {};

    M.events.isSupported = function(event) {
        event = 'on' + event;
        var $el = $N('div');
        var isSupported = (event in $el.$el);
        if (!isSupported) {
            $el.attr(event, 'return;');
            isSupported = (typeof $el.$el[event] === 'function');
        }
        $el.delete();
        return isSupported;
    };

    M.events.pointerOffset = function(event, $parent) {

        if (event.offsetX && $parent.$el === event.target)
            return new M.geo.Point(event.offsetX, event.offsetY);
        
        if (!$parent) $parent = $(event.target);
        var parentXY = $parent.$el.getBoundingClientRect();

        var eventX = event.touches ? event.touches[0].clientX : event.clientX;
        var eventY = event.touches ? event.touches[0].clientY : event.clientY;

        var offsetX = eventX - parentXY.left;
        var offsetY = eventY - parentXY.top;

        // If a CSS transform is applied, the offset is calculated in browser pixels, no $parent pixels
        var scale = $parent.getScale();
        return new M.geo.Point(offsetX/scale[0], offsetY/scale[1]);
    };

    M.events.pointerPosition = function(e) {
        return new M.geo.Point(
            e.touches ? e.touches[0].clientX : e.clientX,
            e.touches ? e.touches[0].clientY : e.clientY
        );
    };

    M.events.getWheelDelta = function(e) {
        var delta = 0;
        if (e.wheelDelta) delta = e.wheelDelta / 40;
        if (e.detail) delta = -e.detail / 3.5;
        return delta;
    };

    M.events.stop = function(e) {
        e.preventDefault();
        e.stopPropagation();
    };


    // =============================================================================================
    // CLICK EVENTS
    // TODO Add ability to remove click events

    function makeClickEvent($el) {
        if ($el._events._click) return;
        $el._events._click = true;

        var waitForEvent = false;
        var startX, startY;
        var preventMouse = false;

        $el.$el.addEventListener('click', function(e){
            e.preventDefault();
        });

        $el.$el.addEventListener('mousedown', function(e){
            if (preventMouse) return;
            waitForEvent = true;
            startX = e.clientX;
            startY = e.clientY;
        });

        $el.$el.addEventListener('mouseup', function(e){
            if (preventMouse) {
                preventMouse = false;
                return;
            }
            if (waitForEvent) {
                var endX = e.clientX;
                var endY = e.clientY;
                if (Math.abs(endX - startX) < 2 && Math.abs(endY - startY) < 2) {
                    $el.trigger('click', e);
                }
            }
            waitForEvent = false;
        });

        $el.$el.addEventListener('touchstart', function(e){
            preventMouse = true;
            if (e.touches.length === 1) {
                waitForEvent = true;
                startX = e.changedTouches[0].clientX;
                startY = e.changedTouches[0].clientY;
            }
        });

        $el.$el.addEventListener('touchend', function(e){
            if (waitForEvent && e.changedTouches.length === 1) {
                var endX = e.changedTouches[0].clientX;
                var endY = e.changedTouches[0].clientY;
                if (Math.abs(endX - startX) < 5 && Math.abs(endY - startY) < 5) {
                    $el.trigger('click', e);
                }
            }
            waitForEvent = false;
        });

        $el.$el.addEventListener('touchcancel', function(){
            waitForEvent = false;
        });
    }


    // =============================================================================================
    // POINTER EVENTS
    // TODO Make pointer more efficient more efficient using *enter and *leave
    // TODO Add ability to remove pointer events

    var checkInside = function($el, event) {
        var c = M.events.pointerPosition(event);
        return ($el.$el === document.elementFromPoint(c.x, c.y));
    };

    function makePointerPositionEvents($el) {
        if ($el._events._pointer) return;
        $el._events._pointer = true;

        var $parent = $($el.$el.offsetParent);
        var isInside = null;
        $parent.on('pointerEnd', function(e) { isInside = null; });

        $parent.on('pointerMove', function(e) {
            var wasInside = isInside;
            isInside = checkInside($el, e);
            if (wasInside != null && isInside && !wasInside) $el.trigger('pointerEnter', e);
            if (!isInside && wasInside) $el.trigger('pointerLeave', e);
            if (isInside) $el.trigger('pointerOver', e);
        });
    }


    // =============================================================================================
    // SCROLL EVENTS
    // TODO Add ability to remove scroll events

    M.$.prototype.fixOverflowScroll = function() {
        if (this._events.fixOverflowScroll) return;
        this._events.fixOverflowScroll = true;

        var _this = this;

        this.$el.addEventListener('touchstart', function(){
            // This ensures that overflow bounces happen within container
            var top = _this.scrollTop();
            var bottom = _this.$el.scrollHeight - _this.height();

            if(top <= 0) _this.scrollTop(1);
            if(top >= bottom) _this.scrollTop(bottom - 1);
        });
    };

    M.$.prototype.scrollTo = function(pos, time, easing) {
        var _this = this;

        if (pos < 0) pos = 0;
        if (time == null) time = 1000;
        if (!easing) easing = 'cubic';

        var startPosition = this.scrollTop();
        var distance = pos - startPosition;

        var callback = function(t) {
            var x = startPosition + distance * M.easing(easing, t);
            _this.scrollTop(x);
            _this.trigger('scroll', { top: x });
        };

        _this.trigger('scrollstart', {});
        var animation = M.animate(callback, time);

        // TODO cancel scroll events
        // this.on('scroll', function() { animation.cancel(); });
        // this.on('touchstart', function() { animation.cancel(); });
    };

    function makeScrollEvents($el) {
        if ($el._events._scroll) return;
        $el._events._scroll = true;

        var scrollTimeout = null;
        var scrolling = false;
        var scrollAnimation;
        var scrollTop;

        function onScroll() {
            var newScrollTop = $el.scrollTop();

            if (Math.abs(newScrollTop - scrollTop) > 1) {
                if (scrollTimeout) window.clearTimeout(scrollTimeout);
                scrollTimeout = null;
                $el.trigger('scroll', { top: newScrollTop });
                scrollTop = newScrollTop;
            } else if (!scrollTimeout) {
                scrollTimeout = window.setTimeout(end, 100);
            } else {
            }
        }

        function start() {
            if (scrolling) return;
            scrolling = true;
            scrollTop = $el.scrollTop();
            scrollAnimation = M.animate(onScroll);
            $el.trigger('scrollstart', {});
        }

        function move() {
            if (!scrolling) start();
        }

        function end() {
            scrolling = false;
            scrollAnimation.cancel();
            $el.trigger('scrollend', {});
        }

        function touchStart() {
            window.addEventListener('touchmove', move);
            window.addEventListener('touchend', touchEnd);
        }

        function touchEnd() {
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', touchEnd);
        }

        $el.fixOverflowScroll();

        var $target = ($el.$el === M.$body.$el) ? M.$window.$el : $el.$el;
        $target.addEventListener('wheel', move);
        $target.addEventListener('mousewheel', move);
        $target.addEventListener('DOMMouseScroll', move);

        $el.$el.addEventListener('touchstart', touchStart);
    }


    // =============================================================================================
    // CUSTOM EVENTS

    var customEvents = {

        pointerStart: 'mousedown touchstart',
        pointerMove:  'mousemove touchmove',
        pointerEnd:   'mouseup touchend mousecancel touchcancel',

        change: 'propertychange keyup input paste',

        scrollwheel: 'DOMMouseScroll mousewheel',

        click: makeClickEvent,  // no capture!

        pointerEnter: makePointerPositionEvents,  // no capture!
        pointerLeave: makePointerPositionEvents,  // no capture!
        pointerOver: makePointerPositionEvents,  // no capture!

        scrollStart: makeScrollEvents,  // no capture!
        scroll: makeScrollEvents,  // no capture!
        scrollEnd: makeScrollEvents  // no capture!
    };

    var shortcuts = ('click scroll change').split(' ');

    shortcuts.each(function(event) {
        M.$.prototype[event] = function(callback) {
            if (callback == null) {
                this.trigger(event);
            } else {
                this.on(event, callback);
            }
        };
    });

    M.$.prototype.transitionEnd = function(fn) {
        this.one('webkitTransitionEnd oTransitionEnd transitionend', fn);
    };

    M.$.prototype.animationEnd = function(fn) {
        this.one('webkitAnimationEnd oAnimationEnd animationend', fn);
    };


    // =============================================================================================
    // EVENT BINDINGS

    function createEvent($el, event, fn, useCapture) {
        var custom = customEvents[event];

        if (M.isString(custom)) {
            $el.on(custom, fn, useCapture);
        } else if (custom) {
            custom($el);
        } else {
            $el.$el.addEventListener(event, fn, !!useCapture);
        }

        if ($el._events[event]) {
            if (!$el._events[event].has(fn)) $el._events[event].push(fn);
        } else {
            $el._events[event] = [fn];
        }
    }

    function removeEvent($el, event, fn, useCapture) {
        var custom = customEvents[event];

        if (M.isString(custom)) {
            $el.off(custom, fn, useCapture);
            return;
        } else if (!custom) {
            $el.$el.removeEventListener(event, fn, !!useCapture);
        }

        if ($el._events[event]) $el._events[event] = $el._events[event].without(fn);
    }

    M.$.prototype.on = function(type, fn, useCapture) {
        var _this = this;
        if (arguments.length > 1) {
            type.words().each(function(event) {
                createEvent(_this, event, fn, useCapture);
            });
        } else {
            M.each(type, function(callback, event) {
                createEvent(_this, event, callback);
            });
        }
    };

    M.$.prototype.one = function(events, fn, useCapture) {
        var _this = this;
        function callback() {
            _this.off(events, callback, useCapture);
            fn(arguments);
        }
        this.on(events, callback, useCapture);
    };

    M.$.prototype.off = function(type, fn, useCapture) {
        var _this = this;
        type.words().each(function(event) {
            removeEvent(_this, event, fn, useCapture);
        });
    };

    M.$.prototype.trigger = function(event, args) {
        if (!this._events[event]) return;
        var _this = this;
        M.each(this._events[event], function(fn) { fn.call(_this, args); });
    };

    // var evt;
    // try {
    //     evt = new CustomEvent(eventName, {detail: eventData, bubbles: true, cancelable: true});
    // } catch (e) {
    //     evt = document.createEvent('Event');
    //     evt.initEvent(eventName, true, true);
    //     evt.detail = eventData;
    // }
    // this.$el.dispatchEvent(evt);


    // =============================================================================================
    // KEYBOARD EVENTS
    // TODO Make keyboard events follow .on syntax

    M.activeInput = function() {
        return document.activeElement === document.body ? undefined : document.activeElement;
    };

    // Executes fn if any one of [keys] is pressed
    M.keyboardEvent = function(keys, fn) {
        if (!(keys instanceof Array)) keys = [keys];
        document.addEventListener('keydown', function(e){
            var k = e.keyCode || e.which;
            for (var i=0; i<keys.length; ++i) {
                if (k === keys[i] && !M.activeInput()) {
                    e.preventDefault();
                    fn(e);
                }
            }
        });
    };

    // Executes fn1 if key1 is pressed, and fn2 if key2 is aready pressed
    M.keyboardMultiEvent = function(key1, key2, fn1, fn2) {
        var key2down = false;

        document.addEventListener('keydown', function(e){
            var k = e.keyCode || e.which;

            if (k === key2) {
                key2down = true;
            } else if (key2down && k === key1 && !M.activeInput()) {
                e.preventDefault();
                fn2(e);
            } else if (k === key1 && !M.activeInput()) {
                e.preventDefault();
                fn1(e);
            }
        });

        document.addEventListener('keyup', function(e){
            var k = e.keyCode || e.which;
            if (k === key2) key2down = false;
        });
    };


    // =============================================================================================
    // RESIZE EVENTS
    // TODO Add ability to remove resize events
    // TODO Use M.Queue to store resize events

    // Multiple queues, to allow ordering of resize events
    var events = [[], [], []];

    var trigger = function() {
        var size = [window.innerWidth, window.innerHeight];
        events.each(function(queue) {
            queue.each(function(fn) {
                fn.call(null, size);
            });
        });
    };

    M.resize = function(fn, queue) {
        if (fn) {
            events[queue||0].push(fn);
        } else {
            trigger();
        }
    };

    var timeout = null;
    M.$window.on('resize', function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            trigger();
        }, 50);
    });

})();
