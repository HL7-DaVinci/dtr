/* eslint-disable no-console */

//
// DME Order begin
//

function SendDMEOrder(qForm, response) {
    const dmeOrderBundle = JSON.parse(JSON.stringify(qForm.props.bundle));
    dmeOrderBundle.entry.unshift({ resource: qForm.props.deviceRequest });
    dmeOrderBundle.entry.unshift({ resource: response });

    console.log(dmeOrderBundle);

    const serviceRequest =
    {
        resourceType: "ServiceRequest",
        identifier: [{ value: create_UUID() }],
        // Note: this is not currently unsupported
        replaces: { reference: "ServiceRequest/undefined" },
        requisition: [{ "value": create_UUID() }],
        status: {
            coding: [{
                system: "http://hl7.org/fhir/request-status",
                code: "active",
                display: "Active"
            }]
        },
        intent: {
            coding: [{
                system: "http://hl7.org/fhir/request-intent",
                code: "original-order",
                display: "Original Order"
            }]
        },
        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet  
        category: {
            coding: [
                {
                    "system": "http://snomed.info/sct",
                    "code": "425399007",
                    "display": "Durable medical equipment (physical object)"
                }
            ]
        },
        priority: {
            coding: [{
                system: "http://hl7.org/fhir/request-priority",
                code: "routine",
                display: "Routine"
            }]
        },
        // Note: this gets populated below
        code: { coding: [] },

        //
        // TODO: add orderDetail
        //

        // TODO: get this from the DeviceRquest             
        quantityQuantity: 1,

        subject: { reference: qForm.makeReference(dmeOrderBundle, "Patient") },

        // Note: this gets populated below, because we might not have one
        encounter: [],

        // TODO: get this from the UI
        occurrenceDateTime: getISODateString(),

        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet 
        asNeededCodeableConcept: {
            coding: [{
                system: "http://snomed.info/sct",
                code: "3947004",
                display: "High oxygen affinity hemoglobin polycythemia"
            }]
        },
        authoredOn: getISODateString(),
        // Note: this gets populated below, because we might not have one
        requester: [],
        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet 
        performerType: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "223366009",
                    display: "Healthcare professional (occupation)"
                }
            ]
        },
        // Note: this gets populated below, because we might not have one
        performer: [],
        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet  
        locationCode: {
            coding: [
                {
                    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                    code: "HOSP",
                    display: "Hospital"
                }
            ]
        },
        // Note: this gets populated below, because we might not have one
        locationReference: [],
        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet 
        reasonCode: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "3548001",
                    display: "Brachial plexus disorder"
                }
            ]
        },

        // TODO: determine which resource to use: Reference(Condition | Observation | DiagnosticReport | DocumentReference)
        reasonReference: { reference: qForm.makeReference(dmeOrderBundle, "Observation") },

        // TODO: determine which resource to use: Reference(Coverage | ClaimReponse)
        insurance: { reference: qForm.makeReference(dmeOrderBundle, "Coverage") },

        // Note: this gets populated below, because we might not have one
        supportingInfo: [],

        // TODO: When the DME Orders IG is done, get this from appropriate ValueSet 
        bodySite: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "10024003",
                    display: "Base of lung"
                }
            ]
        },

        // TODO: get this Markdown from the UI
        note: {
            text: "It's very easy to make some words **bold** and other words *italic* with Markdown. You can even [link to Google!](http://google.com)"
        },

        // TODO: get this from the UI
        patientInstruction: "Test patient instruction",

        // Note: this gets populated below, because we might not have one
        relevantHistory: [],

        //
        // Add Extension stuff when the DME Orders IG is done
        //      

    };

    // populate the "code" with DeviceRequest "code"
    dmeOrderBundle.entry.forEach(function (entry) {
        if (entry.resource.resourceType == "DeviceRequest") {
            serviceRequest.code.coding.push({
                system: entry.resource.codeCodeableConcept.coding[0].system,
                code: entry.resource.codeCodeableConcept.coding[0].code,
                display: entry.resource.codeCodeableConcept.coding[0].display
            });
        }

        if (entry.resource.resourceType == "Encounter") {
            serviceRequest.encounter.push(entry.resource);
        }

        if (entry.resource.resourceType == "PractitionerRole") {
            serviceRequest.requester.push(entry.resource);
        }

        if (entry.resource.resourceType == "Organization") {
            serviceRequest.performer.push(entry.resource);
        }

        if (entry.resource.resourceType == "Location") {
            serviceRequest.locationReference.push(entry.resource);
        }

        if (entry.resource.resourceType == "Any") {
            serviceRequest.supportingInfo.push(entry.resource);
        }

        if (entry.resource.resourceType == "Provenance") {
            serviceRequest.relevantHistory.push(entry.resource);
        }
    });

    console.log(serviceRequest);
    console.log(JSON.stringify(serviceRequest));

    dmeOrderBundle.entry.unshift({ resource: serviceRequest });

    //
    // send request
    //
    const Http = new XMLHttpRequest();
    // Note: this URL does not exist 
    const dmeOrderUrl = "https://some-DME-Orders.domain.org/fhir/ServiceRequest/$submit";       
    Http.open("POST", dmeOrderUrl);
    Http.setRequestHeader("Content-Type", "application/fhir+json");
    Http.send(JSON.stringify(dmeOrderBundle));
    Http.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            var message = "";
            if (this.status === 200) {
                //var dmeOrderResponse = JSON.parse(this.responseText);                
                message = "DME Order Request Success.";
            }
            else {
                message = "DME Order Request Failed.";
            }

            console.log(message);
            alert(message);
            console.log(this.responseText);
        }
    };

    function create_UUID() {
        var dt = new Date().getTime();
        var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c == "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    function getISODateString() {
        var str = new Date().toISOString();
        return str;
    }

}

export default SendDMEOrder;

 //
 // DME Order end
 //
