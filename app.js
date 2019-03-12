var express = require("express");

var app = express();

app.use(express.static("frontend/public", { extensions: ["html"] }));

module.exports = app;
