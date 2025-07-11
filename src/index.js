import {oauth2} from "fhirclient";
import urlUtils from "./util/url";
import {updateLog} from "./util/util";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Alert } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import theme from "./theme";
console.log("completed imports");
// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code
const smartKey = sessionStorage.getItem("SMART_KEY");

// Need either an existing session smart client key or a state/code pair
if (!smartKey && !(state && code)) {
  renderLaunchHelpPage();
}

// Otherwise we can attempt to authorize and render the form
else {

  // load the app parameters stored in the session
  // const params = JSON.parse(sessionStorage[state]); // load app session
  // console.log('params:', params);
  let log = JSON.parse(sessionStorage.getItem("currentLog"));
  if (!log) {
    log = {}
  }
  // const tokenUri = params.tokenUri;
  // const clientId = params.clientId;
  // const secret = params.secret;
  // const serviceUri = params.serviceUri;
  // sessionStorage["serviceUri"] = serviceUri;
  // const redirectUri = params.redirectUri;
  log.status = "redirected";
  const standalone = sessionStorage.getItem("launchContextId") ? false : true;
  console.log("Standalone:", standalone);
  updateLog(log);


  log.status = "Authorizing";
  // Use SMART client to handle the authorization code exchange
  oauth2.ready()
    .then((smart) => {
      console.log("SMART client ready:", smart);
      updateLog(log);
      log.status = "Parsing context";
      
      // Get the token response from the SMART client
      const auth_response = smart.state.tokenResponse;
      
      updateLog(log);
      let appContext = {};
      
      // Parse SMART on FHIR token response
      try {
        // Extract standard SMART on FHIR context parameters from token response
        if (auth_response.patient) {
          appContext.patient = auth_response.patient;
          log.patient = auth_response.patient;
        }
        
        if (auth_response.encounter) {
          appContext.encounter = auth_response.encounter;
        }
        
        // Handle fhirContext array
        if (auth_response.fhirContext && Array.isArray(auth_response.fhirContext)) {
          // Store the full fhirContext array - this contains the references that will be used for fetching
          appContext.fhirContext = auth_response.fhirContext;
          
          // For convenience, extract commonly used resources by type (for backwards compatibility)
          auth_response.fhirContext.forEach(contextItem => {
            if (contextItem.reference) {
              // Extract resource type from reference (e.g., "DiagnosticReport/123")
              const referenceParts = contextItem.reference.split('/');
              if (referenceParts.length >= 2) {
                const resourceType = referenceParts[0].toLowerCase();
                
                switch (resourceType) {
                  case 'questionnaire':
                    appContext.questionnaire = contextItem.reference;
                    break;
                  case 'servicerequest':
                  case 'devicerequest':
                  case 'medicationrequest':
                  case 'nutritionorder':
                    // These could be "orders" in DTR context
                    if (!appContext.order) {
                      appContext.order = contextItem.reference;
                    }
                    break;
                  case 'coverage':
                    appContext.coverage = contextItem.reference;
                    break;
                }
              }
            }
            
            if (contextItem.canonical) {
              // Handle canonical URLs (e.g., for Questionnaires)
              if (contextItem.type && contextItem.type.toLowerCase() === 'questionnaire') {
                appContext.questionnaire = contextItem.canonical;
              }
            }
          });
        }
        
        // Extract other standard launch context parameters
        if (auth_response.need_patient_banner !== undefined) {
          appContext.need_patient_banner = auth_response.need_patient_banner;
        }
        
        if (auth_response.intent) {
          appContext.intent = auth_response.intent;
        }
        
        if (auth_response.smart_style_url) {
          appContext.smart_style_url = auth_response.smart_style_url;
        }
        
        if (auth_response.tenant) {
          appContext.tenant = auth_response.tenant;
        }
        
        // Handle legacy appContext parsing if present for backwards compatibility
        if (auth_response.appContext) {
          try {
            const encodedAppString = auth_response.appContext.replace(/\+/g, "%20");
            const appString = decodeURIComponent(encodedAppString);
            appString.split("&").map((e)=>{
                const temp = e.split("=");
                // Don't override SMART context with legacy context
                if (!appContext[temp[0]]) {
                  appContext[temp[0]] = temp[1];
                }
            });
          } catch (e) {
            console.log("Failed to parse legacy appContext, continuing with standard SMART context");
          }
        }
        
        log.appContext = appContext;
        console.log("Parsed SMART launch context:", appContext);
      } catch (e) {
          log.error = "error parsing token response context";
          console.log("failed to parse token response context:", e);
          updateLog(log);
          throw e;
      }

      
      const patientId = appContext.patient || log.patient;
      console.log("appContext", appContext);
      console.log('standalone', standalone);
      console.log('smart', smart);
      console.log('patientId', patientId);
      log.status = "Rendering app";
      updateLog(log);
      console.log(patientId);
      
      // log could be passed to app, but we can
      // TODO that because we've already got some
      // functionality in that portion of the app
      // and don't really need logs past this point
      // too badly.
      const container = document.getElementById("root");
      const root = createRoot(container);
      root.render(
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App
            appContext={appContext}
            standalone={standalone}
            smart={smart}
            patientId={patientId}
          />
        </ThemeProvider>
      );
      
      console.log(smart.state.tokenResponse);
      if (patientId == null && !standalone) {
        log.error = "Failed to get a patientId from the app params or the authorization response.";
        document.body.innerText = log.error;
        updateLog(log);
        return;
      }
      return patientId;
    })
    .catch((error) => {
      log.error = "SMART authorization failed: " + error.message;
      document.body.innerText = log.error;
      updateLog(log);
    });

}



function renderLaunchHelpPage(error) {

  if (error) {
    console.log("Error:", error);
  }
  else {
    console.log('Missing state or code parameters, rendering launch help page');
  }

  const container = document.getElementById("root");
  const root = createRoot(container);
  root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {error ? (
          <Alert severity="error" sx={{ margin: 2 }}>
            <h4>Error</h4>
            <p>{error}</p>
          </Alert>
        ) : null}

        <Alert severity="info" sx={{ margin: 2 }}>
          <h4>Launch Parameters Missing</h4>
          <p>This is a <a href="https://hl7.org/fhir/smart-app-launch/index.html">SMART on FHIR</a> application that requires the appropriate launch parameters.</p>
          <p>An example launch can be completed through the <a href="https://crd-request-generator.davinci.hl7.org">CRD Request Generator</a>.</p>
        </Alert>
      </ThemeProvider>
  );
}

