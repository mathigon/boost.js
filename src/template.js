// =============================================================================
// Boost.js | Template Functions
// (c) Mathigon
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

export function bind($el, model, noIterate = false) {
  for (let a of $el.attributes) {
    // NOTE: We have to convert x-path attributes, because SVG errors are thrown on load
    let to = a.name.match(/^x-/) ? document.createAttribute(a.name.replace(/^x-/, '')) : a;
    makeTemplate(model, 'value', a, to);
    if (to != a) $el._el.setAttributeNode(to);
    // TODO Update `props` property of custom elements.
  }

  if ($el.children.length) {
    for (let $c of $el.childNodes) {
      if ($c.tagName == 'TEXT') {
        makeTemplate(model, 'text', $c);
      } else if (!noIterate && !$c.isCustomElement) {
        bind($c, model);
      }
    }
  } else if ($el.html.trim()) {
    makeTemplate(model, 'html', $el);
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
