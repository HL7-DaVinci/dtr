import urlUtils from "./util/url";
import {postToLogs} from "./util/util";
let storedJSON = JSON.parse(localStorage.getItem("dtrAppTempClientSet"));
const log = {status:"launching"};

var secret = null; // set me, if confidential
// These parameters will be received at launch time in the URL
log.launchContextId = urlUtils.getUrlParameter("launch");
log.serviceUri = urlUtils.getUrlParameter("iss");

postToLogs(log, callback);


function callback(log) {
    log.status = "fetch client";
    // Change this to the ID of the client that you registered with the SMART on FHIR authorization server.
    var clientId = "7c47a01b-b7d8-41cf-a290-8ed607108e70"; // local client
    // clientId = "c7ecff8d-5e91-48f2-b22e-f423c0c4c009"
    localStorage.setItem("lastAccessedServiceUri", log.serviceUri);
    if(storedJSON) {
        if(storedJSON[log.serviceUri]) {
            clientId = storedJSON[log.serviceUri];
        }else if(storedJSON["default"]){
            clientId = storedJSON["default"];
        }else{
            const errorMsg = "no client id found in local storage, please go to the /register page to register a client id, or verify that the default clientId string in the code is correctly typed.";
            log.error = errorMsg;
            console.log("The app could not find the appropriate client ID");
        }
    }else{
        log.error = "unable to access clients";
    }

    log.clientId = clientId;
    // The scopes that the app will request from the authorization server
    // encoded in a space-separated string:
    //      1. permission to read all of the patient's record
    //      2. permission to launch the app in the specific context
    log.scope = ["launch"].join(" ");

    // Generate a unique session key string (here we just generate a random number
    // for simplicity, but this is not 100% collision-proof)
    var state = Math.round(Math.random() * 100000000).toString();

    // To keep things flexible, let's construct the launch URL by taking the base of the
    // current URL and replace "launch.html" with "index.html".
    var launchUri = window.location.protocol + "//" + window.location.host + window.location.pathname;
    log.redirectUri = launchUri.replace("launch", "index");

    log.status = "retrieving conformance statement";
    // FHIR Service Conformance Statement URL
    var conformanceUri = log.serviceUri + "/metadata?_format=json";

    // Let's request the conformance statement from the SMART on FHIR API server and
    // find out the endpoint URLs for the authorization server
    let conformanceStatement;
    const conformanceGet = new XMLHttpRequest();
    conformanceGet.open("GET", conformanceUri);
    conformanceGet.setRequestHeader("Content-Type", "application/json");
    conformanceGet.setRequestHeader("Accept", "application/json");

    conformanceGet.onload = function() {
    if (conformanceGet.status === 200) {
        try {

        conformanceStatement = JSON.parse(conformanceGet.responseText);
        } catch (e) {
        const errorMsg = "Unable to parse conformance statement.";
        document.body.innerText = errorMsg;
        console.error(errorMsg);
        return;
        }
        redirect(conformanceStatement);
    } else {
        const errorMsg = "Conformance statement request failed. Returned status: " + conformanceGet.status;
        document.body.innerText = errorMsg;
        console.error(errorMsg);
        return;
    }
    };
    conformanceGet.send();

    function redirect(conformanceStatement) {
    var authUri, tokenUri;
    var smartExtension = conformanceStatement.rest[0].security.extension.filter(function(e) {
        return e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
    });

    smartExtension[0].extension.forEach(function(arg) {
        if (arg.url === "authorize") {
        authUri = arg.valueUri;
        } else if (arg.url === "token") {
        tokenUri = arg.valueUri;
        }
    });

    // retain a couple parameters in the session for later use
    sessionStorage[state] = JSON.stringify({
        clientId: clientId,
        secret: secret,
        serviceUri: log.serviceUri,
        redirectUri: log.redirectUri,
        tokenUri: tokenUri
    });

    // finally, redirect the browser to the authorizatin server and pass the needed
    // parameters for the authorization request in the URL
    window.location.href =
        authUri +
        "?" +
        "response_type=code&" +
        "client_id=" +
        encodeURIComponent(clientId) +
        "&" +
        "scope=" +
        encodeURIComponent(log.scope) +
        "&" +
        "redirect_uri=" +
        encodeURIComponent(log.redirectUri) +
        "&" +
        "aud=" +
        encodeURIComponent(log.serviceUri) +
        "&" +
        "launch=" +
        encodeURIComponent(log.launchContextId) +
        "&" +
        "state=" +
        state;
    }
}