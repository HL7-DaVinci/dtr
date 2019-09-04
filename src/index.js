import "whatwg-fetch"; // a window.fetch polyfill
import "fhirclient"; // sets window.FHIR
import urlUtils from "./util/url";

import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
// import { createToken } from './components/Authentication';



// This endpoint available when deployed in CRD server, for development we have
// the proxy set up in webpack.config.dev.js so the CRD server needs to be running
const FHIR_URI_PREFIX = "../fetchFhirUri/";

async function getMessageDef(token, launchContextId) {
  var tempURL = "http://cdex.mettles.com:8280/ehr-server/stu3/MessageDefinition/"+launchContextId;
  let req = fetch(tempURL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  }).then((response) => {
    return response.json();
  }).then((response) => {
    return response;
  }).catch(err => err);
  return req;
}

// hardcoded appContext, needs to by retrieved from OAuth 2.0 access token response
export const appContext = {
  // template: "urn:hl7:davinci:crd:home-oxygen-questionnaire",
  template: "",
  request: "http://cdex.mettles.com:8280/ehr-server/stu3/DeviceRequest/10058/",
  patientId: "",
  npi: ""
}

async function getToken() {
  return new Promise(resolve => {
    // get the URL parameters received from the authorization server
    const state = urlUtils.getUrlParameter("state"); // session key
    const code = urlUtils.getUrlParameter("code"); // authorization code

    // load the app parameters stored in the session
    const params = JSON.parse(sessionStorage[state]); // load app session
    console.log("Params----",params);
    const tokenUri = params.tokenUri;
    const clientId = params.clientId;
    const secret = params.secret;
    const redirectUri = params.redirectUri;

    // Prep the token exchange call parameters
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
    fetch(tokenUri, {
      method: "POST",
      headers: headers,
      body: data.toString()
    }).then(res => res.json())
      // should get back the access token and maybe the patient ID
      .then(function (auth_response) {
        resolve(auth_response.access_token);
      });
  });
}

// hardcoded smart, should be set up with context stuff
async function getFromFhir() {
  let token = await getToken();
   const state = urlUtils.getUrlParameter("state"); // session key
  // load the app parameters stored in the session
  const params = JSON.parse(sessionStorage[state]); // load app session
  const serviceUri = params.serviceUri;
  const launchContextId = params.launchContextId;

  let msg_def = await getMessageDef(token,launchContextId);
 
  var smart;
  if (msg_def.description != undefined) {
    console.log("messagw def---",decodeURIComponent(msg_def.description));
    let resp = JSON.parse(decodeURIComponent(msg_def.description));
    let app_context = resp.appContext;
    if (app_context.file_links) {
      if (app_context.file_links.questionnaire_file != undefined) {
        let questionnaire_template = app_context.file_links.questionnaire_file.split('/');
        appContext.template = decodeURIComponent(questionnaire_template[1]);
      }
    }
    if (app_context.appData) {
      if (app_context.appData.Practitioner != undefined) {
        appContext.npi = app_context.appData.Practitioner;
      }
      if (app_context.appData.patientId != undefined) {
        appContext.patientId = app_context.appData.patientId;

        // const patientId = patientIdfromAppParams || auth_response.patient;
        if (appContext.patientId == null) {
          errorMsg = "Failed to get a patientId from the app params or the authorization response.";
          document.body.innerText = errorMsg;
          console.error(errorMsg);
          return;
        }
        var smart = FHIR.client({
          serviceUrl: serviceUri,
          patientId: appContext.patientId,
          auth: {
            type: "bearer",
            token: token
          }
        });
      }
    }
  }
  return smart;
}

getFromFhir().then((smart) => {
  console.log("after get")
  ReactDOM.render(
    <App
      FHIR_URI_PREFIX={FHIR_URI_PREFIX}
      questionnaireUri={appContext.template}
      smart={smart}
      deviceRequestUri={appContext.request}
    />,
    document.getElementById("root")
  );
});

// const valueSetDB = {};

// // get the URL parameters received from the authorization server
// const state = urlUtils.getUrlParameter("state"); // session key
// const code = urlUtils.getUrlParameter("code"); // authorization code

// // load the app parameters stored in the session
// const params = JSON.parse(sessionStorage[state]); // load app session
// const tokenUri = params.tokenUri;
// const clientId = params.clientId;
// const secret = params.secret;
// const serviceUri = params.serviceUri;
// const redirectUri = params.redirectUri;
// const patientIdfromAppParams = params.patientId;

// // Prep the token exchange call parameters
// const data = new URLSearchParams();
// data.append("code", code);
// data.append("grant_type", "authorization_code");
// data.append("redirect_uri", redirectUri);
// if (!secret) data.append("client_id", clientId);

// const headers = {
//   "Content-Type": "application/x-www-form-urlencoded"
// };
// if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

// // obtain authorization token from the authorization service using the authorization code
// // fetch(tokenUri, {
// //   method: "POST",
// //   headers: headers,
// //   body: data.toString()
// // })
// //   .then(res => res.json())
// //   // should get back the access token and maybe the patient ID
// //   .then(function (auth_response) {
// //     const patientId = patientIdfromAppParams || auth_response.patient;
// //     if (patientId == null) {
// //       errorMsg = "Failed to get a patientId from the app params or the authorization response.";
// //       document.body.innerText = errorMsg;
// //       console.error(errorMsg);
// //       return;
// //     }
// //     var smart = FHIR.client({
// //       serviceUrl: serviceUri,
// //       patientId: patientId,
// //       auth: {
// //         type: "bearer",
// //         token: auth_response.access_token
// //       }
// //     });
// //     go(smart);
// //   });

// function go(smart) {
//   const elmExecutor = buildElmExecutor(smart, "dstu2");
//   // elmExecutor(
//   //   demoElm,
//   //   valueSetDB,
//   //   function(results) {
//   //     console.log("RESULTS", results);
//   //     document.body.innerHTML = "RESULTS<pre>" + JSON.stringify(results, null, 2) + "</pre>";
//   //   },
//   //   function(error) {
//   //     console.error("ERROR", error);
//   //     document.body.innerHTML = "ERROR<pre>" + JSON.stringify(error, null, 2) + "</pre>";
//   //   }
//   // );
//   //ReactDOM.render(<App />, document.getElementById("root"));
// }
