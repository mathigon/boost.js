// =============================================================================
// Boost.js | Routing
// (c) 2015 Mathigon / Philipp Legner
// =============================================================================



import Evented from 'evented';
import Ajax from 'ajax';
import Browser from 'browser';
import { $N } from 'elements';
import { noop, run } from 'utilities';
import { $body } from 'elements';
import { zip } from 'arrays';
import { isString } from 'types';


// -----------------------------------------------------------------------------
// Utilities

const RouteEvents = new Evented();

const clickEvent = document.ontouchstart ? 'touchstart' : 'click';
const location = window.history.location || window.location;


// -----------------------------------------------------------------------------
// Views

class View {
    constructor(options = {}) {
        this.load  = ('load'  in options) ? options.load  : noop;
        this.enter = ('enter' in options) ? options.enter : noop;
        this.exit  = ('exit'  in options) ? options.exit  : noop;

        this.title = ('title' in options) ? options.title : null;
        this.template = ('template' in options) ? options.template : null;
        this.templateUrl = ('templateUrl' in options) ? options.templateUrl : null;
    }
}


// -----------------------------------------------------------------------------
// Setup

let base = '';
let viewport = $body;
let preloaded = false;
let transition = false;

let views = [];
let errorView = { view: new View({ template: 'Error' }), $el: null, params: [] };
let activeView = null;

let current = '';
let id = 0;

function setup(options) {
    if ('base' in options) base = options.base;
    if ('viewport' in options) viewport = options.viewport;
    if ('preloaded' in options) preloaded = options.preloaded;
    if ('transition' in options) transition = options.transition;

    if (!('click' in options) || options.click)
        document.addEventListener(clickEvent, onClick, false);

    window.addEventListener('popstate', onPopState, false);
}

function disable() {
    document.removeEventListener(clickEvent, onClick, false);
    window.removeEventListener('popstate', onPopState, false);
    current = '';
    id = 0;
}


// -----------------------------------------------------------------------------
// Routing Functions
// (when setting up the page)

function view(url, _view = null) {
    // TODO case insensitive, trailing slashes, more options
    // TODO error on multiple matching views

    if (!_view) _view = new View({ templateUrl: url });

    let params = (url.match(/:\w+/g) || []).map(x => x.substr(1));
    let regexStr = url.replace(/:\w+/g, '([\\w-]+)').replace('/', '\\/');
    let regex = new RegExp('^' + regexStr + '$');
    let thisView = { regex, params, view: _view, $el: null };
    views.push(thisView);

    // If initial view, initialise
    let viewParams = _getViewParams(window.location.pathname, thisView);
    if (!viewParams) return;

    if (preloaded) {
        _renderViewComplete(thisView, viewport.children(0), viewParams);
    } else {
         _renderView(thisView, viewParams);
    }
}

function redirect(from, to) {
    view(from, new View({
        load: function() { _replaceState(to); }
    }));
}

function error(view) {
    errorView = { view, $el: null };
}


// -----------------------------------------------------------------------------
// Navigation Functions
// (when navigating the page)

function goTo(url) {
    console.info('[boost] Routing to ' + url);
    for (let v of views) {
        let params = _getViewParams(url, v);
        if (params) return _renderView(v, params);
    }
    return _renderView(errorView);
}

function goBack() {
    window.history.back();
}

function goForward() {
    window.history.forward();
}

function getHash() {
    return window.location.hash.replace(/^#/, '');
}

function setHash(hash) {
    _pushState(window.location.pathname + '#' + hash, current); // TODO
    RouteEvents.trigger('hashChange');
}


// -----------------------------------------------------------------------------
// Render Functions

function _getViewParams(url, view) {
    let match = view.regex.exec(url);
    if (match) {
        match.shift();
        return zip(view.params, match);
    } else {
        return null;
    }
}

function _pushState(url, state = {}) {
    ++id;
    window.history.pushState({ id: id, state: state }, '', url);
    _onStateChange({ url: url });
}

function _replaceState(url, state = {}) {
    window.history.replaceState({ id: id, state: state }, '', url);
}

function _renderView(newView, params = {}) {
    newView.view.load();

    if (activeView) {
        activeView.view.exit();
        activeView.$el.remove();  // TODO out transition
    } else {
        viewport.clear();
    }

    // TODO scroll to top

    let template = run(newView.view.template) || new Ajax.get(newView.view.templateUrl);

    if (template.then) {
        template.then(
            function(r) { _renderViewMake(newView, r, params); },
            function(r) { _renderViewMake(errorView, errorView.view.template, params); }
        );
    } else {
        _renderViewMake(newView, template, params);
    }

}

function _renderViewMake(newView, template, params) {
    let $view = $N('div', { html: template });
    viewport.append($view);  // TODO in transition
    _renderViewComplete(newView, $view, params);
}

function _renderViewComplete(newView, $view, params) {
    if (newView.title) document.title = run(newView.title, params);
    newView.view.enter($view, params);
    newView.$el = $view;
    activeView = newView;
}

function _onStateChange(e) {
    goTo(e.url);
    let newId = 10; // TODO

    Browser.trigger('change', activeView);
    if (newId < id) Browser.trigger('back', activeView);
    if (newId > id) Browser.trigger('forward', activeView);
    id = newId;
}


// -----------------------------------------------------------------------------
// Events

const onPopState = (function () {

    let loaded = false;

    if (document.readyState === 'complete') {
        loaded = true;
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() {
                loaded = true;
            });
        });
    }

    return function(e) {
        if (!loaded) return;
        _onStateChange(e);
    };
})();

function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
}

function onClick(e) {

    if (which(e) !== 1) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    let el = e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;

    // Ignore if tag has "download" attribute or rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // Ensure non-hash for the same path
    let link = el.getAttribute('href');
    if (el.pathname === location.pathname && (el.hash || link === '#')) return;

    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // Check target
    if (el.target) return;

    // Different origin
    if (el.origin !== window.location.origin) return;

    // Rebuild path
    let path = el.pathname + el.search + (el.hash || '');

    // Same page
    let orig = path;
    if (path.indexOf(base) === 0) path = path.substr(base.length);
    if (base && orig === path) return;

    e.preventDefault();
    _pushState(path);
}

// -----------------------------------------------------------------------------

const Router = {
    setup, disable, view, redirect, error, goTo, goBack, goForward,
    get hash() { return getHash(); },
    set hash(h) { setHash(h); },
    on: RouteEvents.on, off: RouteEvents.off, trigger: RouteEvents.trigger };

export { View, Router };
