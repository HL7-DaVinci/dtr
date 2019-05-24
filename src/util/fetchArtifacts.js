function fetchArtifacts(fhirUriPrefix, questionnaireUri, smart, filepath, consoleLog) {
  return new Promise(function(resolve, reject) {
    function handleFetchErrors(response) {
      if (!response.ok) {
          consoleLog("failed to get resource","errorClass");
        reject("Failure when fetching resource.");
      }
      return response;
    }

    const fetchedUris = new Set();
    let pendingFetches = 0;

    const retVal = {
      questionnaire: null,
      mainLibraryElm: null,
      dependentElms: []
    }

    function resolveIfDone(){
      if (pendingFetches != 0) return;
      if (retVal.questionnaire && retVal.mainLibraryElm) resolve(retVal)
      else reject("Failed to fetch all artifacts.")
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
      retVal.questionnaire = questionnaire;
      fetchedUris.add(questionnaireUri)
      const mainElmUri = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqif-library")[0].valueReference.reference;
      fetchElm(mainElmUri, true)
      pendingFetches -= 1;
      consoleLog("fetched elms", "infoClass");

    })
    .catch(err => reject(err));

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
        fetchElmFile(libraryResource, isMain);
        consoleLog("fetched Elm","infoClass");
        pendingFetches -= 1;
      })
      .catch(err => reject(err));
    }

    function fetchRelatedElms(libraryResource){
      if (libraryResource.relatedArtifact == null) return
      const libUris = libraryResource.relatedArtifact.filter(a => a.type == "depends-on").map(a => a.resource.reference);
      libUris.forEach(libUri => fetchElm(libUri));
    }

    function fetchElmFile(libraryResource, isMain){
      const elmUri = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].url;
      if (elmUri in fetchedUris) return;
      let elmUrl = fhirUriPrefix+encodeURIComponent(elmUri);
      if (!fhirResources) {
        elmUrl = filepath + "/" + stripFilenameFromURI(elmUri);
      }

      pendingFetches += 1;
      fetch(elmUrl).then(handleFetchErrors).then(r => r.json())
      .then(elm => {
        pendingFetches -= 1;
        fetchedUris.add(elmUri);
        if (isMain) retVal.mainLibraryElm = elm;
        else retVal.dependentElms.push(elm);
        resolveIfDone();
      })
      .catch(err => reject(err));
    }
  });
}

function stripFilenameFromURI(uri) {
  console.log("stripFilenameFromURI (for fetching): " + uri);
  return uri.substr(uri.lastIndexOf(":")+1);
}

export default fetchArtifacts;