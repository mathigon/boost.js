// =============================================================================
// Boost.js | Templates
// (c) Mathigon
// =============================================================================


import {repeat} from '@mathigon/core';
import {ElementView} from './elements';


// -----------------------------------------------------------------------------
// Object Observables

const ALPHABETH = 'zyxwvutsrqponmlkjihgfedcba';

type Callback = (values: any) => void;

export interface Observable {
  update: () => void;
  watch: (fn: Callback, silent?: boolean) => void;
  set: (key: string, value: any) => void;
  assign: (obj: any) => void;
  name: () => string;

  [key: string]: any;
}


/** Creates a new observable. */
export function observable(state: any = {}): Observable {
  // TODO Add stronger typings.
  // TODO Use Proxies rather than .set(0 and .get().
  // TODO Only run callbacks that depend on properties that have changes.

  const changes: Callback[] = [];
  const values: any = {};

  let n = 1;
  let names = ALPHABETH.split('').map(x => '_' + x);

  function setProperty(key: string, value: any) {
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

  /** Re-evaluates all functions in this observable. */
  state.update = () => {
    for (const fn of changes) fn(values);
  };

  /**
   * Adds a change listener to this observable. If `silent` is false, the
   * listener will also be executed once, immediately.
   */
  state.watch = (fn: Callback, silent?: boolean) => {
    changes.push(fn);
    if (!silent) fn(values);
  };

  /** Sets the value of a property of the observable, and triggers an update. */
  state.set = (key: string, value: any) => {
    if (values[key] === value) return;
    setProperty(key, value);
    state.update();
  };

  /**
   * Assigns one or more properties of a JSON object to this observable, and
   * triggers an update.
   */
  state.assign = (obj: any) => {
    for (const key of Object.keys(obj)) setProperty(key, obj[key]);
    state.update();
  };

  /** Generates a new, unique property name for this observable. */
  state.name = () => {
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
 * Converts an expression string into an executable JS function. If `isString`
 * is true, it will replace all `${x}` type expressions within the string and
 * return a concatenated string. If `expr` is true, it will directly return
 * the result of the expression.
 */
export function parse<T = string>(
    expr: string, isString = true): (vars: any) => T|undefined {
  // TODO Use native expressions instead of eval().

  let fn = expr.replace(/×/g, '*');

  if (isString) {
    fn = fn.replace(/"/g, '\"')
        .replace(/\${([^}]+)}/g, (x, y) => `" + (${y}) + "`);
    fn = '"' + fn + '"';
  }

  try {
    return new Function('_vars', `try {
      with(_vars) { return ${fn} }
    } catch(_error) {
      if (!(_error instanceof ReferenceError)) console.warn(_error);
      return "";
    }`) as (vars: any) => T;
  } catch (e) {
    console.warn('WHILE PARSING: ', expr, '\n', e);
    return () => undefined;
  }
}

function makeTemplate(model: Observable, property: string, fromObj: any,
                      toObj = fromObj) {
  if (fromObj[property].indexOf('${') < 0) return;
  const fn = parse(fromObj[property]);
  model.watch(() => toObj[property] = fn(model) || '');
  toObj[property] = fn(model) || '';
}

/**
 * Binds an observable to a DOM element, and parses all attributes as well as
 * the text content. Use `recursive = true` to also bind the observable to all
 * child elements.
 */
export function bindObservable($el: ElementView, observable: Observable,
                               recursive = true) {
  for (const a of $el.attributes) {
    // NOTE: We have to convert x-path attributes, because SVG errors are thrown on load
    const to = a.name.startsWith('x-') ?
               document.createAttribute(a.name.slice(2)) : a;
    makeTemplate(observable, 'value', a, to);
    if (to !== a) $el._el.setAttributeNode(to);
  }

  if ($el.children.length) {
    for (const $c of $el.childNodes) {
      if ($c instanceof Text) {
        makeTemplate(observable, 'text', $c);
      } else if (recursive) {
        bindObservable($c, observable);
      }
    }
  } else if ($el.html.trim()) {
    makeTemplate(observable, 'html', $el);
  }
}
