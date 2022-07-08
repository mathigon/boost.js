// =============================================================================
// Boost.js | Router
// (c) Mathigon
// =============================================================================


import {EventTarget, Obj} from '@mathigon/core';
import {animate, AnimationResponse} from './animate';
import {Browser, replaceSvgImports} from './browser';
import {$body, $N, ElementView} from './elements';


declare global {
  interface Window {
    ga?: any;  // Google Analytics Object
    gtag?: any;  // Google Analytics Object
  }
}

const LOADING_STYLE = 'position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: #0f82f2; pointer-events: none; z-index: 9999; will-change: transform;';

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

async function getTemplate(view: View, params: ViewParams, url: string): Promise<string> {
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
window.addEventListener('load', () => setTimeout(() => (isReady = true)));

// Prevent scroll restoration on popstate
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}


// -----------------------------------------------------------------------------
// Router Cla

class Router extends EventTarget {
  private $viewport: ElementView = $body;
  private views: View[] = [];

  private active = {path: '', hash: ''};

  private preloaded = false;
  private transition = false;
  private noLoad = false;
  private initialise: Callback = () => undefined;
  beforeChange?: () => Promise<boolean>;

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
      window.addEventListener('popstate', async (e: PopStateEvent) => {
        if (!isReady || !e.state?.path) return;
        const success = await this.load(e.state.path, e.state.hash);
        // Manually revert to the previous state, since popstate events are non-cancellable.
        if (!success) window.history.pushState(this.active, '', this.active.path + this.active.hash);
      });
    }
  }

  view(url: string, {enter, exit, template}: ViewOptions = {}) {
    const params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
    const regexStr = `${url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/')}\\/?`;
    const searchStr = url.includes('?') ? '' : '(\\?.*)?';
    const regex = new RegExp(`^${regexStr}${searchStr}$`, 'i');

    const thisView = {regex, params, enter, exit, template};
    this.views.push(thisView);

    const current = window.location.pathname + window.location.search;
    const viewParams = getViewParams(current, thisView);
    if (!viewParams) return;

    this.active = {path: current, hash: window.location.hash};
    window.history.replaceState(this.active, '', this.active.path + this.active.hash);

    // The wrappers fix stupid Firefox, which doesn't seem to take its time
    // triggering .createdCallbacks for web components...
    Browser.ready(() => {
      setTimeout(() => {
        if (this.preloaded) {
          this.initialise(this.$viewport, viewParams);
          if (thisView.enter) thisView.enter(this.$viewport, viewParams);
        } else {
          this.loadView(thisView, viewParams);
        }
      });
    });
  }

  paths(...urls: string[]) {
    for (const url of urls) this.view(url);
  }

  private getView(path: string) {
    for (const view of this.views) {
      const params = getViewParams(path, view);
      if (params) return {view, params};
    }
  }


  // ---------------------------------------------------------------------------
  // Loading and Rendering

  private async load(path: string, hash: string) {
    if (path === this.active.path && hash !== this.active.hash) {
      this.trigger('hashChange', hash.slice(1));
      this.trigger('change', path + hash);
      this.active = {path, hash};
      return true;
    }

    const go = this.getView(path);
    if (!go) return false;

    if (this.beforeChange && !(await this.beforeChange())) return false;
    this.active = {path, hash};

    this.trigger('change', path + hash);
    if (window.ga) window.ga('send', 'pageview', path + hash);
    if (this.noLoad) {
      if (go.view.enter) go.view.enter(this.$viewport, go.params);
    } else {
      this.loadView(go.view, go.params);  // async
    }

    return true;
  }

  private async loadView(view: View, params: ViewParams = {}) {
    this.showLoadingBar();

    const path = this.active.path;
    const template = await getTemplate(view, params, path);
    if (this.active.path !== path) return;  // Navigated during load..

    // TODO Remove all event listeners in $viewport, to avoid memory leaks.
    await this.$viewport.animate({opacity: 0}, 200).promise;
    this.$viewport.removeChildren();

    $body.scrollTop = 0;
    this.$viewport.html = template;
    Browser.resize();
    replaceSvgImports();
    this.$viewport.animate({'opacity': 1}, 200);  // async
    this.hideLoadingBar();

    const $title = this.$viewport.$('title');
    if ($title) document.title = $title.text;

    this.initialise(this.$viewport, params);
    if (view.enter) view.enter(this.$viewport, params);
    this.trigger('afterChange', {$viewport: this.$viewport});
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

    if (this.getView(anchor.pathname + anchor.search)) {
      e.preventDefault();  // Only prevent default of the view exists.
      this.goTo(anchor.pathname + anchor.search, anchor.hash);
    }
  }

  async goTo(path: string, hash = '') {
    const current = this.active.path + this.active.hash;
    const success = await this.load(path, hash);
    if (success && current !== this.active.path + this.active.hash) {
      // If the path is the same, we don't push another state.
      window.history.pushState(this.active, '', path + hash);
    }
  }

  replace(path: string, hash = '') {
    this.active = {path, hash};
    window.history.replaceState(this.active, '', path + hash);
  }

  back() {
    window.history.back();
  }

  forward() {
    window.history.forward();
  }


  // ---------------------------------------------------------------------------
  // Loading Bar

  private animation?: AnimationResponse;
  private $loadingBar?: ElementView;

  showLoadingBar() {
    if (!this.$loadingBar) this.$loadingBar = $N('div', {style: LOADING_STYLE}, $body);
    this.$loadingBar.css({transform: 'translateX(-100%)', opacity: 1});
    this.$loadingBar.show();

    this.animation = animate((p) => {
      this.$loadingBar!.css('transform', `translateX(-${10 + 90 * Math.exp(-4 * p)}%)`);
    }, 3000);
  }

  async hideLoadingBar() {
    this.animation?.cancel();
    await this.$loadingBar?.animate({transform: 'none', opacity: 0}).promise;
    this.$loadingBar?.hide();
  }
}

export const RouterInstance = new Router();
