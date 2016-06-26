// =============================================================================
// Boost.js | AJAX Functions
// (c) 2015 Mathigon
// =============================================================================



import { defer, deepExtend, throttle } from 'utilities';
import { isString } from 'types';
import Evented from 'evented';
import { $ } from 'elements';



let postData = {};

function sendLogs() {
    if (navigator.onLine === false) return;
    for (let url of Object.keys(postData)) Ajax.beacon(url, { data: JSON.stringify(postData[url]) });
    postData = {};
}

const doDeferredPost = throttle(sendLogs, 5000);
window.addEventListener('online', doDeferredPost);
window.onbeforeunload = function() { sendLogs(); };


function toQueryString(data) {
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

function fromQueryString(str) {
    str = str.replace(/^[?,&]/,'');
    let pairs = decodeURIComponent(str).split('&');
    let result = {};
    pairs.forEach(function(pair) {
        let x = pair.split('=');
        result[x[0]] = x[1];
    });
    return result;
}

function _fetch(type, url, data = null, options = { async: true, cache: true }) {
    // TODO use window.fetch() instead

    let xhr = new XMLHttpRequest();
    let deferred = defer();
    let params = '';

    xhr.onreadystatechange = function() {
        if (xhr.readyState <= 3) return;
        var status = xhr.status;
        if ((status >= 200 && status < 300) || status === 304) {
            deferred.resolve(xhr.responseText);
        } else {
            deferred.reject(xhr);
        }
    };

    if (type === 'GET') {
        url += (url.indexOf('?') >= 0 ? '&xhr=1' : '?xhr=1');
        if (!options.cache) url += '_cachebust=' + Date.now();
        if (data) url += toQueryString(data) + '&';
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
    return deferred.promise;
}


const Ajax = {

    toQueryString,
    fromQueryString,

    formatResponse: function(response, type = 'json') {
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
    },

    get: function(url, data = null) {
        return _fetch('GET', url, data);
    },

    post: function(url, data = null) {
        return _fetch('POST', url, data);
    },

    beacon: function(url, data = null) {
        // TODO if (navigator.sendBeacon) {
        //     navigator.sendBeacon(url, JSON.stringify(data));
        // } else {
            _fetch('POST', url, data);
        // }
    },

    script: function(src) {
        let deferred = defer();

        let el = document.createElement('script');
        el.type = 'text/javascript';  // TODO needed?
        el.src = src;

        el.onerror = function(error) { deferred.reject(error); };
        el.onload = function(success) { deferred.resolve(success); };

        document.head.appendChild(el);  // FIXME Needs Document
        return deferred.promise;
    },

    deferredPost: function(url, data) {
        deepExtend(postData, { [url]: data });
        doDeferredPost();
    }

};

export default Ajax;
