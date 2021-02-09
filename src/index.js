import '@babel/polyfill'
import 'react-app-polyfill/ie11';
import FHIR from "fhirclient"
import urlUtils from "./util/url";
import {updateLog} from "./util/util";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
console.log("completed imports");
// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code
// load the app parameters stored in the session
const params = JSON.parse(sessionStorage[state]); // load app session
const log = params.log;
const tokenUri = params.tokenUri;
const clientId = params.clientId;
const secret = params.secret;
const serviceUri = params.serviceUri;
sessionStorage["serviceUri"] = serviceUri;
const redirectUri = params.redirectUri;
log.status = "redirected";
const standalone = log.launchContextId ? false : true;
console.log("STANDALONE");
console.log(standalone);
updateLog(log);
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
const tokenPost = new XMLHttpRequest();
var auth_response;
tokenPost.open("POST", tokenUri);
tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
tokenPost.onload = function() {
    updateLog(log);
    if (tokenPost.status === 200) {
      try {
  
        auth_response = JSON.parse(tokenPost.responseText);
        log.status = "Parsing appContext"
      } catch (e) {
        log.error = "Failed to parse auth response";
        document.body.innerText = log.error;
        updateLog(log);
        return;
      }

      updateLog(log);
      let appContext = {};
      try {
        // Fix + encoded spaces back to precent encoded spaces
        const encodedAppString = auth_response.appContext.replace(/\+/g, '%20');
        const appString = decodeURIComponent(encodedAppString);
        // Could switch to this later
        appString.split("&").map((e)=>{
            const temp = e.split("=");
            appContext[temp[0]] = temp[1];
        })
      } catch (e) {
          log.error = "error parsing app context, using default";
          console.log("failed to get appContext");
          appContext = {
            template: "Questionnaire/HomeOxygenTherapy",
            request: '{\\"resourceType\\":\\"DeviceRequest\\",\\"id\\":\\"ecea4560-e72c-4f69-8efd-b0f240ecef40\\",\\"meta\\":{\\"profile\\":[\\"http:\\/\\/hl7.org\\/fhir\\/us\\/davinci-crd\\/STU3\\/StructureDefinition\\/profile-devicerequest-stu3\\"]},\\"status\\":\\"draft\\",\\"codeCodeableConcept\\":{\\"coding\\":[{\\"system\\":\\"https:\\/\\/bluebutton.cms.gov\\/resources\\/codesystem\\/hcpcs\\",\\"code\\":\\"E0424\\"}]},\\"subject\\":{\\"reference\\":\\"Patient\\/e3uD6HlZwY69BYkprsNDh2Du7KroLDCIzX8uiCuKkahM3\\"},\\"authoredOn\\":\\"2019-12-30\\",\\"performer\\":{\\"reference\\":\\"Practitioner\\/1912007\\"}}',
            filepath: '../../getfile/cms/hcpcs/E0424'
            }
        }

        log.appContext = appContext;
        log.patient = auth_response.patient;
      
        var smart = FHIR.client({
        serverUrl: serviceUri,
        patientId: log.patient,
        tokenResponse: {
            type: "bearer",
            access_token: auth_response.access_token,
            patient: log.patient,
        }
        });

        log.status = "Rendering app";
        updateLog(log);
        const patientId = log.patient;
        console.log(patientId);
        // log could be passed to app, but we can 
        // TODO that because we've already got some
        // functionality in that portion of the app
        // and don't really need logs past this point
        // too badly.
        ReactDOM.render(
        <App
          FHIR_PREFIX={FHIR_PREFIX}
          FILE_PREFIX={FILE_PREFIX}
          appContext={appContext}
          standalone={standalone}
          smart={smart}
          patientId = {patientId}
        />,
        document.getElementById("root")
        );
        console.log(auth_response);
        if (patientId == null && !standalone) {
        log.error = "Failed to get a patientId from the app params or the authorization response.";
        document.body.innerText = log.error;
        updateLog(log);
        return;
        }
        return patientId;
    } else {
      log.error = "Token post request failed. Returned status: " + tokenPost.status;
      document.body.innerText = log.error;
      updateLog(log);
      return;
    }
  };
log.status = "Authorizing"
tokenPost.send(data);


