// =============================================================================
// Boost.js | Observable
// (c) Mathigon
// =============================================================================


import {Obj} from '@mathigon/core';


type Callback<T> = (state: T) => void;
type Expr<T> = (state: T) => void;

interface ObservableOptions<T> {
  watch: (fn: Callback<T>) => void;
  watchAll: (fn: Callback<T>) => void;
  unwatch: (fn: Callback<T>) => void;
  setComputed: (key: string, expr: (state: T) => any) => void;
  forceUpdate: () => void;
  assign: (obj: any) => void;
  getKey: () => string;
}

export type Observable<T = any> = T&ObservableOptions<T>;


export function observe<T = any>(state: T) {
  const callbackMap = new Map<string, Set<Callback<T>>>();
  const computedKeys = new Map<string, Callback<T>>();
  const watchAllCallbacks = new Set<Callback<T>>();
  let pendingCallback: Callback<T>|undefined = undefined;
  let lastKey = 0;

  function watch(callback: Callback<T>) {
    pendingCallback = callback;
    const result = callback(proxy);
    pendingCallback = undefined;
    return result;
  }

  function watchAll(callback: Callback<T>) {
    watchAllCallbacks.add(callback);
    callback(state);
  }

  function unwatch(callback: Callback<T>) {
    for (const callbacks of callbackMap.values()) {
      if (callbacks.has(callback)) callbacks.delete(callback);
    }
    watchAllCallbacks.delete(callback);
  }

  function setComputed(key: string, expr: Expr<T>) {
    if (computedKeys.has(key)) unwatch(computedKeys.get(key)!);

    const callback = () => {
      (state as any)[key] = expr(proxy);
      if (pendingCallback === callback) pendingCallback = undefined;  // why?
      triggerCallbacks(key);
    };

    computedKeys.set(key, callback);
    watch(callback);
  }

  function triggerCallbacks(key: string) {
    const callbacks = callbackMap.get(key);
    if (callbacks) {
      for (const callback of callbacks) callback(state);
    }
    for (const callback of watchAllCallbacks) callback(state);
  }

  function forceUpdate() {
    for (const callbacks of callbackMap.values()) {
      for (const callback of callbacks) callback(state);
    }
    for (const callback of watchAllCallbacks) callback(state);
  }

  function assign(changes: Obj<string>) {
    Object.assign(state, changes);
  }

  function getKey() {
    lastKey += 1;
    return '_x' + lastKey;

  }

  const proxy = new Proxy(state as any, {
    get(_: T, key: string) {
      if (key === 'watch') return watch;
      if (key === 'watchAll') return watchAll;
      if (key === 'unwatch') return unwatch;
      if (key === 'setComputed') return setComputed;
      if (key === 'forceUpdate') return forceUpdate;
      if (key === 'assign') return assign;
      if (key === 'getKey') return getKey;
      if (key === '_internal') return [state, callbackMap];

      // A callback is currently being run. We track its dependencies.
      if (pendingCallback) {
        if (!callbackMap.has(key)) callbackMap.set(key, new Set());
        callbackMap.get(key)!.add(pendingCallback);
      }

      return (state as any)[key];
    },

    set(_: T, key: string, value: any) {
      if ((state as any)[key] === value) return true;
      (state as any)[key] = value;

      // Clear a value that was previously computed.
      if (computedKeys.has(key)) {
        unwatch(computedKeys.get(key)!);
        computedKeys.delete(key);
      }

      triggerCallbacks(key);
      return true;
    },

    deleteProperty(_: T, p: string) {
      delete (state as any)[p];
      callbackMap.delete(p);
      computedKeys.delete(p);
      return true;
    }
  });

  return proxy as Observable<T>;
}


// -----------------------------------------------------------------------------
// Batch Functions

let timeout: number|undefined = undefined;
const queue = new Set<() => void>();

function process() {
  for (const callback of queue) callback();
  queue.clear();
  timeout = undefined;
}

function enqueue(callback: () => void) {
  if (!timeout) timeout = window.setTimeout(process, 0);
  queue.add(callback);
}
