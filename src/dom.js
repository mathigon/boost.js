// =================================================================================================
// Boost.js | DOM Helpers
// (c) 2014 Mathigon / Philipp Legner
// =================================================================================================


(function() {

	M.$ = function ($el) {
		this._data   = $el ? ($el._mdata   || ($el._mdata   = {})) : {};
		this._events = $el ? ($el._mevents || ($el._mevents = {})) : {};
		this.$el = $el;
	};


	// ---------------------------------------------------------------------------------------------
	// Constructors and Query Selectors

	// Creates a single M.$ element from an arbitrary query string or a Node element
	window.$ = function(selector, context) {
	    if (typeof selector === 'string') {
	        context = context ? (context.$el || context) : document;
			var $el = context.querySelector(selector);
			return $el ? new M.$($el) : null;
	    } else if (selector instanceof Node || selector === window) {
	        return new M.$(selector);
	    }
	};

	// Returns a single M.$ element by id
	window.$I = function(selector) {
		var $el = document.getElementById(selector);
		if ($el) return new M.$($el);
	};

	// Returns a single M.$ element by class name
	window.$C = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.getElementsByClassName(selector);
	    return $els.length ? new M.$($els[0]) : null;
	};

	// Returns a single M.$ element by tag name
	window.$T = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.getElementsByTagName(selector);
		return $els.length ? new M.$($els[0]) : null;
	};

	// Returns an array of M.$ elements based on an arbitrary query string
	window.$$ = function(selector, context) {
	    context = context ? (context.$el || context) : document;
	    var $els = context.querySelectorAll(selector);
	    return M.each($els, function($el) { return new M.$($el); });
	};

	// Returns an array of M.$ elements with a given class name
	window.$$C = function(selector, context) {
		context = context ? (context.$el || context) : document;
		var $els = context.getElementsByClassName(selector);
		return M.each($els, function($el) { return new M.$($el); });
	};

	// Returns an array of M.$ elements with a given tag name
	window.$$T = function(selector, context) {
		context = context ? (context.$el || context) : document;
		var $els = context.getElementsByTagName(selector);
		return M.each($els, function($el) { return new M.$($el); });
	};

	// Creates a new DOM node and M.$ element
	window.$N = function(tag, attributes, parent) {
	    var t = document.createElement(tag);

	    for (var a in attributes) {
	        if (a === 'id') {
	            t.id = attributes.id;
	        } else if (a === 'class') {
	            t.className = attributes.class;
	        } else if (a === 'html') {
	            t.innerHTML = attributes.html;
	        } else {
	            t.setAttribute(a, attributes[a]);
	        }
	    }

	    var $el = new M.$(t);
	    if (parent) parent.append($el);
	    return $el;
	};

	// Converts an arbitrary html string into an array of M.$ elements
	window.$$N = function(html) {
	    var tempDiv = $N('div', { html: html });
	    return tempDiv.children();
	};


	// ---------------------------------------------------------------------------------------------
	// Basic Functionality

	M.$.prototype.addClass = function(className) {
	    var classes = className.split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        this.$el.classList.add(classes[i]);
	    }
	};

	M.$.prototype.removeClass = function(className) {
	    var classes = className.split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        this.$el.classList.remove(classes[i]);
	    }
	};

	M.$.prototype.hasClass = function(className) {
	    return (' ' + this.$el.className + ' ').indexOf(' ' + className.trim() + ' ') >= 0;
	};

	M.$.prototype.toggleClass = function(className) {
	    var classes = className.split(' ');
	    for (var i = 0; i < classes.length; ++i) {
	        this.$el.classList.toggle(classes[i]);
	    }
	};

	M.$.prototype.setClass = function(className, condition) {
	    if (condition) {
	        this.addClass(className);
	    } else {
	        this.removeClass(className);
	    }
	};

	M.$.prototype.attr = function(attr, value) {
	    if (value == null) {
	        return this.$el.getAttribute(attr);
	    } else if (value === null) {
	        this.$el.removeAttribute(attr);
	    } else {
	        this.$el.setAttribute(attr, value);
	    }
	};

	M.$.prototype.data = function(key, value) {
	    if (value == null) {
	        var dataAttr = this.$el.getAttribute('data-' + key);
	        return dataAttr ? dataAttr : (this.data ? this.data[key] : undefined);
	    } else {
	        this.data[key] = value;
	    }
	};

	M.$.prototype.value = function(value) {
	    if (value == null) {
	        return this.$el.value;
	    } else {
	        this.$el.value = value;
	    }
	};

	M.$.prototype.html = function(html) {
	    if (html == null) {
	        return this.$el.innerHTML;
	    } else {
	        this.$el.innerHTML = html;
	    }
	};

	M.$.prototype.text = function(text) {
	    if (text == null) {
	        return this.$el.textContent.trim();
	    } else {
	        this.$el.textContent = text;
	    }
	};


	// ---------------------------------------------------------------------------------------------
	// Dimensions

	M.$.prototype.width = function(type) {
	    if (this.$el === window) {
	        return window.innerWidth;
	    } else if (type === 'padding') {
	        return this.$el.clientWidth;
	    } else if (type === 'scroll') {
	        return this.$el.scrollWidth;
	    }  else if (type === 'border') {
	        return this.$el.offsetWidth;
	    } else if (type === 'margin') {
	        return this.$el.offsetWidth + parseFloat(this.css('margin-right')) + parseFloat(this.css('margin-left'));
	    } else {
	        return this.$el.clientWidth - parseFloat(this.css('padding-left')) - parseFloat(this.css('padding-right'));
	    }
	};

	M.$.prototype.height = function(type) {
	    if (this.$el === window) {
	        return window.innerHeight;
	    } else if (type === 'padding') {
	        return this.$el.clientHeight;
	    } else if (type === 'scroll') {
	        return this.$el.scrollHeight;
	    }  else if (type === 'border') {
	        return this.$el.offsetHeight;
	    } else if (type === 'margin') {
	        return this.$el.offsetHeight + parseFloat(this.css('margin-top')) + parseFloat(this.css('margin-bottom'));
	    } else {
	        return this.$el.clientHeight - parseFloat(this.css('padding-bottom')) - parseFloat(this.css('padding-top'));
	    }
	};

	M.$.prototype.offset = function($parent) {

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
	        box = this.$el.getBoundingClientRect();
	        return { top: box.top, left: box.left, bottom: box.bottom, right: box.right };
	    }
	};


	// ---------------------------------------------------------------------------------------------
	// Styles

	M.$.prototype.css = function(props, value) {
	    if (arguments.length === 1) {
	        if (typeof props === 'string') {
	            return window.getComputedStyle(this.$el, null).getPropertyValue(props);
	        } else {
	            for (var prop in props) if (M.has(props, prop)) this.$el.style[prop] = props[prop];
	        }
	    } else if (arguments.length === 2 && typeof props === 'string') {
	        this.$el.style[M.toCamelCase(props)] = value;
	    }
	};

	M.$.prototype.transition = function(property, duration, curve) {
		if (arguments.length === 1) this.$el.style[M.prefix('transition')] = property;
	    if (typeof duration !== 'string') duration = duration + 'ms';
	    this.$el.style[M.prefix('transition')] = property + ' ' + duration + (curve ? ' ' + curve : '');
	};

	M.$.prototype.transform = function(transform) {
	    this.$el.style[M.prefix('transform')] = (transform || '');
	};

	M.$.prototype.translateX = function(x) {
	    x = Math.round(+x || 0);
	    this.$el.style[M.prefix('transform')] = 'translate(' + x + 'px,0)';
	};

	M.$.prototype.translateY = function(y) {
	    y = Math.round(+y || 0);
	    this.$el.style[M.prefix('transform')] = 'translate(0px,'+y+'px)';
	};

	M.$.prototype.hide = function() {
	    this.css('display', 'none');
	    this.css('visibility', 'hidden');
	};

	M.$.prototype.show = function() {
	    this.css('display', 'block');
	    this.css('visibility', 'visible');
	};


	// ---------------------------------------------------------------------------------------------
	// DOM Manipulation

    // Removes an element from the DOM for more performant node manipulation. The element
    // is placed back into the DOM at the place it was taken from.
    M.$.prototype.manipulate = function(fn){
      	var next = this.$el.nextSibling;
        var parent = this.$el.parentNode;
        var frag = document.createDocumentFragment();
        var returned = fn.call(frag.appendChild(element)) || element;
      	if (next) {
			parent.insertBefore(returned, next);
		} else {
			parent.appendChild(returned);
		}
    };

	M.$.prototype.is = function(selector) {
	    var compareWith = document.querySelectorAll(selector);
	    for (var i = 0, l = compareWith.length; i < l; ++i)
	        if (compareWith[i] === this.$el) return true;
	    return false;
	};

	M.$.prototype.index = function() {
	    var i = 0;
	    var child = this.$el;
	    while ((child = child.previousSibling) !== null) i++;
	    return i;
	};

	M.$.prototype.append = function(newChild) {
	    var _this = this;
	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        newChildren.each(function(child) {
	            _this.$el.appendChild(child.$el);
	        });
	    } else {
	        this.$el.appendChild(newChild.$el);
	    }
	};

	M.$.prototype.prepend = function(newChild) {
	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        for (var j = newChildren.length - 1; j >= 0; j--) {
	            this.$el.insertBefore(newChildren[j], this.$el.childNodes[0]);
	        }
	    } else {
	        this.$el.insertBefore(newChild.$el, this.$el.childNodes[0]);
	    }
	};

	M.$.prototype.insertBefore = function(newChild) {
	    var parent = this.parent();
	    var _this = this;

	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        for (var j = newChildren.length - 1; j >= 0; j--) {
	            parent.$el.insertBefore(newChildren[j].$el, _this.$el);
	        }
	    } else {
	        parent.$el.insertBefore(newChild.$el, _this.$el);
	    }
	};

	M.$.prototype.insertAfter = function(newChild) {
	    var _this = this;
	    var parent = _this.$el.parentNode;

	    if (typeof newChild === 'string') {
	        var newChildren = $$N(newChild);
	        newChildren.each(function(child) {
	            //parent.$el.insertAfter(child, _this.$el);
	        });
	    } else {
	        var next = _this.$el.nextSibling;
	        if (next) {
	            parent.insertBefore(newChild.$el, next);
	        } else {
	            parent.appendChild(newChild.$el);
	        }
	    }
	};

	M.$.prototype.wrap = function(wrapper) {
	    if (typeof wrapper === 'string') wrapper = $(document.createElement(wrapper));
	    this.insertBefore(wrapper);
	    this.remove();
	    wrapper.append(this);
	};

	M.$.prototype.moveTo = function(newParent, before) {
	    this.remove();
	    if (before) {
	        newParent.prepend(this);
	    } else {
	        newParent.append(this);
	    }
	};

	M.$.prototype.next = function () {
	    var next = this.$el.nextSibling;
	    return next ? $(next) : false;
	};

	M.$.prototype.prev = function () {
	    var prev = this.$el.previousSibling;
	    return prev ? $(prev) : false;
	};

	M.$.prototype.find = function(selector) {
	    return $$(selector, this);
	};

	M.$.prototype.parent = function() {
	    var parent = this.$el.parentNode;
	    return parent ? $(parent) : false;
	};

	M.$.prototype.parents = function(selector) {
	    var parents = [];
	    var parent = this.parent();
	    while (parent) {
	        if (!selector || parent.is(selector)) parents.push(parent);
	        parent = parent.parent();
	    }
	    return parents;
	};

	M.$.prototype.children = function(selector) {
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
	};

	M.$.prototype.remove = function () {
	    if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
	};

	M.$.prototype.delete = function () {
	    this.remove();
	    this.$el = null;
	};

	M.$.prototype.clear = function () {
	    var _this = this;
	    this.children().each(function($el) {
	        _this.$el.removeChild($el.$el);
	    });
	};

	M.$.prototype.replace = function(newEl) {
	    this.insertAfter(newEl);
	    this.remove();
	};


	// ---------------------------------------------------------------------------------------------
	// Special Elements

	M.$body = $(document.body);
	M.$html = $T('html');
	M.$window = $(window);
	M.$doc = $(window.document.documentElement);

	M.$html.addClass( M.browser.isTouch ? 'is-touch' : 'not-touch' );
	M.$html.addClass( M.browser.isMobile ? 'is-mobile' : 'not-mobile' );

})();
