import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
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
      
      if (!resourceBundle || typeof resourceBundle !== 'object') {
        console.error("Invalid resourceBundle received:", resourceBundle);
        reject(new Error("Invalid resource bundle received"));
        return;
      }
      
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
    console.log("--- executeElm library: ", executionInputs.elm.library.identifier.id);
    console.log("---- Resources retrieved from Elm:", neededResourcesFromElm);
    console.log("---- Resources retrieved from Library neededResourceFromLibrary", neededResourcesFromLibrary);
    findDifference(neededResourcesFromElm, neededResourcesFromLibrary);
}

// Utility method to find out the difference between two arrays
function findDifference(array1, array2) {
  let temp = [];
  for (var i = 0; i < array1.length; i++) {
    if (!array2.includes(array1[i])) {
      temp.push(array1[i]);
    } 
  }

  for(var i = 0; i < array2.length; i++) {
    if (!array1.includes(array2[i])) {
      temp.push(array2[i]);
    }
  }
  console.log("--- NeededResources Difference: ", temp);
}

function executeElmAgainstPatientSource(executionInputs, patientSource) {
  // executionInputs.elmDependencies = [ fhirhelpersElm ]
  let repository = undefined;
  if(executionInputs.elmDependencies) {
    repository = new cql.Repository(executionInputs.elmDependencies);
  } 

  let lib = undefined;
  if(repository) {
    lib = new cql.Library(executionInputs.elm, repository);
  } else {
    lib = new cql.Library(executionInputs.elm);
  }
    const codeService = new cql.CodeService(executionInputs.valueSetDB);
  const executor = new cql.Executor(lib, codeService, executionInputs.parameters);
  const results = executor.exec(patientSource);
  
  if (!results) {
    console.error("CQL execution returned no results");
    return null;
  }
  
  if (!results.patientResults) {
    console.error("CQL execution results missing patientResults:", results);
    return null;
  }
  
  const patientKeys = Object.keys(results.patientResults);
  if (patientKeys.length === 0) {
    console.error("No patient results found in CQL execution");
    return null;
  }
  
  return results.patientResults[patientKeys[0]];
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