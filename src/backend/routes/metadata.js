const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  var dtrFhirVersion = "4.0.1";
  if (process.env.FHIR_VERSION) {
    dtrFhirVersion = process.env.FHIR_VERSION;
  }

  const capabilityStatement = {
    resourceType: "CapabilityStatement",
    id: "davinci-dtr-cs",
    url: "http://hl7.org/fhir/us/davinci-dtr/CapabilityStatement",
    version: "1.0.0",
    name: "DTRCapabilityStatement",
    status: "active",
    date: "2021-07-06",
    publisher: "HL7 Clinical Decision Support Work Group",
    contact: [{telecom: [{system: "url", value: "http://www.hl7.org/Special/committees/dss"}]}],
    description: "A Capability Statement for the Documentation Templates and Rules (DTR) Reference Implementation (RI).",
    jurisdiction: [{coding: [{system: "urn:iso:std:iso:3166", code: "US"}]}],
    fhirVersion: dtrFhirVersion,
    kind: "instance",
    format: ["json", "application/fhir+json"],
    implementationGuide: "http://hl7.org/fhir/us/davinci-dtr",
    rest: [
      {
        mode: "client",
        documentation: "A DTR Capability Statement",
        security: {
          service: [
            {
              coding: [
                {
                  system: "http://hl7.org/fhir/restful-security-service",
                  code: "SMART-on-FHIR"
                }
              ]
            }
          ]
        },
        resource: [
          {
            type: "CapabilityStatement",
            interaction: [{code: "read"}]
          },
          {
            type: "Patient",
              interaction: [{code: "read"}],
          },
          {
            type: "Observation",
              interaction: [{code: "read"}],
          },
          {
            type: "Coverage",
            interaction: [{code: "read"}],
          },
          {
            type: "Condition",
              interaction: [{code: "read"}],
          },
          {
            type: "Practitioner",
              interaction: [{code: "read"}],
          }
        ]
      }
    ]
  };

  res.send(capabilityStatement);
});

module.exports = router;
