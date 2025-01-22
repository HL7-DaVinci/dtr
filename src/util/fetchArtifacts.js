import "isomorphic-fetch";
import { buildFhirUrl, isRequestReference } from "./util";
function fetchArtifactsOperation(order, coverage, questionnaire, smart, consoleLog, containedQuestionnaire) {
  // fetch from operation
  // parse return parameters similar to function below
  return new Promise(function(resolve, reject) {

    const elmLibraryMaps = new Map();
    const retVal = {
      questionnaire: null,
      order: null,
      mainLibraryElms: [],
      dependentElms: [],
      valueSets: [],
      mainLibraryMaps: null,
      isAdaptiveFormWithoutExtension: false
    };

    // handles errors from api calls
    function handleFetchErrors(response) {
      if (!response.ok) {
        let msg = "Failure when fetching resource";
        let details = `${msg}: ${response.url}: the server responded with a status of ${response.status}`;
        consoleLog(details, "errorClass");
        reject({message: msg, details: details, response: response});
      }
      return response;
    }

    function completeOperation(orderResource) {
      const parameters = {
        "resourceType": "Parameters",
        "meta": {
          "profile": [
            "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-qpackage-input-parameters"
          ]
        },
        "parameter": []
      }
      retVal.order = orderResource;
      parameters.parameter.push({"name": "order", "resource": orderResource})
      smart.request(coverage).then((coverage) => {
        parameters.parameter.push({"name": "coverage", "resource": coverage});
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(parameters)
        };
        fetch(`${questionnaire}/$questionnaire-package`, requestOptions)
          // .then(handleFetchErrors)
          .then((e)=> {return e.json()})
          .then((result) => {
            // TODO: Handle multiple questionnaires
            let bundleEntries = [];
            if (result && result.resourceType === "Bundle") {
              bundleEntries = result.entry;
            } else if (result && result.resourceType === "Parameters") {
              bundleEntries = (result.parameter || []).find(p => p.name === "PackageBundle" || p.name === "return")?.resource?.entry;
            } else if (result && result.status === 500 && result.message) {
              throw new Error(result.message);
            } else {
              throw new Error("Unexpected response from $questionnaire-package operation.");
            }

            if (!bundleEntries) {
              throw new Error("No package bundle found in response.");
            }

            let questionnaire;
  
            if (containedQuestionnaire) {
              retVal.questionnaire = containedQuestionnaire;
              questionnaire = containedQuestionnaire;
            } else {            
              questionnaire = bundleEntries.find((e) => e.resource.resourceType === "Questionnaire")?.resource;
              retVal.questionnaire = questionnaire;
            }

            retVal.isAdaptiveFormWithoutExtension = questionnaire.extension && questionnaire.extension.length > 0;
  
            findQuestionnaireEmbeddedCql(questionnaire.item);
            searchBundle(questionnaire, bundleEntries);
            console.log(retVal);
            resolve(retVal);
          })
          .catch((error) => {
            console.error("Unexpected error during $questionnaire-package operation:", error);
            consoleLog(error.message ? error.message : error, "errorClass", error);
            reject(error);
          });
      })
    }

    function searchBundle(questionnaire, bundleEntries) {
      if (questionnaire.extension !== undefined) {
        // grab all main elm urls
        // R4 resources use cqf library. 
        var mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqf-library")
          .map(lib => lib.valueCanonical);
        bundleEntries.forEach((entry) => {
          var resource = entry.resource;
          if(resource.resourceType === "Library") {
            const base64elmData = resource.content.filter(c => c.contentType == "application/elm+json")[0].data;
            // parse the json string
            let elm = JSON.parse(Buffer.from(base64elmData, 'base64'));
            if (mainElmReferences.find((mainElmReference) => {
              return resource.url === mainElmReference
            })){
              // set the elm where it needs to be
              retVal.mainLibraryElms.push(elm);
              elmLibraryMaps[elm.library.identifier.id] = resource;
              retVal.mainLibraryMaps = elmLibraryMaps;
            } else {
              retVal.dependentElms.push(elm);
            }
          } else if(resource.resourceType === "ValueSet") {
            retVal.valueSets.push(resource);
          }
        })
        // mainElmReferences.forEach((mainElmReference) => {
        //   console.log(mainElmReference);
        //   var libraryResource = bundle.find((e)=>{return e.resource.url === mainElmReference})?.resource;
        //   if(libraryResource) {
        //     const base64elmData = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].data;
        //     Buffer.from(base64elmData, 'base64');

        //     // parse the json string
        //     let elm = JSON.parse(elmString);

        //     // set the elm where it needs to be
        //     retVal.mainLibraryElms.push(elm);
        //     elmLibraryMaps[elm.library.identifier.id] = libraryResource;
        //     retVal.mainLibraryMaps = elmLibraryMaps;
        //   }

        // });
      }
    }
    // recursively searches questionnaire for 
    // embedded cql and puts it in the main 
    // elm library list
    function findQuestionnaireEmbeddedCql(inputItems) {
      if(!inputItems) {
        return;
      }
      inputItems.forEach(item => {
        const itemExtensions = item.extension;
        if(item.extension) {
          let findEmbeddedCql = item.extension.find(ext => 
            ext.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression" 
            && ext.valueExpression && ext.valueExpression.language === "application/elm+json");
    
          if(findEmbeddedCql) {
            const itemLibrary = JSON.parse(findEmbeddedCql.valueExpression.expression);
            itemLibrary.library.identifier= {
              id: "LibraryLinkId" + item.linkId,
              version: "0.0.1"
            };
            elmLibraryMaps[itemLibrary.library.identifier.id] = itemLibrary;
            retVal.mainLibraryMaps = elmLibraryMaps;
            retVal.mainLibraryElms.push(itemLibrary);
          }
        } 
        
        if(item.item !== undefined && item.item.length > 0) {
          findQuestionnaireEmbeddedCql(item.item);
        }
      });
    }

    if(isRequestReference(order)) {
      smart.request(order).then((orderResource) => {
        completeOperation(orderResource);
      })
    } else {
      const orderResource = JSON.parse(order.replace(/\\/g,""));
      completeOperation(orderResource)
    }

  })
}

function fetchArtifacts(questionnaireReference, fhirVersion, smart, consoleLog, isContainedQuestionnaire) {

  return new Promise(function(resolve, reject) {
    function handleFetchErrors(response) {
      if (!response.ok) {
        let msg = "Failure when fetching resource";
        let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
        consoleLog(msg, "errorClass", details);
        reject(msg);
      }
      return response;
    }

    const fetchedUrls = new Set();
    const elmLibraryMaps = new Map();
    let pendingFetches = 0;

    const retVal = {
      questionnaire: null,
      mainLibraryElms: [],
      dependentElms: [],
      valueSets: [],
      mainLibraryMaps: null,
      isAdaptiveFormWithoutExtension: false
    };

    function resolveIfDone(){
      if (pendingFetches != 0) return;
      if (retVal.questionnaire && retVal.mainLibraryElms) resolve(retVal);
      else reject("Failed to fetch all artifacts.");
    }

    function findQuestionnaireEmbeddedCql(inputItems) {
      if(!inputItems) {
        return;
      }
      inputItems.forEach(item => {
        const itemExtensions = item.extension;
        if(item.extension) {
          let findEmbeddedCql = item.extension.find(ext => 
            ext.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression" 
            && ext.valueExpression && ext.valueExpression.language === "application/elm+json");
    
          if(findEmbeddedCql) {
            const itemLibrary = JSON.parse(findEmbeddedCql.valueExpression.expression);
            itemLibrary.library.identifier= {
              id: "LibraryLinkId" + item.linkId,
              version: "0.0.1"
            };
            elmLibraryMaps[itemLibrary.library.identifier.id] = itemLibrary;
            retVal.mainLibraryMaps = elmLibraryMaps;
            retVal.mainLibraryElms.push(itemLibrary);
          }
        } 
        
        if(item.item !== undefined && item.item.length > 0) {
          findQuestionnaireEmbeddedCql(item.item);
        }
      });
    }

    pendingFetches += 1;
    consoleLog("fetching questionnaire and elms", "infoClass");
    consoleLog(questionnaireReference, "infoClass");
    if (!isContainedQuestionnaire) {
      fetch(questionnaireReference).then(handleFetchErrors).then(r => r.json())
        .then(questionnaire => {
          consoleLog("fetched questionnaire successfully", "infoClass");
          // consoleLog(JSON.stringify(questionnaire),"infoClass");
          retVal.questionnaire = questionnaire;
          retVal.isAdaptiveFormWithoutExtension = questionnaire.extension && questionnaire.extension.length > 0;

          fetchedUrls.add(questionnaireReference);

          findQuestionnaireEmbeddedCql(questionnaire.item);

          if (questionnaire.extension !== undefined) {
            // grab all main elm urls
            // R4 resources use cqf library. 
            var mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqf-library")
              .map(lib => lib.valueCanonical);

            if (mainElmReferences == null || mainElmReferences.length == 0) {
              // STU3 resources use cqif library.
              mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqif-library")
                .map(lib => lib.valueReference.reference);
            }

            mainElmReferences.forEach((mainElmReference) => {
              const mainElmUrl = buildFhirUrl(mainElmReference, fhirPrefix, fhirVersion);
              fetchElm(mainElmUrl, true);
            });
          }
          pendingFetches -= 1;
          consoleLog("fetched elms", "infoClass");
          resolveIfDone();

        })
        .catch(err => {
          console.log("error doing fetch():", err);
          reject(err);
        });
    } else {
        const questionnaire = questionnaireReference;
        consoleLog("Questionnaire is provided");
        consoleLog(JSON.stringify(questionnaire));
        retVal.questionnaire = questionnaire;
        retVal.isAdaptiveFormWithoutExtension = questionnaire.extension && questionnaire.extension.length > 0;

        //fetchedUrls.add(questionnaireReference);

        findQuestionnaireEmbeddedCql(questionnaire.item);
        
        if (questionnaire.extension !== undefined) {
          // grab all main elm urls
          // R4 resources use cqf library. 
          var mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqf-library")
            .map(lib => lib.valueCanonical);

          if (mainElmReferences == null || mainElmReferences.length == 0) {
            // STU3 resources use cqif library.
            mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqif-library")
              .map(lib => lib.valueReference.reference);
          }

          mainElmReferences.forEach((mainElmReference) => {
            const mainElmUrl = buildFhirUrl(mainElmReference, fhirPrefix, fhirVersion);
            fetchElm(mainElmUrl, true);
          });
        }
        pendingFetches -= 1;
        consoleLog("fetched elms", "infoClass");
        resolveIfDone();
      }
    
  

    function fetchElm(libraryUrl, isMain = false){
      if (libraryUrl in fetchedUrls) return;

      pendingFetches += 1;
      consoleLog("about to fetchElm (Library): " + libraryUrl, libraryUrl);
      fetch(libraryUrl).then(handleFetchErrors).then(r => r.json())
      .then(libraryResource => {
        fetchedUrls.add(libraryUrl);
        fetchRelatedElms(libraryResource);
        fetchRequiredValueSets(libraryResource);
        fetchElmFile(libraryResource, isMain);
        consoleLog("fetched Elm","infoClass");
        // consoleLog(JSON.stringify(libraryResource),"infoClass")
        pendingFetches -= 1;
        resolveIfDone();
      })
      .catch(err => {
        console.log("error fetching ELM:", err);
        reject(err);
      });
    }

    function fetchRelatedElms(libraryResource){
      if (libraryResource.relatedArtifact == null) return;
      const libReferences = libraryResource.relatedArtifact.filter(a => a.type == "depends-on").map(a => a.resource);
      libReferences.forEach(libReference => {
        const libUrl = buildFhirUrl(libReference, fhirPrefix, fhirVersion);
        fetchElm(libUrl);
      });
    }

    // Fetch any valuesets required for this library
    function fetchRequiredValueSets(libraryResource) {
      if (libraryResource.dataRequirement == null) return;
      // look at the dataRequirement attribute in the library if it exists. This explains the resources it requires
      // for evaluation and one or more code filters that may be used.
      // TODO: allow this to look at multiple code filters.
      const dataRequirementsWithValuesets = libraryResource.dataRequirement.filter(dr => dr.codeFilter != null && dr.codeFilter[0].valueSet != null);
      const valueSetUrls = dataRequirementsWithValuesets.map(dr => dr.codeFilter[0].valueSet);
      valueSetUrls.forEach(valueSetUrl => {
        // assume that the valueSets are canonical URLs that we need to ask the fhir server for an expansion
        fetchValueSet(buildFhirUrl("ValueSet/$expand?url=" + valueSetUrl, fhirPrefix, fhirVersion));
      });
    }

    // Fetch a FHIR value set
    function fetchValueSet(valueSetUrl) {
      pendingFetches += 1;
      consoleLog("about to fetchValueSet:", valueSetUrl);
      fetch(valueSetUrl).then((response) => {
        if (!response.ok) {
          let msg = "Failure when fetching ValueSet " + valueSetUrl + " Make sure CRD has ValueSets Loaded.";
          let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
          consoleLog(msg, "errorClass", details);
          reject(msg);
        }
        return response;
      }).then(r => r.json())
      .then(valueSet => {
        pendingFetches -= 1;
        fetchedUrls.add(valueSetUrl);
        retVal.valueSets.push(valueSet);
        resolveIfDone();
      })
      .catch(err => {
        console.log("error in fetchValueSet:  ", err);
        reject(err);
      });
    }

    function fetchElmFile(libraryResource, isMain){
      if (libraryResource.content[0].url == null) {
        consoleLog("processing the embedded elmFile: " + libraryResource.id);

        // do the direct base64 method instead
        const base64elmData = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].data;

        // base64 decode
        let elmString = atob(base64elmData);

        // parse the json string
        let elm = JSON.parse(elmString);

        // set the elm where it needs to be
        if (isMain) {
          retVal.mainLibraryElms.push(elm);
          elmLibraryMaps[elm.library.identifier.id] = libraryResource;
          retVal.mainLibraryMaps = elmLibraryMaps;
        } else {
          retVal.dependentElms.push(elm);
        }
        resolveIfDone();

      } else {
        // fetch the data
        const elmUri = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].url;
        let elmUrl = buildFileUrl(elmUri);

        pendingFetches += 1;
        consoleLog("about to fetchElmFile: " + elmUrl, elmUrl);
        fetch(elmUrl).then(handleFetchErrors).then(r => r.json())
        .then(elm => {
          if ( elm.library.annotation ) {
            let errors = elm.library.annotation.filter(a => a.type == "CqlToElmError" && a.errorSeverity != "warning");
            if (errors.length > 0) {
              let msg = "CQL to ELM translation resulted in errors.";
              let details = { "ELM annotation": elm.library.annotation };
              consoleLog(msg, "errorClass", details);
              reject(msg);
            }
          }
          pendingFetches -= 1;
          fetchedUrls.add(elmUri);
          if (isMain) {
            retVal.mainLibraryElms.push(elm);
            elmLibraryMaps[elm.library.identifier.id] = libraryResource;
            retVal.mainLibraryMaps = elmLibraryMaps;
          } else {
            retVal.dependentElms.push(elm);
          }
          resolveIfDone();
        })
        .catch(err => {
          console.log("error in fetchElmFile:  ", err);
          reject(err);
        });
      }
    }

    function buildFileUrl(file) {
      return filePrefix + file;
    }
  });
}

function fetchFromQuestionnaireResponse(response, smart) {
  const relaunchContext = {
    questionnaire: null,
    order: null,
    coverage: null,
    response: null,
  }

  return new Promise(function(resolve, reject) {
    smart.request(response).then((res) => {
      console.log(res);
      relaunchContext.questionnaire = res.questionnaire;
      relaunchContext.response = res;
      if(res.extension) {
        const extensions = res.extension.filter((ext) => ext.url === "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/context")
        extensions.forEach((ext) => {
          if(ext.valueReference.type === "Coverage") {
            relaunchContext.coverage = ext.valueReference.reference;
          } else {
            relaunchContext.order = ext.valueReference.reference;
          }
        })
      }
      resolve(relaunchContext);
    })
  })

}

function searchByOrder(order, smart) {
  let requestId;
  if(isRequestReference(order)){
    requestId = order;
  } else {
    const orderResource = JSON.parse(order.replace(/\\/g,""));
    requestId = `${orderResource.resourceType}/${orderResource.id}`
  }
  return new Promise(function(resolve, reject) {
    smart.request(`QuestionnaireResponse?context=${requestId}`).then((res) => {
      if(res.entry) {
        resolve(res.entry)
      }
    })
  })
}

export {
  fetchArtifacts,
  fetchArtifactsOperation,
  fetchFromQuestionnaireResponse,
  searchByOrder
};