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
              loader:'babel-loader'
          }
      ]
  },
  devServer: {
    contentBase: path.resolve(__dirname, "public"),
    port: SERVER_PORT,
    https: SERVER_HTTPS,
    host: 'SERVER_HOST',
    public: 'SERVER_PUBLIC',
    hotOnly: true,
    historyApiFallback: {
        rewrites: [
          { from: /index/, to: '/index.html' },
          { from: /launch/, to: '/launch.html' },
          { from: /register/, to: '/register.html'}
        ]
      },
    proxy: [{
      context: ['/fetchFhirUri', '/getfile'],
      target: 'PROXY_TARGET',
      changeOrigin: true,
      secure: false
    }]
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
});
