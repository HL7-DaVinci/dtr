import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";

const adapter = new JSONFileSync("databaseData/db.json");
const db = new LowSync(adapter, { clients: [], logs: [], count: 0 });

function getClient(id) {
  db.read();
  return db.data.clients.find(c => c.id === id);
}

function findClient(name, client) {
  db.read();
  return db.data.clients.find(c => c.name === name && c.client === client);
}

function getClients() {
  db.read();
  return db.data.clients;
}

function postClient(client) {
  db.read();
  db.data.clients.push(client);
  db.write();
}

function getCountAndIncrement() {
  db.read();
  const count = db.data.count;
  db.data.count = count + 1;
  db.write();
  return count;
}

function postLog(log) {
  db.read();
  log.createdAt = Date.now();
  db.data.logs.push(log);
  db.write();
}

function getLog(id) {
  db.read();
  return db.data.logs.find(l => l.id === id);
}
function getLogs() {
  db.read();
  return db.data.logs;
}

function putLog(id, log) {
  db.read();
  const idx = db.data.logs.findIndex(l => l.id === id);
  if (idx !== -1) {
    db.data.logs[idx] = { ...db.data.logs[idx], ...log };
    db.write();
  }
}

function deleteClient(id) {
  db.read();
  db.data.clients = db.data.clients.filter(c => c.id !== id);
  db.write();
}

export {
  getClient,
  findClient,
  postClient,
  getClients,
  deleteClient,
  postLog,
  getLog,
  getLogs,
  putLog,
  getCountAndIncrement
};
