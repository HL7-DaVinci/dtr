var express = require("express");

var app = express();

app.use(express.static("frontend/dist"));

module.exports = app;
