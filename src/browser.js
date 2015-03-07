// =================================================================================================
// Boost.js | Browser Utilities
// (c) 2015 Mathigon / Philipp Legner
// =================================================================================================



if (typeof M !== 'object' || !M.core || !M.fermat)
	throw new Error('boost.js requires core.js and fermat.js.');
M.boost = true;


(function() {

	var ua = window.navigator.userAgent;
	var isIE = (ua.indexOf('MSIE') >= 0) || (ua.indexOf('Trident') >= 0);

	M.browser = {
	    width:    window.innerWidth,
	    height:   window.innerHeight,

	    isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
					.test(navigator.userAgent.toLowerCase()),
	    isRetina: ((window.devicePixelRatio || 1) > 1),
	    isTouch:  ('ontouchstart' in window) || (window.DocumentTouch && document instanceof window.DocumentTouch),
	    imgExt:   ((window.devicePixelRatio || 1) > 1.25) ? '@2x' : '',

	    isChrome: window.chrome,
	    isIE: isIE,

	    hasHistory: window.history && window.history.pushState && (!isIE || ua.indexOf('MSIE 1') >= 0),
	    hasClipPath: (document.body.style.clipPath != null || document.body.style.webkitClipPath != null) && !isIE,

	    speechRecognition: ('webkitSpeechRecognition' in window)
	};

	M.redraw = function() {
		/*jshint -W030 */
	    document.body.offsetHeight;
	};

	M.now = Date.now || function() { return +(new Date()); };

	M.toCamelCase = function(str) {
	    return str.toLowerCase().replace(/^-/,'').replace(/-(.)/g, function(match, g) {
	        return g.toUpperCase();
	    });
	};

	// Generates a random ID string
	M.uid = function(){
	    return Math.random().toString(36).substr(2,10);
	};


	// ---------------------------------------------------------------------------------------------
	// ONLOAD EVENTS

	var loadQueue = [];
	var loaded = false;

	function afterLoad() {
		if (loaded) return;
		loaded = true;
		for (var i=0; i<loadQueue.length; ++i) loadQueue[i]();
	}

	window.onload = function() {
		afterLoad();
		if (M.resize()) M.resize();
	};

	document.addEventListener('DOMContentLoaded', function(event) {
		afterLoad();
	});

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
	    var index = css.cssRules.length - 1;
	    if(css.insertRule) {
	        css.insertRule(selector + '{' + rules + '}', index);
	    } else {
	        css.addRule(selector, rules, index);
	    }
	};

    var style = document.createElement('div').style;
    var prefixes = [['webkit', 'webkit'], ['moz', 'Moz'], ['ms', 'ms'], ['O', 'o']];

	M.prefix = M.cache(function(name) {
	    var rule = M.toCamelCase(name).toTitleCase();
	    for (var i = 0; i < prefixes.length; ++i) {
	        if (style[prefixes[i][1] + rule] != null) return '-' + prefixes[i][0] + '-' + name;
	    }
	    return name;
	});

})();
