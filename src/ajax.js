// =============================================================================
// Boost.js | AJAX Functions
// (c) 2015 Mathigon
// =============================================================================



import { defer, deepExtend, throttle } from 'utilities';
import { isString } from 'types';
import Evented from 'evented';
import { $ } from 'elements';



const STORAGE_KEY = 'ajax_post_daya';
const postData = JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
window.localStorage.setItem(STORAGE_KEY, {});

const doDeferredPost = throttle(function() {
    if (!navigator.onLine) return;
    Object.keys(postData).forEach(function(url) {
        if (postData[url])
            Ajax.post(url, { data: JSON.stringify(postData[url]) })
                .then(function() { postData[url] = null; });
    });
}, 5000);

window.addEventListener('online', doDeferredPost);

window.onbeforeunload = function() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(postData));
};



export default class Ajax extends Evented {

    // -------------------------------------------------------------------------
    // Static Methods

    static toQueryString(data) {
        let pairs = [];

        for (let key in data) {
            let value = data[key];
            key = encodeURIComponent(key);
            if (value == null) { pairs.push(key); return; }
            value = Array.isArray(value) ? value.join(',') : '' + value;
            value = value.replace(/(\r)?\n/g, '\r\n');
            value = encodeURIComponent(value);
            value = value.replace(/%20/g, '+');
            pairs.push(key + '=' + value);
        }

        return pairs.join('&');
    }

    static fromQueryString(str) {
        str = str.replace(/^[?,&]/,'');
        let pairs = decodeURIComponent(str).split('&');
        let result = {};
        pairs.forEach(function(pair) {
            let x = pair.split('=');
            result[x[0]] = x[1];
        });
        return result;
    }

    static formatResponse(response, type = 'json') {
        switch(type) {

            case 'html':
            var doc = document.implementation.createHTMLDocument('');
            doc.documentElement.innerHTML = response;
            return $(doc);

            case 'json':
            return JSON.parse(response);

            default:
            return response;
        }
    }


    // -------------------------------------------------------------------------
    // Constructor Functions

    constructor(type, url, data = null, options = { async: true, cache: true }) {
        super();

        // TODO use window.fetch() instead

        if (!(this instanceof Ajax)) return new Ajax(arguments);

        let _this = this;
        let xhr = new XMLHttpRequest();
        let params = '';

        xhr.onreadystatechange = function() {
            if (xhr.readyState <= 3) return;
            var status = xhr.status;
            var success = (status >= 200 && status < 300) || status === 304;
            _this.trigger(success ? 'success' : 'error', success ? xhr.responseText : xhr);
        };

        if (type === 'GET') {
            url += (url.indexOf('?') >= 0 ? '&xhr=1' : '?xhr=1');
            if (!options.cache) url += '_cachebust=' + Date.now();
            if (data) url += Ajax.toQueryString(data) + '&';
            xhr.open(type, url, options.async, options.user, options.password);

        } else if (type === 'POST') {
            xhr.open(type, url, options.async, options.user, options.password);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('X-CSRF-Token', window.csrfToken || '');
            params = isString(data) ? '?' + data : Object.keys(data).map(
                k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
            ).join('&');
        }

        xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
        xhr.send(params);
    }

    static get(url, data = null) {
        return new Ajax('GET', url, data);
    }

    static post(url, data = null) {
        return new Ajax('POST', url, data);
    }

    static script(src) {
        let deferred = defer();

        let el = document.createElement('script');
        el.type = 'text/javascript';  // TODO needed?
        el.src = src;

        el.onerror = function(error) { deferred.reject(error); };
        el.onload = function(success) { deferred.resolve(success); };

        document.head.appendChild(el);  // FIXME Needs Document
        return deferred.promise;
    }


    // -------------------------------------------------------------------------
    // Deferred Post

    static deferredPost(url, data) {
        deepExtend(postData, { [url]: data });
        doDeferredPost();
    }


    // -------------------------------------------------------------------------
    // Callbacks

    then(success, error = null) {
        if (success) this.on('success', success);
        if (error) this.on('error', error);
        return this;
    }

    ['catch'](error) {
        this.on('error', error);
        return this;
    }

}
