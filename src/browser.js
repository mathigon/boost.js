// =================================================================================================
// Boost.js | Browser Utilities
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================



if (typeof M !== 'object' || !M.core || !M.fermat)
	throw new Error('boost.js requires core.js and fermat.js.');
M.boost = true;


(function() {

	M.browser = {
	    width:    window.innerWidth,
	    height:   window.innerHeight,

	    isMobile: (typeof window.orientation !== 'undefined'),
	    isRetina: ((window.devicePixelRatio || 1) > 1),
	    isTouch:  ('ontouchstart' in window) || (window.DocumentTouch && document instanceof window.DocumentTouch),
	    imgExt:   ((window.devicePixelRatio || 1) > 1.25) ? '@2x' : '',

	    speechRecognition: ('webkitSpeechRecognition' in window)
	};

	M.redraw = function() {
		/*jshint -W030 */
	    document.body.offsetHeight;
	};

	M.now = Date.now || function getTime () { return new Date().getTime(); };

	M.toCamelCase = function(str) {
	    return str.toLowerCase().replace(/^-/,'').replace(/-(.)/g, function(match, g) {
	        return g.toUpperCase();
	    });
	};

	// Generates a random ID string
	M.uid = function(){
	    return Math.random().toString(36).substr(2,10);
	};

	M.is3DTransform = (function(){
	    var style = document.createElement('div').style;
	    return ('webkitPerspective' in style || 'MozPerspective' in style ||
	        'OPerspective' in style || 'MsPerspective' in style || 'perspective' in style);
	})();


	// ---------------------------------------------------------------------------------------------
	// ONLOAD EVENTS

	var loadQueue = [];
	var loaded = false;

	window.onload = function() {
		loaded = true;
		for (var i=0; i<loadQueue.length; ++i) loadQueue[i]();
	};

	M.onload = function(fn) {
		if (loaded) {
			fn();
		} else {
			loadQueue.push(fn);
		}
	};


	// ---------------------------------------------------------------------------------------------
	// CSS

	M.cssTimeToNumber = function(cssTime) {
	    var regex = /^([\-\+]?[0-9]+(\.[0-9]+)?)(m?s)$/;
	    var matches = regex.exec(cssTime.trim());
	    if (matches === null) return null;
	    return (+matches[1]) * (matches[3] === 's' ? 1000 : 1);
	};


	M.addCSSRule = function(selector, rules) {
	    var css = document.styleSheets[document.styleSheets.length-1];
	    var index = css.rules.length-1;
	    if(css.insertRule) {
	        css.insertRule(selector + '{' + rules + '}', index);
	    } else {
	        css.addRule(selector, rules, index);
	    }
	};

    var cache = {};
    var style;
    var prefixes = {'webkit': 'webkit', 'moz': 'Moz', 'ms': 'ms'};

	// document.body doesn't exist if this file is included in the <head> of an html file
	M.onload(function(){ style = document.body.style; });

    var findCssPrefix = function(name) {
        var rule = M.toCamelCase(name);
        if (style[rule] != null) return name;
        rule = rule.toTitleCase();
        for (var v in prefixes) {
            if (style[prefixes[v] + rule] != null) return '-' + v + '-' + name;
        }
        return name;
    };

    M.prefix = function(name) {
        if (cache[name]) return cache[name];
        var rule = findCssPrefix(name);
        cache[name] = rule;
        return rule;
    };

})();
