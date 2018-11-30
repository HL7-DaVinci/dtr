function extractFhirResourcesThatNeedFetching(elm) {
  const resources = new Set();
  //TODO: why was this elm.source?! and how was it working?
  if ((((elm || {}).library || {}).statements || {}).def) {
    for (const expDef of Object.values(elm.library.statements.def)) {
      extractResourcesFromExpression(resources, expDef.expression);
    }
  }
  return Array.from(resources);
}

function extractResourcesFromExpression(resources, expression) {
  if (expression && Array.isArray(expression)) {
    expression.forEach(function(e) {
      extractResourcesFromExpression(resources, e);
    });
  } else if (expression && typeof expression === "object") {
    if (expression.type === "Retrieve") {
      const match = /^(\{http:\/\/hl7.org\/fhir\})?([A-Z][a-zA-Z]+)$/.exec(expression.dataType);
      if (match) {
        resources.add(match[2]);
      } else {
        console.error("Cannot find resource for Retrieve w/ dataType: ", expression.dataType);
      }
    } else {
      for (const val of Object.values(expression)) {
        extractResourcesFromExpression(resources, val);
      }
    }
  }
}

export default extractFhirResourcesThatNeedFetching;
