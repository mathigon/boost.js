import typescript from '@rollup/plugin-typescript';

const options = {
  input: './index.ts',
  plugins: [typescript()],
  external: ['@mathigon/core', '@mathigon/fermat'],
  onwarn(e) {
    if (e.code !== 'CIRCULAR_DEPENDENCY') console.warn(e.message);
  },
};

module.exports = [
  {...options, output: {file: 'dist/boost.cjs.js', format: 'cjs'}},
  {...options, output: {file: 'dist/boost.esm.js', format: 'esm'}}
];
