// =============================================================================
// Boost.js | Router
// (c) Mathigon
// =============================================================================


import {EventTarget, Obj} from '@mathigon/core';
import {Browser, replaceSvgImports} from './browser';
import {$body, ElementView} from './elements';


declare global {
  interface Window {
    ga?: any;  // Google Analytics Object
  }
}

type Callback = ($el: ElementView, params: ViewParams) => void;

interface RouterOptions {
  $viewport?: ElementView;
  preloaded?: boolean;
  transition?: boolean;
  initialise?: Callback;
  noLoad?: boolean;
  click?: boolean;
  history?: boolean;
}

type ViewParams = Obj<string>;

interface ViewOptions {
  enter?: Callback;
  exit?: () => void;
  template?: string|((params: ViewParams) => string|Promise<string>);
}

interface View extends ViewOptions {
  regex: RegExp;
  params: string[];
}

function getViewParams(url: string, view: View): ViewParams|undefined {
  const match = view.regex.exec(url);
  if (match) {
    match.shift();
    const params: ViewParams = {};
    for (const [i, p] of view.params.entries()) params[p] = match[i];
    return params;
  } else {
    return undefined;
  }
}

async function getTemplate(view: View, params: ViewParams, url: string):
    Promise<string> {
  if (view.template) {
    if (typeof view.template === 'string') return view.template;
    return view.template(params);
  }

  // Append a query string to only load the body of the page, not the header.
  const str = await fetch(url + (url.indexOf('?') >= 0 ? '&xhr=1' : '?xhr=1'));
  return str.text();
}

// Don't trigger Router events during the initial Page load.
let isReady = (document.readyState === 'complete');
window.addEventListener('load', () => setTimeout(() => isReady = true));

// Prevent scroll restoration on popstate
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// -----------------------------------------------------------------------------
// Router Cla

class Router extends EventTarget {
  private $viewport: ElementView = $body;
  private views: View[] = [];

  private active = {path: '', hash: '', index: 0};
  private search = window.location.search;

  private preloaded = false;
  private transition = false;
  private noLoad = false;
  private initialise: Callback = () => undefined;

  setup(options: RouterOptions = {}) {
    if (options.$viewport) this.$viewport = options.$viewport;
    if (options.initialise) this.initialise = options.initialise;
    if (options.preloaded) this.preloaded = options.preloaded;
    if (options.transition) this.transition = options.transition;
    if (options.noLoad) this.noLoad = options.noLoad;

    if (options.click) {
      $body.on('click', (e: MouseEvent) => this.onLinkClick(e));
    }

    if (options.history) {
      window.addEventListener('popstate', (e: PopStateEvent) => {
        if (isReady && e.state) this.goToState(e.state);
      });
    }
  }

  view(url: string, {enter, exit, template}: ViewOptions = {}) {

    // TODO Error on multiple matching views
    const params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
    const regexStr = url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/') +
                     '\\/?';
    const searchStr = url.includes('?') ? '' : '(\\?.*)?';
    const regex = new RegExp('^' + regexStr + searchStr + '$', 'i');

    const thisView = {regex, params, enter, exit, template};
    this.views.push(thisView);

    const viewParams = getViewParams(window.location.pathname, thisView);
    if (!viewParams) return;

    this.active = {
      path: window.location.pathname + this.search,
      hash: window.location.hash,
      index: 0,
    };
    window.history.replaceState(this.active, '',
        this.active.path + this.active.hash);

    // The wrappers fix stupid Firefox, which doesn't seem to take its time
    // triggering .createdCallbacks for web components...
    Browser.ready(() => {
      setTimeout(() => {
        if (this.preloaded) {
          this.initialise(this.$viewport, viewParams);
          if (thisView.enter) thisView.enter(this.$viewport, viewParams);
        } else {
          this.loadView(thisView, viewParams, window.location.pathname);
        }
      });
    });
  }

  paths(...urls: string[]) {
    for (const url of urls) this.view(url);
  }

  getView(path: string) {
    for (const view of this.views) {
      const params = getViewParams(path, view);
      if (params) return {view, params};
    }
  }


  // ---------------------------------------------------------------------------
  // Loading and Rendering

  load(path: string, hash = '') {
    const go = this.getView(path);

    if (path === this.active.path && hash !== this.active.hash) {
      this.trigger('hashChange', hash.slice(1));
      this.trigger('change', path + hash);
      return true;

    } else if (go && path !== this.active.path) {
      this.trigger('change', path + hash);
      if (window.ga) window.ga('send', 'pageview', path + hash);
      if (this.noLoad) {
        if (go.view.enter) go.view.enter(this.$viewport, go.params);
      } else {
        this.loadView(go.view, go.params, path);
      }
      return true;

    } else {
      return false;
    }
  }

  private async loadView(view: View, params: ViewParams = {}, url = '') {
    this.$viewport.css({'opacity': 0.4, 'pointer-events': 'none'});

    const template = await getTemplate(view, params, url);

    this.$viewport.css('opacity', 0);

    setTimeout(() => {
      this.$viewport.removeChildren();
      // TODO Remove all event listeners in $viewport, to avoid memory leaks.

      $body.scrollTop = 0;
      this.$viewport.html = template;
      Browser.resize();
      replaceSvgImports();
      this.$viewport.css({'opacity': 1, 'pointer-events': 'all'});

      const $title = this.$viewport.$('title');
      if ($title) document.title = $title.text;

      this.initialise(this.$viewport, params);
      if (view.enter) view.enter(this.$viewport, params);
      this.trigger('afterChange', {$viewport: this.$viewport});
    }, 350);
  }


  // ---------------------------------------------------------------------------
  // Navigation Functions

  private onLinkClick(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    let el = e.target as Node;
    while (el && el.nodeName !== 'A') el = el.parentNode!;
    if (!el || el.nodeName !== 'A') return;

    const anchor = el as HTMLAnchorElement;

    // Check target
    if (anchor.target) return;

    // Different origin
    if (anchor.origin !== window.location.origin) return;

    // Ignore if tag has "download" attribute or rel="external" attribute
    if (anchor.hasAttribute('download') || anchor.getAttribute('rel') ===
        'external') return;

    // Check for mailto: in the href
    const link = anchor.getAttribute('href');
    if (link && link.indexOf('mailto:') > -1) return;

    const success = this.goTo(anchor.pathname + anchor.search, anchor.hash);
    if (success) e.preventDefault();
  }


  goToState(state: {path: '', hash: '', index: 0}) {
    if (!state || !state.path) return;
    const change = this.load(state.path + this.search, state.hash);

    if (change && state.index < this.active.index) this.trigger('back');
    if (change && state.index > this.active.index) this.trigger('forward');
    this.active = state;
  }


  goTo(path: string, hash = '') {
    const success = this.load(path, hash);
    if (success) {
      const index = (this.active ? this.active.index + 1 : 0);
      this.active = {path, hash, index};
      window.history.pushState(this.active, '', path + hash);
    }
    return success;
  }

  back() {
    window.history.back();
  }

  forward() {
    window.history.forward();
  }
}

export const RouterInstance = new Router();
