const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);
db.defaults({ clients: [], logs: [], count: 0 })
  .write();


function getClient(id) {
    return db.get("clients").find({id: id}).value();
}

function findClient(name, client) {
    return db.get("clients").find({name: name, client: client}).value();
}

function getClients() {
    return db.get("clients").value();
}

function postClient(client) {
    db.get("clients").push(client).write();
}

function getCountAndIncrement() {
    const count = db.get("count").value();
    db.update("count", n => n + 1)
    .write();
    return count;
}

function postLog(log) {
    db.get("logs").push(log).write();
}

function getLog(id) {
    return db.get("logs").find({id: id}).value();
}

function putLog(id, log) {
    db.get("logs")
  .find({ id: id })
  .assign(log)
  .write();
}

function deleteClient(id) {
    return db.get("clients").remove({id: id}).write();
}
module.exports = {
    getClient,
    findClient,
    postClient,
    getClients,
    deleteClient,
    postLog,
    getLog,
    putLog,
    getCountAndIncrement
};