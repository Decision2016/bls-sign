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
    bigInt: 'big-integer'
  },
  module: {
    rules: []
  },
  target: 'node'
};