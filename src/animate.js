// =============================================================================
// Boost.js | Animations
// (c) 2015 Mathigon
// =============================================================================



import { defer } from 'utilities';
import { prefix, redraw } from 'browser';


const animationFrame = window.requestAnimationFrame ||
    function (callback) { return window.setTimeout(callback, 20); };


// -----------------------------------------------------------------------------
// Simple Animations

function animate(callback, duration) {
    var startTime = Date.now();
    var time = 0;
	var running = true;

    let deferred = defer();
    let then = deferred.promise.then.bind(deferred.promise);

    function getFrame() {
        if (running && (!duration || time <= duration)) animationFrame(getFrame);
        time = Date.now() - startTime;
        callback(duration ? Math.min(1,time/duration) : time);
        if (duration && time >= duration) deferred.resolve();
    }

    getFrame();

	return {
		cancel: function() { running = false; deferred.reject(); },
        then };
}


// -----------------------------------------------------------------------------
// Easing

function easeIn(type, t = 0, s = 0) {
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

        case 'swing':
            return 0.5 - Math.cos(t * Math.PI) / 2;

        case 'spring':
            return 1 - (Math.cos(t * 4.5 * Math.PI) * Math.exp(-p * 6));

        case 'bounce':
            if (t < 1/11) return 1/64 - 7.5625 * (0.5/11 - t) * (0.5/11 - t);  // 121/16 = 7.5625
            if (t < 3/11) return 1/16 - 7.5625 * (  2/11 - t) * (  2/11 - t);
            if (t < 7/11) return 1/4  - 7.5625 * (  5/11 - t) * (  5/11 - t);
                          return 1    - 7.5625 * (     1 - t) * (     1 - t);

        default:
            return t;
    }
}

function ease(type, t = 0, s = 0) {

    if (t === 0) return 0;
    if (t === 1) return 1;
    type = type.split('-');

    if (type[1] === 'in')  return     easeIn(type[0], t, s);
    if (type[1] === 'out') return 1 - easeIn(type[0], 1 - t, s);
    if (t <= 0.5)          return     easeIn(type[0], 2 * t,     s) / 2;
                           return 1 - easeIn(type[0], 2 * (1-t), s) / 2;
}


// -----------------------------------------------------------------------------
// Element CSS Animations

function getTransitions(element) {
    let s = window.getComputedStyle(element._el);
    if (s.getPropertyValue('transition') === 'all 0s ease 0s') return [];

    let delay    = s.getPropertyValue('transition-delay').split(',');
    let duration = s.getPropertyValue('transition-duration').split(',');
    let property = s.getPropertyValue('transition-property').split(',');
    let timing   = s.getPropertyValue('transition-timing-function')
                    .match(/[^\(\),]+(\([^\(\)]*\))?[^\(\),]*/g) || [];

    let result = [];
    for (let i = 0; i < property.length; ++i) {
        result.push({
            css:      property[i].trim(),
            delay:    M.cssTimeToNumber(delay[i]),
            duration: M.cssTimeToNumber(duration[i]),
            timing:   timing[i]
        });
    }

    return result;
}

function setTransitions(element, transitions) {
    let styles = transitions.map(function(t) {
        return [
            t.css,
            (t.duration || 1000) + 'ms',
            t.timing || 'linear',
            (t.delay || 0) + 'ms'
        ].join(' ');
    });

    element.css('transition', styles.join(', '));
}

function transitionElement(element, properties) {
    if (!Array.isArray(properties)) properties = [properties];

    let deferred = defer();
    let then = deferred.promise.then.bind(deferred.promise);

    let cancelled = false;
    if (element._data._animation) element._data._animation.cancel();

    // Set start property values of elements
    var s = window.getComputedStyle(element._el);
    properties.forEach(function(p) {
        if (p.from != null) {
            element.css(p.css, options.from);
        } else if (p.css === 'height') {
            element.css('height', parseFloat(s.getPropertyValue('height')));
        } else if (p.css === 'width') {
            element.css('width', parseFloat(s.getPropertyValue('width')));
        }
    });

    // Set transition values of elements
    var oldTransition = s.getPropertyValue('transition').replace('all 0s ease 0s', '');
    setTransitions(element, extend(getTransitions(element), properties));
    redraw();

    // Set end property values of elements
    properties.forEach(function(p) {
        element.css(p.css, p.to);
    });

    // Remove new transition values
    element.transitionEnd(function() {
        if (cancelled) return;
        element.css('transition', oldTransition);
        redraw();
        deferred.resolve();
    });

    function cancel() {
        cancelled = true;
        element.css('transition', oldTransition);

        // Freeze property values at current position  TODO check this!
        let s = window.getComputedStyle(element._el);
        properties.forEach(function(p) {
            element.css(p.css, s.getPropertyValue(p.css));
        });

        redraw();
        deferred.reject();
    }

    return element._data._animation = { cancel, then };
}


// -----------------------------------------------------------------------------
// Element CSS Animations Effects

function enter(element, time = 400, effect = 'fade', delay = 0) {
    element.show();
    let animation;

    if (effect === 'fade') {
        animation = transitionElement(element, {
            css: 'opacity',
            from: 0,
            to: 1,
            duration: time
        });

    } else if (effect === 'pop') {
        let transform = element.transform.replace(/scale\([0-9\.]*\)/, '');
        let from = transform + ' scale(0.5)';
        let to   = transform + ' scale(1)';

        animation = transitionElement(element, [
            { css: prefix('transform'), from: from, to: to, delay: delay,
              duration: time, timing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
            { css: 'opacity', from: 0, to: 1, delay: delay, duration: time }
        ]);

    } else if (effect === 'draw') {
        let l = element.strokeLength;
        element.css('stroke-dasharray', l + ' ' + l);
        animation = transitionElement(element, {
            css: 'stroke-dashoffset',
            from: l, to: 0,
            delay: delay,
            duration: time
        });
        animation.finally(function() { element.css('stroke-dasharray', ''); });
    }

    return animation;
}

function exit(element, time = 400, effect = 'fade', delay = 0) {
    let animation;

    if (effect === 'fade') {
        animation = transitionElement(element, {
            css: 'opacity',
            from: 1, to: 0,
            delay: delay,
            duration: time
        });

    } else if (effect === 'pop') {
        let transform = element.transform.replace(/scale\([0-9\.]*\)/, '');
        var from = transform + ' scale(1)';
        var to   = transform + ' scale(0.5)';

        animation = transitionElement(element, [
            { css: prefix('transform'), from: from, to: to, delay: delay,
              duration: time, timing: 'cubic-bezier(0.68, -0.275, 0.825, 0.115)' },
            { css: 'opacity', from: 1, to: 0, delay: delay, duration: time }
        ]);

    } else if (effect === 'draw') {
        var l = element.getStrokeLength();
        element.css('stroke-dasharray', l + ' ' + l);
        animation = transitionElement(element, {
            css: 'stroke-dashoffset',
            from: 0, to: l,
            delay: delay,
            duration: time
        });
    }

    animation.then(function() { element.hide(); });
    return animation;
}

// pulseDown, pulseUp, flash, bounceUp, bounceRight
function action(element, effect) {
    element.animationEnd(function(){
        element.removeClass('effects-' + effect);
    });
    element.addClass('effects-' + effect);
}

// -----------------------------------------------------------------------------

export default { animate, ease, transitionElement, enter, exit, action };

