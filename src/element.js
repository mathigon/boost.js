// =============================================================================
// Boost.js | Elements
// (c) 2015 Mathigon
// =============================================================================



import { isOneOf } from 'utilities'

const svgTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline',
                 'g', 'defs', 'marker', 'line', 'text', 'pattern'];


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
        let classes = className.words();
        for (let c of classes) {
            this._el.classList.add(c);
        }
    }

    removeClass(className) {
        let classes = className.words();
        for (let c of classes) {
            this._el.classList.remove(c);
        }
    }

    hasClass(className) {
        return (' ' + this._el.className + ' ').indexOf(' ' + className.trim() + ' ') >= 0;  // FIXME
    }

    toggleClass(className) {
        let classes = className.words();
        for (let c of classes) {
            this._el.classList.toggle(classes[i]);
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

    data(key, value) {
        if (value == null) {
            var dataAttr = this._el.getAttribute('data-' + key);
            return dataAttr ? dataAttr : (this._data ? this._data[key] : undefined);
        } else {
            this._data[key] = value;
        }
    }

    value(value) {
        if (value == null) {
            return this._el.value;
        } else {
            this._el.value = value;
        }
    }

    html(html) {
        if (html == null) {
            return this._el.innerHTML;
        } else {
            this._el.innerHTML = html;
        }
    }

    text(text) {
        if (text == null) {
            return this._el.textContent.trim();
        } else {
            this.$el.textContent = text;
        }
    }

    blur() { this._el.blur(); }
    focus() { this._el.focus(); }


    // ---------------------------------------------------------------------------------------------
    // Dimensions

    get offsetTop()  { return this._el.offsetTop; }
    get offsetLeft() { return this._el.offsetLeft; }

    // Includes border and padding
    get width()  { return this._isWindow ? window.innerWidth  : this._el.offsetWidth; }
    get height() { return this._isWindow ? window.innerHeight : this.$el.offsetHeight; }

    // Doesn't include border and padding
    get innerWidth() {
        if (this._isWindow) return window.innerWidth;
        return this._el.clientWidth - parseFloat(this.css('padding-left')) - parseFloat(this.css('padding-right'));  // FIXME parseFLoat
    }
    get innerHeight() {
        if (this._isWindow) return window.innerHeight;
        return this._el.clientHeight - parseFloat(this.css('padding-bottom')) - parseFloat(this.css('padding-top'));
    }

    // Includes Margins
    get outerWidth() {
        if (this._isWindow) return window.outerWidth;
        return this._el.offsetWidth + parseFloat(this.css('margin-right')) + parseFloat(this.css('margin-left'));  // FIXME parseFLoat
    }
    get outerHeight() {
        if (this._isWindow) return window.outerHeight;
        return this._el.offsetHeight + parseFloat(this.css('margin-top')) + parseFloat(this.css('margin-bottom'));
    }

    get scrollWidth()  { return this._isWindow ? M.$body.$el.scrollWidth  : this._el.scrollWidth; }  // FIXME
    get scrollHeight() { return this._isWindow ? M.$body.$el.scrollHeight : this._el.scrollHeight; }

    scrollTop(y) {
        if (y == null) {
            return this._isWindow ? window.pageYOffset : this.$el.scrollTop;
        } else {
            if (this._isWindow) {
                document.body.scrollTop = document.documentElement.scrollTop = y;
            } else {
                this.$el.scrollTop = y;
            }
            this.trigger('scroll', { top: y });
        }
    }

    scrollLeft(x) {
        if (x == null) {
            return this._isWindow ? window.pageXOffset : this.$el.scrollLeft;
        } else {
            if (this._isWindow) {
                document.body.scrollLeft = document.documentElement.scrollLeft = x;
            } else {
                this.$el.scrollLeft = x;
            }
            this.trigger('scroll', { left: x });
        }
    }

    offset($parent) {

        if ($parent === 'parent') $parent = this.parent();
        if ($parent === 'body') $parent = M.$body;
        var box;

        // Get offset from immediate parent
        if ($parent && $parent.$el === this.$el.offsetParent) {
            var top = this.$el.offsetTop + $parent.$el.clientTop;
            var left = this.$el.offsetLeft + $parent.$el.clientLeft;
            var bottom = top +  this.$el.offsetHeight;
            var right = left + this.$el.offsetWidth;
            return { top: top, left: left, bottom: bottom, right: right };

        // Get offset based on any other element including $(document.body)
        } else if ($parent) {
            var parentBox = $parent.$el.getBoundingClientRect();
            box = this.$el.getBoundingClientRect();
            return { top:    box.top    - parentBox.top, left:  box.left  - parentBox.left,
                     bottom: box.bottom - parentBox.top, right: box.right - parentBox.left };

        // Get offset based on viewport
        } else {
            return this.$el.getBoundingClientRect();
        }
    }


    // ---------------------------------------------------------------------------------------------
    // Styles

    css(props, value) {
        if (arguments.length === 1) {
            if (typeof props === 'string') {
                return window.getComputedStyle(this.$el, null).getPropertyValue(props);
            } else {
                for (var p in props) if (M.has(props, p)) this.$el.style[M.toCamelCase(p)] = props[p];
            }
        } else if (arguments.length === 2 && typeof props === 'string') {
            this.$el.style[M.toCamelCase(props)] = value;
        }
    }

    transition(property, duration, curve) {
        if (arguments.length === 1) this.$el.style[M.prefix('transition')] = property;
        if (typeof duration !== 'string') duration = duration + 'ms';
        this.$el.style[M.prefix('transition')] = property + ' ' + duration + (curve ? ' ' + curve : '');
    }

    transform(transform) {
        this.$el.style[M.prefix('transform')] = (transform || '');
    }

    getTransformMatrix() {
        var transform = window.getComputedStyle(this.$el).getPropertyValue(M.prefix('transform'));
        if (!transform || transform === 'none') return null;

        var coords = transform.match(/matrix\(([0-9\,\.\s]*)\)/);
        if (!coords[1]) return null;

        var matrix = coords[1].split(',');
        return [[+matrix[0], +matrix[1]], [+matrix[2], +matrix[3]]];
    }

    getScale() {
        var matrix = this.getTransformMatrix();
        return matrix ? [matrix[0][0], matrix[1][1]] : [1, 1];
    }

    translate(x, y) {
        x = Math.round(+x || 0);
        this.$el.style[M.prefix('transform')] = 'translate(' + x + 'px,' + y + 'px)';
    }

    translateX(x) {
        x = Math.round(+x || 0);
        this.$el.style[M.prefix('transform')] = 'translate(' + x + 'px,0)';
    }

    translateY(y) {
        y = Math.round(+y || 0);
        this._el.style[M.prefix('transform')] = 'translate(0px,' + y + 'px)';
    }

    hide() {
        this.css('display', 'none');
        this.css('visibility', 'hidden');
    }

    show() {
        this.css('display', 'block');
        this.css('visibility', 'visible');
    }


    // ---------------------------------------------------------------------------------------------
    // DOM Manipulation

    // Removes an element from the DOM for more performant node manipulation. The element
    // is placed back into the DOM at the place it was taken from.
    manipulate(fn){
        var next = this.$el.nextSibling;
        var parent = this.$el.parentNode;
        var frag = document.createDocumentFragment();
        frag.appendChild(this.$el);
        var returned = fn.call(this) || this.$el;
        if (next) {
            parent.insertBefore(returned, next);
        } else {
            parent.appendChild(returned);
        }
    }

    is(selector) {
        var compareWith = document.querySelectorAll(selector);
        for (var i = 0, l = compareWith.length; i < l; ++i)
            if (compareWith[i] === this.$el) return true;
        return false;
    }

    index() {
        var i = 0;
        var child = this.$el;
        while ((child = child.previousSibling) !== null) i++;
        return i;
    }

    append(newChild) {
        var _this = this;
        if (typeof newChild === 'string') {
            var newChildren = $$N(newChild);
            newChildren.each(function(child) {
                _this.$el.appendChild(child.$el);
            });
        } else {
            this.$el.appendChild(newChild.$el);
        }
    }

    prepend(newChild) {
        if (typeof newChild === 'string') {
            var newChildren = $$N(newChild);
            for (var j = newChildren.length - 1; j >= 0; j--) {
                this.$el.insertBefore(newChildren[j], this.$el.childNodes[0]);
            }
        } else {
            this.$el.insertBefore(newChild.$el, this.$el.childNodes[0]);
        }
    }

    insertBefore(newChild) {
        var _this = this;
        var parent = this.parent();

        if (typeof newChild === 'string') {
            var newChildren = $$N(newChild);
            for (var j = newChildren.length - 1; j >= 0; j--) {
                parent.$el.insertBefore(newChildren[j].$el, _this.$el);
            }
        } else {
            parent.$el.insertBefore(newChild.$el, _this.$el);
        }
    }

    insertAfter(newChild) {
        var _this = this;
        var parent = this.parent();

        if (typeof newChild === 'string') {
            var newChildren = $$N(newChild);
            newChildren.each(function(child) {
                parent.$el.insertAfter(_this.$el, child.$el);
            });
        } else {
            var next = _this.$el.nextSibling;
            if (next) {
                parent.$el.insertBefore(newChild.$el, next);
            } else {
                parent.$el.appendChild(newChild.$el);
            }
        }
    }

    wrap(wrapper) {
        if (typeof wrapper === 'string') wrapper = $(document.createElement(wrapper));
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

    next() {
        var next = this.$el.nextSibling;
        return next ? $(next) : null;
    }

    prev() {
        var prev = this.$el.previousSibling;
        return prev ? $(prev) : null;
    }

    find(selector) {
        return $$(selector, this);
    }

    parent() {
        var parent = this.$el.parentNode;
        return parent ? $(parent) : null;
    }

    parents(selector) {
        var parents = [];
        var parent = this.parent();
        while (parent) {
            if (!selector || parent.is(selector)) parents.push(parent);
            parent = parent.parent();
        }
        return parents;
    }

    hasParent($p) {
        var parent = this.parent();
        while (parent) {
            if (parent.$el === $p.$el) return true;
            parent = parent.parent();
        }
        return false;
    }

    children(selector) {
        var childNodes = this.$el.children;

        if (!childNodes) {
            childNodes = [];
            var nodes = this.$el.childNodes;
            M.each(nodes, function(n) {
                if (!n.data || n.data.trim()) childNodes.push(n);
            });
        }

        if (typeof selector === 'number') {
            return $(childNodes[selector]);
        } else {
            var children = [];
            for (var i = 0, l = childNodes.length; i < l; ++i)
                if (!selector || $(childNodes[i]).is(selector))
                    children.push($(childNodes[i]));
            return children;
        }
    }

    remove() {
        if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
    }

    delete() {
        this.remove();
        this.$el = null;
    }

    clear() {
        var _this = this;
        this.children().each(function($el) {
            _this.$el.removeChild($el.$el);
        });
    }

    replace(newEl) {
        this.insertAfter(newEl);
        this.remove();
    }

}


// -------------------------------------------------------------------------------------------------
// Constructors

function $(selector, context) {
    if (typeof selector === 'string') {
        context = context ? (context._el || context) : document;
        var $el = context.querySelector(selector);
        return $el ? new M.$($el) : null;
    } else if (selector instanceof Node || selector === window) {
        return new M.$(selector);
    }
}

function $I(selector, context) {
    context = (context && context.$el.getElementById) ? context.$el : document;
    var $el = context.getElementById(selector);
    return $el ? new M.$($el) : null;
}

function $C(selector, context) {
    context = context ? (context._el || context) : document;
    var els = context.getElementsByClassName(selector);
    return els.length ? new Element(els[0]) : null;
}

function $T(selector, context) {
    context = context ? (context._el || context) : document;
    var els = context.getElementsByTagName(selector);
    return els.length ? new Element(els[0]) : null;
}

function $$(selector, context) {
    context = context ? (context._el || context) : document;
    var els = context.querySelectorAll(selector);
    return els.map(function($el) { return new Element(el); });
}

function $$C(selector, context) {
    context = context ? (context._el || context) : document;
    var els = context.getElementsByClassName(selector);
    return els.map(function(el) { return new Element(el); });
}

function $$T(selector, context) {
    context = context ? (context._el || context) : document;
    var $els = context.getElementsByTagName(selector);
    return $els.map(function($el) { return new Element($el); });
}

function $N(tag, attributes = {}, parent = null) {
    var t = svgTags.indexOf(tag) < 0 ? document.createElement(tag) :
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

    var $el = new Element(t);
    if (parent) parent.append($el);
    return $el;
}

function $$N(html) {
    let tempDiv = $N('div', { html: html });
    return tempDiv.children;
}


// -------------------------------------------------------------------------------------------------
// Exports

export default {
    $, $I, $C, $T, $N, $$, $$C, $$T, $$N,
    $body: new Element(document.body),
    $html: $T('html'),
    $window: new Element(window),
    $doc: new Element(window.document.documentElement)
}

