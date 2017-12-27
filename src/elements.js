// =============================================================================
// Boost.js | Element Classes
// (c) Mathigon
// =============================================================================



import { isOneOf, words, toCamelCase, square, delay } from '@mathigon/core';
import { roundTo, Point } from '@mathigon/fermat';
import { ease, animate, transition, enter, exit, effect } from './animate';
import { Browser } from './browser';
import { createEvent, removeEvent } from './events';
import { bindObservable } from './templates';


// -----------------------------------------------------------------------------
// Base Element Class

export class Element {

  constructor(el) {
    this._el = el;
    this._data   = el ? (el._m_data   || (el._m_data   = {})) : {};
    this._events = el ? (el._m_events || (el._m_events = {})) : {};
  }

  get id() { return this._el.id; }
  get data() { return this._el.dataset; }

  get tagName() {
    if (this._el instanceof Text) return 'TEXT';
    return this._el.tagName.toUpperCase();
  }

  getModel() {
    if (!this.parent) return null;
    return this.parent.model || this.parent.getModel();
  }

  bindObservable(model, recursive=true) {
    bindObservable(this, model, recursive);
    return model;
  }

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
    let name = this._el.className;
    return (' ' + name + ' ').indexOf(' ' + className.trim() + ' ') >= 0;
  }

  toggleClass(className) {
    if (this.hasClass(className)) {
      this.removeClass(className);
    } else {
      this.addClass(className);
    }
  }

  setClass(className, condition) {
    if (condition) {
      this.addClass(className);
    } else {
      this.removeClass(className);
    }
  }

  attr(attr) { return this._el.getAttribute(attr); }
  hasAttr(attr) { return this._el.hasAttribute(attr); }
  setAttr(attr, value) { this._el.setAttribute(attr, value); }
  removeAttr(attr) { this._el.removeAttribute(attr); }

  // We need the Array.from() wrapper because Safari doesn't support
  // for (let a for $el.attributes).
  get attributes() { return Array.from(this._el.attributes || []); }

  get value() { return this._el.value; }
  set value(v) { this._el.value = v; }

  get html() { return this._el.innerHTML || ''; }
  set html(h) { this._el.innerHTML = h; }

  get text() { return this._el.textContent || ''; }
  set text(t) { this._el.textContent = t; }

  blur() { this._el.blur(); }
  focus() { this._el.focus(); }


  // -------------------------------------------------------------------------
  // Dimensions

  get bounds() { return this._el.getBoundingClientRect(); }
  get offsetTop()  { return this._el.offsetTop; }
  get offsetLeft() { return this._el.offsetLeft; }

  get offsetParent() {
    let parent = this._el.offsetParent;
    return parent ? $(parent) : null;
  }

  // Includes border and padding
  get width()  { return this._el.offsetWidth; }
  get height() { return this._el.offsetHeight; }

  // Doesn't include border and padding
  get innerWidth() {
    const left = parseFloat(this.css('padding-left'));
    const right = parseFloat(this.css('padding-right'));
    return this._el.clientWidth - left - right;
  }

  get innerHeight() {
    const bottom = parseFloat(this.css('padding-bottom'));
    const top = parseFloat(this.css('padding-top'));
    return this._el.clientHeight - bottom - top;
  }

  // Includes Margins
  get outerWidth() {
    const left = parseFloat(this.css('margin-left'));
    const right = parseFloat(this.css('margin-right'));
    return this.width + left + right;
  }

  get outerHeight() {
    const bottom = parseFloat(this.css('margin-bottom'));
    const top = parseFloat(this.css('margin-top'));
    return this.height + bottom + top;
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

  get boxCenter() {
    let bounds = this.bounds;
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2
    };
  }

  offset(parent) {
    if (parent._el === this._el.offsetParent) {
      // Get offset from immediate parent
      let top = this.offsetTop + parent._el.clientTop;
      let left = this.offsetLeft + parent._el.clientLeft;
      let bottom = top +  this.height;
      let right = left + this.width;
      return { top, left, bottom, right };

    } else {
      // Get offset based on any other element
      let parentBox = parent._el.getBoundingClientRect();
      let box = this._el.getBoundingClientRect();
      return { top:    box.top    - parentBox.top, left:  box.left  - parentBox.left,
        bottom: box.bottom - parentBox.top, right: box.right - parentBox.left };
    }
  }


  // -------------------------------------------------------------------------
  // Scrolling

  get scrollWidth()  { return this._el.scrollWidth; }
  get scrollHeight() { return this._el.scrollHeight; }

  get scrollTop() { return this._el.scrollTop; }
  get scrollLeft() { return this._el.scrollLeft; }

  set scrollTop(y) {
    this._el.scrollTop = y;
    this.trigger('scroll', { top: y, left: this.scrollLeft });
  }

  set scrollLeft(x) {
    this._el.scrollLeft = x;
    this.trigger('scroll', { top: this.scrollTop, left: x });
  }

  fixOverflowScroll() {
    if (this._data._fixOverflowScroll) return;
    this._data._fixOverflowScroll = true;

    this._el.addEventListener('touchstart', () => {
      // This ensures that overflow bounces happen within the container.
      const top = this.scrollTop;
      const bottom = this.scrollHeight - this.height;

      if (top <= 0) this.scrollTop = 1;
      if (top >= bottom) this.scrollTop = bottom - 1;
    });
  }

  scrollTo(pos, time = 1000, easing = 'cubic') {
    if (pos < 0) pos = 0;
    const startPosition = this.scrollTop;
    const distance = pos - startPosition;

    animate(t => {
      const y = startPosition + distance * ease(easing, t);
      this.scrollTop = y;
      this.trigger('scroll', { top: y });
    }, time);

    // TODO Cancel animation if something else triggers a scroll event.
  }

  scrollBy(distance, time = 1000, easing = 'cubic') {
    if (!distance) return;
    this.scrollTo(this.scrollTop + distance, time, easing);
  }


  // -------------------------------------------------------------------------
  // Styles

  css(props, value) {
    if (value === undefined) {
      if (typeof props === 'string') {
        return window.getComputedStyle(this._el).getPropertyValue(props);
      } else {
        const keys = Object.keys(props);
        for (let p of keys) this._el.style[toCamelCase(p)] = props[p];
      }
    } else {
      this._el.style[toCamelCase(props)] = value;
    }
  }

  get transition() { return this.css('transform'); }
  set transition(t) { this._el.style.transition = t; }

  get transform() { return this.css('transform').replace('none', ''); }
  set transform(transform) { this._el.style.transform = transform; }

  get transformMatrix() {
    let transform = this.css('transform');
    if (!transform || transform === 'none') return null;

    let coords = transform.match(/matrix\(([0-9\,\.\s\-]*)\)/);
    if (!coords[1]) return null;

    let matrix = coords[1].split(',');
    return [[+matrix[0], +matrix[1]], [+matrix[2], +matrix[3]],
      [+matrix[4], +matrix[5]]];
  }

  get computedTransformMatrix() {
    let own = this.transformMatrix;
    if (own || !this.parent) return own;  // TODO Do matrix multiplication!
    return this.parent.computedTransformMatrix || [[1, 0], [0, 1], [0, 0]];
  }

  get scale() {
    let matrix = this.transformMatrix;
    return matrix ? [matrix[0][0], matrix[1][1]] : [1, 1];
  }

  translate(x, y) {
    x = roundTo(+x || 0, 0.1);
    y = roundTo(+y || 0, 0.1);
    this.transform = `translate(${x}px,${y}px)`;
  }

  translateX(x) { this.transform = `translate(${roundTo(+x || 0, 0.1)}px,0)`; }
  translateY(x) { this.transform = `translate(0,${roundTo(+x || 0, 0.1)}px)`; }

  hide() { this._el.style.display = 'none'; }
  show() { this._el.style.display = 'block'; }

  invisible() { this._el.style.visibility = 'hidden'; }
  visible() { this._el.style.visibility = 'visible'; }

  transitionEnd(fn) { this.one('transitionend', fn); }
  animationEnd(fn) { this.one('animationend', fn); }


  // -------------------------------------------------------------------------
  // DOM Manipulation

  is(selector) {
    if (this._el.matches) return this._el.matches(selector);
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

  $(selector) { return $(selector, this); }

  $$(selector) { return $$(selector, this); }

  get parent() {
    // Note: parentNode breaks on document.matches.
    let parent = this._el.parentElement;
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
    if (this._el && this._el.parentNode)
      this._el.parentNode.removeChild(this._el);
  }

  remove() {
    this.detach();
    this._el = null;
  }

  removeChildren() {
    while (this._el.firstChild) this._el.removeChild(this._el.firstChild);
  }

  replaceWith(...$els) {
    for (let $el of $els) this.insertBefore($el);
    this.remove();
  }


  // -------------------------------------------------------------------------
  // Events

  on(type, fn = null, useCapture = false) {
    if (fn) {
      for (let e of words(type)) createEvent(this, e, fn, useCapture);
    } else {
      for (let e of Object.keys(type)) createEvent(this, e, type[e]);
    }
  }

  one(events, fn, useCapture = false) {
    const callback = () => {
      this.off(events, callback, useCapture);
      fn(events, fn, useCapture);
    };
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
  // Animations

  animate(rules, duration, delay, ease) {
    return transition(this, rules, duration, delay, ease);
  }

  enter(type, duration, delay) { return enter(this, type, duration, delay); }
  exit(type, duration, delay) { return exit(this, type, duration, delay); }
  effect(type) { effect(this, type); }

  fadeIn(time = 400) { return enter(this, 'fade', time); }
  fadeOut(time = 400) { return exit(this, 'fade', time); }


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
}


// -----------------------------------------------------------------------------
// Special Elements

export class WindowElement extends Element {

  get width()  { return window.innerWidth; }
  get height() { return window.innerHeight; }

  get innerWidth() { return window.innerWidth; }
  get innerHeight() { return window.innerHeight; }

  get outerWidth() { return window.outerWidth; }
  get outerHeight() { return window.outerHeight; }

  get scrollWidth()  { return document.body.scrollWidth; }
  get scrollHeight() { return document.body.scrollHeight; }

  get scrollTop() { return window.pageYOffset; }
  get scrollLeft() { return window.pageXOffset; }

  set scrollTop(y) {
    document.body.scrollTop = document.documentElement.scrollTop = y;
    this.trigger('scroll', { top: y, left: this.scrollLeft });
  }

  set scrollLeft(x) {
    document.body.scrollLeft = document.documentElement.scrollLeft = x;
    this.trigger('scroll', { top: this.scrollTop, left: x });
  }

  get computedTransformMatrix() { return this.transformMatrix; }
}

export class FormElement extends Element {

  get action() { return this._el.action; }

  get formData() {
    let data = {};
    let els = this._el.elements;  // TODO array from
    for (let i=0; i<els.length; ++i) {
      data[els[i].name || els[i].id] = els[i].value;
    }
    return data;
  }

  change(callback) {
    let value = '';
    this.on('change', () => {
      if (this.value === value) return;
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
}

export class SVGElement extends Element {

  hasClass(className) {
    let name = this._el.className.baseVal;
    return (' ' + name + ' ').indexOf(' ' + className.trim() + ' ') >= 0;
  }

  // See https://www.chromestatus.com/features/5724912467574784
  get width() { return this.bounds.width; }
  get height() { return this.bounds.height; }

  get viewBox() { return this._el.viewBox.baseVal || {}; }
  get svgWidth() { return this.viewBox.width || this.width; }
  get svgHeight() { return this.viewBox.height || this.height; }

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

  getPointAt(p) { return this._el.getPointAtLength(p * this.strokeLength); }
  getPointAtLength(i) { return this._el.getPointAtLength(i); }

  get points() {
    let points = this.attr('d');
    if (!points) return [];

    return points.replace(/[MZ]/g,'').split(/[LA]/).map((x) => {
      let p = x.split(',');
      return { x: +p[p.length - 2], y: +p[p.length - 1] };
    });
  }

  set points(p) {
    let d = p.length ? 'M' + p.map(x => x.x + ',' + x.y).join('L') : '';
    this.setAttr('d', d);
  }

  addPoint(p) {
    let d = this.attr('d') + ' L ' + p.x + ',' + p.y;
    this.setAttr('d', d);
  }

  get center() { return new Point(+this.attr('cx'), +this.attr('cy')); }
  setCenter(c) {
    this.setAttr('cx', c.x);
    this.setAttr('cy', c.y);
  }

  setLine(p, q) {
    this.setAttr('x1', p.x);
    this.setAttr('y1', p.y);
    this.setAttr('x2', q.x);
    this.setAttr('y2', q.y);
  }
}

export class CanvasElement extends Element {

  getContext(c='2d', options) {
    return this._el.getContext(c, options);
  }

  get pngImage() {
    return this._el.toDataURL('image/png');
  }
}


// -----------------------------------------------------------------------------
// Element Selectors and Constructors

const svgTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
  'g', 'defs', 'marker', 'line', 'text', 'pattern', 'mask', 'svg'];

const formTags = ['form', 'input', 'select'];

export function $(query, context=null) {
  const c = context ? context._el : document.documentElement;
  const el = (typeof query === 'string') ? c.querySelector(query) : query;

  if (!el) return null;
  if (el.$el) return el.$el;

  if (isOneOf(el, window, document.body, document.documentElement))
    return new WindowElement(el);

  const tagName = (el.tagName || '').toLowerCase();
  if (svgTags.indexOf(tagName) >= 0) return new SVGElement(el);
  if (formTags.indexOf(tagName) >= 0) return new FormElement(el);
  if (tagName === 'canvas') return new CanvasElement(el);

  return new Element(el);
}

export function $$(selector, context=null) {
  const c = context ? context._el : document.documentElement;
  let els = c.querySelectorAll(selector);
  return Array.from(els, el => $(el));
}

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

  let $el = $(t);
  if (parent) parent.append($el);
  return $el;
}

export function $$N(html) {
  return $N('div', { html: html }).children;
}


// -----------------------------------------------------------------------------
// Utilities

export function table(data) {
  let rows = data.map(tr => '<tr>' + tr.map(td => `<td>${td}</td>`).join('') + '</tr>').join('');
  return `<table>${rows}</table>`;
}


// -----------------------------------------------------------------------------
// Special Elements

export const $window = new WindowElement(window);
export const $html = new WindowElement(window.document.documentElement);
export const $body = new WindowElement(document.body);
