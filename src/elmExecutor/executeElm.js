import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
// import fhirhelpersElm from "./FHIRHelpers.json";
import extractFhirResourcesThatNeedFetching from "./extractFhirResourcesThatNeedFetching";
import buildPopulatedResourceBundle from "./buildPopulatedResourceBundle";

function executeElm(smart, fhirVersion, request, executionInputs, consoleLog) {
  return new Promise(function(resolve, reject){
    console.log("about to executeElm()");
    const patientSource = getPatientSource(fhirVersion);
    const neededResourcesFromElm = extractFhirResourcesThatNeedFetching(executionInputs.elm);
    const neededResourcesFromLibrary = retrieveNeededResource(executionInputs.mainLibraryMaps[executionInputs.elm.library.identifier.id]);
    console.log('--- executeElm library: ', executionInputs.elm.library.identifier.id);
    console.log('******* neededResourceFromLibrary', neededResourcesFromLibrary);
    console.log('---- ResourceByElm:', neededResourcesFromElm);
    findDifference(neededResourcesFromElm, neededResourcesFromLibrary);
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
// TODO - reconsider how to handle when implementing codeFilter
const toRemoveList = ["Medication", "Organization"];

function retrieveNeededResource(libraryResource) {
  if (libraryResource.dataRequirement == null) return;
  console.log("--retrieving NeededResource from library:", libraryResource.name);

  const requirementTypes = libraryResource.dataRequirement.map(
    (d) => d.type
  );
  let neededResources = new Set();
  requirementTypes.forEach(type => neededResources.add(type));
 
  console.log("-- retrieved neededResource:", neededResources);
  return Array.from(neededResources).filter(item => !toRemoveList.includes(item));
}


export default executeElm;