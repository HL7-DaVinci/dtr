import "isomorphic-fetch";

function fetchArtifacts(fhirUriPrefix, questionnaireUri, smart, filepath, consoleLog) {
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

    const fetchedUris = new Set();
    let pendingFetches = 0;

    const retVal = {
      questionnaire: null,
      mainLibraryElms: [],
      dependentElms: [],
      valueSets: []
    };

    function resolveIfDone(){
      if (pendingFetches != 0) return;
      if (retVal.questionnaire && retVal.mainLibraryElms) resolve(retVal);
      else reject("Failed to fetch all artifacts.");
    }

    var fhirResources = false;
    if (filepath == null || filepath == "" || filepath == "_") {
      console.log("fhir resources mode");
      fhirResources = true;
    }

    //fetch questionnaire and all elms
    var questionnaireUrl = fhirUriPrefix+encodeURIComponent(questionnaireUri);
    if (!fhirResources) {
      questionnaireUrl = filepath + "/" + stripFilenameFromURI(questionnaireUri) + ".json";
    }

    pendingFetches += 1;
    consoleLog("fetching questionairre and elms", "infoClass");
    consoleLog(questionnaireUrl, "infoClass");
    fetch(questionnaireUrl).then(handleFetchErrors).then(r => r.json())
    .then(questionnaire => {
      consoleLog("fetched questionnaire successfully","infoClass");
      // consoleLog(JSON.stringify(questionnaire),"infoClass");
      retVal.questionnaire = questionnaire;
      fetchedUris.add(questionnaireUri);
      // grab all main elm urls
      const mainElmUris = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqif-library").map(lib => lib.valueReference.reference);
      mainElmUris.forEach((mainElmUri) => {
        fetchElm(mainElmUri, true);
      });
      pendingFetches -= 1;
      consoleLog("fetched elms", "infoClass");

    })
    .catch(err => {
      console.log("error doing fetch():", err);
      reject(err);
    });

    // fetch device request
    // if (deviceRequestIdOrUrl.includes("DeviceRequest/")){
    //   deviceRequestIdOrUrl.indexOf("DeviceRequest/");
    //   deviceRequestIdOrUrl = deviceRequestIdOrUrl.substr(deviceRequestIdOrUrl.indexOf("DeviceRequest/") + 14)
    // }
    // pendingFetches += 1;
    // smart.patient.api.read({type: "DeviceRequest", id: deviceRequestIdOrUrl})
    // .then(response => {
    //   pendingFetches -= 1;
    //   if (response.status !== "success") reject("Failed ot fetch device request.");
    //   retVal.deviceRequest = response.data;
    //   resolveIfDone()
    // }, err => reject(err))

    function fetchElm(libraryUri, isMain = false){
      if (libraryUri in fetchedUris) return;
      let libraryUrl = fhirUriPrefix+encodeURIComponent(libraryUri);
      if (!fhirResources) {
        libraryUrl = filepath + "/" + stripFilenameFromURI(libraryUri) + ".json";
      }

      pendingFetches += 1;
      fetch(libraryUrl).then(handleFetchErrors).then(r => r.json())
      .then(libraryResource => {
        fetchedUris.add(libraryUri);
        fetchRelatedElms(libraryResource);
        fetchRequiredValueSets(libraryResource);
        fetchElmFile(libraryResource, isMain);
        consoleLog("fetched Elm","infoClass");
        // consoleLog(JSON.stringify(libraryResource),"infoClass")
        pendingFetches -= 1;
      })
      .catch(err => {
        console.log("error fetching ELM:", err);
        reject(err);
      });
    }

    function fetchRelatedElms(libraryResource){
      if (libraryResource.relatedArtifact == null) return;
      const libUris = libraryResource.relatedArtifact.filter(a => a.type == "depends-on").map(a => a.resource.reference);
      libUris.forEach(libUri => fetchElm(libUri));
    }

    // Fetch any valuesets required for this library
    function fetchRequiredValueSets(libraryResource) {
      if (libraryResource.dataRequirement == null) return;
      // look at the dataRequirement attribute in the library if it exists. This explains the resources it requires
      // for evaluation and one or more code filters that may be used.
      // TODO: allow this to look at multiple code filters.
      const dataRequirementsWithValuesets = libraryResource.dataRequirement.filter(dr => dr.codeFilter != null && dr.codeFilter[0].valueSetReference != null);
      const valueSetUris = dataRequirementsWithValuesets.map(dr => dr.codeFilter[0].valueSetReference.reference);
      valueSetUris.forEach(valueSetUri => fetchValueSet(valueSetUri));
    }

    // Fetch a FHIR value set
    function fetchValueSet(valueSetUri) {
      if (valueSetUri in fetchedUris) return;
      let valueSetUrl = fhirUriPrefix+encodeURIComponent(valueSetUri);
      if (!fhirResources) {
        valueSetUrl = filepath + "/" + stripFilenameFromURI(valueSetUri) + ".json";
      }

      pendingFetches += 1;
      console.log("about to fetchValueSet:",valueSetUrl);
      fetch(valueSetUrl).then(handleFetchErrors).then(r => r.json())
      .then(valueSet => {
        pendingFetches -= 1;
        fetchedUris.add(valueSetUri);
        retVal.valueSets.push(valueSet);
        resolveIfDone();
      })
      .catch(err => {
        console.log("error in fetchValueSet:  ", err);
        reject(err);
      });
    }

    function fetchElmFile(libraryResource, isMain){
      const elmUri = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].url;
      if (elmUri in fetchedUris) return;
      let elmUrl = fhirUriPrefix+encodeURIComponent(elmUri);
      if (!fhirResources) {
        elmUrl = filepath + "/" + stripFilenameFromURI(elmUri);
      }

      pendingFetches += 1;
      console.log("about to fetchElmFile:",elmUrl);
      fetch(elmUrl).then(handleFetchErrors).then(r => r.json())
      .then(elm => {
        if ( elm.library.annotation ) {
          let errors = elm.library.annotation.filter(a => a.errorSeverity != "warning");
          if (errors.length > 0) {
            let msg = "CQL to ELM translation resulted in errors.";
            let details = { "ELM annotation": elm.library.annotation };
            consoleLog(msg, "errorClass", details);
            reject(msg);
          }
        }
        pendingFetches -= 1;
        fetchedUris.add(elmUri);
        if (isMain) {
          retVal.mainLibraryElms.push(elm);
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
  });
}

function stripFilenameFromURI(uri) {
  console.log("stripFilenameFromURI (for fetching): " + uri);
  return uri.substr(uri.lastIndexOf(":")+1);
}

export default fetchArtifacts;