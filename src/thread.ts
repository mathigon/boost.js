// =============================================================================
// Boost.js | Thread Class Functions
// (c) Mathigon
// =============================================================================


import {defer} from '@mathigon/core';


/**
 * Converts a function into a WebWorker URL object that can be passed into
 * thread(). Note that `fn` has to be a single function with no external
 * references or bindings, so that it can be stringified using .toString().
 */
export function functionToWorker(fn: () => any) {
  const content = `onmessage = e => postMessage((${fn.toString()})(e.data))`;
  const blob = new Blob([content], {type: 'application/javascript'});
  return URL.createObjectURL(blob);
}


/**
 * Creates a new web worker, posts it a serializable data object, and returns
 * when the worker responds (or after a fixed timeout).
 */
export function thread<T = any>(url: string|URL, data: any, timeout = 5000) {
  const deferred = defer<T>();
  const worker = new Worker(url);

  const t = setTimeout(() => {
    worker.terminate();
    console.error('WebWorker timeout!');
    deferred.reject();
  }, timeout);

  worker.onmessage = (e: MessageEvent) => {
    clearTimeout(t);
    worker.terminate();
    console.log(e);
    deferred.resolve(e.data);
  };

  worker.onerror = (e: ErrorEvent) => {
    clearTimeout(t);
    console.error('WebWorker error!', e);
    worker.terminate();
    deferred.reject(e);
  };

  worker.postMessage(data);
  return deferred.promise;
}
