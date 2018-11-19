import resolve from 'rollup-plugin-node-resolve'
import builtins from 'rollup-plugin-node-builtins'
import babel from 'rollup-plugin-babel'
import copy from 'rollup-plugin-copy'
import commonjs from 'rollup-plugin-commonjs'


module.exports = {
  input: 'src/index.js',
  output: [{
    file: 'dist/index.js',
    format: 'cjs'
  },
  {
    file: 'dist/index.mjs',
    format: 'es'
  }],
  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**',
    }),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers']
    }),
    builtins(),
    copy({
      "package.json": "dist/package.json",
      "README.md": "dist/README.md",
      "LICENSE": "dist/LICENSE",
      "test.js": "dist/test.js"
    })
  ],
  external: ['big-integer', 'crypto']
}