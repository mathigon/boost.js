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

type Args = (number|string)[];
type Callback = (...args: Args) => number|string;
type Response = {data: number|string, time: number};


/**
 * Executes a function in a separate thread, for improved performance. Note that
 * `fn` has to be a single function with no external references or bindings, so
 * that it can be stringified using .toString(). Similarly, `args` has to be a
 * single number or string, or an array or numbers and strings
 */
export function thread(fn: Callback, args: number|string|Args, timeout = 1000) {
  if (!Array.isArray(args)) args = [args];

  if (!window.Worker || !window.Blob) {
    return Promise.resolve(fn(...args));
  }

  const deferred = defer<Response>();
  const start = Date.now();

  const content = 'onmessage = function(e){return postMessage(eval(e.data[0]));}';
  const blob = new Blob([content], {type: 'application/javascript'});
  const w = new Worker(URL.createObjectURL(blob));

  const t = setTimeout(function () {
    w.terminate();
    deferred.reject('Timeout!');
  }, timeout);

  w.onmessage = function (e) {
    clearTimeout(t);
    w.terminate();
    deferred.resolve({data: e.data, time: Date.now() - start});
  };

  w.onerror = function (e) {
    clearTimeout(t);
    console.error('WebWorker error', e);
    w.terminate();
    deferred.reject(e);
  };

  // TODO Find a solution that works without function stringification.
  args = args.map(x => (typeof x === 'string') ? '"' + x + '"' : x);
  w.postMessage(['(' + fn.toString() + ')(' + args.join(',') + ')']);

  return deferred.promise;
}
