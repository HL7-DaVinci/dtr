const merge = require("webpack-merge");
const path = require("path");
const webpack = require("webpack");
const common = require("./webpack.config.common.js");

module.exports = merge(common, {
  mode: "development",
  devServer: {
    contentBase: path.resolve(__dirname, "public"),
    port: 3005,
    publicPath: "http://localhost:3005/",
    hotOnly: true
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
});
