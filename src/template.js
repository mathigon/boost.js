// =============================================================================
// Boost.js | Template Functions
// (c) 2015 Mathigon
// =============================================================================



export function parse(string) {
    // TODO use expressions
    // jshint evil: true

    let fn = string.replace(/"/g,'\"');
    fn = fn.replace(/\$\{([^\}]+)\}/g, (x, y) => `" + (${y}) + "`);

    try {
        return new Function('_vars', `try {
            with(_vars) { return "${fn}" }
        } catch(e) {
            if (!(e instanceof ReferenceError)) console.warn(e);
            return "";
        }`);
    } catch (e) {
        console.warn('WHILE PARSING: ', string, '\n', e);
        return function() { return ''; };
    }
}

function makeTemplate(model, property, fromObj, toObj = fromObj) {
    if (fromObj[property].indexOf('${') < 0) return;
    let fn = parse(fromObj[property]);
    model.change(function() { toObj[property] = fn(model); });
    toObj[property] = fn(model);
}

export function bind(_el, model, noIterate = false) {
    let attrs =  _el.attributes;
    if (attrs) { for (let i=0; i<attrs.length; ++i) {
        // NOTE: We have to convert x-path attributes, because SVG errors are thrown on load
        let to = attrs[i].name.match(/^x-/) ? document.createAttribute(attrs[i].name.replace(/^x-/, '')) : attrs[i];
        makeTemplate(model, 'value', attrs[i], to);
        if (to != attrs[i]) _el.setAttributeNode(to);
    } }

    if (_el.children && _el.children.length) {
        for (let c of _el.childNodes) {
            if (c instanceof Text) {
                makeTemplate(model, 'textContent', c);
            } else if (!noIterate && !c.isCustomElement) {
                bind(c, model);
            }
        }
    } else if (_el.innerHTML && _el.innerHTML.trim()) {
        makeTemplate(model, 'innerHTML', _el);
    }
}

export function model(state) {
    let changes = [];

    state.change = function(fn) {
        fn(state);
        changes.push(fn);
    };

    state.set = function(key, value) {
        if (state[key] == value) return;
        state[key] = value;
        for (let fn of changes) fn(state);
    };

    state.load = function(obj) {
        Object.assign(state, obj);
        for (let fn of changes) fn(state);
    };

    for (let fn of changes) fn(state);
    return state;
}
