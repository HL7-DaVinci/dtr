import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
import fhirhelpersElm from "./FHIRHelpers.json";
import extractFhirResourcesThatNeedFetching from "./extractFhirResourcesThatNeedFetching";
import buildPopulatedResourceBundle from "./buildPopulatedResourceBundle";

// use result like r(elm, valueSetDB, resolve, reject)
function buildElmExecutor(smart, fhirVersion) {
  if (fhirVersion == "dstu2") {
    const patientSource = cqlfhir.PatientSource.FHIRv102();
    return collectResourcesAndExecuteElm.bind(null, smart, patientSource);
  }else if(fhirVersion == "dstu3") {
      console.log("using dstu3");
    const patientSource = cqlfhir.PatientSource.FHIRv300();
    return collectResourcesAndExecuteElm.bind(null, smart, patientSource);
  }
}

function collectResourcesAndExecuteElm(smart, patientSource, elm, valueSetDB, resolve, reject) {
  const neededResources = extractFhirResourcesThatNeedFetching(elm);
  console.log("We need to fetch these resources:", neededResources);
  buildPopulatedResourceBundle(
    smart,
    neededResources,
    function(resourceBundle) {
      console.log("Fetched resources are in this bundle:", resourceBundle);
      const results = executeELM(elm, resourceBundle, valueSetDB, patientSource);
      resolve(results);
    },
    reject
  );
}

function executeELM(elm, resourceBundle, valueSetDB, patientSource) {
  const elmDependencies = {
    FHIRHelpers: fhirhelpersElm
  };
  const repository = new cql.Repository(elmDependencies);
  const lib = new cql.Library(elm, repository);
  const codeService = new cql.CodeService(valueSetDB);
  const executor = new cql.Executor(lib, codeService);
  patientSource.loadBundles([resourceBundle]);
  const results = executor.exec(patientSource);
  return results.patientResults[Object.keys(results.patientResults)[0]];
}

export default buildElmExecutor;
