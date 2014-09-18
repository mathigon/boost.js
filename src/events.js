// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

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

	M.$.prototype.on = function(events, callback) {
	    events = events.split(' ');
	    for (var i = 0; i < events.length; ++i)
	        this.$el.addEventListener(events[i], callback, false);
	};

	M.$.prototype.off = function(events, callback) {
	    events = events.split(' ');
	    for (var i = 0; i < events.length; ++i)
	        this.$el.removeEventListener(events[i], callback, false);
	};

	M.$.prototype.one = function(events, fn) {
	    var _this = this;
	    function callback() {
	        _this.off(events, callback);
	        fn(arguments);
	    }
	    this.on(events, callback);
	};

	M.$.prototype.trigger = function(eventName, eventData) {
	    var evt;
	    try {
	        evt = new CustomEvent(eventName, {detail: eventData, bubbles: true, cancelable: true});
	    } catch (e) {
	        evt = document.createEvent('Event');
	        evt.initEvent(eventName, true, true);
	        evt.detail = eventData;
	    }
	    this.$el.dispatchEvent(evt);
	};

	M.events.pointerOffset = function(event, parent) {
	    if (event.offsetX) {
	        return [event.offsetX, event.offsetY];
	    } else {
	        parent = parent ? parent.$el : event.target;
	        var parentXY = parent.getBoundingClientRect();
	        var eventX = event.touches ? event.touches[0].clientX : event.clientX;
	        var eventY = event.touches ? event.touches[0].clientY : event.clientY;
	        return [eventX-parentXY.left, eventY-parentXY.top];
	    }
	};

	M.events.pointerPosition = function(e) {
	    return {
	        x: e.touches ? e.touches[0].clientX : e.clientX,
	        y: e.touches ? e.touches[0].clientY : e.clientY
	    };
	};

	M.events.getWheelDelta = function (e) {
	    var delta = 0;
	    if (e.wheelDelta) delta = e.wheelDelta / 120;
	    if (e.detail) delta = -e.detail / 3;
	    return delta;
	};

	M.events.stop = function (e) {
	    e.preventDefault();
	    e.stopPropagation();
	};


	// -------------------------------------------------------------------------------------------------
	// POINTER EVENTS

	M.$.prototype.pointerStart = function(fn) {
	    this.on('mousedown touchstart', fn);
	};

	M.$.prototype.pointerMove = function(fn) {
	    this.on('mousemove touchmove', fn);
	};

	M.$.prototype.pointerEnd = function(fn) {
	    this.on('mouseup touchend mousecancel touchcancel', fn);
	};

	(function() {

	    var checkInside = function($el, event) {
	        var c = M.events.pointerPosition(event);
	        return ($el.$el === document.elementFromPoint(c.x, c.y));
	    };

	    // TODO Make pointer more efficient more efficient using *enter and *leave

	    M.$.prototype.pointerEnter = function(fn, $parent) {
	        var _this = this;
	        var isInside = null;

	        $parent.pointerEnd(function(e) { isInside = null; });

	        $parent.pointerMove(function(e) {
	            var wasInside = isInside;
	            isInside = checkInside(_this, e);
	            if (wasInside != null && isInside && !wasInside) fn(e);
	        });
	    };

	    M.$.prototype.pointerLeave = function(fn, $parent) {
	        var _this = this;
	        var isInside = null;

	        $parent.pointerMove(function(e) {
	            var wasInside = isInside;
	            isInside = checkInside(_this, e);
	            if (!isInside && wasInside) fn(e);
	        });
	    };

	    M.$.prototype.pointerMoveOver = function(fn, $parent) {
	        var _this = this;
	        $parent.on('touchmove mousemove', function(e) {
	            if (checkInside(_this, e)) fn(e);
	        });
	    };

	})();

	// -------------------------------------------------------------------------------------------------
	// SPECIAL EVENTS

	M.$.prototype.transitionEnd = function(callback) {
	    var events = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'MSTransitionEnd', 'msTransitionEnd'];
	    this.one(events.join(' '), callback);
	};

	M.$.prototype.animationEnd = function(callback) {
	    var events = ['webkitAnimationEnd', 'OAnimationEnd', 'MSAnimationEnd', 'animationend'].join(' ');
	    var _this = this;

	    function fireCallBack(e) {
	        callback.call(_this, e);
	        _this.off(events, fireCallBack);
	    }

	    this.on(events, fireCallBack);
	};

	M.$.prototype.change = function(callback) {
	    this.on('propertychange keyup input paste', callback);
	};

	M.$.prototype.click = function(callback) {

	    var waitForEvent = false;
	    var startX, startY;
	    var _this = this;
	    var preventMouse = false;

	    /* NOTE PreventDefault for Click Events
	    this.on('click', function(e){
	        e.preventDefault();
	    });*/

	    this.on('mousedown', function(e){
	        if (preventMouse) return;
	        waitForEvent = true;
	        startX = e.clientX;
	        startY = e.clientY;
	    });

	    this.on('mouseup', function(e){
	        if (preventMouse) {
	            preventMouse = false;
	            return;
	        }
	        if (waitForEvent) {
	            var endX = e.clientX;
	            var endY = e.clientY;
	            if (Math.abs(endX - startX) < 2 && Math.abs(endY - startY) < 2) {
	                callback.call(_this, e);
	            }
	        }
	        waitForEvent = false;
	    });

	    this.on('touchstart', function(e){
	        preventMouse = true;
	        if (e.touches.length === 1) {
	            waitForEvent = true;
	            startX = e.changedTouches[0].clientX;
	            startY = e.changedTouches[0].clientY;
	        }
	    });

	    this.on('touchend', function(e){
	        if (waitForEvent && e.changedTouches.length === 1) {
	            var endX = e.changedTouches[0].clientX;
	            var endY = e.changedTouches[0].clientY;
	            if (Math.abs(endX - startX) < 5 && Math.abs(endY - startY) < 5) {
	                callback.call(_this, e);
	            }
	        }
	        waitForEvent = false;
	    });

	    this.on('touchcancel', function(){
	        waitForEvent = false;
	    });
	};

	M.$.prototype.scroll = function(fns) {
	    var _this = this;

	    var scrollTimeout = null;
	    var scrolling = false;
	    var initialScroll = 0;

	    function start() {
	        initialScroll = _this.$el.scrollTop;
	        if (fns.start) fns.start();
	        scrolling = true;
	    }

	    function move() {
	        if (!scrolling) start();
	        if (fns.move) fns.move();

	        if (scrollTimeout) window.clearTimeout(scrollTimeout);
	        scrollTimeout = window.setTimeout(end, 100);
	    }

	    function end() {
	        if (fns.end) fns.end();
	        scrolling = false;
	    }

	    // --------------------------------------------------------------------
	    // Add Event Listeners

	    var $el = this.$el;

	    function touchEnd() {
	        window.removeEventListener('touchmove', move);
	        window.removeEventListener('touchend', touchEnd);
	    }

	    this.on('wheel mousewheel DOMMouseScroll', move);

	    this.on('touchstart', function(){
	        // This ensures that overflow bounces happen within container
	        var top = $el.scrollTop;
	        if(top <= 0) $el.scrollTop = 1;
	        if(top + $el.offsetHeight >= $el.scrollHeight) $el.scrollTop = $el.scrollHeight - $el.offsetHeight - 1;

	        start();
	        window.addEventListener('touchmove', move);
	        window.addEventListener('touchend', touchEnd);
	    });
	};

	/*
	M.$.prototype.scroll = function(fns) {
	    var _this = this;

	    var posn = 0;
	    var scrolling = false;
	    var scrollEndTimeout = null;
	    var blocked = false;

	    function start() {
	        if (scrolling) return;
	        scrolling = true;
	        if (fns.start) fns.start();
	        move();
	    }

	    function move() {
	        if (!scrolling) return;
	        requestAnimationFrame(move);
	        var oldPosn = posn;
	        posn = _this.$el.scrollTop;
	        if (fns.move) fns.move(posn);
	        if (!FM.equals(oldPosn, posn, 1)) {
	            clearTimeout(scrollEndTimeout);
	        } else {
	            scrollEndTimeout = setTimeout(function() { end(); }, 100);
	        }
	    }

	    function end() {
	        if (blocked || !scrolling) return;
	        scrolling = false;
	        if (fns.end) fns.end();
	    }

	    // --------------------------------------------------------------------
	    // Add Event Listeners

	    var $el = this.$el;

	    this.on('wheel mousewheel DOMMouseScroll', start);

	    this.on('touchstart', function(){
	        // This ensures that overflow bounces happen within container
	        var top = $el.scrollTop;
	        if(top <= 0) $el.scrollTop = 1;
	        if(top + $el.offsetHeight >= $el.scrollHeight) $el.scrollTop = $el.scrollHeight - $el.offsetHeight - 1;

	        blocked = true;
	        start();
	    });

	    this.on('touchend', function(){
	        blocked = false;
	    });
	};
	*/

	(function () {
	    var shortcuts = ('blur focus keyup keydown keypress submit').split(' ');

	    shortcuts.each( function(event) {
	        M.$.prototype[event] = function(callback) {
	            if (callback == null) {
	                this.trigger(event);
	            } else {
	                this.on(event, callback);
	            }
	        };
	    });
	})();



	// -------------------------------------------------------------------------------------------------
	// KEYBOARD EVENTS

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



	// =================================================================================================
	// SCROLLING
	// =================================================================================================


	(function() {
	    function easeIn(type, t, s) {
	        switch (type) {

	            case 'quad':   return t * t;
	            case 'cubic':  return t * t * t;
	            case 'quart':  return t * t * t * t;
	            case 'quint':  return t * t * t * t * t;
	            case 'circ':   return 1 - Math.sqrt(1 - t * t);
	            case 'sine':   return 1 - Math.cos(t * Math.PI / 2);
	            case 'exp':    return (t <= 0) ? 0 : Math.pow(2, 10 * (t - 1));

	            case 'back':
	                if (s == null) s = 1.70158;
	                return t * t * ((s + 1) * t - s);

	            case 'elastic':
	                if (s == null) s = 0.3;
	                return - Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1) * 2 / s - 0.5) * Math.PI );

	            case 'bounce':
	                     if (t < 1/11) return 1/64 - 7.5625 * (.5/11 - t) * (.5/11 - t);  // 121/16 = 7.5625
	                else if (t < 3/11) return 1/16 - 7.5625 * ( 2/11 - t) * ( 2/11 - t);
	                else if (t < 7/11) return 1/4  - 7.5625 * ( 5/11 - t) * ( 5/11 - t);
	                else               return 1    - 7.5625 * (    1 - t) * (    1 - t);

	            default:
	                return t;
	        }
	    }

	    M.easing = function(type, t, s) {

	        if (t==0) return 0;
	        if (t==1) return 1;

	        type = type.split('-');

	        if (type[1] == 'in') {
	            return easeIn(type[0], t, s);

	        } else if (type[1] == 'out') {
	            return 1 - easeIn(type[0], 1 - t, s)

	        } else {
	            if (t <= 0.5) return     easeIn(type[0], 2 * t,     s) / 2;
	                          return 1 - easeIn(type[0], 2 * (1-t), s) / 2;
	        }
	    };
	})();

	M.$.prototype.scrollTo = function(pos, time, easing, callback) {
	    var _this = this;

	    if (pos < 0) pos = 0;
	    if (!easing) easing = 'cubic';
	    var cancel = false;
	    this.scroll({ scroll: function() { cancel = true; } });
	    this.on('touchstart', function() { cancel = true; });

	    var t = 0;
	    var startPosition = this.$el.scrollTop;
	    var distance = pos-startPosition;
	    var startTime = +new Date;

	    function setScroll() {
	        t = +new Date - startTime;
	        var x = startPosition + distance * M.easing(easing, t / time);
	        _this.$el.scrollTop = x
	        if (callback) callback(x);
	    }

	    function animate() {
	        if (!cancel && t<time) M.animationFrame(animate)
	        setScroll();
	    }

	    animate();
	};

})();
