const merge = require("webpack-merge");
const path = require("path");
const webpack = require("webpack");
const common = require("./webpack.config.common.js");

module.exports = merge(common, {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader"
      }
    ]
  },
  devServer: {
    contentBase: path.resolve(__dirname, "public"),
    port: 3005,
    https: true,
    host: "0.0.0.0",
    public: "0.0.0.0",
    hotOnly: true,
    historyApiFallback: {
      rewrites: [
        { from: /index/, to: "/index.html" },
        { from: /launch/, to: "/launch.html" },
        { from: /register/, to: "/register.html" }
      ]
    },
    proxy: [
      {
        context: ["/files", "/fhir"],
        target: "http://localhost:8090",
        changeOrigin: true,
        secure: false
      },
      {
          context: ["/logs","/clients"],
          target: "https://localhost:3006",
          secure: false
      }
    ]
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
});
