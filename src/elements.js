// =============================================================================
// Boost.js | Elements
// (c) 2015 Mathigon
// =============================================================================



import { isOneOf } from 'utilities';
import { words } from 'strings';
import Evented from 'evented';
import { createEvent, removeEvent, fixOverflowScroll, scrollTo } from 'dom-events';
import { transitionElement, enter, exit, action } from 'animate';


class Element {

    constructor(el) {
        this._el = el;
        this._isWindow = isOneOf(el, window, document.body, document.documentElement);
        this._data   = el ? (el._m_data   || (el._m_data   = {})) : {};
        this._events = el ? (el._m_events || (el._m_events = {})) : {};
    }


    // -------------------------------------------------------------------------
    // Basic Functionality

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

    get value() { return this._el.value; }
    set value(v) { this._el.value = v; }

    get html() { return this._el.innerHTML; }
    set html(h) { this._el.innerHTML = html; }

    get text() { return this._el.textContent; }
    set text(y) { this._el.textContent = html; }

    blur() { this._el.blur(); }
    focus() { this._el.focus(); }


    // -------------------------------------------------------------------------
    // Dimensions

    get bounds() { return this._el.getBoundingClientRect(); }
    get offsetTop()  { return this._el.offsetTop; }
    get offsetLeft() { return this._el.offsetLeft; }

    // Includes border and padding
    get width()  { return this._isWindow ? window.innerWidth  : this._el.offsetWidth; }
    get height() { return this._isWindow ? window.innerHeight : this.$el.offsetHeight; }

    // Doesn't include border and padding
    get innerWidth() {
        if (this._isWindow) return window.innerWidth;
        return this._el.clientWidth - parseFloat(this.css('padding-left')) - parseFloat(this.css('padding-right'));
    }
    get innerHeight() {
        if (this._isWindow) return window.innerHeight;
        return this._el.clientHeight - parseFloat(this.css('padding-bottom')) - parseFloat(this.css('padding-top'));
    }

    // Includes Margins
    get outerWidth() {
        if (this._isWindow) return window.outerWidth;
        return this._el.offsetWidth + parseFloat(this.css('margin-right')) + parseFloat(this.css('margin-left'));
    }
    get outerHeight() {
        if (this._isWindow) return window.outerHeight;
        return this._el.offsetHeight + parseFloat(this.css('margin-top')) + parseFloat(this.css('margin-bottom'));
    }

    offset(parent) {
        if (parent === 'parent') parent = this.parent;
        if (parent === 'body') parent = $body;

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

    get scrollLeft() { return this._isWindow ? window.pageXOffset : this.$el.scrollLeft; }
    set scrollLeft(x) {
        if (this._isWindow) {
            document.body.scrollLeft = document.documentElement.scrollLeft = x;
        } else {
            this.$el.scrollLeft = x;
        }
        this.trigger('scroll', { top: this.scrollTop, left: y });
    }

    fixOverflowScroll() {
        fixOverflowScroll(this)
    }

    scrollTo(x, time = 1000, easing = 'cubic') {
        scrollTo (this, pos, time, easing);
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
        if (arguments.length === 0) return this._el.style[prefix('transition')];
        if (typeof duration !== 'string') duration = duration + 'ms';
        this._el.style[prefix('transition')] = property + ' ' + duration + ' ' + curve;
    }

    get strokeLength() {
        if ('getTotalLength' in this._el) {
            return this._el.getTotalLength();
        } else {
            var dim = this.bounds;
            return 2 * dim.height + 2 * dim.width;
        }
    }

    get transform() {
        // window.getComputedStyle(this._el).getPropertyValue(prefix('transform'));
        return this._el.style[prefix('transform')].replace('none', '');
    }

    set transform(transform) {
        this._el.style[prefix('transform')] = transform;
    }

    get transformMatrix() {
        let transform = window.getComputedStyle(this._el).getPropertyValue(prefix('transform'));
        if (!transform || transform === 'none') return null;

        let coords = transform.match(/matrix\(([0-9\,\.\s]*)\)/);
        if (!coords[1]) return null;

        let matrix = coords[1].split(',');
        return [[+matrix[0], +matrix[1]], [+matrix[2], +matrix[3]]];
    }

    get scale() {
        let matrix = this.transformMatrix;
        return matrix ? [matrix[0][0], matrix[1][1]] : [1, 1];
    }

    translate(x, y) {
        x = Math.round(+x || 0);
        y = Math.round(+y || 0);
        this._el.style[prefix('transform')] = 'translate(' + x + 'px,' + y + 'px)';
    }

    translateX(x) {
        x = Math.round(+x || 0);
        this._el.style[prefix('transform')] = 'translate(' + x + 'px,0)';
    }

    translateY(y) {
        y = Math.round(+y || 0);
        this._el.style[prefix('transform')] = 'translate(0px,' + y + 'px)';
    }

    hide() {
        this.css('display', 'none');
        this.css('visibility', 'hidden');
    }

    show() {
        this.css('display', 'block');
        this.css('visibility', 'visible');
    }

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
        var returned = fn.call(this) || this._el;
        if (next) {
            parent.insertBefore(returned, next);
        } else {
            parent.appendChild(returned);
        }
    }

    is(selector) {
        // TODO improve performance
        let compareWith = document.querySelectorAll(selector);
        for (let q of compareWith)
            if (q === this._el) return true;
        return false;
    }

    index() {
        let i = 0;
        let child = this._el;
        while ((child = child.previousSibling) !== null) ++i;
        return i;
    }

    prepend(newChild) {
        if (typeof newChild === 'string') {
            let newChildren = $$N(newChild);
            for (let j = newChildren.length - 1; j >= 0; --j) {
                this._el.insertBefore(newChildren[j], this._el.childNodes[0]);
            }
        } else {
            this._el.insertBefore(newChild.$el, this._el.childNodes[0]);
        }
    }

    append(newChild) {
        if (typeof newChild === 'string') {
            let newChildren = $$N(newChild);
            for (c of newChildren) this._el.appendChild(c._el);
        } else {
            this._el.appendChild(newChild._el);
        }
    }

    insertBefore(newChild) {
        let parent = this.parent;

        if (typeof newChild === 'string') {
            let newChildren = $$N(newChild);
            for (let j = newChildren.length - 1; j >= 0; --j) {
                parent._el.insertBefore(newChildren[j]._el, this.$el);
            }
        } else {
            parent._el.insertBefore(newChild._el, this._el);
        }
    }

    insertAfter(newChild) {
        let parent = this.parent;

        if (typeof newChild === 'string') {
            let newChildren = $$N(newChild);
            for (c of newChildren) parent._el.insertAfter(_this._el, c._el);
        } else {
            var next = this._el.nextSibling;
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
        this.remove();
        wrapper.append(this);
    }

    moveTo(newParent, before) {
        this.remove();
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

    find(selector) {
        return $$(selector, this);
    }

    get parent() {
        let parent = this._el.parentNode;
        return parent ? $(parent) : null;
    }

    parents(selector) {
        let parents = [];
        let parent = this.parent();
        while (parent) {
            if (!selector || parent.is(selector)) parents.push(parent);
            parent = parent.parent();
        }
        return parents;
    }

    hasParent($p) {
        let parent = this.parent();
        while (parent) {
            if (parent.$el === $p.$el) return true;
            parent = parent.parent();
        }
        return false;
    }

    children(selector) {
        let childNodes = this._el.children;

        if (!childNodes) {
            let nodes = this._el.childNodes;
            return nodes.filter(n => !n.data || n.data.trim()).map(n => $(n));

        } else if (typeof selector === 'number') {
            return $(childNodes[selector]);

        } else if (selector == null) {
            return childNodes.map(n => $(n));

        } else {
            return childNodes.map(n => $(n)).filter($n => $n.is(selector));
        }
    }

    detach() {
        if (this._el.parentNode) this._el.parentNode.removeChild(this._el);
    }

    remove() {
        this.detach();
        this._el = null;
    }

    clear() {
        for ($c of this.children()) _this._el.removeChild($c._el);
    }

    replace(newEl) {
        this.insertAfter(newEl);
        this.remove();
    }


    // -------------------------------------------------------------------------
    // Events

    on(type, fn = null, useCapture = false) {
        if (fn != null) {
            for (e of words(type)) createEvent(this, e, fn, useCapture);
        } else {
            for (e in type) createEvent(this, e, type[e]);
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
        for (e of words(type)) removeEvent(this, e, fn, useCapture);
    }

    trigger(event, args = {}) {
        if (!this._events[event]) return;
        for (fn of this._events[event]) fn.call(this, args);
    }

    // let evt = document.createEvent('Event');
    // evt.initEvent(eventName, true, true);
    // evt.detail = eventData;
    // this.$el.dispatchEvent(evt);


    // -------------------------------------------------------------------------
    // Animations

    animate(properties) { transitionElement(this, properties); }

    enter(time, effect, delay) { enter(this, time, effect, delay); }
    exit(time, effect, delay) { exit(this, time, effect, delay); }
    action(effect) { exit(this, effect); }

    fadeIn(time) { enter(this, time, 'fade'); }
    fadeOut(time) { exit(this, time, 'fade'); }

    slideUp(t) {
        return this.animate({ css: 'height', to: 0 });
    }

    slideDown(t) {
        let _this = this;

        let h = element.children(0).outerHeight();  // TODO make more generic
        let a = this.animate({ css: 'height', to: h });
        a.then(function() { _this.css('height', 'auto'); });
        return a;
    }

}


// -----------------------------------------------------------------------------
// Element Selectors

const svgTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
                 'g', 'defs', 'marker', 'line', 'text', 'pattern'];

function $(selector, context = $doc) {
    if (typeof selector === 'string')
        selector = context._el.querySelector(selector);

    if (selector instanceof Node || selector === window)
        return new Element(selector);

    return null;
}

function $I(selector) {
    let el = document.getElementById(selector);
    return el ? new Element(el) : null;
}

function $C(selector, context = $doc) {
    let els = context._el.getElementsByClassName(selector);
    return els.length ? new Element(els[0]) : null;
}

function $T(selector, context = $doc) {
    let els = context._el.getElementsByTagName(selector);
    return els.length ? new Element(els[0]) : null;
}

function $$(selector, context = $doc) {
    let els = context._el.querySelectorAll(selector);
    return els.map(el => new Element(el));
}

function $$C(selector, context = $doc) {
    let els = context._el.getElementsByClassName(selector);
    return els.map(el => new Element(el));
}

function $$T(selector, context = $doc) {
    let els = context._el.getElementsByTagName(selector);
    return els.map(el => new Element($el));
}


// -----------------------------------------------------------------------------
// Element Constructors

function $N(tag, attributes = {}, parent = null) {
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

function $$N(html) {
    let tempDiv = $N('div', { html: html });
    return tempDiv.children();
}


// -----------------------------------------------------------------------------
// Custom Elements

function customElement(tag, options) {

    var attrs = options.attributeChange || {};

    class CustomElement extends HTMLElement {

        createdCallback() {
            if ('template' in options)
                this.createShadowRoot().innerHTML = template;

            let events = new Evented();
            this.on = events.on;
            this.off = events.off;
            this.trigger = events.trigger;

            this._el = $N(this);
            if ('created' in options) options.created.call(this)
        }

        attachedCallback() {
            if ('attached' in options) options.attached.call(this)
        }

        detachedCallback() {
            if ('detached' in options) options.detached.call(this)
        }

        attributeChangedCallback(attrName, oldVal, newVal) {
            if (attrName in attrs) {
                attrs[attrName].call(this, newVal, oldVal);
            }
        }

    }

    return document.registerElement(tag, CustomElement);
}

 
// -----------------------------------------------------------------------------
// Exports

const $body = new Element(document.body);
const $html = $T('html');
const $window = new Element(window);
const $doc = new Element(window.document.documentElement);

export default {
    $, $I, $C, $T, $N, $$, $$C, $$T, $$N,
    $body, $html, $window, $doc,
    customElement
}
