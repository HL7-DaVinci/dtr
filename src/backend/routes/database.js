import express from "express";
import * as db from "../database/impl.js";

const router = express.Router();
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

function addClient(newClient) {
    const count = db.getCountAndIncrement();
    newClient.id = count;
    db.postClient(newClient);
    return newClient;
};

router.post("/clients", (req, res) => {
    var newClient = req.body;
    newClient = addClient(newClient);
    console.log("POST client: ");
    console.log(newClient);
    res.send(newClient);
});

router.put("/clients", (req, res) => {
    // ignore any existing ID since only the name and client matter
    var newClient = req.body;

    // look for the client in the database
    const result = db.findClient(newClient.name, newClient.client);
    if (result === undefined) {
        // add if not found
        newClient = addClient(newClient);
        console.log("PUT new client: ");
        console.log(newClient);
        res.send(newClient);
    } else {
        // return found client
        console.log("PUT existing client: ");
        console.log(result);
        res.send(result);
    }
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
    db.putLog(parseInt(req.params.id), newLog);
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

router.get("/api/logs", (req, res) => {
    const result = db.getLogs();
    if(result) {
        res.send(result);
    } else {
        res.sendStatus(404)
    }
})

export default router;