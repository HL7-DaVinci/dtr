import "isomorphic-fetch";

function fetchFhirVersion(fhirServer) {
    return new Promise(function(resolve, reject) {
        console.log("fetchFhirVersion from " + fhirServer);

        function handleFetchErrors(response) {
            if (!response.ok) {
            let msg = `Failure when fetching CapabilityStatement to find FHIR version`;
            let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
            console.log(msg + ": errorClass: " + details);
            reject(msg);
            }
            return response;
        }

        fetch(fhirServer + "/metadata").then(handleFetchErrors).then(r => r.json())
        .then(capabilityStatement => {
            let fhirV4 = ['4.0.1', '3.5a.0', '3.5.0', '3.3.0', '3.2.0'];
            let fhirStu3 = ['3.0.2', '1.8.0', '1.6.0', '1.4.0', '1.2.0', '1.1.0'];
            let fhirDstu2 = ['1.0.2', '1.0.0', '0.5.0', '0.4.0'];
            let fhirDstu1 = ['0.0.82', '0.11', '0.06', '0.05'];
            
            let fhirVersion = "unknown";
            if (fhirV4.includes(capabilityStatement.fhirVersion)) {
                fhirVersion = "r4";
            } else if (fhirStu3.includes(capabilityStatement.fhirVersion)) {
                fhirVersion = "stu3";
            } else if (fhirDstu2.includes(capabilityStatement.fhirVersion)) {
                fhirVersion = "dstu2";
            } else if (fhirDstu1.includes(capabilityStatement.fhirVersion)) {
                fhirVersion = "dstu1";
            }

            console.log("fetched CapabilityStatement successfully, FHIR version:  " + capabilityStatement.fhirVersion + " (" + fhirVersion + ")");
            resolve(fhirVersion);
        })
        .catch(err => {
            console.log("error doing fetch():" + err);
            reject(err)
        });
    });
}

export default fetchFhirVersion;