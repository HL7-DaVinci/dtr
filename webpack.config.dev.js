const merge = require("webpack-merge");
const path = require("path");
const webpack = require("webpack");
const common = require("./webpack.config.common.js");

module.exports = merge(common, {
  mode: "development",
  devServer: {
    contentBase: path.resolve(__dirname, "public"),
    port: 3005,
    public: "0.0.0.0",
    hotOnly: true,
    historyApiFallback: {
        rewrites: [
          { from: /index/, to: '/index.html' },
          { from: /launch/, to: '/launch.html' }
        ]
      },
    proxy: {
      '/fetchFhirUri': {
          target: 'http://localhost:8090',
          secure: false
      }
    }
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
});
