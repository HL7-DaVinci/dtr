const config = require("./webpack.config");
config.watch = false;
config.devtool = false;
module.exports = config;