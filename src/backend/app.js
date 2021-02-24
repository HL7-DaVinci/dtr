const express = require("express");
const dbRouter = require("./routes/database");
const bodyParser = require("body-parser");

const app = express();

app.use(express.json());
app.use(bodyParser.json({ type: ["application/json", "application/fhir+json"] }));
let version = process.env.VERSION;
if (version !== "Dev") {
    app.use(express.static(`${__dirname}/../../public/`));
}

app.use("/", dbRouter);
console.log("epic");
module.exports = app;