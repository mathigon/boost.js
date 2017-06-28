// =============================================================================
// Boost.js | Custom Elements Framework
// (c) Mathigon
// *** EXPERIMENTAL ***
// =============================================================================



// -----------------------------------------------------------------------------
// Object Observables

function observable(state={}) {
  let changes = [];
  let singleChanges = {};
  let copies = [];

  let values = {};
  for (let s of Object.keys(state)) values[s] = state[s];

  Object.defineProperties(state, {
    watchAll: {
      value: function(callback) {
        changes.push(callback);
        callback(values);
      }
    },
    watch: {
      value: function(property, callback) {
        if (!(property in singleChanges)) singleChanges[property] = [];
        singleChanges[property].push(callback);
        callback(values[property]);
      }
    },
    _check: {
      value: function() {
        // All properties that have already been upgraded are non-enumerable.
        for (let s of Object.keys(state)) {
          values[s] = state[s];
          Object.defineProperty(state, s, {
            get: function() { return values[s] },
            set: function(val) {
              values[s] = val;
              if (s in singleChanges) singleChanges[s](val);
              for (let fn of changes) fn(values);
              for (let c of copies) c[s] = val;
            }
          });
        }
      }
    },
    _copy: {
      value: function() {
        let child = observable(Object.assign({}, values));
        copies.push(child);
        return child;
      }
    }
  });

  return state;
}


// -----------------------------------------------------------------------------
// Model Binding and Templating

function parse(string) {
  // TODO use expressions
  // jshint evil: true

  let fn = string.replace(/"/g,'"');
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
  model.watchAll(() => { toObj[property] = fn(model); });
  toObj[property] = fn(model);
}

function bindModel(el, model) {
  // Text Nodes
  if (!el.childNodes.length) return makeTemplate(model, 'innerHTML', el);

  for (let child of el.childNodes) {

    // Update attributes
    for (let a of child.attributes) {
      // SVG attributes with variables are prefixed with 'x-', because invalid
      // attributes throw an error on load
      let to = a.name.startsWith('x-') ?
               document.createAttribute(a.name.slice(2)) : a;
      makeTemplate(model, 'value', a, to);
      if (to !== a) child.setAttributeNode(to);
    }

    // Recursive
    if (!(child instanceof Component)) bindModel(child, model);
  }
}


// -----------------------------------------------------------------------------
// Custom Element Baseclass

export class Component extends HTMLElement {

  connectedCallback() {
    // The first time a custom element is connected, we run the .created()
    // property (see below). We have to guard against this running more than
    // once, but trigger the 'connected' event in that case.

    if (this._wasConnected) {
      // TODO Bind the model of the new parent.
      this.dispatchEvent(new CustomEvent('connected'));
      return;
    }
    this._wasConnected = true;

    // -------------------------------------------------------------------------

    let parent = this.parentNode;
    while (parent && !parent.model) parent = parent.parentNode;
    this.model = parent ? parent.model._copy() : observable();

    let $el = this;
    /* TODO Make passing custom properties more efficient!
    let $el = $(this);
    let properties = Object.getOwnPropertyNames(this.constructor.prototype);
    let builtin = ['constructor', 'created', 'ready', 'template', 'templateId'];
    properties = properties.filter(p => !builtin.includes(p));
    for (let p of properties) $el[p] = this[p].bind($el); */

    // -------------------------------------------------------------------------

    let children = this.childNodes;

    if (this.template) this.innerHTML = this.template;
    if (this.templateId) {
      let template = document.getElementById(this.templateId);
      while (this.firstChild) this.removeChild(this.firstChild);
      let clone = document.importNode(template.content, true);
      this.appendChild(clone);
    }

    for (let child of children) {
      let name = child.getAttribute('slot');
      let query = name ? `slot[name=${name}]` : 'slot:not([name])';
      let slot = this.querySelector(query);
      if (slot) slot.parentNode.insertBefore(child, slot);
    }

    for (let slot of this.querySelectorAll('slot')) {
      slot.parentNode.removeChild(slot);
    }

    // -------------------------------------------------------------------------

    this.created.call($el);
    this.model._check();  // All watchable properties should be initialised!
    bindModel(this, this.model);

    // -------------------------------------------------------------------------

    // TODO Don't select nested undefined children.
    let undefinedChildren = this.querySelectorAll(':not(:defined)');

    let promises = Array.from(undefinedChildren, child => {
      return new Promise(ready => { child.addEventListener('_ready', ready); });
    });

    Promise.all(promises).then(() => {
      this.ready.call($el);
      this.dispatchEvent(new CustomEvent('_ready'));
    });
  }

  disconnectedCallback() {
    this.dispatchEvent(new CustomEvent('disconnected'));
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    this.dispatchEvent(new CustomEvent('attr_' + attrName, {
      detail: { newVal, oldVal }
    }));
  }

  attributeChange(attrName, callback) {
    // TODO Also trigger attributeChange when bound model properties change.
    callback(this.getAttribute(attrName), null);
    this.addEventListener('attr_' + attrName, function(e) {
      callback(e.detail.newVal, e.detail.oldVal);
    });
  }

  created() {}
  ready() {}
  static get template() {}
  static get templateId() {}
}

export function registerElement(name, element) {
  window.customElements.define(name, element);
}


/* Example

class Chapter extends Component {
  static get templateId() { return '#chaper'; }
  static get observedAttributes() { return ['disabled', 'open']; }

  // Triggered when DOM element is created.
  created($el, model) {
    model.chapter = this;
    model.x = 10;

    // TODO Make this more convenient (pass JS objects directly as attributes?)
    model.watch($el.attr('callbackFn'), function() {

    });

    this.attributeChange('callbackFn', function(after, before) {

    });
  }

  // Triggered when all custom element children are ready.
  ready() {

  }
} */
