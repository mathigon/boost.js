// =============================================================================
// Boost.js | Templates
// (c) Mathigon
// =============================================================================


import {ElementView} from './elements';
import {compileString} from './eval';
import {Observable} from './observable';



function makeTemplate(model: Observable, property: string, fromObj: any,
                      toObj = fromObj) {
  if (fromObj[property].indexOf('${') < 0) return;
  const fn = compileString(fromObj[property]);
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
