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

export const sampleResult = {
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
            },
            "extension": [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/cqf-library",
                    "valueCanonical": "http://hl7.org/fhir/us/davinci-dtr/Library/HomeOxygenTherapy-prepopulation"
                }
            ],
            "item": [
                {
                    "linkId": "1",
                    "text": "Order Reason",
                    "type": "choice",
                    "required": true,
                    "extension": [
                        {
                            "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
                            "valueCodeableConcept": {
                                "coding": [
                                    {
                                        "system": "http://hl7.org/fhir/questionnaire-item-control",
                                        "code": "check-box",
                                        "display": "Check Box"
                                    }
                                ],
                                "text": "Check Box"
                            }
                        }],
                    "answerOption": [
                        {
                            "valueCoding": {
                                "code": "Initial or original order for certification",
                                "display": "Initial or original order for certification"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Change in status",
                                "display": "Change in status"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Revision or change in equipment",
                                "display": "Revision or change in equipment"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Replacement",
                                "display": "Replacement"
                            }
                        }
                    ]
                },
                {
                    "type": "text",
                    "required": true,
                    "linkId": "3",
                    "text": "Text field",
                },
                {
                    "linkId": "3.1.1",
                    "text": "Relevant Patient Diagnoses (conditions that might be expected to improve with oxygen therapy)",
                    "type": "open-choice",
                    "required": true,
                    "repeats": true,
                    "extension": [
                        {
                            "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
                            "valueExpression": {
                                "language": "text/cql",
                                "expression": "\"HomeOxygenTherapyPrepopulation\".RelevantDiagnoses"
                            }
                        }
                    ]
                },
                {
                    "linkId": "3.2",
                    "text": "Arterial oxygen saturation (Patient on room air while at rest and awake when tested)",
                    "type": "quantity",
                    "required": false,
                    "extension": [
                        {
                            "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
                            "valueExpression": {
                                "language": "text/cql",
                                "expression": "\"HomeOxygenTherapyPrepopulation\".ArterialOxygenSaturation"
                            }
                        }
                    ]
                }
            ]
        }
    ],
    "questionnaire": "#q",
    "status": "in-progress"
}

export const completedResult = {
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
            },
            "item": [
                {
                    // Mark the item as hidden (if the score should be hidden from the user)
                    "extension": [
                        {
                            "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
                            "valueBoolean": true
                        }
                    ],
                    "linkId": "1",
                    "text": "Order Reason",
                    "type": "choice",
                    "required": true,
                    "readOnly": true,
                    "extension": [
                        {
                            "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
                            "valueCodeableConcept": {
                                "coding": [
                                    {
                                        "system": "http://hl7.org/fhir/questionnaire-item-control",
                                        "code": "check-box",
                                        "display": "Check Box"
                                    }
                                ],
                                "text": "Check Box"
                            }
                        }],
                    "answerOption": [
                        {
                            "valueCoding": {
                                "code": "Initial or original order for certification",
                                "display": "Initial or original order for certification"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Change in status",
                                "display": "Change in status"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Revision or change in equipment",
                                "display": "Revision or change in equipment"
                            }
                        },
                        {
                            "valueCoding": {
                                "code": "Replacement",
                                "display": "Replacement"
                            }
                        }
                    ]

                },
                {
                    "type": "text",
                    "required": true,
                    "linkId": "2",
                    "readOnly": true,
                    "text": "Text field",
                },
                {
                    "linkId": "3",
                    "text": "Your Prior Auth number is A12345",
                    "type": "display",
                }
            ]
        }
    ],
    "questionnaire": "#q",
    "item": [
        {
            "linkId": "1", // unique id of the question within the questionnaire
            "text": "Order Reason",
            "answer": [
                {
                    "valueCoding": {
                        "code": "Replacement",
                        "display": "Replacement"
                    }
                }
            ]
        },
        {
            "linkId": "2",
            "text": "Text field",
            "answer": [
                {
                    "valueString": "Filled text field"
                }
            ]
        }
    ],
    "status": "completed"
}


export default function retrieveQuestions(url, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(body)
    };


    /*fetch(url, requestOptions)
        .then(result =>
            console.log("response", result)); */

    return new Promise(completedResult);

}

const resultList = [
    sampleResult,
    completedResult
];

export function retrieveQuestionsCount(clickTime) {
    let index = 0;
    console.log("========= retrieveQuestionCount clickTime:", clickTime);
    if (clickTime > 1) {
        index = 1;
    } else {
        index = clickTime;
    }

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(resultList[index]);
        }, 100);
    });
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

