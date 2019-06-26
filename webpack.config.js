const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'bls-sign',
    libraryTarget: 'commonjs2'
  },
  externals: {
    "big-integer": "big-integer"
  },
  module: {
    rules: []
  },
  target: 'node'
};