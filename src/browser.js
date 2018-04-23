// =============================================================================
// Boost.js | Browser Utilities
// (c) Mathigon
// =============================================================================



import { throttle, Evented, words } from '@mathigon/core';
import { get } from './ajax';
import { $, $body } from './elements';


// -----------------------------------------------------------------------------
// Utilities

const browserEvents = new Evented();
const ua = window.navigator.userAgent;
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

export function redraw() {
  document.body.offsetHeight; /* jshint ignore:line */
}


// -----------------------------------------------------------------------------
// Resize Events

let width = window.innerWidth;
let height = window.innerHeight;

window.onresize = throttle(function() {
  let newWidth = window.innerWidth;
  let height = window.innerHeight;
  if (width === newWidth && width < 800 && height < 800) return;
  width = newWidth;
  browserEvents.trigger('resize', { width, height });
  $body.trigger('scroll', { top: $body.scrollTop });
}, 100);

const doResize = throttle(function() {
  width = window.innerWidth;
  height = window.innerHeight;
  browserEvents.trigger('resize', { width, height });
});

export function resize(fn = null) {
  if (fn) {
    fn({ width, height });
    browserEvents.on('resize', fn);
  } else {
    doResize();
  }
}


// -----------------------------------------------------------------------------
// Load Events

let loadQueue = [];
let loaded = false;

function afterLoad() {
  if (loaded) return;
  loaded = true;
  for (let fn of loadQueue) fn();
  setTimeout(resize);
}

window.onload = afterLoad;
document.addEventListener('DOMContentLoaded', afterLoad);

export function ready(fn) {
  if (loaded) {
    fn();
  } else {
    loadQueue.push(fn);
  }
}


// -----------------------------------------------------------------------------
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


// -----------------------------------------------------------------------------
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
  let v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
  return v ? v[2] : null;
}

export function setCookie(name, value, maxAge = 60 * 60* 24 * 365) {
  document.cookie = name + '=' + value + ';path=/;max-age=' + maxAge;
}

export function deleteCookie(name) {
  setCookie(name, '', -1);
}


// -----------------------------------------------------------------------------
// Storage

const STORAGE_KEY = '_M';

export function setStorage(key, value) {
  let keys = (key||'').split('.');
  let storage = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  let path = storage;

  for (let i=0; i<keys.length-1; ++i) {
    if (path[keys[i]] == null) path[keys[i]] = {};
    path = path[keys[i]];
  }

  path[keys[keys.length - 1]] = value;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

export function getStorage(key) {
  let path = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  if (!key) return path;

  const keys = (key||'').split('.');
  const lastKey = keys.pop();

  for (let k of keys) {
    if (!(k in path)) return null;
    path = path[k];
  }
  return path[lastKey]
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
  return active === document.body ? undefined : $(active);
}

// Executes fn if any one of [keys] is pressed
export function onKey(keys, fn) {
  keys = words(keys).map(k => keyCodes[k] || k);
  document.addEventListener('keydown', function(e) {
    let $active = activeInput();
    if ($active && $active.is('input, textarea, [contenteditable]')) return;
    if (keys.indexOf(e.keyCode) >= 0) fn(e);
  });
}


// -----------------------------------------------------------------------------
// Polyfill for external SVG imports

const IEUA = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/;
const webkitUA = /\bAppleWebKit\/(\d+)\b/;
const EdgeUA = /\bEdge\/12\.(\d+)\b/;

const polyfill = IEUA.test(navigator.userAgent) ||
  (navigator.userAgent.match(EdgeUA) || [])[1] < 10547 ||
  (navigator.userAgent.match(webkitUA) || [])[1] < 537;

const requests = {};

function replaceSvgImports() {
  if (!polyfill) return;

  let uses = Array.from(document.querySelectorAll('svg > use'));
  uses.forEach(function(use) {
    let src = use.getAttribute('xlink:href');
    let [url, id] = src.split('#');
    if (!url.length) return;

    let svg = use.parentNode;
    svg.removeChild(use);

    if (!(url in requests)) requests[url] = get(url);
    let request = requests[url];

    request.then(function(response) {
      let doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = response;

      let icon = doc.getElementById(id);
      let clone = icon.cloneNode(true);

      let fragment = document.createDocumentFragment();
      while (clone.childNodes.length) fragment.appendChild(clone.firstChild);
      svg.appendChild(fragment);
    });
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


// -----------------------------------------------------------------------------
// Exports

export const Browser = {
  /** @type {boolean} */
  isMobile: mobileRegex.test(navigator.userAgent.toLowerCase()),

  /** @type {boolean} */
  isRetina: ((window.devicePixelRatio || 1) > 1),

  /** @type {boolean} */
  isTouch:  ('ontouchstart' in window) ||
      (window.DocumentTouch && document instanceof window.DocumentTouch),

  /** @type {boolean} */
  isChrome: window.chrome,

  /** @type {boolean} */
  isIE: (ua.indexOf('MSIE') >= 0) || (ua.indexOf('Trident') >= 0),

  /** @type {boolean} */
  isFirefox: navigator.userAgent.search('Firefox') >= 0,

  redraw, ready, resize, cssTimeToNumber, addCSS, addCSSRule, replaceSvgImports,

  on: browserEvents.on.bind(browserEvents),
  off: browserEvents.off.bind(browserEvents),
  trigger: browserEvents.trigger.bind(browserEvents),

  get width()  { return width; },
  get height() { return height; },

  get hash() { return window.location.hash.slice(1); },
  set hash(h) {
    // prevent scroll to top when resetting hash
    let scroll = document.body.scrollTop;
    window.location.hash = h;
    document.body.scrollTop = scroll;
  },

  get cookies() { return getCookies(); },
  getCookie, setCookie, deleteCookie,
  setStorage, getStorage, deleteStorage,

  get activeInput() { return activeInput(); },
  keyCodes, onKey
};
