// =============================================================================
// Boost.js | Templates
// (c) Mathigon
// =============================================================================


import {ElementView} from './elements';
import {Observable} from './observable';


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
}


/**
 * Binds an observable to a DOM element, and parses all attributes as well as
 * the text content. Use `recursive = true` to also bind the observable to all
 * child elements.
 */
export function bindModel($el: ElementView, observable: Observable,
                          recursive = true) {
  for (const a of $el.attributes) {
    // We have to prefix x-path attributes, to avoid SVG errors on load.
    const to = a.name.startsWith('x-') ?
               document.createAttribute(a.name.slice(2)) : a;
    makeTemplate(observable, 'value', a, to);
    if (to !== a) $el._el.setAttributeNode(to);
  }

  if ($el.children.length) {
    for (const $c of $el.childNodes) {
      if ($c instanceof Text) {
        makeTemplate(observable, 'textContent', $c);
      } else if (recursive) {
        bindModel($c, observable);
      }
    }
  } else if ($el.html.trim()) {
    makeTemplate(observable, 'html', $el);
  }
}
