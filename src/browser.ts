// =============================================================================
// Boost.js | Browser Utilities
// (c) Mathigon
// =============================================================================


import {Obj, safeToJSON, throttle, words} from '@mathigon/core';
import {$, $body, $html} from './elements';


declare global {
  interface Window {
    BoostBrowser?: BrowserInstance;
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
  'delete': 46
};

export type ResizeEvent = {width: number, height: number};
type ResizeCallback = (e: ResizeEvent) => void;
type KeyboardEventListener = (e: KeyboardEvent, key: string) => void;
type Theme = {name: 'dark'|'light'|'auto', isDark: boolean};

const STORAGE_KEY = '_M';
const UA = window.navigator.userAgent.toLowerCase();

const KEY_NAMES: Obj<string> = {};
for (const [name, id] of Object.entries(KEY_CODES)) KEY_NAMES[id] = name;

const MOBILE_REGEX = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
const IOS_REGEX = /iphone|ipad|ipod/i;
const SAFARI_REGEX = /^((?!chrome|android).)*safari/i;


// -----------------------------------------------------------------------------
// Browser Namespace

class BrowserInstance {
  readonly isMobile = MOBILE_REGEX.test(UA);
  readonly isRetina = ((window.devicePixelRatio || 1) > 1);
  readonly isTouch = (!!window.Touch) || ('ontouchstart' in window);

  readonly isChrome = !!window.chrome;
  readonly isFirefox = UA.indexOf('firefox') >= 0;
  readonly isAndroid = UA.indexOf('android') >= 0;
  readonly isIOS = IOS_REGEX.test(UA);
  readonly isSafari = IOS_REGEX.test(UA) || SAFARI_REGEX.test(UA);

  constructor() {
    window.onload = () => this.afterLoad();
    document.addEventListener('DOMContentLoaded', () => this.afterLoad());

    const applyResizeThrottled = throttle(() => this.applyResize());
    window.addEventListener('resize', applyResizeThrottled);

    try {
      this.darkQuery?.addEventListener('change', () => this.applyThemeChange());
    } catch {
      // Deprecated, but required for older versions of Safari
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/addListener#browser_compatibility
      this.darkQuery?.addListener(() => this.applyThemeChange());
    }
    const initial = this.getCookie('theme');
    if (initial) setTimeout(() => this.setTheme(initial as any));

    try {
      this.localStorage = window.localStorage;
    } catch {
      // This could happen when running inside an iFrame
      console.warn('Unable to access Local Storage in this context.');
    }
  }


  // ---------------------------------------------------------------------------
  // Loading Events

  private readonly loadQueue: Array<() => void> = [];
  private loaded = false;

  private afterLoad() {
    if (this.loaded) return;
    this.loaded = true;
    for (const fn of this.loadQueue) fn();
    setTimeout(() => this.resize());
  }

  /** Binds an event listener that is triggered when the page is loaded. */
  ready(fn: () => void) {
    if (this.loaded) {
      fn();
    } else {
      this.loadQueue.push(fn);
    }
  }

  /** Forces a re-paint. This is useful when updating transition properties. */
  redraw() {
    document.body.offsetHeight; /* jshint ignore:line */
  }


  // ---------------------------------------------------------------------------
  // Resize Events

  width = window.innerWidth;
  height = window.innerHeight;
  private readonly resizeCallbacks: ResizeCallback[] = [];

  private applyResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    if (this.width === newWidth && this.height === newHeight) return;

    this.width = newWidth;
    this.height = newHeight;

    for (const fn of this.resizeCallbacks) fn({width: this.width, height: this.height});
    $body.trigger('scroll', {top: $body.scrollTop});
  }

  onResize(fn: ResizeCallback) {
    fn({width: this.width, height: this.height});
    this.resizeCallbacks.push(fn);
  }

  offResize(fn: ResizeCallback) {
    const i = this.resizeCallbacks.indexOf(fn);
    if (i >= 0) this.resizeCallbacks.splice(i, 1);
  }

  resize() {
    this.applyResize();
  }


  // ---------------------------------------------------------------------------
  // Theme

  readonly theme: Theme = {name: 'light', isDark: false};
  private readonly themeChangedCallbacks: Array<(theme: Theme) => void> = [];
  private themeOverride = '';
  private darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

  private applyThemeChange() {
    const name = this.theme.name;
    const isDark = name === 'dark' || (name === 'auto' && this.darkQuery.matches);

    if (isDark === this.theme.isDark) return;
    this.theme.isDark = isDark;

    $html.setAttr('theme', this.themeOverride || (isDark ? 'dark' : 'light'));
    for (const c of this.themeChangedCallbacks) c(this.theme);
  }

  setTheme(name: 'dark'|'light'|'auto') {
    if (name === this.theme.name) return;
    this.theme.name = name;
    this.setCookie('theme', name);
    this.applyThemeChange();
  }

  onThemeChange(fn: (theme: Theme) => void) {
    this.themeChangedCallbacks.push(fn);
  }


  // ---------------------------------------------------------------------------
  // Location

  /** Returns the hash string of the current window. */
  getHash() {
    return window.location.hash.slice(1);
  }

  /** Set the hash string of the current window. */
  setHash(h: string) {
    // Prevent scroll to top when resetting hash.
    const scroll = document.body.scrollTop;
    window.location.hash = h;
    document.body.scrollTop = scroll;
  }

  /** Set the URL of the current window. */
  setURL(url: string, title = '') {
    window.history.replaceState({}, title, url);
    if (title) window.document.title = title;
  }


  // ---------------------------------------------------------------------------
  // Cookies

  /** Returns a JSON object of all cookies. */
  getCookies() {
    const pairs = document.cookie.split(';');
    const result: Obj<string> = {};
    for (let i = 0, n = pairs.length; i < n; ++i) {
      const pair = pairs[i].split('=');
      result[decodeURIComponent(pair[0]).trim()] = decodeURIComponent(pair[1]);
    }
    return result;
  }

  getCookie(name: string) {
    const v = document.cookie.match(new RegExp(`(^|;) ?${name}=([^;]*)(;|$)`));
    return v ? v[2] : undefined;
  }

  setCookie(name: string, value: any, maxAge = 60 * 60 * 24 * 365) {
    // Cookies are also set for all subdomains. Remove locale subdomains.
    const domain = window.location.hostname.replace(/^[a-z]{2}\./, '');
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};domain=${domain}`;
  }

  deleteCookie(name: string) {
    this.setCookie(name, '', -1);
  }


  // ---------------------------------------------------------------------------
  // Local Storage

  private localStorage?: Storage;

  setStorage(key: string, value: unknown) {
    const keys = (key || '').split('.');
    const storage = safeToJSON(this.localStorage?.getItem(STORAGE_KEY) || undefined, {});
    let path: any = storage;

    for (let i = 0; i < keys.length - 1; ++i) {
      if (path[keys[i]] === undefined) path[keys[i]] = {};
      path = path[keys[i]];
    }

    path[keys[keys.length - 1]] = value;
    this.localStorage?.setItem(STORAGE_KEY, JSON.stringify(storage));
  }

  getStorage(key: string) {
    let path: any = safeToJSON(this.localStorage?.getItem(STORAGE_KEY), {});
    if (!key) return path;

    const keys = (key || '').split('.');
    const lastKey = keys.pop()!;

    for (const k of keys) {
      if (!(k in path)) return;
      path = path[k];
    }
    return path[lastKey];
  }

  deleteStorage(key: string) {
    if (key) {
      this.setStorage(key, undefined);
    } else {
      this.localStorage?.setItem(STORAGE_KEY, '');
    }
  }


  // ---------------------------------------------------------------------------
  // Keyboard Event Handling

  /** The current active element on the page (e.g. and `<input>`). */
  getActiveInput() {
    let active = document.activeElement;
    if (active?.shadowRoot) active = active.shadowRoot.activeElement;
    return active === document.body ? undefined : $(active as HTMLElement);
  }

  /** Binds an event listener that is fired when a key is pressed. */
  onKey(keys: string, fn: KeyboardEventListener, up = false) {
    const keyNames = words(keys);
    const event = up ? 'keyup' : 'keydown';

    document.addEventListener(event, (e) => {
      const key = KEY_NAMES[e.keyCode] || e.key;
      if (!keyNames.includes(key)) return;

      const $active = this.getActiveInput();
      if ($active && $active.is('input, textarea, [contenteditable]')) return;
      if ($active && ['space', 'enter', 'tab'].includes(key) && $active.is('button, a, [tabindex]')) return;

      fn(e, key);
    });
  }
}

// Ensure we only create one Browser class during the lifetime of a page.
export const Browser = window.BoostBrowser || new BrowserInstance();
window.BoostBrowser = Browser;


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
