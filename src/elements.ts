// =============================================================================
// Boost.js | Element Classes
// (c) Mathigon
// =============================================================================


import {isOneOf, words, applyDefaults, Obj} from '@mathigon/core';
import {roundTo, Point, isBetween, Rectangle, SimplePoint, nearlyEquals} from '@mathigon/fermat';
import {loadImage} from './ajax';

import {ease, animate, transition, enter, exit, AnimationProperties, AnimationResponse} from './animate';
import {Browser, KEY_CODES} from './browser';
import {compile, compileString} from './eval';
import {bindEvent, EventCallback, unbindEvent} from './events';
import {Observable} from './observable';
import {drawSVG, GeoShape, parsePath, SVGDrawingOptions} from './svg';
import {CanvasDrawingOptions, drawCanvas} from './canvas';


declare global {
  interface Element {
    _view?: ElementView;
  }
}

// Override Typescript defaults
interface EventListenerOptions {
  capture?: boolean;
  passive?: boolean;
}


// -----------------------------------------------------------------------------
// Base Element Class

export abstract class BaseView<T extends HTMLElement|SVGElement> {
  readonly _data: Obj<any> = {};
  readonly _events: Obj<EventCallback[]> = {};
  readonly type: string = 'default';
  model?: Observable;

  constructor(readonly _el: T) {
    // Store a reference to this element within the native browser DOM.
    _el._view = this;
  }

  get id() {
    return this._el.id;
  }

  get data() {
    return this._el.dataset;
  }

  get tagName() {
    return this._el.tagName.toUpperCase();
  }

  equals(el: ElementView) {
    return this._el === el._el;
  }

  /** Adds one or more space-separated classes to this element. */
  addClass(className: string) {
    for (const c of words(className)) this._el.classList.add(c);
  }

  removeClass(className: string) {
    for (const c of words(className)) this._el.classList.remove(c);
  }

  hasClass(className: string) {
    return this._el.classList.contains(className);
  }

  toggleClass(className: string) {
    return this._el.classList.toggle(className);
  }

  /** Toggles multiple space-separated class names based on a condition. */
  setClass(className: string, condition: boolean) {
    if (condition) {
      this.addClass(className);
    } else {
      this.removeClass(className);
    }
  }

  attr(attr: string) {
    return this._el.getAttribute(attr) || '';
  }

  hasAttr(attr: string) {
    return this._el.hasAttribute(attr);
  }

  setAttr(attr: string, value: any) {
    if (value === undefined) {
      this.removeAttr(attr);
    } else {
      this._el.setAttribute(attr, value.toString());
    }
  }

  removeAttr(attr: string) {
    this._el.removeAttribute(attr);
  }

  get attributes() {
    // Array.from() converts the NamedNodeMap into an array (for Safari).
    return Array.from(this._el.attributes || []);
  }

  get html() {
    return this._el.innerHTML || '';
  }

  set html(h: string) {
    this._el.innerHTML = h;
  }

  get text(): string {
    return this._el.textContent || '';
  }

  set text(t: string) {
    this._el.textContent = t;
  }

  // Required because TS doesn't allow getters and setters with different types.
  set textStr(t: any) {
    this._el.textContent = '' + t;
  }

  /** Blurs this DOM element. */
  blur() {
    this._el.blur();
  }

  /** Focuses this DOM element. */
  focus() {
    this._el.focus();
  }

  // -------------------------------------------------------------------------
  // Model Binding

  getParentModel(): Observable|undefined {
    const parent = this.parent;
    return parent ? (parent.model || parent.getParentModel()) : undefined;
  }

  bindModel(model: Observable, recursive = true) {
    if (this.model) return;  // Prevent duplicate binding.
    this.model = model;

    for (const {name, value} of this.attributes) {
      if (name.startsWith('@')) {
        const event = name.slice(1);
        const expr = compile(value);
        this.removeAttr(name);
        this.on(event, () => expr(model));

      } else if (name === ':show') {
        const expr = compile(value);
        this.removeAttr(name);
        model.watch(() => this.toggle(!!expr(model)));

      } else if (name === ':html') {
        const expr = compile(value);
        this.removeAttr(name);
        model.watch(() => this.html = expr(model) || '');

      } else if (name === ':draw') {
        const expr = compile(value);
        model.watch(() => (this as unknown as SVGView).draw(expr(model)));

      } else if (name === ':bind') {
        this.bindVariable(model, value);

      } else if (name.startsWith(':')) {
        const expr = compile(value);
        const attr = name.slice(1);
        this.removeAttr(name);
        model.watch(() => this.setAttr(attr, expr(model)));

      } else if (value.includes('${')) {
        const expr = compileString(value);
        model.watch(() => this.setAttr(name, expr(model) || ''));
      }
    }

    for (const $c of this.childNodes) {
      if ($c instanceof Text) {
        if ($c.textContent?.includes('${')) {
          const expr = compileString($c.textContent);
          model.watch(() => $c.textContent = expr(model) || '');
        }
      } else if (recursive) {
        $c.bindModel(model);
      }
    }
  }

  protected bindVariable(_model: Observable, _name: string) {
    // Can be implemented by child classes.
  }


  // -------------------------------------------------------------------------
  // Scrolling and Dimensions

  get bounds() {
    return this._el.getBoundingClientRect();
  }

  /** Checks if this element is currently visible in the viewport. */
  get isInViewport() {
    if (this.height === 0) return false;
    const bounds = this.bounds;
    return isBetween(bounds.top, -bounds.height, Browser.height);
  }

  get topLeftPosition() {
    const bounds = this.bounds;
    return new Point(bounds.left, bounds.top);
  }

  get boxCenter() {
    const box = this.bounds;
    return new Point(box.left + box.width / 2, box.top + box.height / 2);
  }

  abstract get width(): number;

  abstract get height(): number;

  abstract get positionLeft(): number;

  abstract get positionTop(): number;

  get scrollWidth() {
    return this._el.scrollWidth;
  }

  get scrollHeight() {
    return this._el.scrollHeight;
  }

  get scrollTop() {
    return this._el.scrollTop;
  }

  set scrollTop(y: number) {
    this._el.scrollTop = y;
    this.trigger('scroll', {top: y, left: this.scrollLeft});
  }

  get scrollLeft() {
    return this._el.scrollLeft;
  }

  set scrollLeft(x: number) {
    this._el.scrollLeft = x;
    this.trigger('scroll', {top: this.scrollTop, left: x});
  }

  /** Scrolls the element to a specific position. */
  scrollTo(pos: number, time = 1000, easing = 'cubic') {
    if (pos < 0) pos = 0;
    const startPosition = this.scrollTop;
    const distance = pos - startPosition;

    if (this._data['scrollAnimation']) this._data['scrollAnimation'].cancel();
    // TODO Also cancel animation after manual scroll events.

    this._data['scrollAnimation'] = animate(t => {
      const y = startPosition + distance * ease(easing, t);
      this.scrollTop = y;
      this.trigger('scroll', {top: y});
    }, time);
  }

  /** Scrolls the element by a given distance. */
  scrollBy(distance: number, time = 1000, easing = 'cubic') {
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
   */
  css(props: string|Obj<string|number>, value?: string|number) {
    if (value === undefined) {
      if (typeof props === 'string') {
        return window.getComputedStyle(this._el).getPropertyValue(props);
      } else {
        const keys = Object.keys(props);
        for (const p of keys) this._el.style.setProperty(p, '' + props[p]);
      }
    } else if (typeof props === 'string') {
      this._el.style.setProperty(props, '' + value);
    }
  }

  /** Shortcut for getting the CSS transform style of an element. */
  get transform() {
    return this.css('transform')!.replace('none', '');
  }

  get transformMatrix() {
    const transform = this.transform;
    if (!transform) return [[1, 0, 0], [0, 1, 0]];

    const coords = transform.match(/matrix\(([0-9,.\s-]*)\)/);
    if (!coords || !coords[1]) return [[1, 0, 0], [0, 1, 0]];

    const matrix = coords[1].split(',');
    return [[+matrix[0], +matrix[2], +matrix[4]],
      [+matrix[1], +matrix[3], +matrix[5]]];
  }

  /** Finds the x and y scale of this element. */
  get scale() {
    const matrix = this.transformMatrix;
    return [matrix[0][0], matrix[1][1]];
  }

  /** Sets the CSS transform on this element. */
  setTransform(posn?: SimplePoint, angle = 0, scale = 1) {
    let t = '';
    if (posn) {
      t +=
        `translate(${roundTo(posn.x, 0.1)}px,${roundTo(posn.y, 0.1)}px)`;
    }
    if (angle) t += ` rotate(${angle}rad)`;
    if (scale) t += ` scale(${scale})`;
    this._el.style.transform = t;
  }

  /** Sets the CSS transform of this element to an x/y translation. */
  translate(x: number, y: number) {
    this.setTransform(new Point(x, y));
  }

  /**
   * Makes the element visible. Use the `data-display` attribute to determine
   * how this is done. Possible options are `visibility`, to use CSS visibility,
   * or CSS display values. The default is `display: block`.
   */
  show() {
    if (this.hasAttr('hidden')) this.removeAttr('hidden');

    if (this.data['display'] === 'visibility') {
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
    if (this.data['display'] === 'visibility') {
      this._el.style.visibility = 'hidden';
    } else {
      this._el.style.display = 'none';
    }
  }

  /** Hides or shows the element based on a boolean value. */
  toggle(show: boolean) {
    if (show) {
      this.show();
    } else {
      this.hide();
    }
  }


  // -------------------------------------------------------------------------
  // DOM Manipulation

  /** Checks if an element matches a given CSS selector. */
  is(selector: string) {
    if (this._el.matches) return this._el.matches(selector);
    return Array.from(document.querySelectorAll(selector)).includes(this._el);
  }

  /** Finds the index of an elements, in the list of its siblings. */
  index() {
    let i = 0;
    let child: Node|undefined = this._el;
    while ((child = (child.previousSibling ||undefined)) !== undefined) ++i;
    return i;
  }

  /** Adds a new child element at the beginning of this one. */
  prepend(newChild: ElementView) {
    const children = this._el.childNodes;
    if (children.length) {
      this._el.insertBefore(newChild._el, children[0]);
    } else {
      this._el.appendChild(newChild._el);
    }
  }

  /** Adds a new child element at the end of this one. */
  append(newChild: ElementView|Text) {
    this._el.appendChild(newChild instanceof Text ? newChild : newChild._el);
  }

  /** Adds a new element immediately before this one, as a sibling. */
  insertBefore(newChild: ElementView) {
    this.parent!._el.insertBefore(newChild._el, this._el);
  }

  /** Adds a new element immediately after this one, as a sibling. */
  insertAfter(newChild: ElementView) {
    const next = this._el.nextSibling;
    if (next) {
      this.parent!._el.insertBefore(newChild._el, next);
    } else {
      this.parent!._el.appendChild(newChild._el);
    }
  }

  /** Returns this element's next sibling, or undefined. */
  get next() {
    return $(this._el.nextSibling as Element|undefined);
  }

  /** Returns this element's previous sibling, or undefined. */
  get prev() {
    return $(this._el.previousSibling as Element|undefined);
  }

  /** The first child element matching a given selector. */
  $(selector: string): ElementView|undefined {
    return $(selector, this);
  }

  /** All child elements matching a given selector. */
  $$(selector: string): ElementView[] {
    return $$(selector, this);
  }

  /** Returns this element's parent, or undefined. */
  get parent() {
    // Note: parentNode breaks on document.matches.
    return $(this._el.parentElement || undefined);
  }

  /** Finds all parent elements that match a specific selector. */
  parents(selector: string) {
    const result = [];
    let parent = this.parent;
    while (parent) {
      if (!selector || parent.is(selector)) result.push(parent);
      parent = parent.parent;
    }
    return result;
  }

  /** Checks if this element has one of the given elements as parent. */
  hasParent(...$p: ElementView[]) {
    const tests = $p.map(p => p._el);
    let parent = this._el.parentNode;
    while (parent) {
      if (isOneOf(parent, ...tests)) return true;
      parent = parent.parentNode;
    }
    return false;
  }

  /** Returns an array of all children of this element. */
  get children() {
    return Array.from(this._el.children || [], n => $(n)!);
  }

  /** Returns an array of all child nodes, including text nodes. */
  get childNodes(): (ElementView|Text)[] {
    return Array.from(this._el.childNodes, (node) => {
      return node instanceof Text ? node : $(node as Element)!;
    });
  }

  /** Removes this element. */
  remove() {
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    // TODO More cleanup: remove event listeners, clean children, etc.
    // this._el = this._data = this._events = undefined;
  }

  /** Removes all children of this element. */
  removeChildren() {
    while (this._el.firstChild) this._el.removeChild(this._el.firstChild);
  }


  // -------------------------------------------------------------------------
  // Events

  /** Binds one ore more space-separated event listeners on this element. */
  on(events: string, callback: EventCallback, options?: EventListenerOptions) {
    for (const e of words(events)) {
      if (e in this._events) {
        if (!this._events[e].includes(callback)) this._events[e].push(callback);
      } else {
        this._events[e] = [callback];
      }
      bindEvent(this, e, callback, options);
    }
  }

  /** Binds a one-time event listener on this element. */
  one(events: string, callback: EventCallback, options?: EventListenerOptions) {
    const callbackWrap = (e: Event) => {
      this.off(events, callbackWrap);
      callback(e);
    };
    this.on(events, callbackWrap, options);
  }

  /**
   * Removes an event listener on this element. If callback is undefined, it
   * removes all event listeners for this event.
   */
  off(events: string, callback?: EventCallback) {
    for (const e of words(events)) {
      if (e in this._events) {
        this._events[e] = callback ? this._events[e].filter(fn => fn !== callback) : [];
      }
      unbindEvent(this, e, callback);
    }
  }

  /** Triggers a specific event on this element. */
  trigger(events: string, args: any = {}) {
    for (const e of words(events)) {
      if (!this._events[e]) return;
      for (const fn of this._events[e]) fn.call(this, args);
    }
  }

  /**
   * Binds an event listener for a specific key that is pressed while this
   * element is in focus.
   */
  onKeyDown(keys: string, callback: (e: KeyboardEvent) => void) {
    const keylist = words(keys).map(k => KEY_CODES[k] || k);
    this._el.addEventListener('keydown', (e: any) => {
      if (keylist.indexOf((e as KeyboardEvent).keyCode) >= 0) callback(e);
    });
  }

  /** Returns a promise that is resolved when an event is triggered. */
  onPromise(event: string, resolveImmediately = false) {
    if (resolveImmediately) return Promise.resolve();
    return new Promise((resolve) => this.one('solve', () => resolve()));
  }


  // -------------------------------------------------------------------------
  // Animations

  /**
   * Animates multiple CSS properties of this element, with a given duration,
   * delay and ease function.
   */
  animate(rules: AnimationProperties, duration = 400, delay = 0,
      easing = 'ease-in-out'): AnimationResponse {
    return transition(this, rules, duration, delay, easing);
  }

  /**
   * Runs an enter animation on this element. Valid effect names are
   *   * 'fade', 'pop' and 'descend'
   *   * 'draw' and 'draw-reverse'
   *   * 'slide' and 'slide-down'
   *   * 'reveal', 'reveal-left' and 'reveal-right'
   */
  enter(effect = 'fade', duration = 500, delay = 0): AnimationResponse {
    return enter(this, effect, duration, delay);
  }

  /**
   * Runs an exit animation on this element. See `.enter()` for options.
   */
  exit(effect = 'fade', duration = 500, delay = 0, remove = false): AnimationResponse {
    return exit(this, effect, duration, delay, remove);
  }

  /**
   * Triggers a CSS animation in an element by adding a class and removing it
   * after the `animationEnd` event.
   */
  effect(className: string) {
    this.one('animationend', () => this.removeClass('effects-' + className));
    this.addClass('effects-' + className);
  }


  // -------------------------------------------------------------------------
  // Utilities

  /**
   * Creates a copy of this element.
   * @param {boolean=} recursive
   * @param {boolean=} withStyles Whether to inline all styles.
   * @returns {Element}
   */
  copy(recursive = true, withStyles = true) {
    const $copy = $(this._el.cloneNode(recursive) as Element)!;
    if (withStyles) $copy.copyInlineStyles(this, recursive);
    return $copy;
  }

  private copyInlineStyles($source: ElementView, recursive = true) {
    const style = window.getComputedStyle($source._el);
    for (const s of Array.from(style)) {
      this.css(s, style.getPropertyValue(s));
    }

    if (recursive) {
      const children = this.children;
      const sourceChildren = $source.children;
      for (let i = 0; i < children.length; ++i) {
        children[i].copyInlineStyles(sourceChildren[i], true);
      }
    }
  }
}

export type ElementView = BaseView<HTMLElement|SVGElement>;


// -----------------------------------------------------------------------------
// HTML Elements

export class HTMLBaseView<T extends HTMLElement> extends BaseView<T> {

  get offsetTop() {
    return this._el.offsetTop;
  }

  get offsetLeft() {
    return this._el.offsetLeft;
  }

  get offsetParent() {
    return $(this._el.offsetParent || undefined);
  }

  /** Returns this element's width, including border and padding. */
  get width() {
    return this._el.offsetWidth;
  }

  /** Returns this element's height, including border and padding. */
  get height() {
    return this._el.offsetHeight;
  }

  /** Returns this element's width, excluding border and padding. */
  get innerWidth() {
    const left = parseFloat(this.css('padding-left')!);
    const right = parseFloat(this.css('padding-right')!);
    return this._el.clientWidth - left - right;
  }

  /** Returns this element's height, excluding border and padding. */
  get innerHeight() {
    const bottom = parseFloat(this.css('padding-bottom')!);
    const top = parseFloat(this.css('padding-top')!);
    return this._el.clientHeight - bottom - top;
  }

  /** Returns this element's width, including margins. */
  get outerWidth() {
    const left = parseFloat(this.css('margin-left')!);
    const right = parseFloat(this.css('margin-right')!);
    return (this.width + left + right) || 0;
  }

  /** Returns this element's height, including margins. */
  get outerHeight() {
    const bottom = parseFloat(this.css('margin-bottom')!);
    const top = parseFloat(this.css('margin-top')!);
    return (this.height + bottom + top) || 0;
  }

  /** @returns {number} */
  get positionTop() {
    let el: HTMLElement|undefined = this._el;
    let offset = 0;

    while (el) {
      offset += el.offsetTop;
      el = el.offsetParent as HTMLElement|undefined;
    }

    return offset;
  }

  /** @returns {number} */
  get positionLeft() {
    let el: HTMLElement|undefined = this._el;
    let offset = 0;

    while (el) {
      offset += el.offsetLeft;
      el = el.offsetParent as HTMLElement|undefined;
    }

    return offset;
  }

  /** Calculates the element offset relative to any other parent element. */
  offset(parent: HTMLView) {
    if (parent._el === this._el.offsetParent) {
      // Get offset from immediate parent
      const top = this.offsetTop + parent._el.clientTop;
      const left = this.offsetLeft + parent._el.clientLeft;
      const bottom = top + this.height;
      const right = left + this.width;
      return {top, left, bottom, right};

    } else {
      // Get offset based on any other element
      const parentBox = parent._el.getBoundingClientRect();
      const box = this._el.getBoundingClientRect();
      return {
        top: box.top - parentBox.top, left: box.left - parentBox.left,
        bottom: box.bottom - parentBox.top, right: box.right - parentBox.left,
      };
    }
  }
}

export type HTMLView = HTMLBaseView<HTMLElement>;


// -----------------------------------------------------------------------------
// SVG Elements

export class SVGBaseView<T extends SVGGraphicsElement> extends BaseView<T> {
  readonly type = 'svg';

  /** Returns the owner `<svg>` which this element is a child of. */
  get $ownerSVG() {
    return $(this._el.ownerSVGElement || undefined) as SVGParentView;
  }

  // See https://www.chromestatus.com/features/5724912467574784
  get width() {
    return this.bounds.width;
  }

  get height() {
    return this.bounds.height;
  }

  // SVG Elements don't have offset properties. We instead use the position of
  // the first non-SVG parent, plus the margin of the SVG owner, plus the SVG
  // position of the individual element. This doesn't work for absolutely
  // positioned SVG elements, and some other edge cases.

  get positionLeft() {
    const svgLeft = this._el.getBBox().x + this._el.getCTM()!.e;
    return this.$ownerSVG.positionLeft + svgLeft;
  }

  get positionTop() {
    const svgTop = this._el.getBBox().y + this._el.getCTM()!.f;
    return this.$ownerSVG.positionTop + svgTop;
  }

  get inverseTransformMatrix() {
    const m = this._el.getScreenCTM()!.inverse();
    const matrix = [[m.a, m.c, m.e], [m.b, m.d, m.f]];

    // Firefox doesn't account for the CSS transform of parent elements.
    // TODO Use matrix product of all parent's transforms, not just the
    // translation of the immediate parent.
    if (Browser.isFirefox) {
      const transform = this.transformMatrix;
      matrix[0][2] -= transform[0][2];
      matrix[1][2] -= transform[1][2];
    }

    return matrix as [[number, number, number], [number, number, number]];
  }

  setTransform(posn?: SimplePoint, angle = 0, scale = 1) {
    const t1 = posn ?
               `translate(${roundTo(posn.x, 0.1)} ${roundTo(posn.y, 0.1)})` :
               '';
    const t2 = nearlyEquals(angle, 0) ? '' : `rotate(${angle * 180 / Math.PI})`;
    const t3 = nearlyEquals(scale, 1) ? '' : `scale(${scale})`;
    this.setAttr('transform', [t1, t2, t3].join(' '));
  }

  /**
   * Finds the total stroke length of this element. Similar to the SVG
   * `getTotalLength()` function, but works for a wider variety of elements.
   */
  get strokeLength(): number {
    if (this._el instanceof SVGGeometryElement) {
      return this._el.getTotalLength();
    } else {
      const dim = this.bounds;
      return 2 * dim.height + 2 * dim.width;
    }
  }

  /**
   * Gets the coordinates of the point at a distance `d` along the length of the
   * stroke of this `<path>` element.
   */
  getPointAtLength(d: number) {
    if (this._el instanceof SVGGeometryElement) {
      const point = this._el.getPointAtLength(d);
      return new Point(point.x, point.y);
    } else {
      return new Point(0, 0);
    }
  }

  /**
   * Gets the coordinates of the point at a position `p` along the length of the
   * stroke of this `<path>` element, where `0 ≤ p ≤ 1`.
   */
  getPointAt(p: number) {
    return this.getPointAtLength(p * this.strokeLength);
  }

  /** Returns a list of all points along an SVG `<path>` element. */
  get points() {
    return parsePath(this.attr('d'));
  }

  /** Sets the list of points for an SVG `<path>` element.c*/
  set points(p: SimplePoint[]) {
    const d = p.length ? 'M' + p.map(x => x.x + ',' + x.y).join('L') : '';
    this.setAttr('d', d);
  }

  /** Appends a new point to an SVG `<path>` element. */
  addPoint(p: SimplePoint) {
    const d = this.attr('d') + ' L ' + p.x + ',' + p.y;
    this.setAttr('d', d);
  }

  /** Finds the center of an SVG `<circle>` element. */
  get center() {
    const x = +this.attr(this.tagName === 'TEXT' ? 'x' : 'cx');
    const y = +this.attr(this.tagName === 'TEXT' ? 'y' : 'cy');
    return new Point(x, y);
  }

  /** Sets the center of an SVG `<circle>` or `<text>` element. */
  setCenter(c: SimplePoint) {
    this.setAttr(this.tagName === 'TEXT' ? 'x' : 'cx', c.x);
    this.setAttr(this.tagName === 'TEXT' ? 'y' : 'cy', c.y);
  }

  /** Sets the end points of an SVG `<line>` element. */
  setLine(p: SimplePoint, q: SimplePoint) {
    this.setAttr('x1', p.x);
    this.setAttr('y1', p.y);
    this.setAttr('x2', q.x);
    this.setAttr('y2', q.y);
  }

  /** Sets the bounds of an SVG `<rectangle>` element. */
  setRect(rect: Rectangle) {
    this.setAttr('x', rect.p.x);
    this.setAttr('y', rect.p.y);
    this.setAttr('width', rect.w);
    this.setAttr('height', rect.h);
  }

  /** Draws a generic geometry object onto an SVG `<path>` element. */
  draw(obj: GeoShape|undefined, options: SVGDrawingOptions = {}) {
    if (!obj) return this.setAttr('d', '');
    const attributes = {
      mark: this.attr('mark'),
      arrows: this.attr('arrows'),
      size: (+this.attr('size')) || undefined,
      fill: this.hasClass('fill'),
      round: this.hasAttr('round'),
    };
    this.setAttr('d', drawSVG(obj, applyDefaults(options, attributes)));
  }
}

export class SVGParentView extends SVGBaseView<SVGSVGElement> {
  /** Returns the viewport coordinates of this `<svg>` element. */
  get viewBox() {
    return (this._el as SVGSVGElement).viewBox.baseVal || {width: 0, height: 0};
  }

  get $ownerSVG() {
    return this;
  }

  get positionLeft() {
    return parseInt(this.css('margin-left')!) + this.parent!.positionLeft;
  }

  get positionTop() {
    return parseInt(this.css('margin-top')!) + this.parent!.positionTop;
  }

  /** Returns the intrinsic width of this `<svg>` element. */
  get svgWidth() {
    return this.viewBox.width || this.width;
  }

  /** Returns the intrinsic height of this `<svg>` element. */
  get svgHeight() {
    return this.viewBox.height || this.height;
  }

  /** Converts an SVG element into a PNG data URI. */
  async pngImage(size?: number) {
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

    const $canvas = $N('canvas', {width, height}) as CanvasView;
    $canvas.ctx.fillStyle = '#fff';
    $canvas.ctx.fillRect(0, 0, width, height);

    const image = await loadImage(url);
    $canvas.ctx.drawImage(image, 0, 0, width, height);
    return $canvas.pngImage;
    // window.URL.revokeObjectURL(url);
  }

  downloadImage(fileName: string, size?: number) {
    // iOS Doesn't allow navigation calls within an async event.
    const windowRef = Browser.isIOS ? window.open('', '_blank') : undefined;

    this.pngImage(size).then((href) => {
      if (windowRef) return windowRef.location.href = href;
      const $a = $N('a', {download: fileName, href, target: '_blank'});
      $a._el.dispatchEvent(new MouseEvent('click',
          {view: window, bubbles: false, cancelable: true}));
    });
  }
}

export type SVGView = SVGBaseView<SVGGraphicsElement>;


// -----------------------------------------------------------------------------
// Window Element (<html> and <body>)

export class WindowView extends HTMLBaseView<HTMLHtmlElement|HTMLBodyElement> {
  readonly type = 'window';

  get width() {
    return window.innerWidth;
  }

  get height() {
    return window.innerHeight;
  }

  get innerWidth() {
    return window.innerWidth;
  }

  get innerHeight() {
    return window.innerHeight;
  }

  get outerWidth() {
    return window.outerWidth;
  }

  get outerHeight() {
    return window.outerHeight;
  }

  get scrollWidth() {
    return document.body.scrollWidth;
  }

  get scrollHeight() {
    return document.body.scrollHeight;
  }

  get scrollTop() {
    return window.pageYOffset;
  }

  set scrollTop(y) {
    document.body.scrollTop = document.documentElement.scrollTop = y;
    this.trigger('scroll', {top: y, left: this.scrollLeft});
  }

  get scrollLeft() {
    return window.pageXOffset;
  }

  set scrollLeft(x) {
    document.body.scrollLeft = document.documentElement.scrollLeft = x;
    this.trigger('scroll', {top: this.scrollTop, left: x});
  }
}


// -----------------------------------------------------------------------------
// Form Element (<form>, <input> and <select>)

type InputFieldElement = HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;

export class FormView extends HTMLBaseView<HTMLFormElement> {
  readonly type = 'form';

  get action() {
    return this._el.action;
  }

  /** Summarises the data for an HTML <form> element in an JSON Object. */
  get formData() {
    const data: Obj<string> = {};
    for (const el of Array.from(this._el.elements)) {
      const id = (el as InputFieldElement).name || el.id;
      if (id) data[id] = (el as InputFieldElement).value;
    }
    return data;
  }

  get isValid() {
    return this._el.checkValidity();
  }
}

export class InputView extends HTMLBaseView<InputFieldElement> {
  readonly type = 'input';

  get checked() {
    return this._el instanceof HTMLInputElement ? this._el.checked : false;
  }

  get value() {
    return this._el.value;
  }

  set value(v) {
    this._el.value = v;
  }

  protected bindVariable(model: Observable, name: string) {
    model[name] = this.value;
    this.change((v: string) => model[name] = v);
    model.watch(() => this.value = model[name]);
  }

  /** Binds a change event listener. */
  change(callback: (val: string) => void) {
    let value = this.value || '';
    this.on('change keyup input paste', () => {
      if (this.value === value) return;
      value = this.value.trim();
      callback(value);
    });
  }

  validate(callback: (value: string) => string) {
    this.change(value => this.setValidity(callback(value)));
  }

  setValidity(str: string) {
    this._el.setCustomValidity(str);
  }

  get isValid() {
    return this._el.checkValidity();
  }
}


// -----------------------------------------------------------------------------
// Canvas Elements (<canvas>)

export class CanvasView extends HTMLBaseView<HTMLCanvasElement> {
  private _ctx?: CanvasRenderingContext2D;
  readonly type = 'canvas';

  /** Returns the drawing context for a `<canvas>` element. */
  getContext(c = '2d', options: WebGLContextAttributes = {}) {
    return this._el.getContext(c, options);
  }

  /** Converts an Canvas element into a PNG data URI. */
  get pngImage() {
    return this._el.toDataURL('image/png');
  }

  /** Returns the intrinsic pixel width of this `<canvas>` element. */
  get canvasWidth() {
    return this._el.width;
  }

  /** Returns the intrinsic pixel height of this `<canvas>` element. */
  get canvasHeight() {
    return this._el.height;
  }

  /** Cached reference to the 2D context for this `<canvas>` element. */
  get ctx() {
    if (!this._ctx) this._ctx = this.getContext() as CanvasRenderingContext2D;
    return this._ctx!;
  }

  /** Draws a generic geometry object ont a `<canvas>` element. */
  draw(obj: GeoShape, options: CanvasDrawingOptions = {}) {
    this.ctx.save();
    drawCanvas(this.ctx, obj, options);
    this.ctx.restore();
  }

  /** Clears this canvas. */
  clear() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /** Clears this canvas. */
  fill(color: string) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.restore();
  }

  /** Erase a specific circle of the canvas. */
  clearCircle(center: Point, radius: number) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
    this.ctx.fill();
    this.ctx.restore();
  }

  downloadImage(fileName: string) {
    const href = this.pngImage;
    const $a = $N('a', {download: fileName, href, target: '_blank'});
    $a._el.dispatchEvent(new MouseEvent('click',
        {view: window, bubbles: false, cancelable: true}));
  }
}


// -----------------------------------------------------------------------------
// Media Elements (<video> and <audio>)

export class MediaView extends HTMLBaseView<HTMLMediaElement> {

  /** Starts playback on a media element. */
  play() {
    return this._el.play() || Promise.resolve();
  }

  /** Pauses playback on a media element. */
  pause() {
    return this._el.pause();
  }
}


// -----------------------------------------------------------------------------
// Element Selectors and Constructors

const SVG_TAGS = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
  'g', 'defs', 'marker', 'line', 'text', 'pattern', 'mask', 'svg', 'foreignObject'];

/**
 * Finds the Element that matches a specific CSS selector, or creates a new
 * Element wrapper around a native HTMLElement instance.
 */
export function $(query?: string|Element,
    context?: ElementView): ElementView|undefined {
  if (!query) return undefined;

  const c = context ? context._el : document.documentElement;
  const el = (typeof query === 'string') ? c.querySelector(query) : query;

  if (!el) return undefined;
  if (el._view) return el._view;

  const tagName = (el.tagName || '').toLowerCase();

  if (tagName === 'svg') {
    return new SVGParentView(el as SVGSVGElement);
  } else if (tagName === 'canvas') {
    return new CanvasView(el as HTMLCanvasElement);
  } else if (tagName === 'form') {
    return new FormView(el as HTMLFormElement);
  } else if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
    return new InputView(el as InputFieldElement);
  } else if (tagName === 'video' || tagName === 'audio') {
    return new MediaView(el as HTMLMediaElement);
  } else if (SVG_TAGS.includes(tagName)) {
    // TODO <mask> and <pattern> are not SVGGraphicsElements.
    return new SVGBaseView<SVGGraphicsElement>(el as SVGGraphicsElement);
  } else {
    return new HTMLBaseView<HTMLElement>(el as HTMLElement);
  }
}

/** Finds all elements that match a specific CSS selector. */
export function $$(selector: string,
    context?: ElementView): ElementView[] {
  const c = context ? context._el : document.documentElement;
  const els = selector ? c.querySelectorAll(selector) : [];
  return Array.from(els, el => $(el)!);
}

/** Creates a new Element instance from a given set of options. */
export function $N(tag: string, attributes: Obj<any> = {},
    parent?: ElementView) {

  const el = !SVG_TAGS.includes(tag) ? document.createElement(tag) :
             document.createElementNS('http://www.w3.org/2000/svg', tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    if (key === 'id') {
      el.id = value;
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (key === 'text') {
      el.textContent = value;
    } else if (key === 'path') {
      el.setAttribute('d', drawSVG(value));
    } else {
      el.setAttribute(key, value);
    }
  }

  const $el = $(el)!;
  if (parent) parent.append($el);
  return $el;
}

export const $body = new WindowView(document.body as HTMLBodyElement);
export const $html = new WindowView(
    document.documentElement as HTMLHtmlElement);
