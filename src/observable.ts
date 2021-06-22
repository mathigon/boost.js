// =============================================================================
// Boost.js | Observable
// (c) Mathigon
// =============================================================================


import {Obj} from '@mathigon/core';


type Callback<T> = (state: T, initial?: boolean) => void;
type Expr<T> = (state: T) => void;

interface ObservableOptions<T> {
  watch: (fn: Callback<T>) => void;
  unwatch: (fn: Callback<T>) => void;
  watchAll: (fn: Callback<T>, dontRunImmediately?: boolean) => void;
  setComputed: (key: string, expr: (state: T) => any) => void;
  forceUpdate: () => void;
  assign: (obj: any) => void;
  getKey: () => string;
  clear: () => void;
}

export type Observable<T = any> = T&ObservableOptions<T>;


// Batching: Makes both `assign` and normal mutations much smarter

let batchDepth = 0;
let batchedCallbacks = new Set<Callback<any>>();
let batchingStateMap = new Map<Callback<any>, Observable>();

function enqueueCallback(callback: Callback<any>, state: Observable){
  batchedCallbacks.add(callback);
  batchingStateMap.set(callback, state);
}

export function batch(callback: () => void){
  batchDepth++;
  callback();
  batchDepth--;
  if(batchDepth == 0){
    for(const callback of batchedCallbacks) callback(batchingStateMap.get(callback));
    batchedCallbacks.clear();
    batchingStateMap.clear();
  }
}


export function observe<T = any>(state: T, parentModel?: Observable) {
  const callbackMap = new Map<string, Set<Callback<T>>>();
  const computedKeys = new Map<string, Callback<T>>();
  const watchAllCallbacks = new Set<Callback<T>>();
  let pendingCallback: Callback<T>|undefined = undefined;
  let lastKey = 0;

  function watch(callback: Callback<T>) {
    pendingCallback = callback;
    const result = callback(proxy, true);
    pendingCallback = undefined;
    return result;
  }

  function unwatch(callback: Callback<T>) {
    for (const callbacks of callbackMap.values()) {
      if (callbacks.has(callback)) callbacks.delete(callback);
    }
    watchAllCallbacks.delete(callback);
  }

  function watchAll(callback: Callback<T>, dontRun?: boolean) {
    watchAllCallbacks.add(callback);
    return dontRun ? undefined : callback(proxy, true);
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
    if(batchDepth > 0){
      for (const callback of callbackMap.get(key) || []) enqueueCallback(callback, state);
      for (const callback of watchAllCallbacks) enqueueCallback(callback, state);
    } else {
      for (const callback of callbackMap.get(key) || []) callback(state);
      for (const callback of watchAllCallbacks) callback(state);
    }
  }

  function forceUpdate() {
    for (const callbacks of callbackMap.values()) {
      for (const callback of callbacks) callback(state);
    }
    for (const callback of watchAllCallbacks) callback(state);
  }

  function assign(changes: Partial<T>) {
    batch(() => {
      for(const key in changes) proxy[key] = changes[key];
    });
  }

  function getKey() {
    lastKey += 1;
    while ('_x' + lastKey in state) lastKey += 1;
    return '_x' + lastKey;
  }

  function clear() {
    state = {} as T;
    callbackMap.clear();
    computedKeys.clear();
    lastKey = 0;
  }

  /**
   * Allow this model to "inherit" properties from a parent model, and update
   * it when the parent model changes.
   */
  function inherit(key: string) {
    if (!parentModel) return;
    parentModel.watch(() => proxy[key] = parentModel[key]);
  }

  const proxy = new Proxy(state as any, {
    get(_: T, key: string) {
      if (key === 'watch') return watch;
      if (key === 'unwatch') return unwatch;
      if (key === 'watchAll') return watchAll;
      if (key === 'setComputed') return setComputed;
      if (key === 'forceUpdate') return forceUpdate;
      if (key === 'assign') return assign;
      if (key === 'getKey') return getKey;
      if (key === 'clear') return clear;
      if (key === '_internal') return [state, callbackMap];

      // A callback is currently being run. We track its dependencies.
      if (pendingCallback) {
        if (!callbackMap.has(key)) callbackMap.set(key, new Set());
        callbackMap.get(key)!.add(pendingCallback);
      }

      if (!(key in state)) inherit(key);
      return (state as any)[key];
    },

    set(_: T, key: string, value: any) {
      if ((state as any)[key] === value) return true;
      (state as any)[key] = value;

      // Clear a value that was previously computed.
      // TODO Clear properties that were inherited from parent modal.
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
    },
  });

  return proxy as Observable<T>;
}
