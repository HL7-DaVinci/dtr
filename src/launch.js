import urlUtils from "./util/url";
import { getClients, postToLogs } from "./util/util";
import { oauth2 } from "fhirclient";

const iss = urlUtils.getUrlParameter("iss");
const launch = urlUtils.getUrlParameter("launch");

console.log("Launching application...");

let clients = [];
getClients(logCallback);

function logCallback(c) {
    clients = c.reduce((obj, item) => (obj[item.name] = item.client, obj) ,{});
    postToLogs({ status: "launching", serviceUri: iss }, startLaunch);
}

function startLaunch(log) {

  localStorage.setItem("lastAccessedServiceUri", iss);
  sessionStorage.setItem("serviceUri", iss);
  sessionStorage.setItem("currentLog", JSON.stringify(log));
  
  let clientId;
  if (clients[iss]) {
    clientId = clients[iss];
  } else if (clients["default"]) {
    clientId = clients["default"];
  } else {
    const errorMsg = "No client ID found for the specified issuer. Please register a client ID or verify that the default client ID is correctly set.";
    console.error(errorMsg);
    alert(errorMsg);
    return;
  }
  
  console.log(`Using client ID: ${clientId} for issuer: ${iss}`);
  const stateKey = Array.from({length: 16}, () => 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 62)
    )
  ).join("");
  console.log(`Generated state: ${stateKey}`);
  

  // Retain the launch context ID in the session storage
  sessionStorage.setItem("launchContextId", launch);

  // Initiate SMART launch
  oauth2.authorize({
    stateKey: stateKey,
    clientId: clientId,
    iss: iss,
    scope: "launch user/Observation.read user/Patient.read patient/Observation.read patient/Patient.read patient/Coverage.read patient/Condition.read user/Practitioner.read",
    redirectUri: window.location.origin + "/index"
  });
}
