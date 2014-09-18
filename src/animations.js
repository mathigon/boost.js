// =================================================================================================
// Volta.js | TODO
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.$.prototype.getTransitions = function() {
	    var s = window.getComputedStyle(this.$el);
	    var delay    = s.getPropertyValue('transition-delay').split(',');
	    var duration = s.getPropertyValue('transition-duration').split(',');
	    var property = s.getPropertyValue('transition-property').split(',');
	    var timing   = s.getPropertyValue('transition-timing-function').match(/[^\(\),]+(\([^\(\)]*\))?[^\(\),]*/g);

	    var result = [];
	    for (var i=0; i<property.length; ++i) {
	        result.push({
	            css:      property[i].trim(),
	            delay:    M.cssTimeToNumber(delay[i]),
	            duration: M.cssTimeToNumber(duration[i]),
	            timing:   timing[i]
	        });
	    }

	    return result;
	};

	M.$.prototype.setTransitions = function(transitions) {
	    var css = [];

	    M.each(transitions, function(options) {
	        css.push([
	            options.css,
	            (options.duration || 1000) + 'ms',
	            options.timing || 'linear',
	            (options.delay || 0) + 'ms'
	        ].join(' '));
	    });

	    this.css('transition', css.join(', '));
	};

	M.$.prototype.animate = function(props, callback) {
	    var _this = this;
	    if (!M.isArray(props)) props = [props];

	    // Set start property values of elements
	    var s = window.getComputedStyle(this.$el);
	    M.each(props, function(options) {
	        if (options.css === 'height') this.css('height', parseFloat(s.getPropertyValue('height')));
	        if (options.css === 'width')  this.css('width',  parseFloat(s.getPropertyValue('width')));
	        if (options.from != null) _this.css(options.css, options.from);
	    });

	    // Set transition values of elements
	    var oldTransition = s.getPropertyValue(M.prefix('transition'));
	    this.setTransitions(M.merge(this.getTransitions(), props));
	    M.redraw();

	    // Set end property values of elements
	    M.each(props, function(options) {
	        _this.css(options.css, options.to);
	    });

	    // Remove new transition values
	    this.transitionEnd(function() {
	        _this.css(M.prefix('transition'), oldTransition);
	        M.redraw();
	        if (callback) callback();
	    });
	};

	M.animate = function(callback, duration) {
	    var startTime = +new Date;
	    var time = 0;
	    getFrame();

	    function getFrame() {
	        if (time <= duration) M.animationFrame(getFrame);
	        time = +new Date - startTime;
	        callback(time / duration);
	    };
	};


	// ---------------------------------------------------------------------------------------------
	// Enter/Exit Animations

	M.$.prototype.getStrokeLength = function() {
	    if (this.$el.getTotalLength) {
	        return this.$el.getTotalLength();
	    } else {
	        var dim = this.$el.getBoundingClientRect();
	        return FM.vector.length([dim.height, dim.width]);
	    }
	};

	M.$.prototype.enter = function(effect, time, delay) {
	    this.css('visibility', 'visible');
	    if (!time) return;
	    if (!effect) effect = 'fade';

	    if (effect === 'fade') {
	        this.animate({ css: 'opacity', from: 0, to: 1, duration: time });

	    } else if (effect === 'pop') {
	        this.css('opacity', '1');
	        this.animate({
	            css: M.prefix('transform'),
	            from: 'scale(0)', to: 'scale(1)', delay: delay,
	            duration: time, timing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
	        });

	    } else if (effect === 'draw') {
	        var l = this.getStrokeLength();
	        this.css('stroke-dasharray', l + ' ' + l);
	        this.animate({ css: 'stroke-dashoffset', from: l, to: 0, delay: delay, duration: time });
	    }
	};

	M.$.prototype.exit = function(effect, time, delay) {
	    var _this = this;
	    if (!time) { this.css('visibility', 'hidden'); return; }
	    if (!effect) effect = 'fade';

	    if (effect === 'fade') {
	        this.animate({ css: 'opacity', from: 1, to: 0, duration: time },
	                     function() { _this.css('visibility', 'hidden'); });
	    } else if (effect === 'draw') {
	        var l = this.getStrokeLength();
	        this.css('stroke-dasharray', l + ' ' + l);
	        this.animate({ css: 'stroke-dashoffset', from: 0, to: l, delay: delay, duration: time });
	    }
	};


	// -------------------------------------------------------------------------------------------------
	// Old Transitions

	// Requires css transition: height, no padding or margin
	M.$.prototype.slideUp = function(callback) {
	    var _this = this;
	    this.$el.sliding = 'up';
	    this.$el.style.height = this.height() + 'px';
	    M.redraw();
	    this.$el.style.height = '0px';

	    this.transitionEnd(function(){
	        if (_this.$el.sliding === 'up' && callback) callback();
	    });
	};

	// Requires css transition: height, no padding or margin, single wrapper child
	M.$.prototype.slideDown = function(callback) {
	    var _this = this;
	    this.$el.sliding = 'down';
	    this.$el.style.height = this.children(0).height('margin') + 'px';

	    this.transitionEnd(function(){
	        if (_this.$el.sliding === 'down') {
	            _this.$el.style.height = 'auto';
	            if (callback) callback();
	        }
	    });
	};

	// Requires css transition: opacity
	M.$.prototype.fadeIn = function() {
	    var _this = this;
	    _this.$el.style.display = 'block';
	    M.redraw();
	    this.$el.style.opacity = '1';
	};

	// Requires css transition: opacity
	M.$.prototype.fadeOut = function() {
	    var _this = this;
	    this.$el.style.opacity = '0';
	    this.transitionEnd(function(){
	        _this.$el.style.display = 'none';
	    });
	};

    var effects = ['pulse', 'pop', 'jumpY', 'jumpX', 'flash'];

    effects.each(function(name){
        M.$.prototype[name] = function() {
            var _this = this;
            _this.animationEnd(function(){
                _this.removeClass('effects-'+name);
            });
            _this.addClass('effects-'+name);
        };
    });

})();
