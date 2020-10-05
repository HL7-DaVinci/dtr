import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
// import fhirhelpersElm from "./FHIRHelpers.json";
import extractFhirResourcesThatNeedFetching from "./extractFhirResourcesThatNeedFetching";
import buildPopulatedResourceBundle from "./buildPopulatedResourceBundle";

function executeElm(smart, fhirVersion, request, executionInputs, consoleLog) {
  return new Promise(function(resolve, reject){
    console.log("about to executeElm()");
    const patientSource = getPatientSource(fhirVersion);
    const neededResourcesFromLibrary = retrieveNeededResources(executionInputs.mainLibraryMaps[executionInputs.elm.library.identifier.id]);
    //compareElmAndLibraryOutput(executionInputs, neededResourcesFromLibrary);
    consoleLog("need to fetch resources","infoClass");
    console.log("We need to fetch these resources:", neededResourcesFromLibrary);
    buildPopulatedResourceBundle(smart, neededResourcesFromLibrary, fhirVersion, request, consoleLog)
    .then(function(resourceBundle) {
      console.log("Fetched resources are in this bundle:", resourceBundle);
      patientSource.loadBundles([resourceBundle]);
      const elmResults = executeElmAgainstPatientSource(executionInputs, patientSource);
      const results = {
        libraryName: executionInputs.elm.library.identifier.id,
        bundle: resourceBundle,
        elmResults: elmResults
      };
      resolve(results);
    })
    .catch(function(err){reject(err);});
  });
}

// Method for debug
function compareElmAndLibraryOutput(executionInputs, neededResourcesFromLibrary) {
    const neededResourcesFromElm = extractFhirResourcesThatNeedFetching(executionInputs.elm);
    console.log('--- executeElm library: ', executionInputs.elm.library.identifier.id);
    console.log('---- Resources retrieved from Elm:', neededResourcesFromElm);
    console.log('---- Resources retrieved from Library neededResourceFromLibrary', neededResourcesFromLibrary);
    findDifference(neededResourcesFromElm, neededResourcesFromLibrary);
}

// Utility method to find out the difference between two arrays
function findDifference(array1, array2) {
  let temp = [];
  for (var i = 0; i < array1.length; i++) {
    if (!array2.includes(array1[i])) {
      temp.push(array1[i])
    } 
  }

  for(var i = 0; i < array2.length; i++) {
    if (!array1.includes(array2[i])) {
      temp.push(array2[i])
    }
  }
  console.log('--- NeededResources Difference: ', temp);
}

function executeElmAgainstPatientSource(executionInputs, patientSource) {
  // executionInputs.elmDependencies = [ fhirhelpersElm ]
  const repository = new cql.Repository(executionInputs.elmDependencies);
  const lib = new cql.Library(executionInputs.elm, repository);
  const codeService = new cql.CodeService(executionInputs.valueSetDB);
  const executor = new cql.Executor(lib, codeService, executionInputs.parameters);
  const results = executor.exec(patientSource);
  return results.patientResults[Object.keys(results.patientResults)[0]];
}

function getPatientSource(fhirVersion) {
  if (fhirVersion == "dstu2") return cqlfhir.PatientSource.FHIRv102();
  if (fhirVersion == "stu3") return cqlfhir.PatientSource.FHIRv300();
  if (fhirVersion == "r4") return cqlfhir.PatientSource.FHIRv400();
}

// A list of FHIR resources can not be queried based on patient
// TODO - reconsider how to handle them when implementing codeFilter
const toRemoveList = ["Organization"];

function retrieveNeededResources(libraryResource) {
  if (libraryResource.dataRequirement == null) return;
  
  const requirementTypes = libraryResource.dataRequirement.map(
    (d) => d.type
  );
  let neededResources = new Set();
  requirementTypes.forEach(type => neededResources.add(type));
 
  // RegEx for the dataRequirements only to load the value set
  // E.g. "type" = "ObservationValueSet" 
  // the ValueSet is used either in CQl or Questionnaire as a set of codes
  // but not used to filter out the patient's FHIR resources based on the valueset
  const regexValueSet = /ValueSet\b/;
  return Array.from(neededResources).filter(item => (!toRemoveList.includes(item) && !regexValueSet.test(item)));
}


export default executeElm;