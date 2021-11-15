/**
 * We have added a custom esbuild plugin that rewrites some dependency paths
 * for the component TS files. The index.esm.js file doesn't contain the code
 * for any of the web components in src/components. Because those are just
 * static classes with no side effects, they would usually be removed by
 * tree-shaking. We also want to avoid duplicate component declarations, or any
 * globally-running code.
 * Instead, this script creates a separate dist/components.js file which needs
 * to be imported separately. However, in order to avoid any duplicate code
 * between these two output files, we've added a custom plugin below that
 * rewrites all src/*.ts imports to instead import from the index.esm.js file.
 */
require('esbuild').build({
  entryPoints: ['src/components/index.ts'],
  outfile: 'dist/components.js',
  format: 'esm',
  target: ['es2016'],
  sourcemap: true,
  treeShaking: true,
  bundle: true,
  plugins: [{
    name: 'dependencies',
    setup(build) {
      build.onResolve({filter: /^\.\.\/$/}, () => ({path: './index.esm.js', external: true}));
    }
  }],
  external: ['@mathigon/core', '@mathigon/fermat', '@mathigon/euclid'],
}).catch(() => process.exit(1));
