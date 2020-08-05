// =============================================================================
// Boost.js | Expression Parsing Tests
// (c) Mathigon
// =============================================================================


import * as tape from 'tape';
import {compile} from '../src/eval';


tape('simple expressions', (test) => {
  test.equal(compile('1+2')(), 3);
  test.equal(compile('2*(1+2)')(), 6);

  // eslint-disable-next-line no-tabs
  test.equal(compile('1 + 2  -3*	4 / 2')(), -3);

  test.equal(compile('"abc"')(), 'abc');
  test.equal(compile('a')({a: 5}), 5);
  test.equal(compile('abc')({abc: 5}), 5);

  test.end();
});


tape('arrays and properties', (test) => {
  test.equal(compile('a[1]')({a: [2, 3, 4]}), 3);
  // test.equal(compile('([2,,4])[x]')({x: 2}), 4);
  // test.equal(compile('([1,2,3])[1]')(), 2);

  test.equal(compile('x.aa')({x: {aa: 9}}), 9);
  test.equal(compile('x.a.b')({x: {a: {b: 4}}}), 4);

  test.equal(compile('fn(1)')({fn: (x: number) => x + 7}), 8);
  test.equal(compile('a.x(2)')({a: {x: (y: number) => y - 4}}), -2);

  test.end();
});


tape('this reference', (test) => {
  class Foo {
    constructor(readonly bar = 10) {}
    getBar() {
      return this.bar;
    }
  }

  const foo = new Foo();
  test.equal(compile('foo.getBar()')({foo}), 10);

  test.end();
});
