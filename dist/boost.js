// Boost Browser and DOM Tools
// (c) 2014, Mathigon / Philipp Legner
// MIT License (https://github.com/Mathigon/boost.js/blob/master/LICENSE)

 (function() {
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

	    isChrome: navigator.userAgent.toLowerCase().indexOf('chrome') > -1,

	    hasHistory: window.history && window.history.pushState,

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

// -------------------------------------------------------------------------------------------------
// String Conversions

M.toQueryString = function(data) {
    var pairs = [];

    M.each(data, function(value, key) {
        key = encodeURIComponent(key);
        if (value == null) { pairs.push(key); return; }
        value = M.isArray(value) ? value.join(',') : '' + value;
        value = value.replace(/(\r)?\n/g, '\r\n');
        value = encodeURIComponent(value);
        value = value.replace(/%20/g, '+');

        pairs.push(key + '=' + value);
    });

    return pairs.join('&');
};

M.fromQueryString = function(string) {
    string = string.replace(/^[?,&]/,'');
    var pairs = decodeURIComponent(string).split('&');
    var result = {};
    pairs.each(function(pair) {
        var x = pair.split('=');
        result[x[0]] = x[1];
    });
    return result;
};


// -------------------------------------------------------------------------------------------------
// AJAX

M.ajax = function(url, options) {

    if (!options) options = {};
    var xhr = new XMLHttpRequest();

    var respond = function() {
        var status = xhr.status;

        if (!status && xhr.responseText || status >= 200 && status < 300 || status === 304) {
            if (!options.success) return;

            if (options.dataType === 'html') {
                var doc = document.implementation.createHTMLDocument('');
                doc.documentElement.innerHTML = xhr.responseText;
                //doc.open();
                //doc.write(xhr.responseText);
                //doc.close();
                /* TODO Scripts in Ajax DOM
                $T('script', doc).each(function(script){
                    var s = $N('script', { html: script.html() });
                    document.body.appendChild(s.$el);
                });
                */
                options.success($(doc));
            } else if (options.dataType === 'json') {
                options.success(JSON.parse(xhr.responseText));
            } else {
                options.success(xhr.responseText);
            }

        } else {
            if (options.error) options.error(xhr);
        }
    };

    if (xhr.onload) {
        xhr.onload = xhr.onerror = respond;
    } else {
        xhr.onreadystatechange = function() { if (xhr.readyState === 4) respond(); };
    }

    // Default URL
    if (!options.url) options.url = window.location.toString();

    // GET Data
    if (options.method === 'GET' || options.method === 'HEAD') {
        url += (url.indexOf('?') >= 0 ? '&' : '?');
        if (options.data) url += M.toQueryString(options.data) + '&';
        if (options.cache === false) url += '_nocache=' + Date.now();
    }

    // Open XHR Request
    if (options.async == null) options.async = 'true';
    xhr.open(options.method ? options.method.toUpperCase() : 'GET',
             url, options.async, options.user, options.password);

    // Additional headers
    if (options.headers && xhr.setRequestHeader)
        M.each(options.headers, function(header, value) {
			xhr.setRequestHeader(header, value);
		});

    // Check for crossDomain
    if (options.crossDomain == null) options.crossDomain =
        /^([\w-]+:)?\/\/([^\/]+)/.test(options.url) && RegExp.$2 !== window.location.host;
    if (options.crossDomain) xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    // POST Data
    var postData = null;
    if (options.processData == null) options.processData = true;
    if (options.contentType == null) options.contentType = 'application/x-www-form-urlencoded';

    if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        var postDataInstances = [ArrayBuffer, Blob, Document, FormData];
        if (!options.processData || postDataInstances.indexOf(options.data.constructor) >= 0) {
            postData = options.data;
        } else {
            // NOTE Check Ajax Post Data
            var boundary = '---------------------------' + Date.now().toString(16);
            if (options.contentType === 'multipart\/form-data') {
                xhr.setRequestHeader('Content-Type', 'multipart\/form-data; boundary=' + boundary);
            } else {
                xhr.setRequestHeader('Content-Type', options.contentType);
            }
            postData = '';
            var _data = M.toQueryString(options.data);
            if (options.contentType === 'multipart\/form-data') {
                boundary = '---------------------------' + Date.now().toString(16);
                _data = _data.split('&');
                var _newData = [];
                for (var i = 0; i < _data.length; i++) {
                    _newData.push('Content-Disposition: form-data; name="' +
						_data[i].split('=')[0] + '"\r\n\r\n' + _data[i].split('=')[1] + '\r\n');
                }
                postData = '--' + boundary + '\r\n' + _newData.join('--' + boundary + '\r\n') +
					'--' + boundary + '--\r\n';
            } else {
                postData = options.contentType === 'application/x-www-form-urlencoded' ?
					_data : _data.replace(/&/g, '\r\n');
            }
        }
    }

    // Send XHR Request
    xhr.send(postData);
};


// -------------------------------------------------------------------------------------------------
// Request Wrappers

M.get = function (url, data, success) {
    return M.ajax(url, {
        method: 'GET',
        dataType: 'html',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.post = function (url, data, success) {
    return M.ajax(url, {
        method: 'POST',
        dataType: 'html',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.getJSON = function (url, data, success) {
    return M.ajax(url, {
        method: 'GET',
        dataType: 'json',
        data: typeof data === 'function' ? null : data,
        success: typeof data === 'function' ? data : success
    });
};

M.getScript = function(src, success, error) {
    var script = document.createElement('script');
    script.type = 'text/javascript';

    if (error) script.onerror = error;
    if (success) script.onload = success;

    document.head.appendChild(script);
    script.src = src;
};

(function() {

	M.colour = {
	    red:    '#D90000',
	    orange: '#F15A24',
	    yellow: '#edd200',
	    lime:   '#b2d300',
	    green:  '#00B200',
	    cyan:   '#29ABE2',
	    blue:   '#006DD9',
	    violet: '#662D91',
	    purple: '#9d0069',
	    pink:   '#ED1E79'
	};

	M.colour.parse = function(c) {
	    if (c[0] === '#') {
	        return [ parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16) ];
	    } else if (c.indexOf('rgb') >= 0) {
	        return c.replace('rgb(','').replace('rgba(','').replace(')','').split(',')
	                .each(function(x){ return +x; });
	    }
	    return null;
	};

    var pad2 = function(str) {
        return str.length === 1 ? '0' + str : str;
    };

    var makeHex = function(colour) {
        var c = M.colour.parse(colour);
        return '#' + c.each(function(x) { return pad2(Math.round(x).toString(16)); }).join('');
    };

    var makeRgb = function(c) {
        var alpha = (c[3] || (c[3] === 0));
        return 'rgb' + (alpha ? 'a(' : '(') + c.slice(0,3).each(function(x) {
			return Math.round(x); }).join(',') + (alpha ? ',' + c[3] : '') + ')';
    };

    M.colour.toRgb = function(c) {
        return makeRgb(M.colour.parse(c));
    };

    M.colour.toHex = function(c) {
        return makeHex(M.colour.parse(c));
    };

    M.colour.interpolate = function(c1, c2, p) {
        p = p.bound(0,1);

        c1 = M.colour.parse(c1);
        c2 = M.colour.parse(c2);
        var alpha = (c1[3] != null || c2[3] != null);
        if (c1[3] == null) c1[3] = 1;
        if (c2[3] == null) c2[3] = 1;

        return makeRgb([
            p*c1[0]+(1-p)*c2[0],
            p*c1[1]+(1-p)*c2[1],
            p*c1[2]+(1-p)*c2[2],
            alpha ? p*c1[3]+(1-p)*c2[3] : null
        ]);
    };

	// Gets the colour of a multi-step gradient at a given percentage p
	M.colour.getColourAt = function(gradient, p) {
	    p = p.bound(0, 0.999);
	    var r = Math.floor(p * (gradient.length - 1));
	    var q = p * (gradient.length - 1) - r;
	    return M.colour.interpolate(gradient[r+1], gradient[r], q);
	};

    // Colour Schemes from http://www.sron.nl/~pault/colourschemes.pdf

    var rainbow = ['#D92120', '#E6642C', '#E68E34', '#D9AD3C', '#B5BD4C', '#7FB972', '#63AD99',
	               '#55A1B1', '#488BC2', '#4065B1', '#413B93', '#781C81'];
    M.colour.rainbow = function(steps) {
        var scale = (0.4 + 0.15 * steps).bound(0,1);
        return M.tabulate(function(x){ return M.colour.getColourAt(rainbow, scale*x/(steps-1)); }, steps);
    };

    var temperature = ['#3D52A1', '#3A89C9', '#77B7E5', '#B4DDF7', '#E6F5FE', '#FFFAD2', '#FFE3AA',
                       '#F9BD7E', '#ED875E', '#D24D3E', '#AE1C3E'];
    M.colour.temperature = function(steps) {
        var scale = (0.1 * steps).bound(0,1);
        return M.tabulate(function(x){
            return M.colour.getColourAt(temperature, (1-scale)/2 + scale*x/(steps-1) ); }, steps);
    };

    var solar = ['#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F', '#FB9A29', '#EC7014', '#CC4C02',
                 '#993404', '#662506'];
    M.colour.solar = function(steps) {
        return M.tabulate(function(x){ return M.colour.getColourAt(solar, x/(steps-1)); }, steps);
    };

})();

M.cookie = {

    get: function get(name) {
        return M.cookie.has(name) ? M.cookie.list()[name] : null;
    },

    has: function has(name) {
        return new RegExp('(?:;\\s*|^)' + encodeURIComponent(name) + '=').test(document.cookie);
    },

    list: function list() {
        var pairs = document.cookie.split(';'), pair, result = {};
        for (var i = 0, n = pairs.length; i < n; ++i) {
            pair = pairs[i].split('=');
            pair[0] = pair[0].replace(/^\s+|\s+$/, '');
            result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return result;
    },

    remove: function remove(name, options) {
        if (!options) options = {};
        options.expires = new Date(0);
        options.maxAge = -1;
        return M.cookie.set(name, null, options);
    },

    // Possible optional options:
    // path     Specify path within the current domain, for example '/'
    // domain   Specify the (sub)domain the cookie pertains to. Can range from the root domain
    //          ('mathigon.org') up to the current subdomain ('test.world.mathigon.org').
    // maxAge   Specify, in seconds, the lifespan of the cookie.
    // expires  Set cookie expiry using an absolute GMT date/time string with an RFC2822 format
    //          (e.g. 'Tue, 02 Feb 2010 22:04:47 GMT')or a JS Date object.
    // secure   Specify whether the cookie should only be passed through HTTPS connections.
    set: function set(name, value, options) {
        options = options || {};
        var cookie = [encodeURIComponent(name) + '=' + encodeURIComponent(value)];
        if (options.path)    cookie.push('path=' + options.path);
        if (options.domain)  cookie.push('domain=' + options.domain);
        if (options.maxAge)  cookie.push('max-age=' + options.maxAge);
        if (options.expires) cookie.push('expires=' + (M.isDate(options.expires) ?
			                 	         options.expires.toUTCString() : options.expires));
        if (options.secure)  cookie.push('secure');
        document.cookie = cookie.join(';');
    }

};

(function() {

    var hasHistory = M.browser.hasHistory;
    var id = 0;

    var root = window.location.origin + window.location.port;
    var path = window.location.pathname.replace(root, '');
    var hash = window.location.hash.replace(/^#/, '');

    var History = M.Class.extend({

        back: function() {
            if(hasHistory) window.history.back();
        },

        forward : function() {
            if (hasHistory) window.history.forward();
        },

        go: function(n) {
            if (hasHistory) window.history.go(n);
        },

        push: function(url, state) {
            ++id;
            if (!state) state = { url: url };
            if (hasHistory) window.history.pushState({id: id, state: state }, '', url);
        },

        replace: function(url, state) {
            if (!state) state = { url: url };
            if (hasHistory) window.history.replaceState(state, '', url);
        }

    });

    M.history = new History();

    Object.defineProperty(M.history, 'hash', {
        enumerable: true,
        configurable : true,
        get: function() {
            return hash;
        },
        set: function(newHash) {
            ++id;
            hash = newHash;
            if (hasHistory) {
                window.history.pushState({id: id, state: {}}, '', path + '#' + hash);
            } else {
                window.location.hash = '#' + hash;
            }
        }
    });

    var popped = ('state' in window.history);
    var initialURL = location.href;

    window.addEventListener('popstate', function(e){
        var validPop = popped || location.href === initialURL;
        popped = true;
        if (!validPop) return;

        path = window.location.pathname;
        hash = window.location.hash.replace(/^#/, '');

        if (!e.state) return;
        var newId = e.state.id;
        M.history.trigger('change', e.state.state);
        if (newId < id) M.history.trigger('back', e.state.state);
        if (newId > id) M.history.trigger('forward', e.state.state);
        id = newId;
    });

})();

(function() {

	M.storage = {};

	M.storage.set = function(key, value) {

	    var keys = (key||'').split('.');
	    var storage = JSON.parse(window.localStorage.getItem('M') || '{}');
	    var path = storage;

	    for (var i=0; i<keys.length-1; ++i) {
	        if (path[keys[i]] == null) path[keys[i]] = {};
	        path = path[keys[i]];
	    }

	    path[keys.last()] = value;

	    window.localStorage.setItem('M', JSON.stringify(storage));
	};

	M.storage.get = function(key) {

	    var keys = (key||'').split('.');
	    var storage = JSON.parse(window.localStorage.getItem('M') || '{}');
	    var path = storage;

	    for (var i=0; i<keys.length-1; ++i) {
	        if (path[keys[i]] == null) return null;
	        path = path[keys[i]];
	    }

	    return key ? path[keys.last()] : path;
	};

	M.storage.clear = function(key) {
	    if (key) {
	        M.storage.set(key, null);
	    } else {
	        window.localStorage.setItem('M', '');
	    }
	};

})();

(function() {

	M.$ = function ($el) {
		this._data   = $el ? ($el._mdata   || ($el._mdata   = {})) : {};
		this._events = $el ? ($el._mevents || ($el._mevents = {})) : {};
		this.$el = $el;
		this._isWindow = M.isOneOf($el, window, document.body, document.documentElement);
	};


	// ---------------------------------------------------------------------------------------------
	// Constructors and Query Selectors

	// Creates a single M.$ element from an arbitrary query string or a Node element
	window.$ = function(selector, context) {
	    if (typeof selector === 'string') {
	        context = context ? (context.$el || context) : document;
			var $el = context.querySelector(selector);
			return $el ? new M.$($el) : null;
	    } else if (selector instanceof Node || selector === window) {
	        return new M.$(selector);
	    }
	};

	// Returns a single M.$ element by id
	window.$I = function(selector, context) {
	    context = (context && context.$el.getElementById) ? context.$el : document;
		var $el = context.getElementById(selector);
		return $el ? new M.$($el) : null;
	};

	// Returns a single M.$ element by class name
	window.$C = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.getElementsByClassName(selector);
	    return $els.length ? new M.$($els[0]) : null;
	};

	// Returns a single M.$ element by tag name
	window.$T = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.getElementsByTagName(selector);
		return $els.length ? new M.$($els[0]) : null;
	};

	// Returns an array of M.$ elements based on an arbitrary query string
	window.$$ = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.querySelectorAll(selector);
	    return M.each($els, function($el) { return new M.$($el); });
	};

	// Returns an array of M.$ elements with a given class name
	window.$$C = function(selector, context) {
		context = context ? (context.$el || context) : document;
		var $els = context.getElementsByClassName(selector);
		return M.each($els, function($el) { return new M.$($el); });
	};

	// Returns an array of M.$ elements with a given tag name
	window.$$T = function(selector, context) {
		context = context ? (context.$el || context) : document;
		var $els = context.getElementsByTagName(selector);
		return M.each($els, function($el) { return new M.$($el); });
	};

	// Creates a new DOM node and M.$ element
	window.$N = function(tag, attributes, parent) {
	    var t = document.createElement(tag);

	    for (var a in attributes) {
	        if (a === 'id') {
	            t.id = attributes.id;
	        } else if (a === 'class') {
	            t.className = attributes.class;
	        } else if (a === 'html') {
	            t.innerHTML = attributes.html;
	        } else {
	            t.setAttribute(a, attributes[a]);
	        }
	    }

	    var $el = new M.$(t);
	    if (parent) parent.append($el);
	    return $el;
	};

	// Converts an arbitrary html string into an array of M.$ elements
	window.$$N = function(html) {
	    var tempDiv = $N('div', { html: html });
	    return tempDiv.children();
	};


	// ---------------------------------------------------------------------------------------------
	// Basic Functionality

	function _addClass($el, className) {
		if ($el.$el.classList) {
			$el.$el.classList.add(className);
		} else if (!$el.hasClass(className)) {
			$el.$el.className += ' ' + className;
		}
	}

	M.$.prototype.addClass = function(className) {
	    var classes = className.trim().split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        _addClass(this, classes[i]);
	    }
	};

	function _removeClass($el, className) {
		if ($el.$el.classList) {
			$el.$el.classList.remove(className);
		} else if ($el.hasClass(className)) {
			$el.$el.className = (' ' + $el.$el.className + ' ').replace(' ' + className + ' ', ' ');
		}
	}

	M.$.prototype.removeClass = function(className) {
	    var classes = className.trim().split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        _removeClass(this, classes[i]);
	    }
	};

	M.$.prototype.hasClass = function(className) {
	    return (' ' + this.$el.className + ' ').indexOf(' ' + className.trim() + ' ') >= 0;
	};

	function _toggleClass($el, className) {
		if ($el.$el.classList) {
			$el.$el.classList.toggle(className);
		} else if ($el.hasClass(className)) {
			$el.addClass(className);
		} else {
			$el.removeClass(className);
		}
	}

	M.$.prototype.toggleClass = function(className) {
	    var classes = className.trim().split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        _toggleClass(this, classes[i]);
	    }
	};

	M.$.prototype.setClass = function(className, condition) {
	    if (condition) {
	        this.addClass(className);
	    } else {
	        this.removeClass(className);
	    }
	};

	M.$.prototype.attr = function(attr, value) {
	    if (value == null) {
	        return this.$el.getAttribute(attr);
	    } else if (value === null) {
	        this.$el.removeAttribute(attr);
	    } else {
	        this.$el.setAttribute(attr, value);
	    }
	};

	M.$.prototype.data = function(key, value) {
	    if (value == null) {
	        var dataAttr = this.$el.getAttribute('data-' + key);
	        return dataAttr ? dataAttr : (this._data ? this._data[key] : undefined);
	    } else {
	        this._data[key] = value;
	    }
	};

	M.$.prototype.value = function(value) {
	    if (value == null) {
	        return this.$el.value;
	    } else {
	        this.$el.value = value;
	    }
	};

	M.$.prototype.html = function(html) {
	    if (html == null) {
	        return this.$el.innerHTML;
	    } else {
	        this.$el.innerHTML = html;
	    }
	};

	M.$.prototype.text = function(text) {
	    if (text == null) {
	        return this.$el.textContent.trim();
	    } else {
	        this.$el.textContent = text;
	    }
	};


	// ---------------------------------------------------------------------------------------------
	// Dimensions

	// Includes border and padding
	M.$.prototype.width = function() {
		if (this._isWindow) return window.innerWidth;
	    return this.$el.offsetWidth;
	};

	// Doesn't include border and padding
	M.$.prototype.innerWidth = function() {
		if (this._isWindow) return window.innerWidth;
		return this.$el.clientWidth - parseFloat(this.css('padding-left')) - parseFloat(this.css('padding-right'));
	};

	// Includes Margins
	M.$.prototype.outerWidth = function() {
		if (this._isWindow) return window.outerWidth;
		return this.$el.offsetWidth + parseFloat(this.css('margin-right')) + parseFloat(this.css('margin-left'));
	};

	M.$.prototype.scrollWidth = function() {
		if (this._isWindow) return M.$body.$el.scrollWidth;
		return this.$el.scrollWidth;
	};

	// Includes border and padding
	M.$.prototype.height = function() {
		if (this._isWindow) return window.innerHeight;
	    return this.$el.offsetHeight;
	};

	// Doesn't include border and padding
	M.$.prototype.innerHeight = function() {
		if (this._isWindow) return window.innerHeight;
		return this.$el.clientHeight - parseFloat(this.css('padding-bottom')) - parseFloat(this.css('padding-top'));
	};

	// Includes Margins
	M.$.prototype.outerHeight = function() {
		if (this._isWindow) return window.outerHeight;
		return this.$el.offsetHeight + parseFloat(this.css('margin-top')) + parseFloat(this.css('margin-bottom'));
	};

	M.$.prototype.scrollHeight = function() {
		if (this._isWindow) return M.$body.$el.scrollHeight;
		return this.$el.scrollHeight;
	};

	M.$.prototype.offset = function($parent) {

	    if ($parent === 'parent') $parent = this.parent();
	    if ($parent === 'body') $parent = M.$body;
		var box;

	    // Get offset from immediate parent
	    if ($parent && $parent.$el === this.$el.offsetParent) {
	        var top = this.$el.offsetTop + $parent.$el.clientTop;
	        var left = this.$el.offsetLeft + $parent.$el.clientLeft;
	        var bottom = top +  this.$el.offsetHeight;
	        var right = left + this.$el.offsetWidth;
	        return { top: top, left: left, bottom: bottom, right: right };

	    // Get offset based on any other element including $(document.body)
	    } else if ($parent) {
	        var parentBox = $parent.$el.getBoundingClientRect();
	        box = this.$el.getBoundingClientRect();
	        return { top:    box.top    - parentBox.top, left:  box.left  - parentBox.left,
	                 bottom: box.bottom - parentBox.top, right: box.right - parentBox.left };

	    // Get offset based on viewport
	    } else {
	        box = this.$el.getBoundingClientRect();
	        return { top: box.top, left: box.left, bottom: box.bottom, right: box.right };
	    }
	};

	M.$.prototype.scrollTop = function(y) {
		if (y == null) {
			return this._isWindow ? window.pageYOffset : this.$el.scrollTop;
		} else {
			if (this._isWindow) {
				document.body.scrollTop = document.documentElement.scrollTop = y;
			} else {
				this.$el.scrollTop = y;
			}
		}
	};

	M.$.prototype.scrollLeft = function(x) {
		if (x == null) {
			return this._isWindow ? window.pageXOffset : this.$el.scrollLeft;
		} else {
			if (this._isWindow) {
				document.body.scrollLeft = document.documentElement.scrollLeft = x;
			} else {
				this.$el.scrollLeft = x;
			}
		}
	};


	// ---------------------------------------------------------------------------------------------
	// Styles

	M.$.prototype.css = function(props, value) {
	    if (arguments.length === 1) {
	        if (typeof props === 'string') {
	            return window.getComputedStyle(this.$el, null).getPropertyValue(props);
	        } else {
	            for (var prop in props) if (M.has(props, prop)) this.$el.style[prop] = props[prop];
	        }
	    } else if (arguments.length === 2 && typeof props === 'string') {
	        this.$el.style[M.toCamelCase(props)] = value;
	    }
	};

	M.$.prototype.transition = function(property, duration, curve) {
		if (arguments.length === 1) this.$el.style[M.prefix('transition')] = property;
	    if (typeof duration !== 'string') duration = duration + 'ms';
	    this.$el.style[M.prefix('transition')] = property + ' ' + duration + (curve ? ' ' + curve : '');
	};

	M.$.prototype.transform = function(transform) {
	    this.$el.style[M.prefix('transform')] = (transform || '');
	};

	M.$.prototype.translateX = function(x) {
	    x = Math.round(+x || 0);
	    this.$el.style[M.prefix('transform')] = 'translate(' + x + 'px,0)';
	};

	M.$.prototype.translateY = function(y) {
	    y = Math.round(+y || 0);
	    this.$el.style[M.prefix('transform')] = 'translate(0px,'+y+'px)';
	};

	M.$.prototype.hide = function() {
	    this.css('display', 'none');
	    this.css('visibility', 'hidden');
	};

	M.$.prototype.show = function() {
	    this.css('display', 'block');
	    this.css('visibility', 'visible');
	};


	// ---------------------------------------------------------------------------------------------
	// DOM Manipulation

    // Removes an element from the DOM for more performant node manipulation. The element
    // is placed back into the DOM at the place it was taken from.
    M.$.prototype.manipulate = function(fn){
      	var next = this.$el.nextSibling;
        var parent = this.$el.parentNode;
        var frag = document.createDocumentFragment();
        frag.appendChild(this.$el);
        var returned = fn.call(this) || this.$el;
      	if (next) {
			parent.insertBefore(returned, next);
		} else {
			parent.appendChild(returned);
		}
    };

	M.$.prototype.is = function(selector) {
	    var compareWith = document.querySelectorAll(selector);
	    for (var i = 0, l = compareWith.length; i < l; ++i)
	        if (compareWith[i] === this.$el) return true;
	    return false;
	};

	M.$.prototype.index = function() {
	    var i = 0;
	    var child = this.$el;
	    while ((child = child.previousSibling) !== null) i++;
	    return i;
	};

	M.$.prototype.append = function(newChild) {
	    var _this = this;
	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        newChildren.each(function(child) {
	            _this.$el.appendChild(child.$el);
	        });
	    } else {
	        this.$el.appendChild(newChild.$el);
	    }
	};

	M.$.prototype.prepend = function(newChild) {
	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        for (var j = newChildren.length - 1; j >= 0; j--) {
	            this.$el.insertBefore(newChildren[j], this.$el.childNodes[0]);
	        }
	    } else {
	        this.$el.insertBefore(newChild.$el, this.$el.childNodes[0]);
	    }
	};

	M.$.prototype.insertBefore = function(newChild) {
	    var _this = this;
	    var parent = this.parent();

	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        for (var j = newChildren.length - 1; j >= 0; j--) {
	            parent.$el.insertBefore(newChildren[j].$el, _this.$el);
	        }
	    } else {
	        parent.$el.insertBefore(newChild.$el, _this.$el);
	    }
	};

	M.$.prototype.insertAfter = function(newChild) {
	    var _this = this;
	    var parent = this.parent();

	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        newChildren.each(function(child) {
	            parent.$el.insertAfter(_this.$el, child.$el);
	        });
	    } else {
	        var next = _this.$el.nextSibling;
	        if (next) {
	            parent.$el.insertBefore(newChild.$el, next);
	        } else {
	            parent.$el.appendChild(newChild.$el);
	        }
	    }
	};

	M.$.prototype.wrap = function(wrapper) {
	    if (typeof wrapper === 'string') wrapper = $(document.createElement(wrapper));
	    this.insertBefore(wrapper);
	    this.remove();
	    wrapper.append(this);
	};

	M.$.prototype.moveTo = function(newParent, before) {
	    this.remove();
	    if (before) {
	        newParent.prepend(this);
	    } else {
	        newParent.append(this);
	    }
	};

	M.$.prototype.next = function () {
	    var next = this.$el.nextSibling;
	    return next ? $(next) : null;
	};

	M.$.prototype.prev = function () {
	    var prev = this.$el.previousSibling;
	    return prev ? $(prev) : null;
	};

	M.$.prototype.find = function(selector) {
	    return $$(selector, this);
	};

	M.$.prototype.parent = function() {
	    var parent = this.$el.parentNode;
	    return parent ? $(parent) : null;
	};

	M.$.prototype.parents = function(selector) {
	    var parents = [];
	    var parent = this.parent();
	    while (parent) {
	        if (!selector || parent.is(selector)) parents.push(parent);
	        parent = parent.parent();
	    }
	    return parents;
	};

	M.$.prototype.children = function(selector) {
	    var childNodes = this.$el.children;

	    if (!childNodes) {
	        childNodes = [];
	        var nodes = this.$el.childNodes;
	        M.each(nodes, function(n) {
	            if (!n.data || n.data.trim()) childNodes.push(n);
	        });
	    }

	    if (typeof selector === 'number') {
	        return $(childNodes[selector]);
	    } else {
	        var children = [];
	        for (var i = 0, l = childNodes.length; i < l; ++i)
	            if (!selector || $(childNodes[i]).is(selector))
	                children.push($(childNodes[i]));
	        return children;
	    }
	};

	M.$.prototype.remove = function () {
	    if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
	};

	M.$.prototype.delete = function () {
	    this.remove();
	    this.$el = null;
	};

	M.$.prototype.clear = function () {
	    var _this = this;
	    this.children().each(function($el) {
	        _this.$el.removeChild($el.$el);
	    });
	};

	M.$.prototype.replace = function(newEl) {
	    this.insertAfter(newEl);
	    this.remove();
	};


	// ---------------------------------------------------------------------------------------------
	// Special Elements

	M.$body = $(document.body);
	M.$html = $T('html');
	M.$window = $(window);
	M.$doc = $(window.document.documentElement);

	M.$html.addClass( M.browser.isTouch ? 'is-touch' : 'not-touch' );
	M.$html.addClass( M.browser.isMobile ? 'is-mobile' : 'not-mobile' );

})();

(function() {

    M.animationFrame = (function() {
        var rAF = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function (callback) { return window.setTimeout(callback, 20); };
        return function(fn) { return rAF(fn); };
    })();

    M.cancelAnimationFrame = (function(){
          var cAF = window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame    ||
            window.msCancelAnimationFrame     ||
            window.clearTimeout;
          return function(id) { return cAF(id); };
    })();

    M.animate = function(callback, duration) {
        var startTime = +new Date();
        var time = 0;
		var running = true;

        function getFrame() {
            if (running && (!duration || time <= duration)) M.animationFrame(getFrame);
            time = +new Date() - startTime;
            callback(duration ? time/duration : time);
        }

        getFrame();

		return {
			cancel: function() { running = false; }
		};
    };


    // ---------------------------------------------------------------------------------------------
    // Element Animations (CSS)

    M.$.prototype.getTransitions = function() {
        var s = window.getComputedStyle(this.$el);
        var delay    = s.getPropertyValue('transition-delay').split(',');
        var duration = s.getPropertyValue('transition-duration').split(',');
        var property = s.getPropertyValue('transition-property').split(',');
        var timing   = s.getPropertyValue('transition-timing-function')
                        .match(/[^\(\),]+(\([^\(\)]*\))?[^\(\),]*/g);

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
            if (options.css === 'width') this.css('width',  parseFloat(s.getPropertyValue('width')));
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
            if (callback) callback.call(_this);
        });
    };


    // ---------------------------------------------------------------------------------------------
    // Element Animations (Enter/Exit)

    M.$.prototype.getStrokeLength = function() {
        if (this.$el.getTotalLength) {
            return this.$el.getTotalLength();
        } else {
            var dim = this.$el.getBoundingClientRect();
            return 2 * dim.height + 2 * dim.width;
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

    M.$.prototype.fadeIn = function(time) {
        this.show();
        this.animate({ css: 'opacity', from: 0, to: 1, duration: time });
    };

    M.$.prototype.fadeOut = function(time) {
        this.animate({ css: 'opacity', from: 1, to: 0, duration: time },
            function() { this.hide(); });
    };


    // ---------------------------------------------------------------------------------------------
    // Animated Effects

    var effects = ['pulseDown', 'pulseUp', 'flash', 'bounceUp', 'bounceRight'];

    effects.each(function(name){
        M.$.prototype[name] = function() {
            var _this = this;
            _this.animationEnd(function(){
                _this.removeClass('effects-'+name);
            });
            _this.addClass('effects-'+name);
        };
    });


    // ---------------------------------------------------------------------------------------------
    // Easing

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
                if (t < 1/11) return 1/64 - 7.5625 * (0.5/11 - t) * (0.5/11 - t);  // 121/16 = 7.5625
                if (t < 3/11) return 1/16 - 7.5625 * (  2/11 - t) * (  2/11 - t);
                if (t < 7/11) return 1/4  - 7.5625 * (  5/11 - t) * (  5/11 - t);
                              return 1    - 7.5625 * (     1 - t) * (     1 - t);

            default:
                return t;
        }
    }

    M.easing = function(type, t, s) {

        if (t === 0) return 0;
        if (t === 1) return 1;
        type = type.split('-');

        if (type[1] === 'in')  return     easeIn(type[0], t, s);
        if (type[1] === 'out') return 1 - easeIn(type[0], 1 - t, s);
        if (t <= 0.5)          return     easeIn(type[0], 2 * t,     s) / 2;
                               return 1 - easeIn(type[0], 2 * (1-t), s) / 2;
    };

})();

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


})();