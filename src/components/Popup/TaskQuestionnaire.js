export default {
    "resourceType": "Questionnaire",
    "id": "Task",
    "name": "Task",
    "title": "Task",
    "status": "draft",
    "subjectType": ["Patient"],
    "date": "2019-12-06",
    "publisher": "Da Vinci DTR",
    "item": [
      {
        "linkId": "1",
        "text": "Basic Info",
        "type": "group",
        "item": [
            {
                "linkId": "1.1",
                "text": "basedOn",
                "type": "reference",
                "required": false
            },
            {
                "linkId": "1.2",
                "text": "status",
                "type": "choice",
                "required": true,
                "answerOption": [
                    {
                        "valueCoding": {
                          "code": "draft",
                          "display": "draft"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "requested",
                          "display": "requested"

                        }
                    },
                    {
                        "valueCoding": {
                          "code": "received",
                          "display": "received"

                        }
                    },
                    {
                        "valueCoding": {
                          "code": "accepted",
                          "display": "accepted"

                        }
                    },
                    {
                        "valueCoding": {
                          "code": "rejected",
                          "display": "rejected"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "ready",
                          "display": "ready"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "cancelled",
                          "display": "cancelled"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "in-progress",
                          "display": "in-progress"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "on-hold",
                          "display": "on-hold"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "failed",
                          "display": "failed"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "completed",
                          "display": "completed"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "entered-in-error",
                          "display": "entered-in-error"
                        }
                    }
                ]
            },
            {
                "linkId": "1.3",
                "text": "intent",
                "type": "choice",
                "required": true,
                "answerOption": [
                    {
                        "valueCoding": {
                          "code": "proposal",
                          "display": "proposal"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "plan",
                          "display": "plan"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "order",
                          "display": "order"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "original-order",
                          "display": "original-order"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "reflex-order",
                          "display": "reflex-order"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "filler-order",
                          "display": "filler-order"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "instance-order",
                          "display": "instance-order"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "option",
                          "display": "option"
                        }
                    },
                ]
            },
            {
                "linkId": "1.4",
                "text": "priority",
                "type": "choice",
                "required": false,
                "answerOption": [
                    {
                        "valueCoding": {
                          "code": "routine",
                          "display": "routine"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "urgent",
                          "display": "urgent"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "asap",
                          "display": "asap"
                        }
                    },
                    {
                        "valueCoding": {
                          "code": "stat",
                          "display": "stat"
                        }
                    },
                ]
            },
            {
                "linkId": "1.5",
                "text": "description",
                "type": "string",
                "required": false
            },
            
        ]
      },
      {
        "linkId": "2",
        "text": "Task Details",
        "type": "group",
        "item": [
            {
                "linkId": "2.1",
                "text": "focus",
                "type": "reference",
                "required": false
            },
            {
                "linkId": "2.2",
                "text": "for",
                "type": "reference",
                "required": false
            },
            {
                "linkId": "2.3",
                "text": "encounter",
                "type": "reference",
                "required": false
            },
            {
                "linkId": "2.4",
                "text": "requester",
                "type": "reference",
                "required": false,
            },
            {
                "linkId": "2.5",
                "text": "reasonCode",
                "type": "open-choice",
                "required": false,
            },
            {
                "linkId": "2.6",
                "text": "reasonReference",
                "type": "reference",
                "required": false,
            },
            {
                "linkId": "2.7",
                "text": "insurance",
                "type": "reference",
                "required": false,
            },
            {
                "linkId": "2.8",
                "text": "note",
                "type": "text",
                "required": false
            },
        ]
      }
    ]
  };
  