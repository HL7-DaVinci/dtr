import express from "express";
import dbRouter from "./routes/database.js";
import wellKnownRouter from "./routes/wellknown.js";
import metadataRouter from "./routes/metadata.js";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function startApp() {
    const app = express();

    app.use(express.json());
    app.use(bodyParser.json({ type: ["application/json", "application/fhir+json"] }));
    console.log("dirname: ", __dirname);
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
    // app.use("/.well-known", wellKnownRouter);
    // app.use("/metadata", metadataRouter);
    console.log("starting backend");
    return app;
}

export default startApp;