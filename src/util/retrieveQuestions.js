export default function retrieveQuestions(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(body)
    };

    return fetch(url, requestOptions);
}

export function buildNextQuestionRequest(questionnaire, questionnaireResponse, patientReference) {
    let requestBody = undefined;
    if (!questionnaireResponse) {
        requestBody = {
            "resourceType": "QuestionnaireResponse"
        };
    } else {
        requestBody = questionnaireResponse;
    }

    requestBody.meta = {
        profile: [
            "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse-adapt"
        ]
    };
    
    requestBody.status = "in-progress";
    requestBody.contained = [];
    requestBody.contained.push(questionnaire);
    requestBody.questionnaire = `#${questionnaire.id}`;

    if (!!patientReference) {
        if (typeof(patientReference) === typeof("")) {
            patientReference = {
                reference: patientReference
            };
        }
        requestBody.subject = patientReference;
    }


    return requestBody;
}

