// =================================================================================================
// Boost.js | Browser Utilities
// (c) 2015 Mathigon / Philipp Legner
// =================================================================================================



import { cache, throttle } from 'utilities';
import Evented from 'evented';


// ---------------------------------------------------------------------------------------------
// Utilities

const browserEvents = new Evented();
const ua = window.navigator.userAgent;
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

function redraw() {
    document.body.offsetHeight;
}


// ---------------------------------------------------------------------------------------------
// Load Events

let loadQueue = [];
let loaded = false;

function afterLoad() {
    loaded = true;
    for (let fn of loadQueue) fn();
}

window.onload = function() {
    if (!loaded) afterLoad();
    resize();
};

document.addEventListener('DOMContentLoaded', function() {
    if (!loaded) afterLoad();
});

function ready(fn) {
    if (loaded) {
        fn();
    } else {
        loadQueue.push(fn);
    }
}


// ---------------------------------------------------------------------------------------------
// Resize Events

window.onresize = throttle(function() {
    browserEvents.trigger('resize');
}, 100);

function resize(fn) {
    browserEvents.on('resize', fn);
}


// ---------------------------------------------------------------------------------------------
// CSS

function cssTimeToNumber(cssTime) {
    let regex = /^([\-\+]?[0-9]+(\.[0-9]+)?)(m?s)$/;
    let matches = regex.exec(cssTime.trim());
    if (matches === null) return null;
    return (+matches[1]) * (matches[3] === 's' ? 1000 : 1);
}

function addCSSRule(selector, rules) {
    let css = document.styleSheets[document.styleSheets.length-1];
    let index = css.cssRules.length - 1;
    if(css.insertRule) {
        css.insertRule(selector + '{' + rules + '}', index);
    } else {
        css.addRule(selector, rules, index);
    }
}

const prefixes = ['webkit', 'Moz', 'ms', 'O'];
const style = document.createElement('div').style;

const prefix = cache(function(name, dashes) {
    let rule = name.toCamelCase();
    if (style[rule] != null) return dashes ? name : rule; 

    rule = rule.toTitleCase();
    for (let i = 0; i < prefixes.length; ++i) {
        if (style[prefixes[i] + rule] != null)
            return dashes ? '-' + prefixes[i].toLowerCase() + '-' + name : prefixes[i] + rule;
    }
});


// ---------------------------------------------------------------------------------------------
// Cookies TODO

function getCookies() {  // FIXME
    let pairs = document.cookie.split(';');
    let result = {};
    for (let i = 0, n = pairs.length; i < n; ++i) {
        let pair = pairs[i].split('=');
        pair[0] = pair[0].replace(/^\s+|\s+$/, '');
        result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return result;
}

function getCookie(name) {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

function setCookie(name, value, days) {
    var d = new Date;
    d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
    document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
}

function deleteCookie(name) {
    setCookie(name, '', -1);
}

/* Possible optional options:
// path     Specify path within the current domain, for example '/'
// domain   Specify the (sub)domain the cookie pertains to. Can range from the root domain
//          ('mathigon.org') up to the current subdomain ('test.world.mathigon.org').
// maxAge   Specify, in seconds, the lifespan of the cookie.
// expires  Set cookie expiry using an absolute GMT date/time string with an RFC2822 format
//          (e.g. 'Tue, 02 Feb 2010 22:04:47 GMT')or a JS Date object.
// secure   Specify whether the cookie should only be passed through HTTPS connections.
function setCookie(name, value, options) {
    options = options || {};
    var cookie = [encodeURIComponent(name) + '=' + encodeURIComponent(value)];
    if (options.path)    cookie.push('path=' + options.path);
    if (options.domain)  cookie.push('domain=' + options.domain);
    if (options.maxAge)  cookie.push('max-age=' + options.maxAge);
    if (options.expires) cookie.push('expires=' + (M.isDate(options.expires) ?
                                     options.expires.toUTCString() : options.expires));
    if (options.secure)  cookie.push('secure');
    document.cookie = cookie.join(';');
} */


// ---------------------------------------------------------------------------------------------
// Storage

const STORAGE_KEY = '_M';

function setStorage(key, value) {
    var keys = (key||'').split('.');
    var storage = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    var path = storage;

    for (var i=0; i<keys.length-1; ++i) {
        if (path[keys[i]] == null) path[keys[i]] = {};
        path = path[keys[i]];
    }

    path[keys[keys.length - 1]] = value;
    window.localStorage.setItem('M', JSON.stringify(storage));
}

function getStorage(key) {
    var keys = (key||'').split('.');
    var storage = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    var path = storage;

    for (var i=0; i<keys.length-1; ++i) {
        if (path[keys[i]] == null) return null;
        path = path[keys[i]];
    }

    return key ? path[keys[keys.length - 1]] : path;
}

function deleteStorage(key) {
    if (key) {
        setStorage(key, null);
    } else {
        window.localStorage.setItem(STORAGE_KEY, '');
    }
}


// ---------------------------------------------------------------------------------------------
// History

// TODO compare with https://github.com/router5/router5/

var popped = ('state' in window.history);
var initialURL = location.href;
var id = 0;

function goTo(n) {
    window.history.go(n);
},

function goBack() {
    window.history.back();
},

function goForward() {
    window.history.forward();
},

function pushState(url, state = { url: url }) {
    ++id;
    window.history.pushState({id: id, state: state }, '', url);
},

function replaceState(url, state = { url: url }) {
    iwindow.history.replaceState(state, '', url);
}

function getHash() {
    return window.location.hash.replace(/^#/, '');
}

function setHash(newHash) {
    ++id;
    hash = newHash;
    window.history.pushState({id: id, state: {}}, '', window.location.pathname + '#' + hash);
}

window.onpopstate = function(e) {
    var validPop = popped || location.href === initialURL;
    popped = true;
    if (!validPop) return;

    var state = e.state || { id: 0, state: { url: path } };
    var newId = state.id;

    browserEvents.trigger('change', state.state);
    if (newId < id) browserEvents.trigger('back', state.state);
    if (newId > id) browserEvents.trigger('forward', state.state);
    id = newId;
};


// ---------------------------------------------------------------------------------------------
// Exports

export default {
    isMobile: mobileRegex.test(navigator.userAgent.toLowerCase()),
    isRetina: ((window.devicePixelRatio || 1) > 1),
    isTouch:  ('ontouchstart' in window) || (window.DocumentTouch && document instanceof window.DocumentTouch),
    isChrome: window.chrome,
    isIE: (ua.indexOf('MSIE') >= 0) || (ua.indexOf('Trident') >= 0),

    redraw, ready, resize, cssTimeToNumber, addCSSRule, prefix,
    on: browserEvents.on, off: browserEvents.off, trigger: browserEvents.trigger,

    get width:  function() { return window.innerWidth; },
    get height: function() { return window.innerHeight; },

    get cookies(): getCookies, getCookie, setCookie, deleteCookie,
    setStorage, getStorage, deleteStorage,

    goTo, goBack, goForward, pushState, replaceState,
    get hash(): getHash, set hash(): setHash
};

