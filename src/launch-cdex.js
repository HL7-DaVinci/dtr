import urlUtils from "./util/url";
import {postToLogs, updateLog, getClients} from "./util/util";
import { oauth2 } from "fhirclient";

const launch = urlUtils.getUrlParameter("launch");
const iss = urlUtils.getUrlParameter("iss");

console.log("launch:", launch);
console.log("iss:", iss);

getClients((c) => {
  const clients = c.reduce((obj, item) => (obj[item.name] = item.client, obj) ,{});

  if (clients[iss]) {
    doLaunch(clients[iss]);
  }
  else {
    console.error(`No client found for issuer: ${iss}`);
  }
});



function doLaunch(clientId) {
  
  oauth2.authorize({
    clientId: clientId,
    iss: iss,
    scope: "launch launch/patient launch/task patient/*.rs patient/Task.u patient/QuestionnaireResponse.cu",
    redirectUri: window.origin + "/cdex",
  });

}
