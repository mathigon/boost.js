// =============================================================================
// Boost.js | Observable
// (c) Mathigon
// =============================================================================


type SimpleCallback<T> = (state: T, initial?: boolean) => void;
type DeltaCallback<T, DeltaT = Partial<T>> =
  (newState: DeltaT, prevState: DeltaT) => void;
type Callback<T> =
  | SimpleCallback<T>
  | DeltaCallback<T>;
type Expr<T> = (state: T) => void;

interface ObservableOptions<T> {
  watch: (fn: SimpleCallback<T>) => void;
  // TODO: try cloning fn for first run as solution for deltas
  unwatch: (fn: Callback<T>) => void;
  watchAll: (fn: SimpleCallback<T>, dontRunImmediately?: boolean) => void;
  watchAllDelta: (fn: DeltaCallback<T>, dontRunImmediately?: boolean) => void;
  setComputed: (key: string, expr: (state: T) => any) => void;
  forceUpdate: () => void;
  assign: (obj: Partial<T>, clear?: boolean) => void;
  getKey: () => string;
  clear: () => void;
  copy: () => T;
}

export type Observable<T = any> = T&ObservableOptions<T>;

type BatchedCallbackState =
 | ['simple', Observable]
 | ['delta', Partial<Observable>, Partial<Observable>];

let batchDepth = 0;
const batchedCallbacks = new Map<Callback<any>, BatchedCallbackState>();

function enqueueCallback(
  callback: Callback<any>,
  currentState: Partial<Observable>,
  prevState?: Partial<Observable>
) {
  batchedCallbacks.set(callback, prevState ? ['delta', currentState, prevState] : ['simple', currentState]);
}

/** Batch multiple observable changes together into a single callback. */
export function batch(callback: () => void) {
  batchDepth++;
  callback();
  batchDepth--;
  if (batchDepth === 0) {
    for (const [callback, [tag, currentState, prevState]] of batchedCallbacks.entries()) {
      if (tag === 'simple') {
        (callback as SimpleCallback<any>)(currentState);
      } else {
        (callback as DeltaCallback<any>)(currentState, prevState!);
      }
    }
    batchedCallbacks.clear();
  }
}


/** Convert object to an observable Proxy with .watch() callbacks. */
export function observe<T extends object = any>(state: T, parentModel?: Observable) {
  const callbackMap = new Map<string, Set<SimpleCallback<T>>>();
  const computedKeys = new Map<string, SimpleCallback<T>>();
  const watchAllCallbacks = new Set<SimpleCallback<T>>();
  const deltaCallbacks = new Set<DeltaCallback<T>>;
  let pendingCallback: SimpleCallback<T>|undefined = undefined;
  let lastKey = 0;

  function watch(callback: SimpleCallback<T>) {
    pendingCallback = callback;
    const result = callback(proxy, true);
    pendingCallback = undefined;
    return result;
  }

  function unwatch(callback: SimpleCallback<T> | DeltaCallback<T>) {
    for (const callbacks of callbackMap.values()) {
      if (callbacks.has(callback as any)) callbacks.delete(callback as any);
    }
    watchAllCallbacks.delete(callback as any);
    deltaCallbacks.delete(callback as any);
  }

  function watchAll(callback: SimpleCallback<T>, dontRun?: boolean) {
    watchAllCallbacks.add(callback);
    return dontRun ? undefined : callback(proxy, true);
  }

  function watchAllDelta(callback: DeltaCallback<T>) {
    deltaCallbacks.add(callback);
  }

  function setComputed(key: string, expr: Expr<T>) {
    if (computedKeys.has(key)) unwatch(computedKeys.get(key)!);

    const callback = () => {
      let prevPartial: any = undefined;
      if (deltaCallbacks.size > 0) {
        prevPartial = {};
        (prevPartial as any)[key] = (state as any)[key];
      }
      (state as any)[key] = expr(proxy);
      if (pendingCallback === callback) pendingCallback = undefined;  // why?
      triggerCallbacks(key, prevPartial);
    };

    computedKeys.set(key, callback);
    watch(callback);
  }

  function triggerCallbacks(key: string, prev?: Partial<T>) {
    let partialNewState: any = undefined;
    if (prev) {
      partialNewState = {};
      for (const key of Object.keys(prev)) {
        (partialNewState as any)[key] = (state as any)[key];
      }
    }
    if (batchDepth > 0) {
      for (const callback of callbackMap.get(key) || []) enqueueCallback(callback, state);
      for (const callback of watchAllCallbacks) enqueueCallback(callback, state);
      if (prev) {
        for (const deltaCallback of deltaCallbacks) enqueueCallback(deltaCallback, partialNewState, prev);
      }
    } else {
      for (const callback of callbackMap.get(key) || []) callback(state);
      for (const callback of watchAllCallbacks) callback(state);
      if (prev) {
        for (const deltaCallback of deltaCallbacks) deltaCallback(partialNewState, prev);
      }
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
      if (key === 'unwatch') return unwatch;
      if (key === 'watchAll') return watchAll;
      if (key === 'watchAllDelta') return watchAllDelta;
      if (key === 'setComputed') return setComputed;
      if (key === 'forceUpdate') return forceUpdate;
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
      let prevPartial: any = undefined;
      if (deltaCallbacks.size > 0) {
        prevPartial = {};
        (prevPartial as any)[key] = (state as any)[key];
      }
      (state as any)[key] = value;

      // Clear a value that was previously computed.
      // TODO Clear properties that were inherited from parent modal.
      if (computedKeys.has(key)) {
        unwatch(computedKeys.get(key)!);
        computedKeys.delete(key);
      }

      triggerCallbacks(key, prevPartial);
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
