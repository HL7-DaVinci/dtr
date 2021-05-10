import "isomorphic-fetch";
import { buildFhirUrl } from "./util";

function fetchArtifacts(fhirPrefix, filePrefix, questionnaireReference, fhirVersion, smart, consoleLog) {

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
      mainLibraryMaps: null
    };

    function resolveIfDone(){
      if (pendingFetches != 0) return;
      if (retVal.questionnaire && retVal.mainLibraryElms) resolve(retVal);
      else reject("Failed to fetch all artifacts.");
    }

    //fetch questionnaire and all elms
    const questionnaireUrl = buildFhirUrl(questionnaireReference, fhirPrefix, fhirVersion);

    pendingFetches += 1;
    consoleLog("fetching questionnaire and elms", "infoClass");
    consoleLog(questionnaireUrl, "infoClass");
    fetch(questionnaireUrl).then(handleFetchErrors).then(r => r.json())
    .then(questionnaire => {
      consoleLog("fetched questionnaire successfully","infoClass");
      // consoleLog(JSON.stringify(questionnaire),"infoClass");
      retVal.questionnaire = questionnaire;
      fetchedUrls.add(questionnaireUrl);
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
      pendingFetches -= 1;
      consoleLog("fetched elms", "infoClass");
      resolveIfDone();

    })
    .catch(err => {
      console.log("error doing fetch():", err);
      reject(err);
    });

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

export default fetchArtifacts;