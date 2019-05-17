const merge = require("webpack-merge");
const common = require("./webpack.config.common.js");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  module: {
    rules: [
        {
            test: /\.js$/,
            loader:'babel-loader'
        }
    ]
},
  // look into serving up the gzip version only in prod build
  // plugins: [new MinifyPlugin({}, { sourceMap: false }), new CompressionPlugin()]
  plugins: [new MinifyPlugin({}, { sourceMap: false })]
});
