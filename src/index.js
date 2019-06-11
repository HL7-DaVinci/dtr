import '@babel/polyfill'
import "fhirclient"; // sets window.FHIR
import urlUtils from "./util/url";

import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
console.log("completed imports");
// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code
console.log(state);
// load the app parameters stored in the session
const params = JSON.parse(sessionStorage[state]); // load app session
const tokenUri = params.tokenUri;
const clientId = params.clientId;
const secret = params.secret;
const serviceUri = params.serviceUri;
sessionStorage["serviceUri"] = serviceUri;
const redirectUri = params.redirectUri;
// This endpoint available when deployed in CRD server, for development we have
// the proxy set up in webpack.config.dev.js so the CRD server needs to be running
const FHIR_URI_PREFIX = "../../fetchFhirUri/";
var data = `code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`
// const data = new URLSearchParams();
// data.append("code", code);
// data.append("grant_type", "authorization_code");
// data.append("redirect_uri", redirectUri);
if (!secret) data+="&client_id=" + clientId;

const headers = {
  "Content-Type": "application/x-www-form-urlencoded"
};
if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

// obtain authorization token from the authorization service using the authorization code
const tokenPost = new XMLHttpRequest();
var auth_response;
tokenPost.open("POST", tokenUri);
tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
tokenPost.onload = function() {
    if (tokenPost.status === 200) {
      try {
  
        auth_response = JSON.parse(tokenPost.responseText);
        console.log(auth_response);
      } catch (e) {
        const errorMsg = "Failed to parse auth response";
        document.body.innerText = errorMsg;
        console.error(errorMsg);
        return;
      }
      const appString = decodeURIComponent(auth_response.appContext);
      const appContext = {
        template: appString.split("&")[0].split("=")[1],
        request: JSON.parse(appString.split("&")[1].split("=")[1].replace(/\\/g,"")),
        filepath: appString.split("&")[2].split("=")[1]
      }
      
        var smart = FHIR.client({
        serviceUrl: serviceUri,
        patientId: auth_response.patient,
        auth: {
            type: "bearer",
            token: auth_response.access_token

        }
        });
        ReactDOM.render(
        <App
          FHIR_URI_PREFIX={FHIR_URI_PREFIX}
          questionnaireUri={appContext.template}
          smart={smart}
          deviceRequest={appContext.request}
          filepath={appContext.filepath}
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
    } else {
      const errorMsg = "Token post request failed. Returned status: " + tokenPost.status;
      document.body.innerText = errorMsg;
      console.error(errorMsg);
      return;
    }
  };
tokenPost.send(data);

