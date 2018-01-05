// =============================================================================
// Boost.js | Templates
// (c) Mathigon
// =============================================================================


// -----------------------------------------------------------------------------
// Object Observables

export function observable(state={}) {
  let changes = [];
  let values = {};

  function setProperty(key, value) {
    if (values[key] === value) return;
    values[key] = value;
    if (key in state) return;
    Object.defineProperty(state, key, {
      get: () => values[key],
      set(val) {
        values[key] = val;
        state.update();
      }
    });
  }

  for (let key of Object.keys(state)) setProperty(key, state[key]);

  // ---------------------------------------------------------------------------

  state.update = function() {
    for (let fn of changes) fn(values);
  };

  state.watch = function(fn) {
    changes.push(fn);
    fn(values);
  };

  state.set = function(key, value) {
    setProperty(key, value);
    state.update();
  };

  state.assign = function(obj) {
    for (let key of Object.keys(obj)) setProperty(key, obj[key]);
    state.update();
  };

  return state;
}


// -----------------------------------------------------------------------------
// Model Binding and Templating

export function parse(string, expr=false) {
  // TODO use expressions
  // jshint evil: true

  let fn = string.replace(/×/g, '*');

  if (!expr) {
    fn = fn.replace(/"/g,'\"')
      .replace(/\$\{([^\}]+)\}/g, (x, y) => `" + (${y}) + "`);
    fn = '"' + fn + '"';
  }

  try {
    return new Function('_vars', `try {
      with(_vars) { return ${fn} }
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
  model.watch(() => { toObj[property] = fn(model); });
  toObj[property] = fn(model);
}

export function bindObservable($el, observable, recursive=true) {
  for (let a of $el.attributes) {
    // NOTE: We have to convert x-path attributes, because SVG errors are thrown on load
    let to = a.name.match(/^x-/) ? document.createAttribute(a.name.replace(/^x-/, '')) : a;
    makeTemplate(observable, 'value', a, to);
    if (to !== a) $el._el.setAttributeNode(to);
  }

  if ($el.children.length) {
    for (let $c of $el.childNodes) {
      if ($c.tagName === 'TEXT') {
        makeTemplate(observable, 'text', $c);
      } else if (recursive) {
        bindObservable($c, observable);
      }
    }
  } else if ($el.html.trim()) {
    makeTemplate(observable, 'html', $el);
  }
}
