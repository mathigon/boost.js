// =============================================================================
// Boost.js | Browser Utilities
// (c) Mathigon
// =============================================================================


import {throttle, words, safeToJSON, Obj} from '@mathigon/core';
import {$, $body} from './elements';


declare global {
  interface Window {
    Touch: any;
    chrome: any;
  }
}

export const KEY_CODES: Obj<number> = {
  'backspace': 8,
  'tab': 9,
  'enter': 13,
  'shift': 16,
  'ctrl': 17,
  'alt': 18,
  'pause': 19,
  'capslock': 20,
  'escape': 27,
  'space': 32,
  'pageup': 33,
  'pagedown': 34,
  'end': 35,
  'home': 36,
  'left': 37,
  'up': 38,
  'right': 39,
  'down': 40,
  'insert': 45,
  'delete': 46,
};

export type ResizeEvent = {width: number, height: number};


// -----------------------------------------------------------------------------
// Browser Namespace

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Browser {

  const ua = window.navigator.userAgent.toLowerCase();

  export const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      ua);
  export const isRetina = ((window.devicePixelRatio || 1) > 1);
  export const isTouch = (!!window.Touch) || 'ontouchstart' in window;

  export const isChrome = !!window.chrome;
  export const isFirefox = ua.indexOf('firefox') >= 0;
  export const isAndroid = ua.indexOf('android') >= 0;
  export const isIOS = /iphone|ipad|ipod/i.test(ua);
  export const isSafari = isIOS || /^((?!chrome|android).)*safari/i.test(ua);

  /** Forces a re-paint. This is useful when updating transition properties. */
  export function redraw() {
    document.body.offsetHeight; /* jshint ignore:line */
  }


  // ---------------------------------------------------------------------------
  // Load Events

  const loadQueue: (() => void)[] = [];
  let loaded = false;

  // eslint-disable-next-line no-inner-declarations
  function afterLoad() {
    if (loaded) return;
    loaded = true;
    for (const fn of loadQueue) fn();
    setTimeout(resize);
  }

  window.onload = afterLoad;
  document.addEventListener('DOMContentLoaded', afterLoad);

  /** Binds an event listener that is triggered when the page is loaded. */
  export function ready(fn: () => void) {
    if (loaded) {
      fn();
    } else {
      loadQueue.push(fn);
    }
  }


  // ---------------------------------------------------------------------------
  // Resize Events

  type ResizeCallback = (e: ResizeEvent) => void;
  const resizeCallbacks: ResizeCallback[] = [];

  export let width = window.innerWidth;
  export let height = window.innerHeight;

  const doResize = throttle(() => {
    width = window.innerWidth;
    height = window.innerHeight;
    for (const fn of resizeCallbacks) fn({width, height});
    $body.trigger('scroll', {top: $body.scrollTop});
  });

  export function onResize(fn: ResizeCallback) {
    fn({width, height});
    resizeCallbacks.push(fn);
  }

  export function offResize(fn: ResizeCallback) {
    const i = resizeCallbacks.indexOf(fn);
    if (i >= 0) resizeCallbacks.splice(i, 1);
  }

  export function resize() {
    doResize();
  }

  window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    if (width === newWidth && height === newHeight) return;

    width = newWidth;
    height = newHeight;
    doResize();
  });


  // ---------------------------------------------------------------------------
  // Location Hash

  /** Returns the hash string of the current window. */
  export function getHash() {
    return window.location.hash.slice(1);
  }

  /** Set the hash string of the current window. */
  export function setHash(h: string) {
    // Prevent scroll to top when resetting hash.
    const scroll = document.body.scrollTop;
    window.location.hash = h;
    document.body.scrollTop = scroll;
  }


  // ---------------------------------------------------------------------------
  // Cookies

  /** Returns a JSON object of all cookies. */
  export function getCookies() {
    const pairs = document.cookie.split(';');
    const result: Obj<string> = {};
    for (let i = 0, n = pairs.length; i < n; ++i) {
      const pair = pairs[i].split('=');
      pair[0] = pair[0].replace(/^\s+|\s+$/, '');
      result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return result;
  }

  export function getCookie(name: string) {
    const v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
    return v ? v[2] : undefined;
  }

  export function setCookie(name: string, value: any,
      maxAge = 60 * 60 * 24 * 365) {
    // Cookies are also set for all subdomains. Remove locale subdomains.
    const domain = window.location.hostname.replace(/^[a-z]{2}\./, '');
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};domain=${domain}`;
  }

  export function deleteCookie(name: string) {
    setCookie(name, '', -1);
  }


  // ---------------------------------------------------------------------------
  // Local Storage

  const STORAGE_KEY = '_M';

  export function setStorage(key: string, value: any) {
    const keys = (key || '').split('.');
    const storage = safeToJSON(window.localStorage.getItem(STORAGE_KEY) || undefined);
    let path = storage;

    for (let i = 0; i < keys.length - 1; ++i) {
      if (path[keys[i]] == undefined) path[keys[i]] = {};
      path = path[keys[i]];
    }

    path[keys[keys.length - 1]] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }

  export function getStorage(key: string) {
    let path = safeToJSON(window.localStorage.getItem(STORAGE_KEY) || undefined);
    if (!key) return path;

    const keys = (key || '').split('.');
    const lastKey = keys.pop()!;

    for (const k of keys) {
      if (!(k in path)) return undefined;
      path = path[k];
    }
    return path[lastKey];
  }

  export function deleteStorage(key: string) {
    if (key) {
      setStorage(key, undefined);
    } else {
      window.localStorage.setItem(STORAGE_KEY, '');
    }
  }


  // ---------------------------------------------------------------------------
  // Keyboard Event Handling

  /** The current active element on the page (e.g. and `<input>`). */
  export function getActiveInput() {
    const active = document.activeElement;
    return active === document.body ? undefined : $(active as HTMLElement);
  }

  type KeyboardEventListener = (e: KeyboardEvent, key: string) => void;

  const KEY_NAMES: Obj<string> = {};
  for (const [name, id] of Object.entries(KEY_CODES)) KEY_NAMES[id] = name;

  /** Binds an event listener that is fired when a key is pressed. */
  export function onKey(keys: string, fn: KeyboardEventListener, up = false) {
    const keyNames = words(keys);
    const event = up ? 'keyup' : 'keydown';

    document.addEventListener(event, (e) => {
      const key = KEY_NAMES[e.keyCode] || e.key;
      if (!keyNames.includes(key)) return;

      const $active = getActiveInput();
      if ($active && $active.is('input, textarea, [contenteditable]')) return;
      if ($active && ['space', 'enter', 'tab'].includes(key) && $active.is('button, a, [tabindex]')) return;

      fn(e, key);
    });
  }
}


// -----------------------------------------------------------------------------
// Polyfill for external SVG imports

const IEUA = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/;
const webkitUA = /\bAppleWebKit\/(\d+)\b/;
const EdgeUA = /\bEdge\/12\.(\d+)\b/;

const polyfill = IEUA.test(navigator.userAgent) ||
                 +(navigator.userAgent.match(EdgeUA) || [])[1] < 10547 ||
                 +(navigator.userAgent.match(webkitUA) || [])[1] < 537;

const requests: Obj<Promise<string>> = {};

/** Replaces SVG `<use>` imports that are not supported by older browsers. */
export function replaceSvgImports() {
  if (!polyfill) return;

  const uses = Array.from(document.querySelectorAll('svg > use'));
  uses.forEach(function(use) {
    const src = use.getAttribute('xlink:href')!;
    const [url, id] = src.split('#');
    if (!url.length || !id) return;

    const svg = use.parentNode!;
    svg.removeChild(use);

    if (!(url in requests)) requests[url] = fetch(url).then(r => r.text());
    const request = requests[url];

    request.then((response) => {
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = response;

      const icon = doc.getElementById(id)!;
      const clone = icon.cloneNode(true);

      const fragment = document.createDocumentFragment();
      while (clone.childNodes.length) fragment.appendChild(clone.firstChild!);
      svg.appendChild(fragment);
    });
  });
}


// -----------------------------------------------------------------------------
// Fake Accessibility Keyboard Events

export function bindAccessibilityEvents() {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.keyCode === KEY_CODES.enter || e.keyCode === KEY_CODES.space) {
      const $active = Browser.getActiveInput();
      // The CodeMirror library adds tabindex attributes on their <textarea> fields.
      if ($active && $active.hasAttr('tabindex') && $active.tagName !== 'TEXTAREA') {
        e.preventDefault();
        $active.trigger('pointerdown', e);
        $active.trigger('pointerstop', e);
        $body.trigger('pointerstop', e);
        $active.trigger('click', e);
      }
    }
  });
}
