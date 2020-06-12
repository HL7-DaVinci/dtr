import "url-search-params-polyfill";
function doSearch(smart, type, fhirVersion, request, callback) {
  const q = {};
  let usePatient = true;
  // setup the query for Practitioner and Coverage
  switch (type) {
    case "Practitioner":
      let performer;
      if (request.resourceType === "DeviceRequest") {
        performer = request.performer && request.performer.reference;
      } else if (request.resourceType === "ServiceRequest") {
        performer = request.performer[0] && request.performer[0].reference;
      } else if (request.resourceType === "MedicationRequest") {
        performer = request.requester && request.requester.reference;
      }

      q._id = performer;
      if( performer.includes("PractitionerRole")){
          q._id = null;
      } else if( performer.includes("Practitioner")) {
        q._id = performer.split("/")[1];
      }
      smart.request(performer,{resolveReferences:"practitioner",flat:true}).then((result)=>{
          if(result && result.practitioner) {
              request.performer = {"reference": "Practitioner/" + result.practitioner.id};
            callback([result.practitioner]);
          }

      });
      usePatient = false;
      console.log(q._id);
      break;
    case "Coverage":
      switch (fhirVersion.toUpperCase()) {
        case "STU3":
          if (request.extension) {
            if (request.extension.length > 0) {
              q._id =
                request.extension[0] &&
                request.extension[0].valueReference &&
                request.extension[0].valueReference.reference;
              console.log(q._id);
            } else {
              console.log("No extension/coverage found!");
            }
          }
          break;
        case "R4":
          if (request.insurance) {
            if (request.insurance.length > 0) {
              q._id = request.insurance[0] && request.insurance[0].reference;
              console.log(q._id);
            } else {
              console.log("No insurance/coverage found!");
            }
          }
          break;
        default:
          // unknown version
          break;
      }
  }

  // If this is for Epic, there are some specific modifications needed for the queries to work properly
  if (
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES &&
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES.toLowerCase() === "true"
  ) {
    switch (type) {
      case "Observation":
        // Epic requires you to specify a category or code search parameter, so search on all categories
        q.category = [
          "social-history",
          "vital-signs",
          "imaging",
          "laboratory",
          "procedure",
          "survey",
          "exam",
          "therapy"
        ].join(",");
        break;
      case "MedicationOrder":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = [
          "active",
          "completed",
          "stopped",
          "on-hold",
          "draft",
          "entered-in-error"
        ].join(",");
        break;
      case "MedicationStatement":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = ["active", "completed", "intended", "entered-in-error"].join(
          ","
        );
        break;
      default:
      //nothing
    }
  }
  const query = new URLSearchParams();
  Object.keys(q).forEach((parameter)=>{
      query.set(parameter, q[parameter]);
  });
  if( usePatient ) {
    smart.patient.request(`${type}?${query}`)
    .then(processSuccess(smart, [], callback), processError(smart, callback));
  } else if(q._id){
    smart.request(`${type}?${query}`)
    .then(processSuccess(smart, [], callback), processError(smart, callback));   
  }

}

function processSuccess(smart, resources, callback) {
  return response => {
    if (response && response.resourceType === "Bundle") {
      if (response.entry) {
        response.entry.forEach(function(e) {
          resources.push(e.resource);
        });
      }
      if (
        response.link &&
        response.link.some(l => l.relation === "next" && l.url != null)
      ) {
        // There is a next page, so recursively process that before we do the callback
        smart.request(response.link.find((e)=>{e.relation==="next";}))
          .then(processSuccess(smart, resources, callback), processError(smart, callback));
      } else {
        callback(resources);
      }
    } else {
      callback(null, new Error("Failed to parse response", response));
    }
  };
}

function processError(smart, callback) {
  return error => {
    callback(null, error);
  };
}

function buildPopulatedResourceBundle(
  smart,
  neededResources,
  fhirVersion,
  request,
  consoleLog
) {
  return new Promise(function(resolve, reject) {
    console.log("waiting for patient");
    consoleLog("waiting for patient", "infoClass");

    consoleLog(smart.patient.id, "infoClass");
    smart.patient.read().then(
      pt => {
        console.log("got pt", pt);
        consoleLog("got pt:" + pt, "infoClass");
        const entryResources = [pt];
        const readResources = (neededResources, callback) => {
          const r = neededResources.pop();
          if (r == null) {
            callback();
          } else if (r === "Patient") {
            readResources(neededResources, callback);
          } else {
            doSearch(smart, r, fhirVersion, request, (results, error) => {
              if (results) {
                entryResources.push(...results);
              }
              if (error) {
                const resourceError = new Error(error);
                if(resourceError.message.includes("OperationOutcome")) {
                    let splitError = resourceError.message.split("{");
                    splitError[0] = "";
                    splitError = splitError.join("{");
                    consoleLog("Error fetching resource", "errorClass", JSON.parse(splitError));
                }else{
                    consoleLog("Error fetching resource", "errorClass", resourceError.message);
                }
              }
              readResources(neededResources, callback);
            });
          }
        };

        readResources(neededResources.slice(), () => {
          const bundle = {
            resourceType: "Bundle",
            type: "collection",
            entry: entryResources.map(r => ({ resource: r }))
          };
          resolve(bundle);
        });
      },
      error => {
        consoleLog("error: " + error, "errorClass", `failed to fetch patient ${smart.patient.id}`);
        console.log(error);
        reject(error);
      }
    );
  });
}

export default buildPopulatedResourceBundle;