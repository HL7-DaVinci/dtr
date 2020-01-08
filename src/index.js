import '@babel/polyfill'
import FHIR from "fhirclient"
 // sets window.FHIR
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
const FHIR_PREFIX = "../../fhir/";
const FILE_PREFIX = "../../"
var data = `code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`;
// const data = new URLSearchParams();
// data.append("code", code);
// data.append("grant_type", "authorization_code");
// data.append("redirect_uri", redirectUri);
if (!secret) data += "&client_id=" + clientId;

const headers = {
  "Content-Type": "application/x-www-form-urlencoded"
};
if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

// obtain authorization token from the authorization service using the authorization code
alert("getting token");

const tokenPost = new XMLHttpRequest();
var auth_response;
tokenPost.open("POST", tokenUri);
tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
tokenPost.onload = function() {
    if (tokenPost.status === 200) {
      try {
  
        auth_response = JSON.parse(tokenPost.responseText);
        console.log(auth_response);
        alert("retrieved token");
      } catch (e) {
        const errorMsg = "Failed to parse auth response";
        document.body.innerText = errorMsg;
        console.error(errorMsg);
        return;
      }

      let appContext;
      try {
        const appString = decodeURIComponent(auth_response.appContext);
        alert(appString);
        appContext = {
            template: appString.split("&")[0].split("=")[1],
            request: JSON.parse(appString.split("&")[1].split("=")[1].replace(/\\/g,"")),
            filepath: appString.split("&")[2].split("=")[1]
          }
      } catch (e) {
          alert("error parsing app context, using default")
          appContext = {
            template: "urn:hl7:davinci:crd:home-oxygen-questionnaire",
            request: JSON.parse('{\\"resourceType\\":\\"DeviceRequest\\",\\"id\\":\\"ecea4560-e72c-4f69-8efd-b0f240ecef40\\",\\"meta\\":{\\"profile\\":[\\"http:\\/\\/hl7.org\\/fhir\\/us\\/davinci-crd\\/STU3\\/StructureDefinition\\/profile-devicerequest-stu3\\"]},\\"status\\":\\"draft\\",\\"codeCodeableConcept\\":{\\"coding\\":[{\\"system\\":\\"https:\\/\\/bluebutton.cms.gov\\/resources\\/codesystem\\/hcpcs\\",\\"code\\":\\"E0424\\"}]},\\"subject\\":{\\"reference\\":\\"Patient\\/e3uD6HlZwY69BYkprsNDh2Du7KroLDCIzX8uiCuKkahM3\\"},\\"authoredOn\\":\\"2019-12-30\\",\\"performer\\":{\\"reference\\":\\"PractitionerRole\\/100163717310\\"}}'.replace(/\\/g,"")),
            filepath: '../../getfile/cms/hcpcs/E0424'
            }
        }

      
        var smart = FHIR.client({
        serverUrl: serviceUri,
        patientId: auth_response.patient,
        tokenResponse: {
            type: "bearer",
            access_token: auth_response.access_token,
            patient: auth_response.patient,
        }
        });
        alert("rendering app");
        ReactDOM.render(
        <App
          FHIR_PREFIX={FHIR_PREFIX}
          FILE_PREFIX={FILE_PREFIX}
          questionnaireUri={appContext.template}
          smart={smart}
          deviceRequest={JSON.parse(appContext.request.replace(/\\/g,""))}
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
    return patientId;

};
tokenPost.send(data);


