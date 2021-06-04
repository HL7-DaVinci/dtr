const path = require("path");

module.exports = {
	mode: "production",
    entry: {
        launch: path.resolve(__dirname, "src/launch.js"),
        index: path.resolve(__dirname, "src/index.js"),
        register: path.resolve(__dirname, "src/register.js"),
        log: path.resolve(__dirname, "src/logs.js")
      },
      output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "public/js"),
        publicPath: "/"
      },
	watch: true,
    devtool: "#eval-source-map",
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
				test: /\.jsx$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							["@babel/preset-env"],
							["@babel/preset-react"]
						]
					}
				}
			},
            { test: /\.js$/, loader: "babel-loader", exclude: /node_modules/ },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
              }
		]
	},
    node: {
        fs: "empty"
      }
};