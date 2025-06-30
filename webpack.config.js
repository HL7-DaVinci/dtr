import path from "path";
import webpack from "webpack";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
	mode: "production",
    entry: {
        launch: path.resolve(__dirname, "src/launch.js"),
        index: path.resolve(__dirname, "src/index.js"),
        register: path.resolve(__dirname, "src/register.js"),
        log: path.resolve(__dirname, "src/logs.js"),
        cdex: path.resolve(__dirname, "src/cdex.js"),
        launchCdex: path.resolve(__dirname, "src/launch-cdex.js")
      },
      output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "public/js"),
        publicPath: "./"
      },
    watch: true,
    devtool: "eval-source-map",
    resolve: { 
        extensions: [".js", ".jsx"],
        extensionAlias: {
            ".js": [".js", ".jsx"]
        },
        fallback: {
            "fs": false,
            "crypto": require.resolve("crypto-browserify"),
            "timers": require.resolve("timers-browserify"),
            "vm": require.resolve("vm-browserify"),
            "buffer": require.resolve("buffer"),
            "process": require.resolve("process/browser"),
            "util": require.resolve("util"),
            "events": require.resolve("events"),
            "stream": require.resolve("stream-browserify"),
            "assert": require.resolve("assert"),
            "os": require.resolve("os-browserify/browser"),
            "path": require.resolve("path-browserify"),
            "url": require.resolve("url"),
            "constants": require.resolve("constants-browserify")
        }
    },
	module: {
		rules: [
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                // bit of a hack to ignore the *.js.map files included in cql-execution (from coffeescript)
                test: /\.js.map$/,
                include: [path.resolve(__dirname, "node_modules/cql-execution/lib")],
                use: { loader: "ignore-loader" }
            },
			{
				test: /\.jsx$/,				exclude: /node_modules\/(?!@lhncbc\/ucum-lhc)/,
				use: {
					loader: "babel-loader",
					options: {
                        presets: [
                            ['@babel/preset-env', {
                                "corejs": "3",
                                "useBuiltIns": "entry",
                                "targets": {
                                    "esmodules": true,
                                    "ie": "11"
                                }
                            }], 
                            ['@babel/preset-react', {
                                "runtime": "automatic"
                            }]
                        ],
                        plugins: ['@babel/plugin-transform-runtime']
					}
				}
			},
            { 
                test: /\.js$/, 
                loader: "babel-loader", 
                exclude: /node_modules\/(?!@lhncbc\/ucum-lhc)/
            },            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
              }
		]
	},
    experiments: {
        topLevelAwait: true
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser.js'
        })
    ]
};