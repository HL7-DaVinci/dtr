const express = require("express");
const dbRouter = require("./routes/database");
const bodyParser = require("body-parser");
const request = require("request");
const createProxyMiddleware = require("http-proxy-middleware");

function startApp(proxyTarget) {
    const app = express();
    app.use("/fhir", createProxyMiddleware({ target: proxyTarget, changeOrigin: false }));
    app.use("/files", function (req, res) {
        var url = proxyTarget + "/files" + req.url;
        req.pipe(request({
            url: url, agentOptions: {
                rejectUnauthorized: false
            }
        })).pipe(res);
    });
    app.use(express.json());
    app.use(bodyParser.json({ type: ["application/json", "application/fhir+json"] }));
    app.use(express.static(`${__dirname}/../../public/`));
    app.get("/register", function(req, res){
        res.sendFile("register.html", {root: "./public"});
    });
    app.get("/index", function(req, res){
        res.sendFile("index.html", {root: "./public"});
    });
    app.get("/launch", function(req, res){
        res.sendFile("launch.html", {root: "./public"});
    });
    app.get("/logs", function(req, res){
        res.sendFile("logs.html", {root: "./public"});
    });

    app.use("/", dbRouter);
    console.log("starting backend");
    return app;
}

module.exports = startApp;