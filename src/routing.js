// =============================================================================
// Boost.js | Routing
// (c) 2015 Mathigon / Philipp Legner
// =============================================================================



import Evented from 'evented';


// -----------------------------------------------------------------------------
// Utilities

const RouteEvents = new Evented();

const clickEvent = document.ontouchstart ? 'touchstart' : 'click';
const location = window.history.location || window.location;

function noop() {}


// -----------------------------------------------------------------------------
// Views

class View {
    constructor(options) {
        this.load  = ('load'  in options) ? options.load  : noop;
        this.enter = ('enter' in options) ? options.enter : noop;
        this.exit  = ('exit'  in options) ? options.exit  : noop;

        this.template = ('template' in options) ? options.template : null;
        this.data     = ('data' in options)     ? options.data     : null;
    }
}


// -----------------------------------------------------------------------------
// Setup

let base = '';
let viewport = $body;
let preloaded = false;
let transition = false;

let views = [];
let errorvView = null;
let activeView = null;

let current = '';
let id = 0;

function setup(options) {
    if ('base' in options) base = options.base;
    if ('viewport' in options) viewport = options.viewport;
    if ('preloaded' in options) preloaded = options.preloaded;
    if ('transition' in options) transition = options.transition;

    if (!(click in options) || options.click)
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

function view(url, _view) {
    // TODO case insensitive, trailing slashes, more options
    // TODO multiple matching views

    let params = url.match(/:\w+/g).map(x => x.substr(1));
    let regexStr = url.replace(/:\w+/g, '(\w+)').replace('/', '\\/');
    let regex = new RegExp('^' + regexStr + '$');
    views.push({ regex, params, _view });

    // TODO check if initial, the run view
}

function redirect(from, to) {
    view(from, new View({
        load: function() { _replaceState(to); }
    }));
}

function error(view) {
    errorView = view;
}


// -----------------------------------------------------------------------------
// Navigation Functions
// (when navigating the page)

function goTo(url) {
    for (let v of views) {
        let match = v.regex.exec(url);
        if (match) {
            match.shift();
            let params = zip(v.params, match);
            _renderView(v, url, params);
        }
    }
    _renderView(errorvView, url);
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

function setHash(newHash) {
    hash = newHash;
    _pushState(window.location.pathname + '#' + hash, currentState); // TODO
    RouteEvents.trigger('hashChange');
}


// -----------------------------------------------------------------------------
// Render Functions

function _pushState(url, state = {}) {
    ++id;
    window.history.pushState({ id: id, state: state }, '', url);
}

function _replaceState(url, state = {}) {
    window.history.replaceState({ id: id, state: state }, '', url);
}

function _renderView(newView, url, params = {}) {
    newView.load();

    if (activeView) {
        activeView.exit();
        activeView.$el.remove();  // TODO transition
    }

    let $view;

    if (initial && preload) {
        $view = viewport.children[0];
    } else {
        template = newView.template || Ajax.load(newView.templateUrl);  // TODO promise
        $view = $('div', { html: template });
        viewport.addChild($view);  // TODO transition
    }

    newView.enter($view, params);
    activeView = newView;
}

function _onStateChange(e) {
    goTo(e.url);
    let newId = 10; // TODO

    browserEvents.trigger('change', activeView);
    if (newId < id) browserEvents.trigger('back', activeView);
    if (newId > id) browserEvents.trigger('forward', activeView);
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

    return function _onPopState(e) {
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

    var el = e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;

    // Ignore if tag has "download" attribute or rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (el.pathname === location.pathname && (el.hash || '#' === link)) return;

    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;

    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (base && orig === path) return;

    e.preventDefault();
    _pushState(path);
}

// -----------------------------------------------------------------------------

const Router = {
    setup, disable, view, redirect, error, 
    getHash, setHash, goTo, goBack, goForward,
    on: RouteEvents.on, off: RouteEvents.off, trigger: RouteEvents.trigger
};

export { View, Router };


/*
const homeView = new View({
    load: function() { },
    enter: function($el, params) { },
    exit: function() { },

    template: '<div></div>',
    templateUrl: '/my-page',
    template: function(params) { return '<div></div>'; },

    data: { }
});

Router.setup({
    viewport: $('#main'),
    initial: 'preloaded', // template for first view is already in place
    transition: 'fade',
    click: true,
    popstate: true,
    base: '/'
});

Router.view('/home', homeView);
Router.redirect('/other', '/home');
Router.error(errorView)
*/


