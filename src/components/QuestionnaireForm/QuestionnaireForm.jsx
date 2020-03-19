import React, { Component } from "react";
import cql from "cql-execution";
import "./QuestionnaireForm.css";
import { findValueByPrefix } from "../../util/util.js";

export default class QuestionnaireForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      containedResources: null,
      items: null,
      itemTypes: {},
      values: {
        "1.1": "henlo"
      },
      orderedLinks: [],
      sectionLinks: {},
      fullView: true,
      turnOffValues: [],
      useSavedResponse: false,
      savedResponse: null
    };

    this.outputResponse = this.outputResponse.bind(this);
  }

  componentWillMount() {
    // setup
    // get all contained resources
    let partialResponse = localStorage.getItem(this.props.qform.id);
    let dynamic_choice_only = false;

    if (partialResponse) {
      let result = confirm(
        "Found previously saved form. Do you want to load existing data from saved from?"
      );

      if (result) {
        this.state.savedResponse = JSON.parse(partialResponse);
        dynamic_choice_only = true;
      } else {
        localStorage.removeItem(this.props.qform.id);
      }
    }


      // If not using saved QuestionnaireResponse, create a new one
      let newResponse  = {
        resourceType: 'QuestionnaireResponse',
        status: 'draft',
        item: []
      }

    if (this.props.qform.contained) {
      this.distributeContained(this.props.qform.contained);
    }

    const items = this.props.qform.item;
    this.prepopulate(items, newResponse.item, dynamic_choice_only)

    if (!dynamic_choice_only) {
      this.state.savedResponse = newResponse
    }
  }

  componentDidMount() {
    let lform = null
    
    if (this.props.fhirVersion == 'STU3') {
      lform = window.LForms.FHIR.STU3.SDC.convertQuestionnaireToLForms(this.props.qform);
    } else {
      lform = window.LForms.FHIR.R4.SDC.convertQuestionnaireToLForms(this.props.qform);
    }

    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeader: false,
      showQuestionCode: true,
      hideFormControls: true
    };

    if (this.state.savedResponse) {
      lform = LForms.Util.mergeFHIRDataIntoLForms("QuestionnaireResponse", this.state.savedResponse, lform, "R4")
    }

    window.LForms.Util.addFormToPage(lform, "formContainer")
  }

  prepopulate(items, response_items, dynamic_choice_only) {
    items.map(item => {

        let response_item = {
          linkId: item.linkId,
        };

      if (!dynamic_choice_only) {
        response_items.push(response_item);
      }
      
      if (item.item) {
        // its a section/group
        response_item.item = []
        this.prepopulate(item.item, response_item.item, dynamic_choice_only);
      } else {
        if (item.type === 'choice' || item.type === 'open-choice') {
         this.populateOptions(item)
        }

        // autofill fields
        if (item.extension && (!dynamic_choice_only || item.type == 'open-choice')) {
          response_item.answer=[]
          item.extension.forEach(e => {
            let value;
            if (
              e.url ===
              "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue"
            ) {
              // stu3
              value = findValueByPrefix(e, "value");
            } else if (
              e.url === "http://hl7.org/fhir/StructureDefinition/cqf-expression"
            ) {
              // r4
              value = findValueByPrefix(e, "value");
              value = value.expression;
            } else {
              // not a cql statement reference
              return;
            }

            // split library designator from statement
            const valueComponents = value.split(".");
            let libraryName;
            let statementName;
            if (valueComponents.length > 1) {
              libraryName = valueComponents[0].substring(
                1,
                valueComponents[0].length - 1
              );
              statementName = valueComponents[1];
            } else {
              // if there is not library name grab the first library name
              statementName = value;
              libraryName = Object.keys(this.props.cqlPrepoulationResults)[0];
            }
            // grab the population result
            let prepopulationResult;
            if (this.props.cqlPrepoulationResults[libraryName] != null) {
              prepopulationResult = this.props.cqlPrepoulationResults[
                libraryName
              ][statementName];
            } else {
              prepopulationResult = null;
              console.log(`Couldn't find library "${libraryName}"`);
            }

            if (prepopulationResult != null && !dynamic_choice_only) {
              let initial = []

              switch (item.type) {
                case 'boolean':
                  response_item.answer.push({ valueBoolean: prepopulationResult });
                  break;

                case 'integer':
                  response_item.answer.push({ valueInteger: prepopulationResult });
                  break;

                case 'date':
                  if (this.props.fhirVersion === "STU3") {
                    item.initialDate = prepopulationResult;
                  } else {
                    initial.push({valueDate: prepopulationResult});  
                  }
                  response_item.answer.push({valueDate: prepopulationResult});
                  break;

                case 'choice':
                  response_item.answer.push({valueCoding: this.getDisplayCoding(prepopulationResult, item)});
                  break;

                case 'open-choice':
                  //This is to populated dynamic options (option items generated from CQL expression)
                  //R4 uses item.answerOption, STU3 uses item.option
                  let populateAnswerOptions = false;
                  let populateOptions = false;

                  if (item.answerOption != null && item.answerOption.length == 0) {
                    populateAnswerOptions = true
                  } else if (item.option != null && item.option.length == 0) {
                    populateOptions = true
                  }

                  prepopulationResult.forEach(v => {
                    let displayCoding = this.getDisplayCoding(v)

                    if (populateAnswerOptions) {
                      item.answerOption.push({ valueCoding: displayCoding })
                    } else if (populateOptions) {
                      item.option.push({ valueCoding: displayCoding })
                    }

                    response_item.answer.push({ valueCoding: displayCoding });
                  });
                  break;

                case 'quantity':
                  response_item.answer.push({ valueQuantity: prepopulationResult });
                  break;

                default:
                  response_item.answer.push({ valueString: prepopulationResult });
              }

              if (initial.length > 0) {
                item.initial = initial;
              }
            }
          });
        }


      }
    });
  }

  getDisplayCoding(v, item) {
    if (typeof v == 'string') {
      let selectedCode;
      if (item.answerOption) {
        selectedCode = item.answerOption.find(o => o.valueCoding.code == v)
      } else if (item.option) {
        selectedCode = item.option.find(o => o.valueCoding.code == v)
      }

      if (selectedCode) {
        return selectedCode.valueCoding
      } else {
        return {
          code: v,
          display: v
        }
      }
    }

    let system = '';
    let displayText = v.display

    if (v.system == 'http://snomed.info/sct') {
      system = 'SNOMED'
    } else if (v.system.startsWith('http://hl7.org/fhir/sid/icd-10')) {
      system = "ICD-10"
    }

    if (system.length > 0) {
      displayText = displayText + ' - ' + system + ' - ' + v.code
    }

    return {
      code: v.code,
      system: v.system,
      display: displayText
    }
  }

  populateMissingDisplay(codingList) {
    if (codingList) {
      codingList.forEach(v => {
        if (v.valueCoding && !v.valueCoding.display) {
          v.valueCoding.display = v.valueCoding.code
        }
      })
    }
  }

  populateOptions(item) {
    const answerOptionsReference = item.answerValueSet || (item.options || {}).reference

    if(typeof answerOptionsReference === "string") {
      // answerValueSet
      if(answerOptionsReference.startsWith("#")) {
          // contained resource reference
          const resource = this.state.containedResources[answerOptionsReference.substr(1,answerOptionsReference.length)];
          const values = resource.compose.include;
          let choice = []
          values.forEach((element)=>{
              element.concept.forEach((concept)=>{
                choice.push({valueCoding: concept})
              });
          });

          if (this.state.fhirVersion === 'STU3') {
            item.option = choice
          } else {
            item.answerOption = choice
          }
      }
    }

    if (this.props.fhirVersion === 'STU3') {
      this.populateMissingDisplay(item.option)
    } else {
      this.populateMissingDisplay(item.answerOption)
    }
  }

  distributeContained(contained) {
    // make a key:value map for the contained
    // resources with their id so they can be
    // referenced by #{id}
    const containedResources = {};
    contained.forEach(resource => {
      containedResources[resource.id] = resource;
    });
    this.setState({ containedResources });
  }

  generateAndStoreDocumentReference(questionnaireResponse, dataBundle) {
    var pdfMake = require("pdfmake/build/pdfmake.js");
    var pdfFonts = require("pdfmake/build/vfs_fonts.js");
    pdfMake.vfs = pdfFonts.pdfMake.vfs;

    var docDefinition = {
      content: [
        {
          text:
            "QuestionnaireResponse: " +
            questionnaireResponse.id +
            " (" +
            questionnaireResponse.authored +
            ")\n",
          style: "header"
        },
        {
          text: JSON.stringify(questionnaireResponse, undefined, 4),
          style: "body"
        }
      ],
      styles: {
        header: {
          fontSize: 13,
          bold: true
        },
        body: {
          fontSize: 8,
          bold: false,
          preserveLeadingSpaces: true
        }
      }
    };

    // create the DocumentReference and generate a PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    //pdfDocGenerator.open();
    pdfDocGenerator.getBase64(b64pdf => {
      const documentReference = {
        resourceType: "DocumentReference",
        status: "current",
        type: {
          coding: [
            {
              system: "http://loinc.org",
              code: "55107-7",
              display: "Addendum Document"
            }
          ]
        },
        description: "PDF containing a QuestionnaireResponse",
        indexed: new Date().toISOString(),
        subject: { reference: this.makeReference(dataBundle, "Patient") },
        author: { reference: this.makeReference(dataBundle, "Practitioner") },
        content: [
          {
            attachment: {
              data: b64pdf,
              contentType: "application/pdf"
            }
          }
        ]
      };
      console.log(documentReference);

      // send the DocumentReference to the EHR FHIR server
      var docReferenceUrl = sessionStorage["serviceUri"] + "/DocumentReference";
      console.log("Storing DocumentReference to: " + docReferenceUrl);

      const Http = new XMLHttpRequest();
      Http.open("POST", docReferenceUrl);
      Http.setRequestHeader("Content-Type", "application/fhir+json");
      Http.send(JSON.stringify(documentReference));
      Http.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status == 201) {
            console.log(
              "Successfully stored DocumentReference ID: " +
              JSON.parse(this.response).id
            );
          } else {
            console.log(
              "WARNING: something may be wrong with the DocumentReference storage response:"
            );
            console.log(this.response);
          }
        }
      };
    });
  }

  // create the questionnaire response based on the current state
  outputResponse(status) {
    console.log(this.state.sectionLinks);

    var qr = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', 'R4');
    qr.status = status;
    qr.author = {
      reference:
        "Practitioner/" +
        this.props.cqlPrepoulationResults.BasicPractitionerInfo
          .OrderingProvider.id.value
    };

    qr.questionnaire = this.props.qform.id;

    // This is a bug in LHC control. The prepopulated date is not saved
    this.checkMissingDate(this.props.qform.item, qr.item);


    if (status == "in-progress") {
      localStorage.setItem(qr.questionnaire, JSON.stringify(qr));
      alert("Partial QuestionnaireResponse saved");
      console.log("Partial QuestionnaireResponse saved.");
      return;
    }

    // For HIMSS Demo with Mettle always use GCS as payor info
    const insurer = {
      resourceType: "Organization",
      id: "org1234",
      name: "GCS",
      identifier: [
        {
          system: "urn:ietf:rfc:3986",
          value: "2.16.840.1.113883.13.34.110.1.150.2"
        }
      ]
    };
    const managingOrg = {
      resourceType: "Organization",
      id: "org1111",
      name: "Byrd-Watson",
      identifier: [
        {
          system: "http://hl7.org/fhir/sid/us-npi",
          value: "1437147246"
        }
      ],
      address: [
        {
          use: "work",
          state: "IL",
          postalCode: "62864",
          city: "Mount Vernon",
          line: ["1200 Main St"]
        }
      ]
    };
    const facility = {
      resourceType: "Location",
      id: "loc1234",
      type: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
              code: "IEC",
              display: "Impairment evaluation center"
            }
          ]
        }
      ],
      managingOrganization: {
        reference: "Organization/org1111"
      }
    };

    const priorAuthBundle = JSON.parse(JSON.stringify(this.props.bundle));
    priorAuthBundle.entry.unshift({ resource: managingOrg });
    priorAuthBundle.entry.unshift({ resource: facility });
    priorAuthBundle.entry.unshift({ resource: insurer });
    priorAuthBundle.entry.unshift({ resource: this.props.deviceRequest });
    priorAuthBundle.entry.unshift({ resource: response });
    console.log(priorAuthBundle);

    this.generateAndStoreDocumentReference(qr, priorAuthBundle);

    // if (this.props.priorAuthReq) {
    const priorAuthClaim = {
      resourceType: "Claim",
      status: "active",
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/claim-type",
            code: "professional",
            display: "Professional"
          }
        ]
      },
      subType: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/ex-claimsubtype",
            code: "HIMSS",
            display: "Example subType code for HIMSS demo"
          }
        ]
      },
      use: "preauthorization",
      patient: { reference: this.makeReference(priorAuthBundle, "Patient") },
      created: authored,
      provider: {
        reference: this.makeReference(priorAuthBundle, "Practitioner")
      },
      insurer: {
        reference: this.makeReference(priorAuthBundle, "Organization")
      },
      facility: {
        reference: this.makeReference(priorAuthBundle, "Location")
      },
      priority: { coding: [{ code: "normal" }] },
      prescription: {
        reference: this.makeReference(priorAuthBundle, "DeviceRequest")
      },
      careTeam: [
        {
          sequence: 1,
          provider: {
            reference: this.makeReference(priorAuthBundle, "Practitioner")
          },
          extension: [
            {
              url: "http://terminology.hl7.org/ValueSet/v2-0912",
              valueCode: "OP"
            }
          ]
        }
      ],
      supportingInfo: [
        {
          sequence: 1,
          category: {
            coding: [
              {
                system:
                  "http://hl7.org/us/davinci-pas/CodeSystem/PASSupportingInfoType",
                code: "patientEvent"
              }
            ]
          },
          timingPeriod: {
            start: "2020-01-01",
            end: "2021-01-01"
          }
        },
        {
          sequence: 2,
          category: {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                code: "info",
                display: "Information"
              }
            ]
          },
          valueReference: {
            reference: this.makeReference(
              priorAuthBundle,
              "QuestionnaireResponse"
            )
          }
        }
      ],
      item: [
        {
          sequence: "1",
          productOrService: this.props.deviceRequest.codeCodeableConcept,
          quantity: {
            value: 1
          }
        }
      ],
      diagnosis: [],
      insurance: [
        {
          sequence: 1,
          focal: true,
          coverage: {
            reference: this.makeReference(priorAuthBundle, "Coverage")
          }
        }
      ]
    };
    var sequence = 1;
    priorAuthBundle.entry.forEach(function (entry, index) {
      if (entry.resource.resourceType == "Condition") {
        priorAuthClaim.diagnosis.push({
          sequence: sequence++,
          diagnosisReference: { reference: "Condition/" + entry.resource.id }
        });
      }
    });
    console.log(priorAuthClaim);

    priorAuthBundle.entry.unshift({ resource: priorAuthClaim });
    console.log(priorAuthBundle);

    this.props.setPriorAuthClaim(priorAuthBundle);
    // } else {
    //   alert("NOT submitting for prior auth");
    // }
    localStorage.removeItem(qr.questionnaire);
  }

  checkMissingDate(questionItems, responseItems) {
    responseItems.forEach(responseItem => {
      const questionItem = questionItems.find(i => i.linkId == responseItem.linkId)
      if (responseItem.item) {
        this.checkMissingDate(questionItem.item, responseItem.item);
      } else if (questionItem.type === 'date' && !responseItem.answer) {
          if (this.props.fhirVersion === 'STU3' && questionItem.initialDate) {
          responseItem.answer = [];
          responseItem.answer.push({valueDate: initialDate});
          } else if (questionItem.initial && questionItem.initial.length > 0) {
            responseItem.answer = questionItem.initial;
          } 
        }
    });
  }

  isEmptyAnswer(answer) {
    return (
      answer.length < 1 ||
      JSON.stringify(answer[0]) == "{}" ||
      (answer[0].hasOwnProperty("valueString") &&
        (answer[0].valueString == null || answer[0].valueString == "")) ||
      (answer[0].hasOwnProperty("valueDateTime") &&
        (answer[0].valueDateTime == null || answer[0].valueDateTime == "")) ||
      (answer[0].hasOwnProperty("valueDate") &&
        (answer[0].valueDate == null || answer[0].valueDate == "")) ||
      (answer[0].hasOwnProperty("valueBoolean") &&
        answer[0].valueBoolean == null) ||
      (answer[0].hasOwnProperty("valueQuantity") &&
        (answer[0].valueQuantity == null ||
          answer[0].valueQuantity.value == null ||
          answer[0].valueQuantity.value == ""))
    );
  }

  makeReference(bundle, resourceType) {
    var entry = bundle.entry.find(function (entry) {
      return entry.resource.resourceType == resourceType;
    });
    return resourceType + "/" + entry.resource.id;
  }

  render() {
    return (
      <div>
        <div id="formContainer">
        </div>
        <div className="submit-button-panel">
          <button className="btn submit-button" onClick={this.outputResponse.bind(this, "in-progress")}>
            Save
          </button>
          <button className="btn submit-button" onClick={this.outputResponse.bind(this, "completed")}>
            Next
          </button>
        </div>
      </div>
    );
  }
}
