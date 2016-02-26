// =================================================================================================
// Boost.js | Browser Utilities
// (c) 2015 Mathigon / Philipp Legner
// =================================================================================================



import Evented from 'evented';
import { words, toCamelCase } from 'strings';
import { cache, throttle } from 'utilities';
import { $body } from 'elements';


// ---------------------------------------------------------------------------------------------
// Utilities

const browserEvents = new Evented();
const ua = window.navigator.userAgent;
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

export function redraw() {
    document.body.offsetHeight; /* jshint ignore:line */
}


// ---------------------------------------------------------------------------------------------
// Resize Events

let width = window.innerWidth;
let height = window.innerHeight;

window.onresize = throttle(function() {
    let newWidth = window.innerWidth;
    let height = window.innerHeight;
    if (width === newWidth && width < 800 && height < 800) return;
    width = newWidth;
    browserEvents.trigger('resize', { width, height });
    // $body.trigger('scroll', { top: $body.scrollTop });
}, 100);

export function resize(fn = null) {
    if (fn) {
        browserEvents.on('resize', fn);
    } else {
        width = window.innerWidth;
        height = window.innerHeight;
        browserEvents.trigger('resize', { width, height });
    }
}

setTimeout(resize);


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
    resize();
    if (!loaded) afterLoad();
});

export function ready(fn) {
    if (loaded) {
        fn();
    } else {
        loadQueue.push(fn);
    }
}


// ---------------------------------------------------------------------------------------------
// CSS

export function cssTimeToNumber(cssTime) {
    let regex = /^([\-\+]?[0-9]+(\.[0-9]+)?)(m?s)$/;
    let matches = regex.exec(cssTime.trim());
    if (matches === null) return null;
    return (+matches[1]) * (matches[3] === 's' ? 1000 : 1);
}

export function addCSS(css) {
    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    document.head.appendChild(style);
}

export function addCSSRule(selector, rules) {
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

export const prefix = cache(function(name, dashes) {
    let rule = toCamelCase(name);
    if (style[rule] != null) return dashes ? name : rule;

    rule = rule.toTitleCase();
    for (let i = 0; i < prefixes.length; ++i) {
        if (style[prefixes[i] + rule] != null)
            return dashes ? '-' + prefixes[i].toLowerCase() + '-' + name : prefixes[i] + rule;
    }
});


// ---------------------------------------------------------------------------------------------
// Cookies TODO

export function getCookies() {  // FIXME
    let pairs = document.cookie.split(';');
    let result = {};
    for (let i = 0, n = pairs.length; i < n; ++i) {
        let pair = pairs[i].split('=');
        pair[0] = pair[0].replace(/^\s+|\s+$/, '');
        result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return result;
}

export function getCookie(name) {
    var v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
    return v ? v[2] : null;
}

export function setCookie(name, value, maxAge = 60 * 60* 24 * 365) {
    document.cookie = name + '=' + value + ';path=/;max-age=' + maxAge;
}

export function deleteCookie(name) {
    setCookie(name, '', -1);
}


// ---------------------------------------------------------------------------------------------
// Storage

const STORAGE_KEY = '_M';

export function setStorage(key, value) {
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

export function getStorage(key) {
    let keys = (key||'').split('.');
    let storage = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    let path = storage;

    for (var i=0; i<keys.length-1; ++i) {
        if (path[keys[i]] == null) return null;
        path = path[keys[i]];
    }

    return key ? path[keys[keys.length - 1]] : path;
}

export function deleteStorage(key) {
    if (key) {
        setStorage(key, null);
    } else {
        window.localStorage.setItem(STORAGE_KEY, '');
    }
}


// -----------------------------------------------------------------------------
// Keyboard Events

const keyCodes = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    pause: 19,
    capslock: 20,
    escape: 27,
    space: 32,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    insert: 45,
    'delete': 46
};

export function activeInput() {
    let active = document.activeElement;
    return active === document.body ? undefined : active;
}

// Executes fn if any one of [keys] is pressed
export function onKey(keys, fn) {
    keys = words(keys).map(k => keyCodes[k] || k);
    document.addEventListener('keydown', function(e){
        if (activeInput()) return;
        if (keys.indexOf(e.keyCode) >= 0) fn(e);
    });
}

// Executes fn1 if key1 is pressed, and fn2 if key2 is aready pressed
export function onMultiKey(key1, key2, fn1, fn2) {
    let key2down = false;

    key1 = keyCodes[key1] || key1;
    key2 = keyCodes[key2] || key2;

    document.addEventListener('keydown', function(e) {
        if (activeInput()) return;
        let k = e.keyCode;

        if (k === key2) {
            key2down = true;
        } else if (key2down && k === key1) {
            fn2(e);
        } else if (k === key1) {
            fn1(e);
        }
    });

    document.addEventListener('keyup', function(e){
        let k = e.keyCode;
        if (k === key2) key2down = false;
    });
}


// -----------------------------------------------------------------------------
// Visibility API

let isOldWebkit = !('hidden' in document) && ('webkitHidden' in document);
let visibilityProperty = isOldWebkit ? 'webkitHidden' : 'hidden';
let visibilityEvent = isOldWebkit ? 'webkitvisibilitychange' : 'visibilitychange';

document.addEventListener(visibilityEvent, function() {
    browserEvents.trigger(document[visibilityProperty] ? 'focus' : 'blur');
});

// ---------------------------------------------------------------------------------------------

export default {
    isMobile: mobileRegex.test(navigator.userAgent.toLowerCase()),
    isRetina: ((window.devicePixelRatio || 1) > 1),
    isTouch:  ('ontouchstart' in window) ||
        (window.DocumentTouch && document instanceof window.DocumentTouch),
    isChrome: window.chrome,
    isIE: (ua.indexOf('MSIE') >= 0) || (ua.indexOf('Trident') >= 0),

    redraw, ready, resize, cssTimeToNumber, addCSS, addCSSRule, prefix,

    on: browserEvents.on.bind(browserEvents),
    off: browserEvents.off.bind(browserEvents),
    trigger: browserEvents.trigger.bind(browserEvents),

    get width()  { return width; },
    get height() { return height; },

    get cookies() { return getCookies(); },
    getCookie, setCookie, deleteCookie,
    setStorage, getStorage, deleteStorage,

    get activeInput() { return activeInput(); },
    keyCodes, onKey, onMultiKey
};
