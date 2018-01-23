// =============================================================================
// Boost.js | Custom Elements Framework
// (c) Mathigon
// =============================================================================



import { Browser } from './browser';
import { Element } from './elements';


// -----------------------------------------------------------------------------
// Polyfills

// Firefox
Browser.ready(() => {
  Browser.addCSS(':unresolved { visibility: visible; }');
});

// Safari: `HTMLElement` is an `Object` and can't be extended
let _HTMLElement = HTMLElement;
if (typeof HTMLElement !== 'function'){
  _HTMLElement = function() {};
  _HTMLElement.prototype = HTMLElement.prototype;
}


// -----------------------------------------------------------------------------
// Utility Functions

function applyTemplate(el, options) {
  // Array.from() is required to break the reference to the original parent.
  const children = Array.from(el.childNodes);

  if (options.template) {
    el.innerHTML = options.template;
  } else if (options.templateId) {
    let template = document.querySelector(options.templateId);
    if (!template) throw new Error('Template not found:', options.templateId);
    while(el.firstChild) el.removeChild(el.firstChild);
    let clone = document.importNode(template.content, true);
    el.appendChild(clone);
  }

  if (!children.length) return;
  const defaultSlot = el.querySelector('slot:not([name])');

  for (let child of children) {
    let name = child.getAttribute ? child.getAttribute('slot') : null;
    let slot = name ? el.querySelector(`slot[name="${name}"]`) : defaultSlot;
    if (slot) slot.parentNode.insertBefore(child, slot);
  }

  for (let slot of el.querySelectorAll('slot')) {
    slot.parentNode.removeChild(slot);
  }
}

function customElementChildren(el) {
  const result = [];
  for (let c of el.children) {
    if (c.tagName.startsWith('X-')) {
      result.push(c);
    } else {
      result.push(...customElementChildren(c));
    }
  }
  return result;
}


// -----------------------------------------------------------------------------
// Custom Element Classes

const customElements = new Map();

class CustomHTMLElement extends HTMLElement {

  connectedCallback() {
    // The element setup is done when it is first attached to the dom. We have
    // to guard against this running more than once.
    if (this._wasConnected) {
      // TODO Bind the model of the new parent.
      this.$el.trigger('connected');
      return;
    }
    this._wasConnected = true;
    this._isReady = false;

    if (this.$el.created) this.$el.created();

    const options = customElements.get(this.$el.tagName);

    // Bind Component Template
    if (options.template || options.templateId) applyTemplate(this, options);

    // Select all unresolved custom element children
    // TODO improve performance
    let promises = customElementChildren(this).filter(c => !c._isReady)
      .map(c => new Promise(resolve => c.addEventListener('_ready', resolve)));

    // TODO run ready() synchronously, if promises.length == 0
    Promise.all(promises).then(() => {
      if (this.$el.ready) this.$el.ready();
      this.dispatchEvent(new CustomEvent('_ready'));
      this._isReady = true;
    });
  }

  disconnectedCallback() {
    this.$el.trigger('disconnected');
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    this.$el.trigger('attr:' + attrName, { newVal, oldVal });
  }
}

export class CustomElement extends Element {
  constructor(el) { super(el); }
  created() {}
  ready() {}
  static get template() {}
  static get templateId() {}
}

export function registerElement(tagName, ElementClass, options={}) {
  // Every class can only be used once as custom element,
  // so we have to make a copy.

  class Constructor extends CustomHTMLElement {
    constructor() {
      super();
      this.$el = new ElementClass(this);
      this._wasConnected = false;
    }

    static get observedAttributes() { return options.attributes || []; }
  }

  customElements.set(tagName.toUpperCase(), options);
  window.customElements.define(tagName, Constructor);
}
