import urlUtils from "./util/url";
import {postToLogs, updateLog, getClients} from "./util/util";
let clients = [];
getClients(logCallback);
const log = {status:"launching"};

var secret = null; // set me, if confidential
// These parameters will be received at launch time in the URL
log.launchContextId = urlUtils.getUrlParameter("launch");
log.serviceUri = urlUtils.getUrlParameter("iss");

function logCallback(c) {
    clients = c.reduce((obj, item) => (obj[item.name] = item.client, obj) ,{});
    postToLogs(log, callback);
}

function callback(log) {
    log.status = "fetch clients";
    // Change this to the ID of the client that you registered with the SMART on FHIR authorization server.
    var clientId = "7c47a01b-b7d8-41cf-a290-8ed607108e70"; // local client
    // clientId = "c7ecff8d-5e91-48f2-b22e-f423c0c4c009"
    localStorage.setItem("lastAccessedServiceUri", log.serviceUri);
    if(clients) {
        if(clients[log.serviceUri]) {
            clientId = clients[log.serviceUri];
        }else if(clients["default"]){
            clientId = clients["default"];
        }else{
            const errorMsg = "no client id found in local storage, please go to the /register page to register a client id, or verify that the default clientId string in the code is correctly typed.";
            log.error = errorMsg;
            updateLog(log);
        }
    }else{
        log.error = "unable to access clients";
        updateLog(log);
    }

    log.clientId = clientId;
    // The scopes that the app will request from the authorization server
    // encoded in a space-separated string:
    //      1. permission to read all of the patient's record
    //      2. permission to launch the app in the specific context
    log.scope = ["launch","user/Observation.read","user/Patient.read","patient/Observation.read","patient/Patient.read","patient/Coverage.read", "patient/Condition.read", "user/Practitioner.read" ].join(" ");

    // Generate a unique session key string (here we just generate a random number
    // for simplicity, but this is not 100% collision-proof)
    var state = Math.round(Math.random() * 100000000).toString();

    // To keep things flexible, let's construct the launch URL by taking the base of the
    // current URL and replace "launch.html" with "index.html".
    var launchUri = window.location.protocol + "//" + window.location.host + window.location.pathname;
    log.redirectUri = launchUri.replace("launch", "index");

    log.status = "retrieving conformance statement";
    updateLog(log);
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
        log.error = "Unable to parse conformance statement.";
        updateLog(log);
        document.body.innerText = log.error;
        return;
        }
        redirect(conformanceStatement);
    } else {
        log.error = "Conformance statement request failed. Returned status: " + conformanceGet.status;
        updateLog(log);
        document.body.innerText = log.error;
        return;
    }
    };
    conformanceGet.send();

    function redirect(conformanceStatement) {
    log.status = "redirecting";
    updateLog(log);
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
        tokenUri: tokenUri,
        log: log
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