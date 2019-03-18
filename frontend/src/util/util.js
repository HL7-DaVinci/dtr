// to get FHIR properties of the form answer{whatever}
function findValueByPrefix(object, prefix) {
    for (var property in object) {
        if (object.hasOwnProperty(property) && 
            property.toString().startsWith(prefix)) {
            return object[property];
        }
    }
}

export {
    findValueByPrefix
}