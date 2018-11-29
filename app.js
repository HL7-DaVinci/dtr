var express = require("express");

var app = express();

app.use(express.static("frontend/dist", { extensions: ["html"] }));

module.exports = app;
