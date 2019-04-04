import "whatwg-fetch"; // a window.fetch polyfill
import "fhirclient"; // sets window.FHIR
import demoElm from "./cql/Demo.json";
import buildElmExecutor from "./elmExecutor/buildElmExecutor";
import urlUtils from "./util/url";

import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";

ReactDOM.render(<App />, document.getElementById("root"));

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
