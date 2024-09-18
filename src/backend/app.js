const express = require("express");
const dbRouter = require("./routes/database");
const wellKnownRouter = require("./routes/wellknown");
const metadataRouter = require("./routes/metadata");
const bodyParser = require("body-parser");

function startApp() {
    const app = express();

    app.use(express.json());
    app.use(bodyParser.json({ type: ["application/json", "application/fhir+json"] }));
    console.log("dirname: ", __dirname);
    app.use(express.static(`${__dirname}/../../public/`));
    app.get("/register", function(req, res){
        res.sendFile("register.html", {root: "./public"});
    });
    app.get("/index", function(req, res) {
        // Check if required parameters are present (replace 'paramName' with actual parameter name)
        if (!req.query.paramName) {
            // Send a custom error page or message if parameters are missing
            res.send(`
            <html>
                <head><title>Error: Missing Parameters</title></head>
                <body>
                    <h1>Error: Missing Required Parameters</h1>
                    <p>You need to provide the correct parameters to access this page. Please ensure you are launching from the appropriate EHR system with the correct context.</p>
                    <p>For more information, visit the <a href="/crd-request-generator-docs">CRD Request Generator Documentation</a>.</p>
                </body>
            </html>
        `);
        } else {
            // If parameters are correct, serve the intended HTML file
            res.sendFile("index.html", {root: "./public"});
        }
    });
    app.get("/launch", function(req, res) {
        // Check if required parameters are present
        if (!req.query.paramName) {
            // Send a custom error page or message if parameters are missing
            res.send(`
            <html>
                <head><title>Error: Missing Parameters</title></head>
                <body>
                    <h1>Error: Missing Required Parameters</h1>
                    <p>The launch request is missing the required parameters. Please ensure you are launching from an EHR that supports SMART on FHIR with the correct launch context.</p>
                    <p>For more information, visit the <a href="/crd-request-generator-docs">CRD Request Generator Documentation</a>.</p>
                </body>
            </html>
        `);
        } else {
            // If parameters are correct, serve the intended HTML file
            res.sendFile("launch.html", {root: "./public"});
        }
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
    // app.use("/.well-known", wellKnownRouter);
    // app.use("/metadata", metadataRouter);
    console.log("starting backend");
    return app;
}

module.exports = startApp;