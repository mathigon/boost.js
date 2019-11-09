// =============================================================================
// Boost.js | Thread Class Functions
// (c) Mathigon
// =============================================================================


import {defer} from '@mathigon/core';


declare global {
  interface Window {
    Worker?: Worker;
  }
}


/**
 * Executes a function in a separate thread, for improved performance. Note that
 * `fn` has to be a single function with no external references or bindings, so
 * that it can be stringified using .toString(). Similarly, `args` has to be a
 * single number or string, or an array or numbers and strings
 */
export function thread<T>(fn: (...args: number[]) => T,
                          args: number|number[],
                          timeout = 5000): Promise<{data: T, time: number}> {

  if (!Array.isArray(args)) args = [args];

  if (!window.Worker || !window.Blob) {
    return Promise.resolve({data: fn(...args), time: 0});
  }

  const deferred = defer<{data: T, time: number}>();
  const start = Date.now();

  const content = 'onmessage = function(e){return postMessage(eval(e.data[0]));}';
  const blob = new Blob([content], {type: 'application/javascript'});
  const w = new Worker(URL.createObjectURL(blob));

  const t = setTimeout(function () {
    w.terminate();
    deferred.reject('Timeout!');
  }, timeout);

  w.onmessage = (e: MessageEvent) => {
    clearTimeout(t);
    w.terminate();
    deferred.resolve({data: e.data, time: Date.now() - start});
  };

  w.onerror = (e: ErrorEvent) => {
    clearTimeout(t);
    console.error('WebWorker error', e);
    w.terminate();
    deferred.reject(e);
  };

  // TODO Find a solution that works without function stringification.
  w.postMessage(['(' + fn.toString() + ')(' + args.join(',') + ')']);

  return deferred.promise;
}
