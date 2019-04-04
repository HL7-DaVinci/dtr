const path = require("path");

module.exports = {
  entry: {
    launch: path.resolve(__dirname, "src/launch.js"),
    index: path.resolve(__dirname, "src/index.js")
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "public"),
    publicPath: "/",
  },
  resolve: { extensions: ["*", ".js", ".jsx"] },
  module: {
    rules: [
      {
        // bit of a hack to ignore the *.js.map files included in cql-execution (from coffeescript)
        test: /\.js.map$/,
        include: [path.resolve(__dirname, "node_modules/cql-execution/lib")],
        use: { loader: "ignore-loader" }
      },
      {
        test: /\.(mjs|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/env",
                {
                  useBuiltIns: "usage"
                }
              ]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  node: {
    fs: "empty"
  }
};
