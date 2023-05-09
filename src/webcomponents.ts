// =============================================================================
// Boost.js | Custom Elements Framework
// (c) Mathigon
// =============================================================================


import {HTMLBaseView} from './elements';

type CustomElementOptions = {template?: string};
type CustomElementConstructor = new (el: CustomHTMLElement) => CustomElementView;


// -----------------------------------------------------------------------------
// Utility Functions

function applyTemplate(el: CustomHTMLElement, template: string) {
  // Array.from() is required to break the reference to the original parent.
  const children = Array.from(el.childNodes) as Element[];

  el.innerHTML = template;

  const slots: Record<string, HTMLElement> = {};
  for (const s of Array.from(el.querySelectorAll('slot'))) {
    slots[s.getAttribute('name') || ''] = s;
  }

  for (const child of children) {
    const name = child.getAttribute ? (child.getAttribute('slot') || '') : '';
    const slot = slots[name] || slots[''];
    if (slot) slot.parentNode!.insertBefore(child, slot);
  }

  for (const slot of Object.values(slots)) slot.parentNode!.removeChild(slot);
}

function* customElementChildren(el: Element): Iterable<CustomHTMLElement> {
  for (const c of Array.from(el.children)) {
    if (c.tagName.includes('-')) {
      yield c as CustomHTMLElement;
    } else {
      yield* customElementChildren(c);
    }
  }
}


// -----------------------------------------------------------------------------
// Custom Element Classes

const customElementOptions = new Map<string, CustomElementOptions>();

abstract class CustomHTMLElement extends HTMLElement {
  private wasConnected = false;
  private isReady = false;
  _view!: CustomElementView;

  async connectedCallback() {
    // The element setup is done when it is first attached to the dom. We have
    // to guard against this running more than once.
    if (this.wasConnected) {
      // TODO Bind the model of the new parent.
      this._view.trigger('connected');
      return;
    }
    this.wasConnected = true;
    this.isReady = false;

    this._view.created();

    const options = customElementOptions.get(this._view.tagName) || {};

    // Bind Component Template
    if (options.template) applyTemplate(this, options.template);

    // Select all unresolved custom element children
    // TODO improve performance and fix ordering
    const promises = [...customElementChildren(this)]
      .filter(c => !c.isReady)
      .map(c => new Promise(res => c.addEventListener('ready', res)));
    setTimeout(() => {
      if (!this.isReady) console.error(`Children of custom element ${this.tagName} not ready after 1s.`);
    }, 1000);
    await Promise.all(promises);

    this._view.ready();
    this.dispatchEvent(new CustomEvent('ready'));
    this.isReady = true;
  }

  disconnectedCallback() {
    this._view.trigger('disconnected');
  }
}

/**
 * Base class for custom HTML elements. In addition to other custom methods,
 * it can implement `created()` and `ready()` methods that are executed during
 * the element lifecycle.
 */
export abstract class CustomElementView extends HTMLBaseView<CustomHTMLElement> {
  created() {
    // abstract
  }

  ready() {
    // abstract
  }
}

export const CUSTOM_ELEMENTS = new Map<string, CustomElementConstructor>();

/**
 * Decorator for registering a new custom HTML element.
 */
export function register(tagName: string, options: CustomElementOptions = {}) {
  return function(ElementClass: CustomElementConstructor) {
    if (window.customElements.get(tagName)) {
      console.warn(`Trying to declare the custom element ${tagName} twice!`);
      return;
    }

    // Every class can only be used once as custom element,
    // so we have to make a copy.
    class Constructor extends CustomHTMLElement {
      constructor() {
        super();
        this._view = new ElementClass(this);
      }
    }

    CUSTOM_ELEMENTS.set(tagName, ElementClass);
    customElementOptions.set(tagName.toUpperCase(), options);
    window.customElements.define(tagName, Constructor);
  };
}
