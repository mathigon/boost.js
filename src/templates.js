// =============================================================================
// Boost.js | Templates
// (c) Mathigon
// =============================================================================


import { repeat } from '@mathigon/core';

// -----------------------------------------------------------------------------
// Object Observables

const ALPHABETH = 'zyxwvutsrqponmlkjihgfedcba';

/**
 * Creates a new observable.
 * @param {Object} state Initial state
 */
export function observable(state={}) {
  const changes = [];
  const values = {};

  let n = 1;
  let names = ALPHABETH.split('').map(x => '_' + x);

  function setProperty(key, value) {
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

  for (const key of Object.keys(state)) setProperty(key, state[key]);

  // ---------------------------------------------------------------------------

  /**
   * Re-evaluates all functions in this observable.
   * @memberOf {observable}
   */
  state.update = function() {
    // TODO Should only execute functions that use state properties that have
    // changed. See https://github.com/elbywan/hyperactiv
    for (const fn of changes) fn(values);
  };

  /**
   * Adds a change listener to this observable.
   * @param {Function} fn
   * @param {silent=} silent Whether to execute `fn` immediately.
   * @memberOf {observable}
   */
  state.watch = function(fn, silent=false) {
    changes.push(fn);
    if (!silent) fn(values);
  };

  /**
   * Sets the value of a property of the observable, and triggers an update.
   * @param {string} key
   * @param {any} value
   * @memberOf {observable}
   */
  state.set = function(key, value) {
    if (values[key] === value) return;
    setProperty(key, value);
    state.update();
  };

  /**
   * Assigns one or more properties of a JSON object to this observable, and
   * triggers an update.
   * @param {Object.<string, any>} obj
   * @memberOf {observable}
   */
  state.assign = function(obj) {
    for (const key of Object.keys(obj)) setProperty(key, obj[key]);
    state.update();
  };

  /**
   * Generates a new, unique property name for this observable.
   * @returns {string}
   * @memberOf {observable}
   */
  state.name = function() {
    if (!names.length) {
      n += 1;
      names = ALPHABETH.split('').map(x => repeat('_', n) + x);
    }
    return names.pop();
  };

  return state;
}


// -----------------------------------------------------------------------------
// Model Binding and Templating

/**
 * Converts an expression string into an executable JS function. If `expr` is
 * false, it will replace all `${x}` type expressions within the string and
 * return a concatenated string. If `expr` is true, it will directly return
 * the result of the expression.
 * @param {string} string
 * @param {boolean=} expr
 * @returns {Function}
 */
export function parse(string, expr=false) {
  // TODO Use native expressions instead of eval().
  // jshint evil: true

  let fn = string.replace(/×/g, '*');

  if (!expr) {
    fn = fn.replace(/"/g,'\"')
      .replace(/\${([^}]+)}/g, (x, y) => `" + (${y}) + "`);
    fn = '"' + fn + '"';
  }

  try {
    return new Function('_vars', `try {
      with(_vars) { return ${fn} }
    } catch(_error) {
      if (!(_error instanceof ReferenceError)) console.warn(_error);
      return "";
    }`);
  } catch (e) {
    console.warn('WHILE PARSING: ', string, '\n', e);
    return function() { return ''; };
  }
}

function makeTemplate(model, property, fromObj, toObj = fromObj) {
  if (fromObj[property].indexOf('${') < 0) return;
  const fn = parse(fromObj[property]);
  model.watch(() => { toObj[property] = fn(model); });
  toObj[property] = fn(model);
}

/**
 * Binds an observable to a DOM element, and parses all attributes as well as
 * the text content. Use `recursive = true` to also bind the observable to all
 * child elements.
 * @param {Element} $el
 * @param {observable} observable
 * @param {boolean=} recursive
 */
export function bindObservable($el, observable, recursive=true) {
  for (const a of $el.attributes) {
    // NOTE: We have to convert x-path attributes, because SVG errors are thrown on load
    const to = a.name.match(/^x-/) ? document.createAttribute(a.name.replace(/^x-/, '')) : a;
    makeTemplate(observable, 'value', a, to);
    if (to !== a) $el._el.setAttributeNode(to);
  }

  if ($el.children.length) {
    for (const $c of $el.childNodes) {
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
