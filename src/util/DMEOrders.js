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
        // DME Orders V1.2.xlsx - Row 2
        resourceType: "ServiceRequest",

        // DME Orders V1.2.xlsx - Row 5
        // Note: this gets populated below
        identifier: [],

        // DME Orders V1.2.xlsx - Row 9 (NYS)
        // Note: DME Order updates are Not Yet Supported (NYS) in the SoF App
        replaces: { reference: "ServiceRequest/undefined" },

        // DME Orders V1.2.xlsx - Row 10
        // Note: this gets populated below
        requisition: [],

        // DME Orders V1.2.xlsx - Row 11
        status: {
            coding: [{
                system: "http://hl7.org/fhir/request-status",
                code: "active",
                display: "Active"
            }]
        },

        // DME Orders V1.2.xlsx - Row 13
        intent: {
            coding: [{
                system: "http://hl7.org/fhir/request-intent",
                code: "original-order",
                display: "Original Order"
            }]
        },

        // DME Orders V1.2.xlsx - Row 15 (NYS)        
        // TODO: When the DME Orders IG is done, get this from the appropriate ValueSet  
        category: {
            coding: [
                {
                    "system": "http://snomed.info/sct",
                    "code": "425399007",
                    "display": "Durable medical equipment (physical object)"
                }
            ]
        },

        // DME Orders V1.2.xlsx - Row 17
        priority: {
            coding: [{
                system: "http://hl7.org/fhir/request-priority",
                code: "routine",
                display: "Routine"
            }]
        },

        // DME Orders V1.2.xlsx - Row 20 
        // Note: this gets populated below
        code: { coding: [] },

        // DME Orders V1.2.xlsx - Row 22         
        // Note: this gets populated below
        orderDetail: { coding: [], text: [] },

        // DME Orders V1.2.xlsx - Row 25             
        quantityQuantity: 1,

        // DME Orders V1.2.xlsx - Row 28
        subject: { reference: qForm.makeReference(dmeOrderBundle, "Patient") },

        // DME Orders V1.2.xlsx - Row 29
        // Note: this gets populated below
        encounter: [],

        // DME Orders V1.2.xlsx - Row 31       
        occurrenceDateTime: getISODateString(),

        // DME Orders V1.2.xlsx - Row 37 (NYS)
        // TODO: When the DME Orders IG is done, get this from the appropriate ValueSet  
        asNeededCodeableConcept: {
            coding: [{
                system: "http://snomed.info/sct",
                code: "3947004",
                display: "High oxygen affinity hemoglobin polycythemia"
            }]
        },

        // DME Orders V1.2.xlsx - Row 38       
        authoredOn: getISODateString(),

        // DME Orders V1.2.xlsx - Row 39
        // Note: this gets populated below
        requester: [],

        // DME Orders V1.2.xlsx - Row 40 (NYS)
        // TODO: When the DME Orders IG is done, get this from the appropriate ValueSet  
        performerType: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "223366009",
                    display: "Healthcare professional (occupation)"
                }
            ]
        },

        // DME Orders V1.2.xlsx - Row 42
        // Note: this gets populated below
        performer: [],

        // DME Orders V1.2.xlsx - Row 43 (NYS)
        // TODO: When the DME Orders IG is done, get this from the appropriate ValueSet  
        locationCode: {
            coding: [
                {
                    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                    code: "HOSP",
                    display: "Hospital"
                }
            ]
        },

        // DME Orders V1.2.xlsx - Row 42
        // Note: this gets populated below
        locationReference: [],

        // DME Orders V1.2.xlsx - Row 46 (NYS)
        // TODO: When the DME Orders IG is done, get this from the appropriate ValueSet  
        reasonCode: {
            coding: [
                {
                    system: "http://snomed.info/sct",
                    code: "3548001",
                    display: "Brachial plexus disorder"
                }
            ]
        },

        // DME Orders V1.2.xlsx - Row 48      
        // Note: this gets populated below
        reasonReference: [],

        // DME Orders V1.2.xlsx - Row 49        
        insurance: { reference: qForm.makeReference(dmeOrderBundle, "Coverage") },

        // DME Orders V1.2.xlsx - Row 50
        // Note: this gets populated below
        supportingInfo: [],

        // DME Orders V1.2.xlsx - Row 52 (NYS)       
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

        // DME Orders V1.2.xlsx - Row 54
        // TODO: Add note to the the SoF App/DeviceRequest resource. Use this text below for testing only!
        note: {
            text: "It's very easy to make some words **bold** and other words *italic* with Markdown. You can even [link to Google!](http://google.com)"
        },

        // DME Orders V1.2.xlsx - Row 55  
        // TODO: Add note to the the SoF App/DeviceRequest resource. Use this text below for testing only!
        patientInstruction: "Test patient instruction",

        // DME Orders V1.2.xlsx - Row 50
        // Note: this gets populated below
        relevantHistory: [],

        // DME Orders V1.2.xlsx - Row 60
        extension: [
            {
                url: "http://hl7.org/fhir/StructureDefinition/reviewtype",
                coding: [
                    {
                        // TODO: need codesystem from IG?                         
                        code: "DRLS",
                        display: "Document Requirements Lookup Service (DRLS)"
                    }]
            }
        ]

    };

    // Maps resources from DeviceRequest to ServiceRequest and checks for existence 
    dmeOrderBundle.entry.forEach(function (entry) {
        if (entry.resource.resourceType == "DeviceRequest") {

            // DME Orders V1.2.xlsx - Row 5 
            // DME Orders V1.2.xlsx - Row 10 
            // TODO: Add identifier to DeviceRequest    
            if (entry.resource.identifier !== undefined) {
                serviceRequest.identifier.push(entry.resource.identifier);
                serviceRequest.requisition.push(entry.resource.identifier);
            }
            else {
                serviceRequest.identifier.push(entry.resource.id);
                serviceRequest.requisition.push(entry.resource.id);
            }

            // DME Orders V1.2.xlsx - Row 20 
            if (entry.resource.codeCodeableConcept !== undefined) {
                serviceRequest.code.coding.push({
                    system: entry.resource.codeCodeableConcept.coding[0].system,
                    code: entry.resource.codeCodeableConcept.coding[0].code,
                    display: entry.resource.codeCodeableConcept.coding[0].display
                });
            }

            // DME Orders V1.2.xlsx - Row 54
            if (entry.resource.note !== undefined) {
                serviceRequest.note.push(entry.resource.note);
            }
        }
        else if (entry.resource.resourceType == "Encounter") {
            // Not Yet Implemented (NYI)
            serviceRequest.encounter.push(entry.resource);
        }
        else if (entry.resource.resourceType == "PractitionerRole") {
            // Bug: this was mapped wrong, needs to be remapped
            serviceRequest.requester.push(entry.resource);
        }
        else if (entry.resource.resourceType == "Organization") {
            serviceRequest.performer.push(entry.resource);
        }
        else if (entry.resource.resourceType == "Location") {
            serviceRequest.locationReference.push(entry.resource);
        }
        else if (entry.resource.resourceType == "Any") {
            // Not Yet Implemented (NYI)
            serviceRequest.supportingInfo.push(entry.resource);
        }
        else if (entry.resource.resourceType == "Provenance") {
            // Not Yet Implemented (NYI), it is not part of DSTU3
            serviceRequest.relevantHistory.push(entry.resource);
        }
        else if (entry.resource.resourceType == "DocumentReference") {
            // Note: this is being created, but it is not yet coming through to the bundle
            serviceRequest.reasonReference.push(entry.resource);
        }
        else if (entry.resource.resourceType == "QuestionnaireResponse") {
            // DME Orders V1.2.xlsx - Row 22 - orderDetail
            // TODO: realign array
            var serviceRequestTempRef1 = serviceRequest;
            var serviceRequestTempRef12;
            entry.resource.item.forEach(function (item1) {
                serviceRequestTempRef12 = serviceRequestTempRef1;
                item1.item.forEach(function (item2) {
                    if (item2 !== undefined && item2.answer !== undefined && item2.answer[0] !== undefined && item2.answer[0].valueCoding !== undefined) {
                        serviceRequestTempRef12.orderDetail.coding.push({
                            system: item2.answer[0].valueCoding.system !== undefined ? item2.answer[0].valueCoding.system : "",
                            code: item2.answer[0].valueCoding.code,
                            display: item2.answer[0].valueCoding.display
                        });
                        serviceRequestTempRef12.orderDetail.text.push(item2.text);
                    }
                    else if (item2 !== undefined && item2.answer !== undefined && item2.answer[0] !== undefined && item2.answer[0].valueDate !== undefined) {
                        // TODO: do this a better way
                        if (item2.answer[0].text == "Start date") 
                            serviceRequestTempRef12.occurrenceDateTime.push(item2.answer[0].valueDate);                       
                    }
                });
            });
        }
    });

    console.log(serviceRequest);
    console.log(JSON.stringify(serviceRequest));

    // remove DeviceRequest and Response
    dmeOrderBundle.entry.shift({ resource: qForm.props.deviceRequest });
    dmeOrderBundle.entry.shift({ resource: response });

    // add ServiceRequest
    dmeOrderBundle.entry.unshift({ resource: serviceRequest });

    console.log(JSON.stringify(dmeOrderBundle));

    //
    // begin send request
    //
    const Http = new XMLHttpRequest();

    // Note: this URL does not really exist 
    const dmeOrderUrl = "https://some-DME-Orders.domain.org/fhir/ServiceRequest/$submit";

    Http.open("POST", dmeOrderUrl);
    Http.setRequestHeader("Content-Type", "application/fhir+json");
    Http.send(JSON.stringify(dmeOrderBundle));
    Http.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            var message = "";
            if (this.status === 200) {
                message = "DME Order Request Success.";
            }
            else {
                message = "DME Order Request Failed.\n\nHint: Is your endpoint valid?";
            }

            console.log(message);
            alert(message);
            console.log(this.responseText);
        }
    };
    //
    // end send request
    //

    function getISODateString() {
        var str = new Date().toISOString();
        return str;
    }

}

export default SendDMEOrder;

 //
 // DME Order end
 //
