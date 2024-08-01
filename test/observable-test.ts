// =============================================================================
// Boost.js | Observable Tests
// (c) Mathigon
// =============================================================================


import tape from 'tape';
import {batch, observe} from '../src/observable';


interface Model {
  a: number;
  b: number;
  c?: number;
  d?: number;
}

tape('simple observe', (test) => {
  const model = observe({a: 1, b: 2});
  let callbacks = 0;

  test.equal(model.a, 1);
  model.watch(s => (callbacks += s.a));
  test.equal(callbacks, 1);

  model.a = 2;
  test.equal(model.a, 2);
  test.equal(callbacks, 3);

  // It doesn't change if we set a value to the same as before.
  model.a = 2;
  test.equal(callbacks, 3);

  test.end();
});

tape('watch all', (test) => {
  const model = observe({a: 1, b: 2});
  let callbacks = 0;

  const fn = () => (callbacks += 1);
  model.watchAll(fn);
  test.equal(callbacks, 1);

  model.a = 2;
  model.a = 2;  // Nothing changed
  (model as any).c = 3;
  test.equal(callbacks, 3);

  model.unwatch(fn);
  model.b = 3;
  test.equal(callbacks, 3);

  test.end();
});

tape('watch keys', (test) => {
  const model = observe<Model>({a: 1, b: 2});

  let changes = 0;
  model.watchKeys('a', () => (changes += 1));
  test.equal(changes, 1);

  model.a += 1;  // this triggers the callback
  test.equal(changes, 2);

  model.b += 1;  // this doesn't trigger the callback
  test.equal(changes, 2);

  test.end();
});

tape('nested dependencies', (test) => {
  const model = observe<Model>({a: 1, b: 2});

  model.setComputed('c', (s) => s.a + s.b);
  model.setComputed('d', (s) => s.c! + s.b);

  test.equal(model.c, 3);
  test.equal(model.d, 5);

  model.a = 5;

  test.equal(model.c, 7);
  test.equal(model.d, 9);

  model.c = 11;
  model.a = 5;
  test.equal(model.c, 11);

  model.setComputed('b', (s) => s.a + s.c!);
  test.equal(model.b, 16);

  model.a = 4;
  test.equal(model.d, 26);

  model.setComputed('b', (s) => s.a + s.a);
  test.equal(model.b, 8);
  test.equal(model.d, 19);

  test.end();
});

tape('batched mutation (normal)', (test) => {

  const model = observe({a: 1, b: 2, c: 3});
  let callbacks = 0;

  model.watchAll(() => (callbacks += 1), true);

  test.equal(callbacks, 0);

  model.a *= 2;
  model.b *= 2;

  test.equal(callbacks, 2);

  batch(() => {
    model.a *= 2;
    model.b *= 2;
  });

  test.equal(callbacks, 3);

  batch(() => {
    model.a *= 2;
    batch(() => {
      model.b *= 2;
      batch(() => {
        model.c *= 2;
      });
    });
  });

  test.equal(callbacks, 4);

  test.end();
});

tape('batched mutation (computed)', (test) => {

  const model = observe({a: 1, b: 2});
  let callbacks = 0;

  model.setComputed('x', () => {
    callbacks++;
    return model.a + model.b;
  });

  test.equal(callbacks, 1);

  model.a *= 2;
  model.b *= 2;

  test.equal(callbacks, 3);

  batch(() => {
    model.a *= 2;
    model.b *= 2;
  });

  test.equal(callbacks, 4);

  test.end();
});

tape('assign', (test) => {
  const model = observe<Model>({a: 1, b: 2});
  let aCallbacks = 0; let bCallbacks = 0; let allCallbacks = 0;

  model.watch(({a: _a}, initial) => {
    if (!initial) aCallbacks++;
  });

  model.watch(({b: _b}, initial) => {
    if (!initial) bCallbacks++;
  });

  model.watchAll(() => allCallbacks++, true);

  model.a ++;

  test.equal(aCallbacks, 1);
  test.equal(bCallbacks, 0);
  test.equal(allCallbacks, 1);

  model.assign({
    a: 3
  });

  // Setting `a` with assign should call `watchAll` callbacks, and watchers using `a`, but not watchers using `b`
  test.equal(aCallbacks, 2);
  test.equal(bCallbacks, 0);
  test.equal(allCallbacks, 2);

  model.assign({
    a: 3,
    b: 3
  });

  // `a` has the same value as before, no need to re-run callbacks
  test.equal(aCallbacks, 2);
  test.equal(bCallbacks, 1);
  test.equal(allCallbacks, 3);

  test.end();
});
