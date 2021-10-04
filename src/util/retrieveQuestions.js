export const sampleBody = {
    "resourceType": "QuestionnaireResponse",
    "meta": {
        "profile": [
            "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse-adapt"
        ]
    },
    "contained": [
        {
            "resourceType": "Questionnaire",
            "id": "q",
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-adapt"
                ]
            }
        }
    ],
    "questionnaire": "#q",
    "status": "in-progress"
};

export default function retrieveQuestions(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(body)
    };

    fetch(url, requestOptions)
        .then(result =>
            console.log("response", result));

}

export function buildNextQuestionRequest(questionnaire) {
    const requestBody = {
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

    requestBody.contained.push(questionnaire);

    requestBody.questionnaire = `#${questionnaire.id}`

    return requestBody;
}

