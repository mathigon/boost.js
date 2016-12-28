// =============================================================================
// Boost.js | Router
// (c) 2017 Mathigon
// =============================================================================



import Evented from 'evented';
import Ajax from 'ajax';
import Browser from 'browser';
import { noop, run } from 'utilities';
import { $body } from 'elements';
import { zip } from 'arrays';


// -----------------------------------------------------------------------------
// Utilities

function getViewParams(url, view) {
  let match = view.regex.exec(url);
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
  let link = el.getAttribute('href');
  if (link && link.indexOf('mailto:') > -1) return;

  let success = this.goTo(el.pathname + el.search, el.hash);
  if (success) e.preventDefault();
}


// -----------------------------------------------------------------------------
// Rendering and Navigation

function renderView(router, view, template, params) {
  router.$viewport.css('opacity', 0);

  setTimeout(() => {
    router.$viewport.clear();
    $body.scrollTop = 0;
    router.$viewport.html = template;
    Browser.resize();
    router.$viewport.css({ opacity: 1, 'pointer-events': 'all' });
    document.title = router.$viewport.find('title').text;
    router.initialise(router.$viewport, params);
    if (view.enter) view.enter(router.$viewport, params);
    router.trigger('afterChange');
  }, 350);
}

function loadView(router, view, params = {}, url = '') {
  router.$viewport.css({ opacity: 0.4, 'pointer-events': 'none' });
  let template = run(view.template, params) || Ajax.get(url);

  if (template.then) {
    template.then(function(response) { renderView(router, view, response, params); });
  } else {
    renderView(router, view, template, params);
  }
}


// -----------------------------------------------------------------------------
// Router Class

class Router extends Evented {

  setup(options) {
    this.$viewport = options.$viewport || $body;
    this.preloaded = options.preloaded || false;
    this.transition = options.transition || false;
    this.initialise = options.initialise || noop;

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
    let params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
    let regexStr = url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/') + '\\/?';
    let regex = new RegExp('^' + regexStr + '$');

    let thisView = { regex, params, enter, exit, template };
    this.views.push(thisView);

    let viewParams = getViewParams(window.location.pathname, thisView);
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
    for (let view of this.views) {
      let params = getViewParams(path, view);
      if (params) return { view, params };
    }
  }


  // ------------------------------------------------------------------------
  // Navigation Functions

  load(path, hash = '') {
    let go = this.getView(path);

    if (path == this.active.path && hash != this.active.hash) {
      console.info('[boost] Routing to ' + path + hash);
      this.trigger('hashChange', hash.slice(1));
      this.trigger('change', path + hash);
      return true;

    } else if (go && path != this.active.path) {
      console.info('[boost] Routing to ' + path + hash);
      this.trigger('change', path + hash);
      loadView(this, go.view, go.params, path);
      return true;

    } else {
      return false;
    }
  }

  goToState(state) {
    if (!state || !state.path) return;
    let change = this.load(state.path, state.hash);

    if (change && state.index < this.active.index) this.trigger('back');
    if (change && state.index > this.active.index) this.trigger('forward');
    this.active = state;
  }


  goTo(path, hash) {
    let success = this.load(path, hash);
    if (success) {
      let index = (this.active ? this.active.index + 1 : 0);
      this.active = { path, hash, index };
      window.history.pushState(this.active, '', path + hash);
    }
    return success;
  }

  back() { window.history.back(); }
  forward() { window.history.forward(); }

}

export default new Router();
