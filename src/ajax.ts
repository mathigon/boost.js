// =============================================================================
// Boost.js | AJAX Functions
// (c) Mathigon
// =============================================================================


import {Obj, deepExtend, throttle, unique} from '@mathigon/core';


// -----------------------------------------------------------------------------
// Helper functions

declare global {
  interface Window {
    csrfToken: string;
  }
}

type PostData = Obj<any>;

/** Converts a JSON object to an HTML query string. */
export function toQueryString(data: PostData) {
  const pairs: string[] = [];

  for (let key of Object.keys(data)) {
    let value = data[key];
    key = encodeURIComponent(key);
    if (value == undefined) {
      pairs.push(key);
      continue;
    }
    value = Array.isArray(value) ? value.join(',') : '' + value;
    value = value.replace(/(\r)?\n/g, '\r\n');
    value = encodeURIComponent(value);
    value = value.replace(/%20/g, '+');
    pairs.push(key + '=' + value);
  }

  return pairs.join('&');
}


/** Converts an HTML query string to JSON object. */
export function fromQueryString(str: string) {
  str = str.replace(/^[?,&]/, '');
  const pairs = decodeURIComponent(str).split('&');
  const result: Obj<string> = {};
  pairs.forEach((pair) => {
    const x = pair.split('=');
    result[x[0]] = x[1];
  });
  return result;
}


// -----------------------------------------------------------------------------
// Request Utilities

/**
 * Asynchronously loads a resource using a POST request. This utility function
 * automatically form-encodes JSON data and adds a CSRF header.
 */
export function post(url: string, data?: string|PostData) {
  const options = {
    method: 'POST',
    body: !data ? undefined :
          (typeof data === 'string') ? data : toQueryString(data),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-Token': window.csrfToken || '',
    },
  };

  const ext = url.includes('?') ? '&xhr=1' : '?xhr=1';
  return fetch(url + ext, options).then((r) => r.text());
}

/** Asynchronously loads and executes a JS script. */
export function loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onerror = reject;
    el.onload = resolve;
    document.head.appendChild(el);  // TODO Needs document!
  });
}

/** Asynchronously loads an Image. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}


// -----------------------------------------------------------------------------
// Deferred Post

const POST_DATA = new Map<string, PostData>();

function savePostData(url: string, data: PostData) {
  if (POST_DATA.has(url)) {
    deepExtend(POST_DATA.get(url), data, (a, b) => unique(a.concat(b)));
  } else {
    POST_DATA.set(url, data);
  }
}

function sendPostData() {
  if (!window.navigator.onLine) return;

  for (const [url, data] of POST_DATA) {
    // Remove the POST data immediately, but add it back if the request fails.
    // This means that deferredPost() can be called while an AJAX request is
    // in progress, and the data is not lost.
    POST_DATA.delete(url);
    post(url, {data: JSON.stringify(data)})
        .catch((error) => {
          console.error('Failed to send POST request:', error);
          savePostData(url, data);
        });
  }
}

const doDeferredPost = throttle(sendPostData, 5000);
window.addEventListener('online', doDeferredPost);
window.onbeforeunload = sendPostData;

/**
 * Utility function to throttle repeated POST requests. A request to the same
 * URL will be made at most every 5s, and the corresponding data objects will
 * be deep-merged.
 */
export function deferredPost(url: string, data: PostData) {
  savePostData(url, data);
  doDeferredPost();
}
