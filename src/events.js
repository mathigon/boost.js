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


	// ---------------------------------------------------------------------------------------------
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

	// ---------------------------------------------------------------------------------------------
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



	// ---------------------------------------------------------------------------------------------
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


	// ---------------------------------------------------------------------------------------------
	// Scroll Events

	M.$.prototype.scrollTo = function(pos, time, easing) {
		var _this = this;

		if (pos < 0) pos = 0;
		if (time == null) time = 1000;
		if (!easing) easing = 'cubic';

		var startPosition = this.$el.scrollTop;
		var distance = pos - startPosition;

		var callback = function(t) {
			var x = startPosition + distance * M.easing(easing, t);
			_this.$el.scrollTop = x;
			_this.trigger('scroll');
		};

		var animation = M.animate(callback, time);

		this.scroll({ scroll: function() { animation.cancel(); } });
		this.on('touchstart', function() { animation.cancel(); });
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
	M.$.prototype.onScroll = function(fn) {

		var scrolled = false;

		function scrollCallback() {
			fn();
			scrolled = false;
		};

		function scrollHandle(e) {
			if (!scrolled) {
				scrolled = true;
				M.animationFrame(scrollCallback);
			}
		};

		this.$el.addEventListener('scroll', scrollHandle, false);
	};
	*/





})();
