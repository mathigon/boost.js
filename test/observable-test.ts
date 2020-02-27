// =============================================================================
// Boost.js | Observable Tests
// (c) Mathigon
// =============================================================================


import * as tape from 'tape';
import {observe} from '../src/observable';


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
  model.watch((s) => callbacks += s.a);
  test.equal(callbacks, 1);

  model.a = 2;
  test.equal(model.a, 2);
  test.equal(callbacks, 3);

  // It doesn't change if we set a value to the same as before.
  model.a = 2;
  test.equal(callbacks, 3);

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
