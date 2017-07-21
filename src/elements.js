// =============================================================================
// Boost.js | Elements
// (c) 2017 Mathigon
// =============================================================================



import { uid, isOneOf, words, toCamelCase, square } from '@mathigon/core';
import { roundTo } from '@mathigon/fermat';
import { ease, animate, transition, enter, exit, effect } from './animate';
import { Browser } from './browser';
import { createEvent, removeEvent } from './events';
import { bind, model } from './template';


function cssN(element, property) {
  return parseFloat(element.css(property));
}

const p = window.Element.prototype;
const elementMatches = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector;


export class Element {

  constructor(el) {
    this._el = el;
    this._isWindow = isOneOf(el, window, document.body, document.documentElement);
    this._data   = el ? (el._m_data   || (el._m_data   = {})) : {};
    this._events = el ? (el._m_events || (el._m_events = {})) : {};
    this.isCustomElement = false;
  }

  get tagName() {
    if (this._el instanceof Text) return 'TEXT';
    return this._el.tagName;
  }


  // -------------------------------------------------------------------------
  // Basic Functionality

  get id() { return this._el.id; }
  get data() { return this._el.dataset; }

  addClass(className) {
    let classes = words(className);
    if (this._el.classList) {
      for (let c of classes) this._el.classList.add(c);
    } else {
      this._el.className += ' ' + className;
    }
  }

  removeClass(className) {
    let classes = words(className);
    if (this._el.classList) {
      for (let c of classes) this._el.classList.remove(c);
    } else {
      let regex = new RegExp('(^|\\s)' + classes.join('|') + '(\\s|$)', 'gi');
      this._el.className = this._el.className.toString().replace(regex, ' ');
    }
  }

  hasClass(className) {
    return (' ' + this._el.className + ' ').indexOf(' ' + className.trim() + ' ') >= 0;
  }

  toggleClass(className) {
    let classes = words(className);
    for (let c of classes) {
      if (this._el.classList) {
        this._el.classList.toggle(c);
      } else {
        this[this.hasClass(c) ? 'removeClass' : 'addClass'](c);
      }
    }
  }

  setClass(className, condition = true) {
    if (condition) {
      this.addClass(className);
    } else {
      this.removeClass(className);
    }
  }

  attr(attr, value) {
    if (value === undefined) {
      return this._el.getAttribute(attr);
    } else if (value === null) {
      this._el.removeAttribute(attr);
    } else {
      this._el.setAttribute(attr, value);
    }
  }

  hasAttribute(attr) {
    return this._el.hasAttribute(attr);
  }

  // We need the Array.from() wrapper because Safari doesn't support
  // for (let a for $el.attributes).
  get attributes() { return Array.from(this._el.attributes || []); }

  get value() { return this._el.value; }
  set value(v) { this._el.value = v; }

  get html() { return this._el.innerHTML || ''; }
  set html(h) { this._el.innerHTML = h; }

  get text() { return this._el.textContent || ''; }
  set text(t) { this._el.textContent = t; }


  // -------------------------------------------------------------------------
  // Form Actions

  get action() { return this._el.action; }
  get formData() {
    let data = {};
    let els = this._el.elements; // TODO array from
    for (let i=0; i<els.length; ++i) {
      data[els[i].name || els[i].id] = els[i].value;
    }
    return data;
  }

  blur() { this._el.blur(); }
  focus() { this._el.focus(); }

  change(callback) {
    let value = '';
    this.on('change', () => {
      if (this.value == value) return;
      value = this.value;
      callback(value);
    });
  }

  validate(callback) {
    this.change(value => { this.setValidity(callback(value)); });
  }

  setValidity(str) {
    this._el.setCustomValidity(str || '');
  }

  get isValid() {
    return this._el.checkValidity();
  }


  // -------------------------------------------------------------------------
  // Dimensions

  get bounds() { return this._el.getBoundingClientRect(); }
  get offsetTop()  { return this._el.offsetTop; }
  get offsetLeft() { return this._el.offsetLeft; }

  // Includes border and padding
  get width()  {
    if (this._isWindow) return window.innerWidth;
    // TODO see https://www.chromestatus.com/features/5724912467574784
    if (this._el instanceof SVGElement) return this.bounds.width;
    return this._el.offsetWidth;
  }

  get height() {
    if (this._isWindow) return window.innerHeight;
    // TODO see https://www.chromestatus.com/features/5724912467574784
    if (this._el instanceof SVGElement) return this.bounds.height;
    return this._el.offsetHeight;
  }

  get svgWidth() {
    return (this._el.viewBox.baseVal || {}).width || this.width;
  }

  get svgHeight() {
    return (this._el.viewBox.baseVal || {}).height || this.height;
  }

  // Doesn't include border and padding
  get innerWidth() {
    if (this._isWindow) return window.innerWidth;
    return this._el.clientWidth - cssN(this, 'padding-left') - cssN(this, 'padding-right');
  }
  get innerHeight() {
    if (this._isWindow) return window.innerHeight;
    return this._el.clientHeight - cssN(this, 'padding-bottom') - cssN(this, 'padding-top');
  }

  // Includes Margins
  get outerWidth() {
    if (this._isWindow) return window.outerWidth;
    return this._el.offsetWidth + cssN(this, 'margin-right') + cssN(this, 'margin-left');
  }
  get outerHeight() {
    if (this._isWindow) return window.outerHeight;
    return this._el.offsetHeight + cssN(this, 'margin-top') + cssN(this, 'margin-bottom');
  }

  get positionTop() {
    let element = this;
    let offset = 0;

    do { offset += element.offsetTop; }
    while (element = element.offsetParent);

    return offset;
  }

  get positionLeft() {
    let element = this;
    let offset = 0;

    do { offset += element.offsetLeft; }
    while (element = element.offsetParent);

    return offset;
  }

  get clientCenter() {
    let bounds = this.bounds;
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };

  }

  offset(parent) {
    // Get offset from immediate parent
    if (parent._el === this._el.offsetParent) {
      let top = this.offsetTop + parent._el.clientTop;
      let left = this.offsetLeft + parent._el.clientLeft;
      let bottom = top +  this.height;
      let right = left + this.width;
      return { top, left, bottom, right };

      // Get offset based on any other element
    } else {
      let parentBox = parent._el.getBoundingClientRect();
      let box = this._el.getBoundingClientRect();
      return { top:    box.top    - parentBox.top, left:  box.left  - parentBox.left,
        bottom: box.bottom - parentBox.top, right: box.right - parentBox.left };
    }
  }


  // -------------------------------------------------------------------------
  // Scrolling

  get scrollWidth()  { return this._isWindow ? $body._el.scrollWidth  : this._el.scrollWidth; }
  get scrollHeight() { return this._isWindow ? $body._el.scrollHeight : this._el.scrollHeight; }

  get scrollTop() { return this._isWindow ? window.pageYOffset : this._el.scrollTop; }
  set scrollTop(y) {
    if (this._isWindow) {
      document.body.scrollTop = document.documentElement.scrollTop = y;
    } else {
      this._el.scrollTop = y;
    }
    this.trigger('scroll', { top: y, left: this.scrollLeft });
  }

  get scrollLeft() { return this._isWindow ? window.pageXOffset : this._el.scrollLeft; }
  set scrollLeft(x) {
    if (this._isWindow) {
      document.body.scrollLeft = document.documentElement.scrollLeft = x;
    } else {
      this._el.scrollLeft = x;
    }
    this.trigger('scroll', { top: this.scrollTop, left: x });
  }

  fixOverflowScroll() {
    let _this = this;

    if (this._isWindow || this._data._fixOverflowScroll) return;
    this._data._fixOverflowScroll = true;

    this._el.addEventListener('touchstart', function(){
      // This ensures that overflow bounces happen within container
      let top = _this.scrollTop;
      let bottom = _this.scrollHeight - _this.height;

      if(top <= 0) _this.scrollTop = 1;
      if(top >= bottom) _this.scrollTop = bottom - 1;
    });
  }

  scrollTo(pos, time = 1000, easing = 'cubic') {
    let _this = this;
    let id = uid();
    if (pos < 0) pos = 0;

    let startPosition = this.scrollTop;
    let distance = pos - startPosition;

    function callback(t) {
      let y = startPosition + distance * ease(easing, t);
      _this.scrollTop = y;
      _this.trigger('scroll', { top: y, id });
    }

    animate(callback, time);

    // TODO Cancel animation if something else triggers scroll event
    // let _animation = animate(callback, time);
    // this.one('scroll', function(x) {  if (x.id !== id) animation.cancel(); });
    // this.one('touchStart', function() { animation.cancel(); });
  }

  scrollBy(distance, time = 1000, easing = 'cubic') {
    if (!distance) return;
    this.scrollTo(this.scrollTop + distance, time, easing);
  }


  // -------------------------------------------------------------------------
  // Styles

  css(props, value = null) {
    if (value == null) {
      if (typeof props === 'string') {
        return window.getComputedStyle(this._el, null).getPropertyValue(props);
      } else {
        for (let p in props) this._el.style[toCamelCase(p)] = props[p];
      }
    } else {
      this._el.style[toCamelCase(props)] = value;
    }
  }

  transition(property, duration = '1s', curve = 'ease-in-out') {
    if (arguments.length === 0) return this._el.style[Browser.prefix('transition')];
    if (typeof duration !== 'string') duration = duration + 'ms';
    this._el.style[Browser.prefix('transition')] = property + ' ' + duration + ' ' + curve;
  }

  get transform() {
    // window.getComputedStyle(this._el).getPropertyValue(Browser.prefix('transform'));
    return this._el.style[Browser.prefix('transform')].replace('none', '');
  }

  set transform(transform) {
    this._el.style[Browser.prefix('transform')] = transform;
  }

  get transformMatrix() {
    let transform = window.getComputedStyle(this._el).getPropertyValue(Browser.prefix('transform'));
    if (!transform || transform === 'none') return null;

    let coords = transform.match(/matrix\(([0-9\,\.\s\-]*)\)/);
    if (!coords[1]) return null;

    let matrix = coords[1].split(',');
    return [[+matrix[0], +matrix[1]], [+matrix[2], +matrix[3]],
      [+matrix[4], +matrix[5]]];
  }

  get computedTransformMatrix() {
    let own = this.transformMatrix;

    // TODO Do matrix multiplication!
    if (own) return own;

    if (this._isWindow || !this.parent) return own;
    return this.parent.computedTransformMatrix;
  }

  get scale() {
    let matrix = this.transformMatrix;
    return matrix ? [matrix[0][0], matrix[1][1]] : [1, 1];
  }

  translate(x, y) {
    x = roundTo(+x || 0, 0.1);
    y = roundTo(+y || 0, 0.1);
    this._el.style[Browser.prefix('transform')] = `translate(${x}px,${y}px)`;
  }

  translateX(x) {
    x = roundTo(+x || 0, 0.1);
    this._el.style[Browser.prefix('transform')] = 'translate(' + x + 'px,0)';
  }

  translateY(y) {
    y = roundTo(+y || 0, 0.1);
    this._el.style[Browser.prefix('transform')] = 'translate(0px,' + y + 'px)';
  }

  hide() {
    if (!this._data.noDisplayChange) this.css('display', 'none');
    this.css('visibility', 'hidden');
  }

  show() {
    if (!this._data.noDisplayChange) this.css('display', 'block');
    this.css('visibility', 'visible');
  }

  get noDisplayChange() { return this._data.noDisplayChange; }
  set noDisplayChange(value) { this._data.noDisplayChange = value; }

  transitionEnd(fn) {
    this.one('webkitTransitionEnd transitionend', fn);
  }

  animationEnd(fn) {
    this.one('webkitAnimationEnd animationend', fn);
  }


  // -------------------------------------------------------------------------
  // DOM Manipulation

  // Removes an element from the DOM for more performant node manipulation.
  // The element is placed back into the DOM at the place it was taken from.
  manipulate(fn) {
    let next = this._el.nextSibling;
    let parent = this._el.parentNode;
    let frag = document.createDocumentFragment();
    frag.appendChild(this._el);
    let returned = fn.call(this) || this._el;
    if (next) {
      parent.insertBefore(returned, next);
    } else {
      parent.appendChild(returned);
    }
  }

  is(selector) {
    if (elementMatches) return elementMatches.call(this._el, selector);
    return [].indexOf.call(document.querySelectorAll(selector), this._el) > -1;
  }

  index() {
    let i = 0;
    let child = this._el;
    while ((child = child.previousSibling) !== null) ++i;
    return i;
  }

  prepend(newChild) {
    let children = this._el.childNodes;

    if (typeof newChild === 'string') {
      let newChildren = $$N(newChild);
      for (let j = newChildren.length - 1; j >= 0; --j) {
        this._el.insertBefore(newChildren[j], this._el.childNodes[0]);
      }
    } else {
      if (children.length) {
        this._el.insertBefore(newChild._el, children[0]);
      } else {
        this._el.appendChild(newChild._el);
      }
    }
  }

  append(newChild) {
    if (typeof newChild === 'string') {
      let newChildren = $$N(newChild);
      for (let c of newChildren) this._el.appendChild(c._el);
    } else {
      this._el.appendChild(newChild._el);
    }
  }

  insertBefore(newChild) {
    let parent = this.parent;

    if (typeof newChild === 'string') {
      let newChildren = $$N(newChild);
      for (let j = newChildren.length - 1; j >= 0; --j) {
        parent._el.insertBefore(newChildren[j]._el, this._el);
      }
    } else {
      parent._el.insertBefore(newChild._el, this._el);
    }
  }

  insertAfter(newChild) {
    let parent = this.parent;

    if (typeof newChild === 'string') {
      let newChildren = $$N(newChild);
      for (let c of newChildren) parent._el.insertAfter(this._el, c._el);
    } else {
      let next = this._el.nextSibling;
      if (next) {
        parent._el.insertBefore(newChild._el, next);
      } else {
        parent._el.appendChild(newChild._el);
      }
    }
  }

  wrap(wrapper) {
    if (typeof wrapper === 'string') wrapper = $N(wrapper);
    this.insertBefore(wrapper);
    this.detach();
    wrapper.append(this);
    return wrapper;
  }

  moveTo(newParent, before = false) {
    this.detach();
    if (before) {
      newParent.prepend(this);
    } else {
      newParent.append(this);
    }
  }

  get next() {
    let next = this._el.nextSibling;
    return next ? $(next) : null;
  }

  get prev() {
    let prev = this._el.previousSibling;
    return prev ? $(prev) : null;
  }

  $(selector) {
    return $(selector, this);
  }

  $$(selector) {
    return $$(selector, this);
  }

  // DEPRECATED!
  find(selector) {
    return this.$(selector);
  }

  // DEPRECATED!
  findAll(selector) {
    return this.$$(selector);
  }

  get parent() {
    let parent = this._el.parentElement;  // note: parentNode breaks on document.matches
    return parent ? $(parent) : null;
  }

  get offsetParent() {
    let parent = this._el.offsetParent;
    return parent ? $(parent) : null;
  }

  get siblings() {
    let siblings = [];
    let el = this._el.parentNode.firstChild;
    do { siblings.push($(el)); } while (el = el.nextSibling);
    return siblings;
  }

  parents(selector) {
    let result = [];
    let parent = this.parent;
    while (parent) {
      if (!selector || parent.is(selector)) result.push(parent);
      parent = parent.parent;
    }
    return result;
  }

  hasParent(...$p) {
    let $tests = $p.map(p => p._el);
    let parent = this._el.parentNode;
    while (parent) {
      if (isOneOf(parent, ...$tests)) return true;
      parent = parent.parentNode;
    }
    return false;
  }

  get children() {
    let children = this._el.children || [];
    return Array.from(children, n => $(n));
  }

  get childNodes() {
    let childNodes = this._el.childNodes || [];
    return Array.from(childNodes, n => $(n));
  }

  detach() {
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
  }

  remove() {
    this.detach();
    this._el = null;
  }

  clear() {
    while (this._el.firstChild) this._el.removeChild(this._el.firstChild);
  }

  replace(...$els) {
    for (let $el of $els) this.insertBefore($el);
    this.remove();
  }

  applyTemplate($template) {
    if (!$template) throw new Error('Template not found');
    this.clear();
    let clone = document.importNode($template._el.content, true);
    this._el.appendChild(clone);
  }


  // -------------------------------------------------------------------------
  // Events

  on(type, fn = null, useCapture = false) {
    if (fn != null) {
      for (let e of words(type)) createEvent(this, e, fn, useCapture);
    } else {
      for (let e in type) createEvent(this, e, type[e]);
    }
  }

  one(events, fn, useCapture = false) {
    let _this = this;
    function callback() {
      _this.off(events, callback, useCapture);
      fn(events, fn, useCapture);
    }
    this.on(events, callback, useCapture);
  }

  off(type, fn, useCapture = false) {
    for (let e of words(type)) removeEvent(this, e, fn, useCapture);
  }

  trigger(events, args = {}) {
    for (let e of words(events)) {
      if (!this._events[e]) return;
      for (let fn of this._events[e]) fn.call(this, args);
    }
  }

  onKeyDown(keys, fn) {
    keys = words(keys).map(k => Browser.keyCodes[k] || k);
    this._el.addEventListener('keydown', function(e){
      if (keys.indexOf(e.keyCode) >= 0) fn(e);
    });
  }


  // -------------------------------------------------------------------------
  // Templates

  model(state, noIterate = false) {
    bind(this, state.change ? state : model(state), noIterate);
  }

  get props() {
    if (!('_props' in this._data)) this._data._props = {};
    return this._data._props;
  }


  // -------------------------------------------------------------------------
  // Animations

  animate(rules, duration, delay, ease) { return transition(this, rules, duration, delay, ease); }
  enter(type, duration, delay) { return enter(this, type, duration, delay); }
  exit(type, duration, delay) { return exit(this, type, duration, delay); }
  effect(type) { effect(this, type); }

  fadeIn(time = 400) { return enter(this, 'fade', time); }
  fadeOut(time = 400) { return exit(this, 'fade', time); }

  sticky(bounds) {
    // TODO sticky bottom
    // TODO remove body scroll events on destroy

    let _this = this;
    let isSticky;
    let offset = this.positionTop;

    let $placeholder = $N('div', { style: `height: ${this.height}px; display: none;` });
    this.insertAfter($placeholder);

    function position({ top }) {
      let shouldStick = offset - top < bounds.top;

      if (shouldStick && !isSticky) {
        isSticky = true;
        _this.addClass('sticky-top');
        $placeholder.show();
      } else if (!shouldStick && isSticky) {
        isSticky = false;
        _this.removeClass('sticky-top');
        $placeholder.hide();
      }
    }

    $body.on('scroll', position);

    Browser.resize(() => {
      // TODO what if already sticky?
      // offset = this.positionTop;
      position({ top: $body.scrollTop });
    });
  }


  // -------------------------------------------------------------------------
  // SVG Methods
  // TODO caching for this._data._points

  get strokeLength() {
    if ('getTotalLength' in this._el) {
      return this._el.getTotalLength();
    } else if (this._el instanceof SVGLineElement) {
      return Math.sqrt(square(this._el.x2.baseVal.value - this._el.x1.baseVal.value) +
        square(this._el.y2.baseVal.value - this._el.y1.baseVal.value));
    } else {
      let dim = this.bounds;
      return 2 * dim.height + 2 * dim.width;
    }
  }

  getLengthAt(i) { return this._el.getPointAtLength(i); }

  get points() {
    let points = this.attr('d').replace('M','').split('L');
    return points.map(function(x){
      let p = x.split(',');
      return { x: p[0], y: p[1] };
    });
  }

  set points(p) {
    let d = p.length ? 'M' + p.map(x => x.x + ',' + x.y).join('L') : '';
    this.attr('d', d);
  }

  addPoint(p) {
    let d = this.attr('d') + ' L ' + p.x + ',' + p.y;
    this.attr('d', d);
  }

  center(c) {
    this.attr('cx', c.x);
    this.attr('cy', c.y);
  }

  line(p, q) {
    this.attr('x1', p.x);
    this.attr('y1', p.y);
    this.attr('x2', q.x);
    this.attr('y2', q.y);
  }


  // -------------------------------------------------------------------------
  // Cursor and Selections

  get cursor() {
    let sel = window.getSelection();
    if (!sel.rangeCount) return [0, 0];

    let range = window.getSelection().getRangeAt(0);
    let preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this._el);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    let start = preCaretRange.toString().length;
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    let end = preCaretRange.toString().length;
    return [start, end];
  }

  /* set cursor(offset) {
    let parents = [this._el];
    let node = this._el.childNodes[0];

    while (node) {
      // Elements like <span> have further children
      if (node.childNodes.length) {
        parents.push(node);
        node = node.childNodes[0];

        // Text Node
      } else if (offset > node.length) {
        offset -= node.length;
        node = node.nextSibling || parents.pop().nextSibling;

        // Final Text Node
      } else {
        let range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    }
  } */

}


// -----------------------------------------------------------------------------
// Element Selectors

const svgTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
  'g', 'defs', 'marker', 'line', 'text', 'pattern', 'mask', 'svg'];

const _doc = { _el: document };

export function $(selector, context = _doc) {
  if (typeof selector === 'string')
    selector = context._el.querySelector(selector);

  if (selector instanceof Node || selector === window)
    return selector._el || new Element(selector);

  return null;
}

export function $I(selector) {
  let el = document.getElementById(selector);
  return el ? new Element(el) : null;
}

export function $C(selector, context = _doc) {
  let els = context._el.getElementsByClassName(selector);
  return els.length ? new Element(els[0]) : null;
}

export function $T(selector, context = _doc) {
  let els = context._el.getElementsByTagName(selector);
  return els.length ? new Element(els[0]) : null;
}

export function $$(selector, context = _doc) {
  let els = context._el.querySelectorAll(selector);
  return Array.from(els, el => new Element(el));
}

export function $$C(selector, context = _doc) {
  let els = context._el.getElementsByClassName(selector);
  return Array.from(els, el => new Element(el));
}

export function $$T(selector, context = _doc) {
  let els = context._el.getElementsByTagName(selector);
  return Array.from(els, el => new Element(el));
}


// -----------------------------------------------------------------------------
// Element Constructors

export function $N(tag, attributes = {}, parent = null) {
  let t = svgTags.indexOf(tag) < 0 ? document.createElement(tag) :
    document.createElementNS('http://www.w3.org/2000/svg', tag);

  for (let a in attributes) {
    if (a === 'id') {
      t.id = attributes.id;
    } else if (a === 'html') {
      t.innerHTML = attributes.html;
    } else {
      t.setAttribute(a, attributes[a]);
    }
  }

  let $el = new Element(t);
  if (parent) parent.append($el);
  return $el;
}

export function $$N(html) {
  let tempDiv = $N('div', { html: html });
  return tempDiv.children;
}


// -----------------------------------------------------------------------------
// Custom Elements

// Polyfill for Safari, where HTMLElement instanceof 'object' and can't be extended
let _HTMLElement = HTMLElement;
if (typeof HTMLElement !== 'function'){
  _HTMLElement = function(){};
  _HTMLElement.prototype = HTMLElement.prototype;
}

export function customElement(tag, options) {

  let attrs = options.attributes || {};
  if ('styles' in options) Browser.addCSS(options.styles);

  class CustomElement extends _HTMLElement {

    createdCallback() {
      let $el = this.$el = $(this);
      let children = $el.childNodes;
      this.$el.isCustomElement = true;

      if ('template' in options) $el.html = options.template;
      if ('templateId' in options) $el.applyTemplate($(options.templateId));

      $$T('content', $el).forEach(function($content) {
        let select = $content.attr('select');
        children.forEach(function($c, i) {
          if ($c && (!select || $c.is(select))) {
            $content.insertBefore($c);
            children[i] = null;
          }
        });
        $content.remove();
      });

      if ('created' in options) options.created.call(this, $el);
    }

    attachedCallback() {
      if ('attached' in options) options.attached.call(this, this.$el);
    }

    detachedCallback() {
      if ('detached' in options) options.detached.call(this, this.$el);
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
      if (attrName in attrs) {
        attrs[attrName].call(this, newVal, oldVal);
      }
    }

  }

  // TODO fix custom methods
  for (let k of Object.keys(options)) {
    if (!isOneOf(k, 'created', 'attached', 'detached', 'template', 'styles', 'attributes')) {
      CustomElement.prototype[k] = options[k];
    }
  }

  return document.registerElement(tag, CustomElement);
}


// -----------------------------------------------------------------------------
// Helper Functions

export function table(data) {
  let rows = data.map(tr => '<tr>' + tr.map(td => `<td>${td}</td>`).join('') + '</tr>').join('');
  return `<table>${rows}</table>`;
}


// -----------------------------------------------------------------------------
// Special Elements

export const $window = new Element(window);
export const $html = new Element(window.document.documentElement);
export const $body = new Element(document.body);
