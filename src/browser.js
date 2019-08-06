// =============================================================================
// Boost.js | Browser Utilities
// (c) Mathigon
// =============================================================================



import { throttle, Evented, words } from '@mathigon/core';
import { $, $body } from './elements';


// -----------------------------------------------------------------------------
// Utilities

const browserEvents = new Evented();
const ua = window.navigator.userAgent.toLowerCase();
const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

export function redraw() {
  document.body.offsetHeight; /* jshint ignore:line */
}


// -----------------------------------------------------------------------------
// Resize Events

let width = window.innerWidth;
let height = window.innerHeight;

window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  if (width === newWidth && height === newHeight) return;

  width = newWidth;
  height = newHeight;

  browserEvents.trigger('resize', { width, height });
  $body.trigger('scroll', { top: $body.scrollTop });
});

const doResize = throttle(function() {
  width = window.innerWidth;
  height = window.innerHeight;
  browserEvents.trigger('resize', { width, height });
});

function resize(fn = null) {
  if (fn) {
    fn({ width, height });
    browserEvents.on('resize', fn);
  } else {
    doResize();
  }
}


// -----------------------------------------------------------------------------
// Load Events

const loadQueue = [];
let loaded = false;

function afterLoad() {
  if (loaded) return;
  loaded = true;
  for (const fn of loadQueue) fn();
  setTimeout(resize);
}

window.onload = afterLoad;
document.addEventListener('DOMContentLoaded', afterLoad);

function ready(fn) {
  if (loaded) {
    fn();
  } else {
    loadQueue.push(fn);
  }
}


// -----------------------------------------------------------------------------
// Cookies
// TODO Refactor this!

function getCookies() {
  const pairs = document.cookie.split(';');
  const result = {};
  for (let i = 0, n = pairs.length; i < n; ++i) {
    const pair = pairs[i].split('=');
    pair[0] = pair[0].replace(/^\s+|\s+$/, '');
    result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return result;
}

function getCookie(name) {
  const v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
  return v ? v[2] : null;
}

function setCookie(name, value, maxAge = 60 * 60* 24 * 365) {
  document.cookie = name + '=' + value + ';path=/;max-age=' + maxAge;
}

function deleteCookie(name) {
  setCookie(name, '', -1);
}


// -----------------------------------------------------------------------------
// Storage

const STORAGE_KEY = '_M';

function setStorage(key, value) {
  const keys = (key||'').split('.');
  const storage = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  let path = storage;

  for (let i=0; i<keys.length-1; ++i) {
    if (path[keys[i]] == null) path[keys[i]] = {};
    path = path[keys[i]];
  }

  path[keys[keys.length - 1]] = value;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function getStorage(key) {
  let path = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  if (!key) return path;

  const keys = (key||'').split('.');
  const lastKey = keys.pop();

  for (const k of keys) {
    if (!(k in path)) return null;
    path = path[k];
  }
  return path[lastKey]
}

function deleteStorage(key) {
  if (key) {
    setStorage(key, null);
  } else {
    window.localStorage.setItem(STORAGE_KEY, '');
  }
}


// -----------------------------------------------------------------------------
// Keyboard Events

export const KEY_CODES = {
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

function activeInput() {
  const active = document.activeElement;
  return active === document.body ? undefined : $(active);
}

// Executes fn if any one of [keys] is pressed
function onKey(keys, fn) {
  keys = words(keys).map(k => KEY_CODES[k] || k);
  document.addEventListener('keydown', function(e) {
    const $active = activeInput();
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

  const uses = Array.from(document.querySelectorAll('svg > use'));
  uses.forEach(function(use) {
    const src = use.getAttribute('xlink:href');
    const [url, id] = src.split('#');
    if (!url.length || !id) return;

    const svg = use.parentNode;
    svg.removeChild(use);

    if (!(url in requests)) requests[url] = fetch(url).then(r => r.text());
    const request = requests[url];

    request.then(function(response) {
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = response;

      const icon = doc.getElementById(id);
      const clone = icon.cloneNode(true);

      const fragment = document.createDocumentFragment();
      while (clone.childNodes.length) fragment.appendChild(clone.firstChild);
      svg.appendChild(fragment);
    });
  });
}


// -----------------------------------------------------------------------------
// Visibility API

const isOldWebkit = !('hidden' in document) && ('webkitHidden' in document);
const visibilityProperty = isOldWebkit ? 'webkitHidden' : 'hidden';
const visibilityEvent = isOldWebkit ? 'webkitvisibilitychange' : 'visibilitychange';

document.addEventListener(visibilityEvent, function() {
  browserEvents.trigger(document[visibilityProperty] ? 'focus' : 'blur');
});


// -----------------------------------------------------------------------------
// Exports

/** Browser utilities class. */
export const Browser = {
  /** @type {boolean} */
  isMobile: mobileRegex.test(ua),

  /** @type {boolean} */
  isRetina: ((window.devicePixelRatio || 1) > 1),

  /** @type {boolean} */
  isTouch:  ('ontouchstart' in window) ||
      (window.DocumentTouch && document instanceof window.DocumentTouch),

  /** @type {boolean} */
  isChrome: !!window.chrome,

  /** @type {boolean} */
  isFirefox: ua.indexOf('firefox') >= 0,

  /** @type {boolean} */
  isAndroid: ua.indexOf('android') >= 0,

  /** @type {boolean} */
  isIOS: /iphone|ipad|ipod/i.test(ua),

  /** @type {boolean} */
  isSafari: /^((?!chrome|android).)*safari/i.test(ua),

  /** Forces a re-paint. This is useful when updating transition properties. */
  redraw,

  /**
   * Binds an event listener that is fired when the page has finished loading.
   * @param {Function} callback
   */
  ready,

  /**
   * Binds a throttled event listener that is fired when the browser is resized.
   * @param {Function} callback
   */
  resize,

  /**
   * Replaces SVG `<use>` imports that are not supported by older browsers.
   */
  replaceSvgImports,

  on: browserEvents.on.bind(browserEvents),

  off: browserEvents.off.bind(browserEvents),

  trigger: browserEvents.trigger.bind(browserEvents),

  /**
   * The current width of the Browser window.
   * @returns {number}
   */
  get width()  { return width; },

  /**
   * The current height of the Browser window.
   * @returns {number}
   */
  get height() { return height; },

  /**
   * Returns the hash string of the current window.
   * @returns {string}
   */
  get hash() { return window.location.hash.slice(1); },

  /**
   * Set the hash string of the current window.
   * @param {string} h
   */
  set hash(h) {
    // prevent scroll to top when resetting hash
    const scroll = document.body.scrollTop;
    window.location.hash = h;
    document.body.scrollTop = scroll;
  },

  /**
   * Returns a JSON object of all cookies.
   * @returns {Object.<string,string>}
   */
  get cookies() { return getCookies(); },

  getCookie,
  setCookie,
  deleteCookie,
  setStorage,
  getStorage,
  deleteStorage,

  /**
   * The current active element on the page (e.g. and `<input>`).
   * @returns {Element}
   */
  get activeInput() { return activeInput(); },

  /**
   * Binds an event listener that is fired when a key is pressed.
   * @param {string} keys Multiple space-separated keys,
   * @param {Function} callback
   */
  onKey
};
