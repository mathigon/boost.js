// =================================================================================================
// Boost.js | AJAX Functions
// (c) 2015 Mathigon / Philipp Legner
// =================================================================================================



import $ from 'element';
import Evented from 'evented';


export default class Ajax extends Evented {

    // ---------------------------------------------------------------------------------------------
    // Static Methods

    static toQueryString(data) {
        let pairs = [];

        for (let key of data) {
            let value = data[key];
            key = encodeURIComponent(key);
            if (value == null) { pairs.push(key); return; }
            value = Array.isArray(value) ? value.join(',') : '' + value;
            value = value.replace(/(\r)?\n/g, '\r\n');
            value = encodeURIComponent(value);
            value = value.replace(/%20/g, '+');
            pairs.push(key + '=' + value);
        };

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

    static formatResponse(response, type) {
        switch(type) {

            case 'html':
            var doc = document.implementation.createHTMLDocument('');
            doc.documentElement.innerHTML = response;
            return $(doc);
 
            case: 'json':
            return JSON.parse(response);

            default:
            return response;
        }
    }


    // ---------------------------------------------------------------------------------------------
    // Constructor Functions

    constructor(type = 'GET', url, data = '', options = { async: true, cache: true }) {
        
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
            url += (url.indexOf('?') >= 0 ? '&' : '?');
            if (data) url += Ajax.toQueryString(data) + '&';
            if (!options.cache) url += '_cachebust=' + Date.now();
        } else {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            params = typeof data == 'string' ? '?' + data : Object.keys(data).map(
                function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]) }
            ).join('&');
            if (!options.cache) url += '&_cachebust=' + Date.now();
        }

        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.open(type, url, options.async, options.user, options.password);
        xhr.send(params);
    }

    static get(url, data) {
        return new Ajax('GET', url, data);
    }
     
    static post(url, data) {
        return new Ajax('POST', url, data);
    }

    static script(src) {
        var script = document.createElement('script');
        script.type = 'text/javascript';  // TODO needed?
        script.src = src;

        if (error) script.onerror = error;  // FIXME
        if (success) script.onload = success;  // FIXME

        document.head.appendChild(script);  // FIXME Needs Document
    }
}

