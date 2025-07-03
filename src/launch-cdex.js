import urlUtils from "./util/url";
import {postToLogs, updateLog, getClients} from "./util/util";
import { oauth2 } from "fhirclient";

const launch = urlUtils.getUrlParameter("launch");
const iss = urlUtils.getUrlParameter("iss");


getClients((c) => {
  const clients = c.reduce((obj, item) => (obj[item.name] = item.client, obj) ,{});

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

  oauth2.authorize({
    stateKey: stateKey,
    clientId: clientId,
    iss: iss,
    scope: "launch launch/patient launch/task patient/*.rs patient/Task.u patient/QuestionnaireResponse.cu",
    redirectUri: window.origin + "/cdex",
  });

});