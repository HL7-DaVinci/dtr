import "whatwg-fetch"; // a window.fetch polyfill
import "fhirclient"; // sets window.FHIR
import urlUtils from "./util/url";

import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";

// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code

// load the app parameters stored in the session
const params = JSON.parse(sessionStorage[state]); // load app session
const tokenUri = params.tokenUri;
const clientId = params.clientId;
const secret = params.secret;
const serviceUri = params.serviceUri;
const redirectUri = params.redirectUri;

// This endpoint available when deployed in CRD server, for development we have
// the proxy set up in webpack.config.dev.js so the CRD server needs to be running
const FHIR_URI_PREFIX = "../fetchFhirUri/";

const data = new URLSearchParams();
data.append("code", code);
data.append("grant_type", "authorization_code");
data.append("redirect_uri", redirectUri);
if (!secret) data.append("client_id", clientId);

const headers = {
  "Content-Type": "application/x-www-form-urlencoded"
};
if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

// obtain authorization token from the authorization service using the authorization code
const pat = fetch(tokenUri, {
  method: "POST",
  headers: headers,
  body: data.toString()
})
  .then(res => res.json())
  // should get back the access token and maybe the patient ID
  .then(function (auth_response) {
    const appContext = {
        template: auth_response.template,
        request: serviceUri + '/' + auth_response.request
      }
      // hardcoded smart, should be set up with context stuff
      var smart = FHIR.client({
        serviceUrl: serviceUri,
        patientId: auth_response.patient
      });
      
      
      ReactDOM.render(
        <App
          FHIR_URI_PREFIX={FHIR_URI_PREFIX}
          questionnaireUri={appContext.template}
          smart={smart}
          deviceRequestUri={appContext.request}
        />,
        document.getElementById("root")
      );
      console.log(auth_response);
    const patientId = auth_response.patient;
    if (patientId == null) {
      const errorMsg = "Failed to get a patientId from the app params or the authorization response.";
      document.body.innerText = errorMsg;
      console.error(errorMsg);
      return;
    }
    return patientId;
  });