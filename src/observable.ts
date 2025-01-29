// =============================================================================
// Boost.js | Observable
// (c) Mathigon
// =============================================================================


type Callback<T> = (state: T, initial?: boolean) => void;
type Expr<T> = (state: T) => void;

interface ObservableOptions<T> {
  watch: (fn: Callback<T>) => void;
  watchKeys: (keys: string, fn: Callback<T>) => void;
  unwatch: (fn: Callback<T>) => void;
  watchAll: (fn: Callback<T>, dontRunImmediately?: boolean) => void;
  setComputed: (key: string, expr: (state: T) => unknown) => void;
  forceUpdate: () => void;
  assign: (obj: Partial<T>, clear?: boolean) => void;
  getChanges: () => [Partial<T>, Partial<T>];
  getKey: () => string;
  clear: () => void;
  copy: () => T;
}

export type Observable<T = any> = T&ObservableOptions<T>;


let batchDepth = 0;
const batchedCallbacks = new Map<Callback<any>, Observable>();

function enqueueCallback(callback: Callback<any>, state: Observable) {
  batchedCallbacks.set(callback, state);
}

/** Batch multiple observable changes together into a single callback. */
export function batch(callback: () => void) {
  batchDepth++;
  callback();
  batchDepth--;
  if (batchDepth === 0) {
    for (const [callback, state] of batchedCallbacks.entries()) {
      batchedCallbacks.delete(callback);
      callback(state);
    }
  }
}


/** Convert object to an observable Proxy with .watch() callbacks. */
export function observe<T extends object = any>(state: T, parentModel?: Observable) {
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

  function watchKeys(keys: string, fn: Callback<T>) {
    for (const key of keys.split(' ')) {
      if (!callbackMap.has(key)) callbackMap.set(key, new Set());
      callbackMap.get(key)!.add(fn);
    }
    return fn(proxy, true);
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
    if (batchDepth > 0) {
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

  function assign(changes: Partial<T>, clear?: boolean) {
    if (clear) state = {} as T;
    batch(() => {
      for (const [key, value] of Object.entries(changes)) {
        if (!(key in previous)) (previous as any)[key] = (state as any)[key];
        proxy[key] = value;
      }
    });
  }

  function getKey() {
    lastKey += 1;
    while (`_x${lastKey}` in state) lastKey += 1;
    return `_x${lastKey}`;
  }

  function clear() {
    state = {} as T;
    callbackMap.clear();
    computedKeys.clear();
    lastKey = 0;
  }

  function copy() {
    return Object.assign({}, state);
  }

  let previous: Partial<T> = {};
  function getChanges() {
    const changes: [Partial<T>, Partial<T>] = [{}, {}];
    for (const k of Object.keys(previous)) {
      if ((previous as any)[k] === (state as any)[k]) continue;
      (changes[0] as any)[k] = (previous as any)[k];
      (changes[1] as any)[k] = (state as any)[k];
    }
    previous = {};
    return changes;
  }

  /**
   * Allow this model to "inherit" properties from a parent model, and update
   * it when the parent model changes.
   */
  function inherit(key: string) {
    if (!parentModel) return;
    parentModel.watch(() => (proxy[key] = parentModel[key]));
  }

  const proxy = new Proxy(state as any, {
    get(_: T, key: string) {
      if (key === 'watch') return watch;
      if (key === 'watchKeys') return watchKeys;
      if (key === 'unwatch') return unwatch;
      if (key === 'watchAll') return watchAll;
      if (key === 'setComputed') return setComputed;
      if (key === 'forceUpdate') return forceUpdate;
      if (key === 'getChanges') return getChanges;
      if (key === 'assign') return assign;
      if (key === 'getKey') return getKey;
      if (key === 'clear') return clear;
      if (key === 'copy') return copy;
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
      if (!(key in previous)) (previous as any)[key] = (state as any)[key];
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
    }
  });

  return proxy as Observable<T>;
}
