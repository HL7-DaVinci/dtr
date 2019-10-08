import React from "react";
import ReactDOM from "react-dom";
import urlUtils from "./util/url";
import PriorAuth from "./components/PriorAuth/PriorAuth";

// Prior Auth server params
const PRIORAUTH_SERVICE = {
  // BASE: "http://localhost:9000/fhir",
  BASE: "https://davinci-prior-auth.logicahealth.org/fhir",
  CLAIM_RESPONSE: "/ClaimResponse",
  SUBSCRIPTION: "/Subscription",
  // WS_BASE: "ws://localhost:9000/fhir",
  WS_BASE: "wss://davinci-prior-auth.logicahealth.org/fhir",
  WS_CONNECT: "/connect",
  WS_SUBSCRIBE: "/private/notification",
  WS_BIND: "/subscribe"
};

// Get the URL parameters receieved
const priorAuthId = urlUtils.getUrlParameter("identifier");
const patientId = urlUtils.getUrlParameter("patient.identifier");
const claimResponseUri =
  PRIORAUTH_SERVICE.BASE +
  PRIORAUTH_SERVICE.CLAIM_RESPONSE +
  "?identifier=" +
  priorAuthId +
  "&patient.identifier=" +
  patientId;
console.log("priorAuth id: " + priorAuthId);
console.log("patient id: " + patientId);

// Obtain the ClaimResponse for the given prior auth id and patient
const claimResponseGet = new XMLHttpRequest();
claimResponseGet.open("GET", claimResponseUri);
claimResponseGet.setRequestHeader("Accept", "application/json");
claimResponseGet.onload = function() {
  let claimResponseBundle;
  if (this.status === 200) {
    claimResponseBundle = JSON.parse(this.responseText);
    console.log(claimResponseBundle);
    if (claimResponseBundle == null) {
      let message = "Unable to parse response body";
      message += "Status: " + this.status + "\n";
      message += "PriorAuth ID: " + priorAuthId + "\n";
      message += "Patient: " + patientId + "\n";
      message += "Response:\n" + this.responseText;
      console.log(e);
      console.log(message);
      document.body.innerHTML = e;
      return;
    }
    ReactDOM.render(
      <PriorAuth
        claimResponseBundle={claimResponseBundle}
        priorAuthId={priorAuthId}
        patientId={patientId}
        priorAuthService={PRIORAUTH_SERVICE}
      />,
      document.getElementById("root")
    );
  } else {
    let message = "Unable to retrieve ClaimResponse\n";
    message += "Status: " + this.status + "\n";
    message += "PriorAuth ID: " + priorAuthId + "\n";
    message += "Patient: " + patientId;
    console.log(message);
    alert(message);
    return;
  }
};
claimResponseGet.send();
