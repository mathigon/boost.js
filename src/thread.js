// =============================================================================
// Boost.js | Thread Class Functions
// (c) Mathigon
// =============================================================================



import { defer, isString } from '@mathigon/core';


// fn has to be a single function with no external references or bindings
// args has to be a single number or string, or an array or numbers and strings
export default function thread(fn, args, timeout = 1000) {
  let deferred = defer();
  let start = Date.now();

  if (!window.Worker || !window.Blob) {
    deferred.resolve(fn.apply(null, args));
    return deferred.promise;
  }

  let content = 'onmessage = function(e){return postMessage(eval(e.data[0]));}';
  let blob = new Blob([content], {type: 'application/javascript'});
  let w = new Worker(URL.createObjectURL(blob));

  let t = setTimeout(function() {
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
    w.terminate();
    deferred.reject(e);
  };

  if (!Array.isArray(args)) args = [args];
  args = args.map(x => isString(x) ? '"' + x + '"' : x);
  w.postMessage(['(' + fn.toString() + ')(' + args.join(',') + ')']);

  return deferred.promise;
}
