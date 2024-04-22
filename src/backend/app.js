const express = require("express");
const dbRouter = require("./routes/database");
const wellKnownRouter = require("./routes/wellknown");
const metadataRouter = require("./routes/metadata");
const bodyParser = require("body-parser");

function startApp() {
    const app = express();

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

    // CDex questionnaire task-related
    app.get("/cdex", function(req, res){
        res.sendFile("cdex.html", {root: "./public"});
    });
    app.get("/launch-cdex", function(req, res){
        res.sendFile("launch-cdex.html", {root: "./public"});
    });

    app.use("/", dbRouter);
    app.use("/.well-known", wellKnownRouter);
    app.use("/metadata", metadataRouter);
    console.log("starting backend");
    return app;
}

module.exports = startApp;