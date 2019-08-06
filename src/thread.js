// =============================================================================
// Boost.js | Thread Class Functions
// (c) Mathigon
// =============================================================================



import { defer, isString } from '@mathigon/core';


/**
 * Executes a function in a separate thread, for improved performance. Note that
 * `fn` has to be a single function with no external references or bindings, so
 * that it can be stringified using .toString(). Similarly, `args` has to be a
 * single number or string, or an array or numbers and strings
 * @param {Function} fn
 * @param {number|string|Array.<number|string>} args
 * @param {number=} timeout
 * @returns {Promise}
 */
export function thread(fn, args, timeout = 1000) {
  if (!window.Worker || !window.Blob) {
    return Promise.resolve(fn.apply(null, args));
  }

  const deferred = defer();
  const start = Date.now();

  const content = 'onmessage = function(e){return postMessage(eval(e.data[0]));}';
  const blob = new Blob([content], {type: 'application/javascript'});
  const w = new Worker(URL.createObjectURL(blob));

  const t = setTimeout(function() {
    w.terminate();
    deferred.reject('Timeout!');
  }, timeout);

  w.onmessage = function(e) {
    clearTimeout(t);
    w.terminate();
    deferred.resolve({ data: e.data, time: Date.now() - start });
  };

  w.onerror = function(e) {
    clearTimeout(t);
    console.error('WebWorker error', e);
    w.terminate();
    deferred.reject(e);
  };

  if (!Array.isArray(args)) args = [args];
  args = args.map(x => isString(x) ? '"' + x + '"' : x);
  w.postMessage(['(' + fn.toString() + ')(' + args.join(',') + ')']);

  return deferred.promise;
}
