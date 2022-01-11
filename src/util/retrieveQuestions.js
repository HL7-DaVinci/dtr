export default function retrieveQuestions(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(body)
    };

    return fetch(url, requestOptions);
}

export function buildNextQuestionRequest(questionnaire, questionnaireResponse) {
    let requestBody = undefined;
    if (!questionnaireResponse) {
        requestBody = {
            "resourceType": "QuestionnaireResponse",
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse-adapt"
                ]
            },
            "contained": [
            ],
            "status": "in-progress"
        };
    } else {
        requestBody = questionnaireResponse;
    }

    requestBody.status = "in-progress";
    requestBody.contained = [];
    requestBody.contained.push(questionnaire);

    requestBody.questionnaire = `#${questionnaire.id}`

    const questionnaireReference = {
        "url": "http://hl7.org/fhir/StructureDefinition/contained-id",
        "valueReference": {
            "reference": `#${questionnaire.id}`
        }
    };
    if (requestBody.extension) {
        requestBody.extension.push(questionnaireReference)
    } else {
        requestBody.extension = [
            questionnaireReference
        ];
    }

    return requestBody;
}

