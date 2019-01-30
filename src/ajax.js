// =============================================================================
// Boost.js | AJAX Functions
// (c) Mathigon
// =============================================================================



import { defer, deepExtend, throttle, isString, unique } from '@mathigon/core';
import { $ } from './elements';


// -----------------------------------------------------------------------------
// Helper functions

export function toQueryString(data) {
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

export function fromQueryString(str) {
  str = str.replace(/^[?,&]/,'');
  let pairs = decodeURIComponent(str).split('&');
  let result = {};
  pairs.forEach(function(pair) {
    let x = pair.split('=');
    result[x[0]] = x[1];
  });
  return result;
}

export function formatResponse(response, type = 'json') {
  switch(type) {
    case 'html': {
      let doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = response;
      return $(doc);
    }
    case 'json':
      return JSON.parse(response);
  }
  return response;
}


// -----------------------------------------------------------------------------
// Fetchers

export function fetch(type, url, data=null, options={ async: true, cache: true }) {
  // TODO Use window.fetch() instead.

  let xhr = new XMLHttpRequest();
  let deferred = defer();
  let params = '';

  xhr.onreadystatechange = function() {
    if (xhr.readyState <= 3) return;
    let status = xhr.status;
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

export function get(url, data = null) {
  return fetch('GET', url, data);
}

export function post(url, data = null) {
  return fetch('POST', url, data);
}

export function script(src) {
  return new Promise(function(resolve, reject) {
    let el = document.createElement('script');
    el.src = src;
    el.onerror = reject;
    el.onload = resolve;

    document.head.appendChild(el);  // TODO Needs document!
  });
}


// -----------------------------------------------------------------------------
// Deferred Post

let POST_DATA = new Map();

function sendPostData() {
  if (navigator.onLine === false) return;
  for (let [url, data] of POST_DATA) {
    fetch('POST', url, {data: JSON.stringify(data)})
        .then(() => POST_DATA.delete(url));
  }
}

const doDeferredPost = throttle(sendPostData, 3000);
window.addEventListener('online', doDeferredPost);
window.onbeforeunload = sendPostData;

export function deferredPost(url, data) {
  if (POST_DATA.has(url)) {
    deepExtend(POST_DATA.get(url), data, (a, b) => unique(a.concat(b)));
  } else {
    POST_DATA.set(url, data)
  }
  doDeferredPost();
}
