// =============================================================================
// Boost.js | Custom Elements Framework
// (c) Mathigon
// =============================================================================


import {HTMLBaseView} from './elements';


type CustomElementOptions = {attributes?: string[], template?: string, templateId?: string};
type CustomElementConstructor = new (el: CustomHTMLElement) => CustomElementView;

export type AttributeChangedEvent = {newVal: string, oldVal: string};


// -----------------------------------------------------------------------------
// Utility Functions

function applyTemplate(el: CustomHTMLElement, options: CustomElementOptions) {
  // Array.from() is required to break the reference to the original parent.
  const children = Array.from(el.childNodes) as Element[];

  if (options.template) {
    el.innerHTML = options.template;
  } else if (options.templateId) {
    const template = document.querySelector(options.templateId);
    if (!template) throw new Error(`Template not found: ${options.templateId}`);
    while (el.firstChild) el.removeChild(el.firstChild);
    const content = (template as HTMLTemplateElement).content;
    const clone = document.importNode(content, true);
    el.appendChild(clone);
  }

  if (!children.length) return;
  const defaultSlot = el.querySelector('slot:not([name])');

  for (const child of children) {
    const name = child.getAttribute ? child.getAttribute('slot') : undefined;
    const slot = name ? el.querySelector(`slot[name="${name}"]`) : defaultSlot;
    if (slot) slot.parentNode!.insertBefore(child, slot);
  }

  for (const slot of Array.from(el.querySelectorAll('slot'))) {
    slot.parentNode!.removeChild(slot);
  }
}

function customElementChildren(el: Element) {
  const result: CustomHTMLElement[] = [];
  for (const c of Array.from(el.children)) {
    if (c.tagName.startsWith('X-')) {
      result.push(c as CustomHTMLElement);
    } else {
      result.push(...customElementChildren(c));
    }
  }
  return result;
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
    if (options.template || options.templateId) applyTemplate(this, options);

    // Select all unresolved custom element children
    // TODO improve performance and fix ordering
    const promises = customElementChildren(this)
        .filter(c => !c.isReady)
        .map(c => new Promise(res => c.addEventListener('ready', res)));
    await Promise.all(promises);

    this._view.ready();
    this.dispatchEvent(new CustomEvent('ready'));
    this.isReady = true;
  }

  disconnectedCallback() {
    this._view.trigger('disconnected');
  }

  attributeChangedCallback(attrName: string, oldVal: string, newVal: string) {
    this._view.trigger('attr:' + attrName, {newVal, oldVal});
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


/**
 * Decorator for registering a new custom HTML element.
 */
export function register(tagName: string, options: CustomElementOptions = {}) {
  return function(ElementClass: CustomElementConstructor) {
    // Every class can only be used once as custom element,
    // so we have to make a copy.

    class Constructor extends CustomHTMLElement {
      constructor() {
        super();
        this._view = new ElementClass(this);
      }

      static observedAttributes = options.attributes || [];
    }

    customElementOptions.set(tagName.toUpperCase(), options);
    window.customElements.define(tagName, Constructor);
  };
}
