const express = require("express");
const router = express.Router();
const db = require("../database/impl");
const CLIENT = "clients";
const LOGS = "logs";

router.get("/clients/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const result = db.getClient(id);
    if(result) {
        res.send(result);
    } else {
        res.sendStatus(404);
    }
});

router.get("/clients", (req, res) => {
    const result = db.getClients();
    res.send(result);
});

router.post("/clients", (req, res) => {
    const newClient = req.body;
    const count = db.getCountAndIncrement();
    newClient.id = count;
    db.postClient(newClient);
    res.send(newClient);
});

router.delete("/clients/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const result = db.deleteClient(id);
    res.send(result);
});

router.post("/logs", (req, res) => {
    const newLog = req.body;
    const count = db.getCountAndIncrement();
    newLog.id = count;
    db.postLog(newLog);
    res.send(newLog);
});

router.put("/logs/:id", (req, res) => {
    const newLog = req.body;
    db.putLog(req.params.id, newLog);
    res.sendStatus(200);
});

router.get("/logs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const result = db.getLog(id);
    if(result) {
        res.send(result);
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;