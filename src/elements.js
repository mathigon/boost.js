// =============================================================================
// Boost.js | Element Classes
// (c) Mathigon
// =============================================================================



import { isOneOf, words, square, applyDefaults } from '@mathigon/core';
import { roundTo, Point, isBetween } from '@mathigon/fermat';
import { ease, animate, transition, enter, exit, effect } from './animate';
import { Browser, KEY_CODES } from './browser';
import { createEvent, removeEvent } from './events';
import { drawSVG } from './svg';
import { drawCanvas } from './canvas';
import { bindObservable, observable } from './templates';


// -----------------------------------------------------------------------------
// Base Element Class

/**
 * Wrapper class for DOM elements.
 */
export class Element {

  constructor(el) {
    this._el = el;
    this._data   = el ? (el._m_data   || (el._m_data   = {})) : {};
    this._events = el ? (el._m_events || (el._m_events = {})) : {};
  }

  /** @returns {string} */
  get id() { return this._el.id; }

  /** @returns {DOMStringMap} */
  get data() { return this._el.dataset; }

  /** @returns {string} */
  get tagName() {
    if (this._el instanceof Text) return 'TEXT';
    return this._el.tagName.toUpperCase();
  }

  equals(el) {
    return this._el === el._el;
  }

  getModel() {
    if (!this.parent) return null;
    return this.parent.model || this.parent.getModel() || observable();
  }

  bindObservable(model, recursive=true) {
    bindObservable(this, model, recursive);
    return model;
  }

  /** @param {string} className Multiple space-separated classes to add. */
  addClass(className) {
    if (this.tagName === 'TEXT') return;
    for (const c of words(className)) this._el.classList.add(c);
  }

  /** @param {string} className Multiple space-separated classes to add. */
  removeClass(className) {
    if (this.tagName === 'TEXT') return;
    for (const c of words(className)) this._el.classList.remove(c);
  }

  /** @param {string} className */
  hasClass(className) {
    if (this.tagName === 'TEXT') return;
    return this._el.classList.contains(className);
  }

  /** @param {string} className */
  toggleClass(className) {
    if (this.tagName === 'TEXT') return;
    return this._el.classList.toggle(className);
  }

  /**
   * Toggles multiple space-separated class names based on a condition.
   * @param {string} className
   * @param {boolean} condition
   */
  setClass(className, condition) {
    if (condition) {
      this.addClass(className);
    } else {
      this.removeClass(className);
    }
  }

  /**
   * @param {string} attr
   * @returns {string}
   */
  attr(attr) { return this._el.getAttribute(attr) || ''; }

  /**
   * @param {string} attr
   * @returns {boolean}
   */
  hasAttr(attr) { return this._el.hasAttribute(attr); }

  /**
   * @param {string} attr
   * @param {string|number} value
   */
  setAttr(attr, value) { this._el.setAttribute(attr, '' + value); }

  /** @param {string} attr */
  removeAttr(attr) { this._el.removeAttribute(attr); }

  /** @returns {Attr[]} */
  get attributes() {
    // Array.from() converts the NamedNodeMap into an array (for Safari).
    return Array.from(this._el.attributes || []);
  }

  /** @returns {string} */
  get value() { return this._el.value; }

  /** @param {string} v */
  set value(v) { this._el.value = v; }

  /** @returns {string} */
  get html() { return this._el.innerHTML || ''; }

  /** @param {string} h */
  set html(h) { this._el.innerHTML = h; }

  /** @returns {string} */
  get text() { return this._el.textContent || ''; }

  /** @param {string} t */
  set text(t) { this._el.textContent = t; }

  /** Blurs this DOM element. */
  blur() { this._el.blur(); }

  /** Focuses this DOM element. */
  focus() { this._el.focus(); }


  // -------------------------------------------------------------------------
  // Dimensions

  /** @returns {DOMRect} */
  get bounds() { return this._el.getBoundingClientRect(); }

  /** @returns {Point} */
  get topLeftPosition() {
    const bounds = this.bounds;
    return new Point(bounds.left, bounds.top);
  }

  /** @returns {number} */
  get offsetTop()  { return this._el.offsetTop; }

  /** @returns {number} */
  get offsetLeft() { return this._el.offsetLeft; }

  /** @returns {?Element} */
  get offsetParent() { return $(this._el.offsetParent); }

  /**
   * Returns this element's width, including border and padding.
   * @returns {number}
   */
  get width()  { return this._el.offsetWidth; }

  /**
   * Returns this element's height, including border and padding.
   * @returns {number}
   */
  get height() { return this._el.offsetHeight; }

  /**
   * Returns this element's width, excluding border and padding.
   * @returns {number}
   */
  get innerWidth() {
    const left = parseFloat(this.css('padding-left'));
    const right = parseFloat(this.css('padding-right'));
    return this._el.clientWidth - left - right;
  }

  /**
   * Returns this element's height, excluding border and padding.
   * @returns {number}
   */
  get innerHeight() {
    const bottom = parseFloat(this.css('padding-bottom'));
    const top = parseFloat(this.css('padding-top'));
    return this._el.clientHeight - bottom - top;
  }

  /**
   * Returns this element's width, including margins.
   * @returns {number}
   */
  get outerWidth() {
    const left = parseFloat(this.css('margin-left'));
    const right = parseFloat(this.css('margin-right'));
    return this.width + left + right;
  }

  /**
   * Returns this element's height, including margins.
   * @returns {number}
   */
  get outerHeight() {
    const bottom = parseFloat(this.css('margin-bottom'));
    const top = parseFloat(this.css('margin-top'));
    return this.height + bottom + top;
  }

  /** @returns {number} */
  get positionTop() {
    let el = this._el;
    let offset = 0;

    do { offset += el.offsetTop; }
    while (el = el.offsetParent);

    return offset;
  }

  /** @returns {number} */
  get positionLeft() {
    let el = this._el;
    let offset = 0;

    do { offset += el.offsetLeft; }
    while (el = el.offsetParent);

    return offset;
  }

  /** @returns {Point} */
  get boxCenter() {
    const box = this.bounds;
    return new Point(box.left + box.width / 2, box.top + box.height / 2);
  }

  /**
   * Calculates the element offset relative to any other parent element.
   * @param {Element} parent
   * @returns {{top: number, left: number, bottom: number, right: number}}
   */
  offset(parent) {
    if (parent._el === this._el.offsetParent) {
      // Get offset from immediate parent
      const top = this.offsetTop + parent._el.clientTop;
      const left = this.offsetLeft + parent._el.clientLeft;
      const bottom = top +  this.height;
      const right = left + this.width;
      return { top, left, bottom, right };

    } else {
      // Get offset based on any other element
      const parentBox = parent._el.getBoundingClientRect();
      const box = this._el.getBoundingClientRect();
      return { top: box.top - parentBox.top, left: box.left - parentBox.left,
        bottom: box.bottom - parentBox.top, right: box.right - parentBox.left };
    }
  }

  /**
   * Checks if this element is currently visible in the viewport.
   * @returns {boolean}
   */
  get isInViewport() {
    if (this.height === 0) return false;
    const bounds = this.bounds;
    return isBetween(bounds.top, -bounds.height, Browser.height);
  }


  // -------------------------------------------------------------------------
  // Scrolling

  /** @returns {number} */
  get scrollWidth()  { return this._el.scrollWidth; }

  /** @returns {number} */
  get scrollHeight() { return this._el.scrollHeight; }

  /** @returns {number} */
  get scrollTop() { return this._el.scrollTop; }

  /** @returns {number} */
  get scrollLeft() { return this._el.scrollLeft; }

  /** @param {number} y */
  set scrollTop(y) {
    this._el.scrollTop = y;
    this.trigger('scroll', { top: y, left: this.scrollLeft });
  }

  /** @param {number} x */
  set scrollLeft(x) {
    this._el.scrollLeft = x;
    this.trigger('scroll', { top: this.scrollTop, left: x });
  }

  /**
   * Scrolls the element to a specific position.
   * @param {number} pos
   * @param {number=} time
   * @param {string=} easing
   */
  scrollTo(pos, time = 1000, easing = 'cubic') {
    if (pos < 0) pos = 0;
    const startPosition = this.scrollTop;
    const distance = pos - startPosition;

    if (this._data._scrollAnimation) this._data._scrollAnimation.cancel();
    // TODO Also cancel animation after manual scroll events.

    this._data._scrollAnimation = animate(t => {
      const y = startPosition + distance * ease(easing, t);
      this.scrollTop = y;
      this.trigger('scroll', { top: y });
    }, time);
  }

  /**
   * Scrolls the element by a given distance.
   * @param distance
   * @param time
   * @param easing
   */
  scrollBy(distance, time = 1000, easing = 'cubic') {
    if (!distance) return;
    this.scrollTo(this.scrollTop + distance, time, easing);
  }


  // -------------------------------------------------------------------------
  // Styles

  /**
   * Retrieves or sets CSS properties on this element. Examples:
   *   * $el.css('color');  // returns 'red'
   *   * $el.css('color', 'blue');
   *   * $el.css({color: 'blue'});
   *
   * @param {string|Object} props
   * @param {string} value
   * @returns {string}
   */
  css(props, value) {
    if (value === undefined) {
      if (typeof props === 'string') {
        return window.getComputedStyle(this._el).getPropertyValue(props);
      } else {
        const keys = Object.keys(props);
        for (const p of keys) this._el.style.setProperty(p, props[p]);
      }
    } else {
      this._el.style.setProperty(props, value);
    }
  }

  /**
   * Shortcut for getting the CSS transform style of an element.
   * @returns {string}
   */
  get transform() {
    return this.css('transform').replace('none', '');
  }

  get transformMatrix() {
    const transform = this.transform;
    if (!transform) return [[1, 0, 0], [0, 1, 0]];

    const coords = transform.match(/matrix\(([0-9,.\s\-]*)\)/);
    if (!coords[1]) return [[1, 0, 0], [0, 1, 0]];

    const matrix = coords[1].split(',');
    return [[+matrix[0], +matrix[2], +matrix[4]],
      [+matrix[1], +matrix[3], +matrix[5]]];
  }

  /**
   * Finds the x and y scale of this element.
   * @returns {number[]}
   */
  get scale() {
    const matrix = this.transformMatrix;
    return [matrix[0][0], matrix[1][1]];
  }

  /**
   * Sets the CSS transform on this element.
   * @param {Point?} posn
   * @param {number=} angle
   * @param {number=} scale
   */
  setTransform(posn, angle = 0, scale = 1) {
    let t = '';
    if (posn) t += `translate(${roundTo(posn.x, 0.1)}px,${roundTo(posn.y, 0.1)}px)`;
    if (angle) t += ` rotate(${angle}rad)`;
    if (scale) t += ` scale(${scale})`;
    this._el.style.transform = t;
  }

  /**
   * Sets the CSS transform of this element to an x/y translation.
   * @param {number} x
   * @param {number} y
   */
  translate(x, y) {
    this.setTransform(new Point(x, y));
  }

  /**
   * Makes the element visible. Use the `data-display` attribute to determine
   * how this is done. Possible options are `visibility`, to use CSS visibility,
   * or CSS display values. The default is `display: block`.
   */
  show() {
    if (this.hasAttr('hidden')) this.removeAttr('hidden');

    if (this.data.display === 'visibility') {
      this._el.style.visibility = 'visible';
    } else {
      this._el.style.display = this.data.display || 'block';
    }
  }

  /**
   * Makes the element invisible, using CSS visibility (if
   * `data-display="visibility"`), or `display: none`.
   */
  hide() {
    if (this.data.display === 'visibility') {
      this._el.style.visibility = 'hidden';
    } else {
      this._el.style.display = 'none';
    }
  }

  /**
   * Hides or shows the element based on a boolean value.
   * @param {boolean} show
   */
  toggle(show) {
    if (show) {
      this.show();
    } else {
      this.hide();
    }
  }


  // -------------------------------------------------------------------------
  // DOM Manipulation

  /**
   * Checks if an element matches a given CSS selector.
   * @param {string} selector
   * @returns {boolean}
   */
  is(selector) {
    if (this._el.matches) return this._el.matches(selector);
    return [].indexOf.call(document.querySelectorAll(selector), this._el) > -1;
  }

  /**
   * Finds the index of an elements, in the list of its siblings.
   * @returns {number}
   */
  index() {
    let i = 0;
    let child = this._el;
    while ((child = child.previousSibling) !== null) ++i;
    return i;
  }

  /**
   * Adds a new child element at the beginning of this one.
   * @param {Element} newChild
   */
  prepend(newChild) {
    const children = this._el.childNodes;
    if (children.length) {
      this._el.insertBefore(newChild._el, children[0]);
    } else {
      this._el.appendChild(newChild._el);
    }
  }

  /**
   * Adds a new child element at the end of this one.
   * @param {Element} newChild
   */
  append(newChild) {
    this._el.appendChild(newChild._el);
  }

  /**
   * Adds a new element immediately before this one, as a sibling.
   * @param {Element} newChild
   */
  insertBefore(newChild) {
    this.parent._el.insertBefore(newChild._el, this._el);
  }

  /**
   * Adds a new element immediately after this one, as a sibling.
   * @param {Element} newChild
   */
  insertAfter(newChild) {
    const next = this._el.nextSibling;
    if (next) {
      this.parent._el.insertBefore(newChild._el, next);
    } else {
      this.parent._el.appendChild(newChild._el);
    }
  }

  /**
   * Wraps a DOM element around this one.
   * @param {Element} wrapper
   */
  wrap(wrapper) {
    this.insertBefore(wrapper);
    wrapper.append(this);
  }

  /** @returns {?Element} This element's next sibling, or null. */
  get next() {
    return $(this._el.nextSibling);
  }

  /** @returns {?Element} This element's previous sibling, or null. */
  get prev() {
    return $(this._el.previousSibling);
  }

  /**
   * The first child element matching a given selector.
   * @param {string} selector
   * @returns {?Element}
   */
  $(selector) { return $(selector, this); }

  /**
   * All child elements matching a given selector.
   * @param {string} selector
   * @returns {Element[]}
   */
  $$(selector) { return $$(selector, this); }

  /** @returns {?Element} This element's parent, or null. */
  get parent() {
    // Note: parentNode breaks on document.matches.
    return $(this._el.parentElement);
  }

  /**
   * Finds all parent elements that match a specific selector.
   * @param selector
   * @returns {Element[]}
   */
  parents(selector) {
    const result = [];
    let parent = this.parent;
    while (parent) {
      if (!selector || parent.is(selector)) result.push(parent);
      parent = parent.parent;
    }
    return result;
  }

  /**
   * Checks if this element has one of the given elements as parent.
   * @param {...Element} $p
   * @returns {boolean}
   */
  hasParent(...$p) {
    const tests = $p.map(p => p._el);
    let parent = this._el.parentNode;
    while (parent) {
      if (isOneOf(parent, ...tests)) return true;
      parent = parent.parentNode;
    }
    return false;
  }

  /**
   * Returns an array of all children of this element.
   * @returns {Element[]}
   */
  get children() {
    const children = this._el.children || [];
    return Array.from(children, n => $(n));
  }

  /**
   * Returns an array of all child nodes of this element, including text nodes.
   * @returns {Element[]}
   */
  get childNodes() {
    const childNodes = this._el.childNodes || [];
    return Array.from(childNodes, n => $(n));
  }

  /** Removes this element. */
  remove() {
    // TODO More cleanup: remove event listeners, clean children, etc.
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    this._el = null;
  }

  /** Removes all children of this element. */
  removeChildren() {
    while (this._el.firstChild) this._el.removeChild(this._el.firstChild);
  }

  /**
   * Replaces this element with one or more other elements.
   * @param {...Element} $els
   */
  replaceWith(...$els) {
    for (const $el of $els) this.insertBefore($el);
    this.remove();
  }


  // -------------------------------------------------------------------------
  // Events

  /**
   * Binds one ore more event listeners on this element.
   * @param {string} events One or more space-separated event names.
   * @param {Function} callback
   * @param {any=} options
   */
  on(events, callback, options = undefined) {
    for (const e of words(events)) createEvent(this, e, callback, options);
  }

  /**
   * Binds a one-time event listener on this element.
   * @param {string} events One or more space-separated event names.
   * @param {Function} callback
   * @param {any=} options
   */
  one(events, callback, options = undefined) {
    const callbackWrap = (e) => {
      this.off(events, callbackWrap, options);
      callback(e);
    };
    this.on(events, callbackWrap, options);
  }

  /**
   * Removes an event listener on this element.
   * @param {string} events One or more space-separated event names.
   * @param {Function} callback
   */
  off(events, callback) {
    for (const e of words(events)) removeEvent(this, e, callback);
  }

  /**
   * Triggers a specific event on this element.
   * @param {string} events One or more space-separated event names.
   * @param {any=} args
   */
  trigger(events, args = {}) {
    for (const e of words(events)) {
      if (!this._events[e]) return;
      for (const fn of this._events[e]) fn.call(this, args);
    }
  }

  /**
   * Binds an event listener for a specific key that is pressed while this
   * element is in focus.
   * @param {string} keys One ore more space-separated key names.
   * @param {Function} callback
   */
  onKeyDown(keys, callback) {
    const keylist = words(keys).map(k => KEY_CODES[k] || k);
    this._el.addEventListener('keydown', (e) => {
      if (keylist.indexOf(e.keyCode) >= 0) callback(e);
    });
  }


  // -------------------------------------------------------------------------
  // Animations

  /**
   * Animates multiple CSS properties of this element, with a given duration,
   * delay and ease function.
   * @param {Object.<string,(*|Array)>} rules
   * @param {number=} duration
   * @param {number=} delay
   * @param {string=} ease
   * @returns {{cancel: Function, then: Function}}
   */
  animate(rules, duration, delay, ease) {
    return transition(this, rules, duration, delay, ease);
  }

  /**
   * Runs an enter animation on this element. Valid effect names are
   *   * 'fade', 'pop' and 'descend'
   *   * 'draw' and 'draw-reverse'
   *   * 'slide' and 'slide-down'
   *   * 'reveal', 'reveal-left' and 'reveal-right'
   *
   * @param {string=} effect
   * @param {number=} duration
   * @param {number=} delay
   * @returns {{cancel: Function, then: Function}}
   */
  enter(effect = 'fade', duration = 500, delay = 0) {
    return enter(this, effect, duration, delay);
  }

  /**
   * Runs an exit animation on this element. See `.enter()` for effect options.
   * @param {string=} effect
   * @param {number=} duration
   * @param {number=} delay
   * @param {boolean=} remove Whether to the remove the element afterwards.
   * @returns {{cancel: Function, then: Function}}
   */
  exit(effect = 'fade', duration = 500, delay = 0, remove = false) {
    return exit(this, effect, duration, delay, remove);
  }

  /**
   * Triggers a CSS animation in an element by adding a class and removing it
   * after the `animationEnd` event.
   * @param {string} className
   */
  effect(className) { effect(this, className); }


  // -------------------------------------------------------------------------
  // Utilities

  /**
   * Creates a copy of this element.
   * @param {boolean=} recursive
   * @param {boolean=} withStyles Whether to inline all styles.
   * @returns {Element}
   */
  copy(recursive = true, withStyles = true) {
    const $copy = $(this._el.cloneNode(recursive));
    if (withStyles) $copy.copyInlineStyles(this, recursive);
    return $copy;
  }

  /** @private */
  copyInlineStyles($source, recursive = true) {
    const style = window.getComputedStyle($source._el);
    for (const s of style) this.css(s, style.getPropertyValue(s));

    if (recursive) {
      const children = this.children;
      const sourceChildren = $source.children;
      for (let i = 0; i < children.length; ++i) {
        children[i].copyInlineStyles(sourceChildren[i], true);
      }
    }
  }
}


// -----------------------------------------------------------------------------
// Special Elements

/**
 * Element subclass for Window, Document and `<body>`.
 */
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
}

/**
 * Element subclass for `<form>`, `<input>` and `<select>`.
 */
export class FormElement extends Element {

  get action() { return this._el.action; }
  get checked() { return this._el.checked; }

  /**
   * Summarises the element data for an HTML <form> element in an JSON Object.
   * @returns {Object}
   */
  get formData() {
    const data = {};
    for (const el of Array.from(this._el.elements)) {
      const id = el.name || el.id;
      if (id) data[id] = el.value;
    }
    return data;
  }

  /**
   * Binds a change event listener.
   * @param {Function} callback
   */
  change(callback) {
    let value = '';
    this.on('change', () => {
      if (this.value === value) return;
      value = this.value.trim();
      callback(value);
    });
  }

  validate(callback) {
    this.change(value => this.setValidity(callback(value)));
  }

  setValidity(str) {
    this._el.setCustomValidity(str || '');
  }

  get isValid() {
    return this._el.checkValidity();
  }
}

/**
 * Element subclass for SVG elements.
 */
export class SVGElement extends Element {

  /**
   * Returns the owner `<svg>` which this element is a child of.
   * @returns {Element|null}
   */
  get $ownerSVG() { return $(this._el.ownerSVGElement) || null; }

  // See https://www.chromestatus.com/features/5724912467574784
  get width() { return this.bounds.width; }
  get height() { return this.bounds.height; }

  /**
   * Returns the viewport coordinates of this `<svg>` element.
   * @returns {SVGRect}
   */
  get viewBox() { return this._el.viewBox.baseVal || {}; }

  /**
   * Returns the intrinsic width of this `<svg>` element.
   * @returns {number}
   */
  get svgWidth() { return this.viewBox.width || this.width; }

  /**
   * Returns the intrinsic height of this `<svg>` element.
   * @returns {number}
   */
  get svgHeight() { return this.viewBox.height || this.height; }

  // SVG Elements don't have offset properties. We instead use the position of
  // the first non-SVG parent, plus the margin of the SVG owner, plus the SVG
  // position of the individual element. This doesn't work for absolutely
  // positioned SVG elements, and some other edge cases.

  get positionLeft() {
    if (this.$ownerSVG) {
      const svgLeft = this._el.getBBox().x + this._el.getCTM().e;
      return this.$ownerSVG.positionLeft + svgLeft;
    }
    return parseInt(this.css('margin-left')) + this.parent.positionLeft;
  }

  get positionTop() {
    if (this.$ownerSVG) {
      const svgTop = this._el.getBBox().y + this._el.getCTM().f;
      return this.$ownerSVG.positionTop + svgTop;
    }
    return parseInt(this.css('margin-top')) + this.parent.positionTop;
  }

  get inverseTransformMatrix() {
    const m = this._el.getScreenCTM().inverse();
    const matrix = [[m.a, m.c, m.e], [m.b, m.d, m.f]];

    // Firefox doesn't account for the CSS transform of parent elements.
    // TODO Use matrix product of all parent's transforms, not just the
    // translation of the immediate parent.
    if (Browser.isFirefox) {
      const transform = this.transformMatrix;
      matrix[0][2] -= transform[0][2];
      matrix[1][2] -= transform[1][2];
    }

    return matrix;
  }

  setTransform(posn, angle = 0, scale = 1) {
    const t1 = posn ? `translate(${roundTo(posn.x, 0.1)} ${roundTo(posn.y, 0.1)})` : '';
    const t2 = angle ? `rotate(${angle * 180 / Math.PI})` : '';
    const t3 = scale ? `scale(${scale})` : '';
    this.setAttr('transform', [t1, t2, t3].join(' '));
  }

  /**
   * Finds the total stroke length of this element. Similar to the SVG
   * `getTotalLength()` function, but works for a wider variety of elements.
   * @returns {number}
   */
  get strokeLength() {
    if ('getTotalLength' in this._el) {
      return this._el.getTotalLength();
    } else if (this._el instanceof SVGLineElement) {
      return Math.sqrt(square(this._el.x2.baseVal.value - this._el.x1.baseVal.value) +
        square(this._el.y2.baseVal.value - this._el.y1.baseVal.value));
    } else {
      const dim = this.bounds;
      return 2 * dim.height + 2 * dim.width;
    }
  }

  /**
   * Gets the coordinates of the point at a position `p` along the length of the
   * stroke of this `<path>` element, where `0 ≤ p ≤ 1`.
   * @param {number} p
   * @returns {Point}
   */
  getPointAt(p) {
    const point = this._el.getPointAtLength(p * this.strokeLength);
    return new Point(point.x, point.y);
  }

  /**
   * Returns a list of all points along an SVG `<path>` element.
   * @returns {Point[]}
   */
  get points() {
    const points = this.attr('d');
    if (!points) return [];

    return points.replace(/[MZ]/g,'').split(/[LA]/).map((x) => {
      const p = x.split(',');
      return new Point(+p[p.length - 2], +p[p.length - 1]);
    });
  }

  /**
   * Sets the list of points for an SVG `<path>` element.
   * @param {Point[]} p
   */
  set points(p) {
    const d = p.length ? 'M' + p.map(x => x.x + ',' + x.y).join('L') : '';
    this.setAttr('d', d);
  }

  /**
   * Appends a new point to an SVG `<path>` element.
   * @param {Point} p
   */
  addPoint(p) {
    const d = this.attr('d') + ' L ' + p.x + ',' + p.y;
    this.setAttr('d', d);
  }

  /**
   * Finds the center of an SVG `<circle>` element.
   * @returns {Point}
   */
  get center() {
    return new Point(+this.attr('cx'), +this.attr('cy'));
  }

  /**
   * Sets the center of an SVG `<circle>` or `<text>` element.
   * @param {Point} c
   */
  setCenter(c) {
    this.setAttr(this.tagName === 'TEXT' ? 'x' : 'cx', c.x);
    this.setAttr(this.tagName === 'TEXT' ? 'y' : 'cy', c.y);
  }

  /**
   * Sets the end points of an SVG `<line>` element.
   * @param {Point} p
   * @param {Point} q
   */
  setLine(p, q) {
    this.setAttr('x1', p.x);
    this.setAttr('y1', p.y);
    this.setAttr('x2', q.x);
    this.setAttr('y2', q.y);
  }

  /**
   * Sets the bounds of an SVG `<rectangle>` element.
   * @param {Rectangle} rect
   */
  setRect(rect) {
    this.setAttr('x', rect.p.x);
    this.setAttr('y', rect.p.y);
    this.setAttr('width', rect.w);
    this.setAttr('height', rect.h);
  }

  /**
   * Draws a generic geometry object ont an SVG `<path>` element.
   * @param {Line|Circle|Polygon|Rectangle|Angle|Arc} obj
   * @param {Object=} options
   */
  draw(obj, options={}) {
    const attributes = {
      mark: this.attr('mark'),
      arrows: this.attr('arrows'),
      size: (+this.attr('size')) || null,
      fill:  this.hasClass('fill'),
      round: this.hasAttr('round')
    };
    this.setAttr('d', drawSVG(obj, applyDefaults(options, attributes)));
  }

  /**
   * Converts an SVG element into a PNG data URI.
   * @param {number?} size
   * @returns {Promise<string>}
   */
  pngImage(size = null) {
    const $copy = this.copy(true, true);

    const width = size || this.svgWidth;
    const height = size || this.svgHeight;
    $copy.setAttr('width', width);
    $copy.setAttr('height', height);

    const data = new XMLSerializer().serializeToString($copy._el);
    let url = 'data:image/svg+xml;utf8,' + encodeURIComponent(data);
    url = url.replace('svg ', 'svg xmlns="http://www.w3.org/2000/svg" ');
    // const svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
    // const url = window.URL.createObjectURL(svgBlob);

    const $canvas = $N('canvas', {width, height});
    $canvas.ctx.fillStyle = '#fff';
    $canvas.ctx.fillRect(0, 0, width, height);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        $canvas.ctx.drawImage(img, 0, 0, width, height);
        resolve($canvas.pngImage);
        // window.URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }
}

/**
 * Element subclass for `<canvas>`.
 */
export class CanvasElement extends Element {

  /**
   * Returns the drawing context for a `<canvas>` element.
   * @param {string=} c
   * @param {Object=} options
   * @returns {CanvasRenderingContext2D|WebGLRenderingContext}
   */
  getContext(c='2d', options={}) {
    return this._el.getContext(c, options);
  }

  /**
   * Converts an Canvas element into a PNG data URI.
   * @returns {string}
   */
  get pngImage() {
    return this._el.toDataURL('image/png');
  }

  /**
   * Returns the intrinsic pixel width of this `<canvas>` element.
   * @returns {number}
   */
  get canvasWidth() { return this._el.width; }

  /**
   * Returns the intrinsic pixel height of this `<canvas>` element.
   * @returns {number}
   */
  get canvasHeight() { return this._el.height; }

  /**
   * Cached reference to the 2D context for this `<canvas>` element.
   * @returns {CanvasRenderingContext2D}
   */
  get ctx() {
    if (!this._data.ctx) this._data.ctx = this.getContext();
    return this._data.ctx;
  }

  /**
   * Draws a generic geometry object ont a `<canvas>` element.
   * @param {Line|Circle|Polygon|Rectangle|Angle|Arc} obj
   * @param {Object=} options
   */
  draw(obj, options) {
    this.ctx.save();
    drawCanvas(this.ctx, obj, options);
    this.ctx.restore();
  }

  /** Clears this canvas. */
  clear() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
}

/**
 * Element subclass for `<video>` and `<audio>`.
 */
export class MediaElement extends Element {

  /**
   * Starts playback on a `<video>` or `<audio>` element.
   * @returns {Promise}
   */
  play() {
    return this._el.play() || Promise.resolve();
  }

  /**
   * Pauses playback on a `<video>` or `<audio>` element.
   * @returns {Promise}
   */
  pause() {
    this._el.pause();
  }
}


// -----------------------------------------------------------------------------
// Element Selectors and Constructors

const svgTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
  'g', 'defs', 'marker', 'line', 'text', 'pattern', 'mask', 'svg'];

const formTags = ['form', 'input', 'select'];

/**
 * Finds the Element that matches a specific CSS selector, or creates a new
 * Element wrapper around a native HTMLElement instance.
 * @param {string|HTMLElement} query
 * @param {Element=} context
 * @returns {Element|null}
 */
export function $(query, context = null) {
  if (!query) return null;
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
  if (isOneOf(tagName, 'video', 'audio')) return new MediaElement(el);

  return new Element(el);
}

/**
 * Finds all elements that match a specific CSS selector.
 * @param {string} selector
 * @param {Element=} context
 * @returns {Element[]}
 */
export function $$(selector, context=null) {
  const c = context ? context._el : document.documentElement;
  const els = c.querySelectorAll(selector || null);
  return Array.from(els, el => $(el));
}

/**
 * Creates a new Element instance from a given set of options.
 * @param {string} tag
 * @param {Object.<string,string>=} attributes
 * @param {Element=} parent
 * @returns {Element}
 */
export function $N(tag, attributes = {}, parent = null) {
  const t = svgTags.indexOf(tag) < 0 ? document.createElement(tag) :
    document.createElementNS('http://www.w3.org/2000/svg', tag);

  for (const a of Object.keys(attributes)) {
    if (a === 'id') {
      t.id = attributes.id;
    } else if (a === 'html') {
      t.innerHTML = attributes.html;
    } else if (a === 'text') {
      t.textContent = attributes.text;
    } else if (a === 'path') {
      t.setAttribute('d', drawSVG(attributes.path))
    } else {
      t.setAttribute(a, attributes[a]);
    }
  }

  const $el = $(t);
  if (parent) parent.append($el);
  return $el;
}


// -----------------------------------------------------------------------------
// Utilities

/**
 * Converts a 2-dimensional data array into an HTML <table> string.
 * @param {Array.<Array.<string>>} data
 * @returns {string}
 */
export function table(data) {
  const rows = data.map(tr => '<tr>' + tr.map(td => `<td>${td}</td>`)
      .join('') + '</tr>').join('');
  return `<table>${rows}</table>`;
}


// -----------------------------------------------------------------------------
// Special Elements

/** @type {WindowElement} */
export const $window = new WindowElement(window);

/** @type {WindowElement} */
export const $html = new WindowElement(window.document.documentElement);

/** @type {WindowElement} */
export const $body = new WindowElement(document.body);
