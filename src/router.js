// =============================================================================
// Boost.js | Router
// (c) Mathigon
// =============================================================================



/* global ga */
import { noop, run, zip, Evented } from '@mathigon/core';
import { Browser } from './browser';
import { $body } from './elements';


// -----------------------------------------------------------------------------
// Utilities

function getViewParams(url, view) {
  const match = view.regex.exec(url);
  if (match) {
    match.shift();
    return zip(view.params, match);
  } else {
    return null;
  }
}

// Prevent scroll restoration on popstate
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';


// -----------------------------------------------------------------------------
// Browser History

const onPopState = (function () {
  let ready = false;

  if (document.readyState === 'complete') {
    ready = true;
  } else {
    window.addEventListener('load', function() {
      setTimeout(function() { ready = true; });
    });
  }

  return function(e) {
    if (ready && e.state) this.goToState(e.state);
  };
})();

function onLinkClick(e) {

  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (e.defaultPrevented) return;

  let el = e.target;
  while (el && 'A' !== el.nodeName) el = el.parentNode;
  if (!el || 'A' !== el.nodeName) return;

  // Check target
  if (el.target) return;

  // Different origin
  if (el.origin !== window.location.origin) return;

  // Ignore if tag has "download" attribute or rel="external" attribute
  if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

  // Check for mailto: in the href
  const link = el.getAttribute('href');
  if (link && link.indexOf('mailto:') > -1) return;

  const success = this.goTo(el.pathname + el.search, el.hash);
  if (success) e.preventDefault();
}


// -----------------------------------------------------------------------------
// Rendering and Navigation

function renderView(router, view, template, params) {
  router.$viewport.css('opacity', 0);

  setTimeout(() => {
    router.$viewport.removeChildren();
    // TODO Remove all event listeners in $viewport, to avoid memory leaks.
    $body.scrollTop = 0;
    router.$viewport.html = template;
    Browser.resize();
    Browser.replaceSvgImports();
    router.$viewport.css({ opacity: 1, 'pointer-events': 'all' });
    document.title = router.$viewport.$('title').text;
    router.initialise(router.$viewport, params);
    if (view.enter) view.enter(router.$viewport, params);
    router.trigger('afterChange', {$viewport: router.$viewport});
  }, 350);
}

function loadUrl(src) {
  // Append a query string to only load the body of the page, not the header.
  return fetch(src + (src.indexOf('?') >= 0 ? '&xhr=1' : '?xhr=1'))
      .then(response => response.text());
}

function loadView(router, view, params = {}, url = '') {
  router.$viewport.css({ opacity: 0.4, 'pointer-events': 'none' });
  const template = run(view.template, params) || loadUrl(url);

  if (template.then) {
    template.then(response => renderView(router, view, response, params));
  } else {
    renderView(router, view, template, params);
  }
}


// -----------------------------------------------------------------------------
// Router Class

class _Router extends Evented {

  setup(options) {
    this.$viewport = options.$viewport || $body;
    this.preloaded = options.preloaded || false;
    this.transition = options.transition || false;
    this.initialise = options.initialise || noop;
    this.noLoad = options.noLoad || false;

    this.views = [];
    this.active = null;
    this.current = '';

    if (options.click) $body.on('click', onLinkClick.bind(this));
    if (options.history) window.addEventListener('popstate', onPopState.bind(this));
  }

  get hash() {
    return window.location.hash.slice(1);
  }

  set hash(hash) {
    window.location.hash = hash;
    this.trigger('hashChange', hash);
  }


  // ------------------------------------------------------------------------
  // Routing Functions

  view(url, { enter, exit, template } = {}) {

    // TODO case insensitive, trailing slashes, more options
    // TODO error on multiple matching views
    const params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
    const regexStr = url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/') + '\\/?';
    const regex = new RegExp('^' + regexStr + '$');

    const thisView = { regex, params, enter, exit, template };
    this.views.push(thisView);

    const viewParams = getViewParams(window.location.pathname, thisView);
    if (!viewParams) return;

    this.active = { path: window.location.pathname, hash: window.location.hash, index: 0 };
    window.history.replaceState(this.active, '', this.active.path + this.active.hash);

    // The wrappers fix stupid Firefox, which doesn't seem to take its time
    // triggering .createdCallbacks for web components...
    Browser.ready(() => { setTimeout(() => {
      if (this.preloaded) {
        this.initialise(this.$viewport, viewParams);
        if (thisView.enter) thisView.enter(this.$viewport, viewParams);
      } else {
        loadView(this, thisView, viewParams, this.location.pathname);
      }
    }); });
  }

  paths(...urls) {
    urls.forEach(url => { this.view(url); });
  }

  getView(path) {
    for (const view of this.views) {
      const params = getViewParams(path, view);
      if (params) return { view, params };
    }
  }


  // ------------------------------------------------------------------------
  // Navigation Functions

  load(path, hash = '') {
    const go = this.getView(path);

    if (path === this.active.path && hash !== this.active.hash) {
      console.info('[boost] Routing to ' + path + hash);
      this.trigger('hashChange', hash.slice(1));
      this.trigger('change', path + hash);
      return true;

    } else if (go && path !== this.active.path) {
      console.info('[boost] Routing to ' + path + hash);
      this.trigger('change', path + hash);
      if (window.ga) ga('send', 'pageview', path + hash);
      if (this.noLoad) {
        if (go.view.enter) go.view.enter(this.$viewport, go.params);
      } else {
        loadView(this, go.view, go.params, path);
      }
      return true;

    } else {
      return false;
    }
  }

  goToState(state) {
    if (!state || !state.path) return;
    const change = this.load(state.path, state.hash);

    if (change && state.index < this.active.index) this.trigger('back');
    if (change && state.index > this.active.index) this.trigger('forward');
    this.active = state;
  }


  goTo(path, hash = '') {
    const success = this.load(path, hash);
    if (success) {
      const index = (this.active ? this.active.index + 1 : 0);
      this.active = { path, hash, index };
      window.history.pushState(this.active, '', path + hash);
    }
    return success;
  }

  back() { window.history.back(); }
  forward() { window.history.forward(); }

}

export const Router = new _Router();
