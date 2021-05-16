import React, { Component } from "react";
import "./QuestionnaireForm.css";
import { findValueByPrefix, searchQuestionnaire } from "../../util/util.js";
import SelectPopup from "./SelectPopup";
import _ from "lodash";
import shortid from "shortid";

export default class QuestionnaireForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      containedResources: null,
      items: null,
      itemTypes: {},
      values: {
        1.1: "henlo"
      },
      orderedLinks: [],
      sectionLinks: {},
      fullView: true,
      turnOffValues: [],
      savedResponse: null,
      formLoaded: "New",
      popupTitle: "Would you like to continue an in-process questionnaire?",
      popupOptions: [],
      popupFinalOption: "Cancel"
    };

    this.outputResponse = this.outputResponse.bind(this);
    this.smart = props.smart;
    this.patientId = props.patientId;
    this.fhirVersion = props.fhirVersion;
    this.FHIR_PREFIX = props.FHIR_PREFIX;
    this.partialForms = {};
    this.handleGtable = this.handleGtable.bind(this);
    this.getLibraryPrepopulationResult = this.getLibraryPrepopulationResult.bind(
      this
    );
    this.buildGTableItems = this.buildGTableItems.bind(this);
    this.mergeResponseForSameLinkId = this.mergeResponseForSameLinkId.bind(
      this
    );
  }

  componentWillMount() {
    // search for any partially completed QuestionnaireResponses
    if(this.props.standalone) {
        const response = this.props.response;
        const items = this.props.qform.item;
        const parentItems = [];
        this.handleGtable(items, parentItems, response.item);
        this.prepopulate(items, response.item, true);
        const mergedResponse = this.mergeResponseForSameLinkId(response);
        this.state.savedResponse = mergedResponse;
    } else {
        this.smart.request("QuestionnaireResponse?" + 
        "status=in-progress" + 
        "&subject=" + this.getPatient()).then((result)=>{
            this.popupClear("Would you like to continue an in-process questionnaire?", "Cancel", false);
            this.processSavedQuestionnaireResponses(result, false);
        }, ((result)=>{
            this.popupClear("Error: failed to load in-process questionnaires", "OK", true);
            this.popupLaunch();
        })).catch(console.error);

        // If not using saved QuestionnaireResponse, create a new one
        let newResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'draft',
            item: []
        }     
        const items = this.props.qform.item;
        const parentItems = [];
        this.handleGtable(items, parentItems, newResponse.item);
        this.prepopulate(items, newResponse.item, false);
        let mergedResponse = this.mergeResponseForSameLinkId(newResponse);
        this.state.savedResponse = mergedResponse;
    }
  }

  componentDidMount() {
    this.loadAndMergeForms(this.state.savedResponse);
  }

  loadPreviousForm() {
    // search for any QuestionnaireResponses
    this.smart
      .request("QuestionnaireResponse?" + "&subject=" + this.getPatient())
      .then(
        (result) => {
          this.popupClear(
            "Would you like to load a previous form?",
            "Cancel",
            false
          );
          this.processSavedQuestionnaireResponses(result, true);
        },
        (result) => {
          this.popupClear("Error: failed to load previous forms", "OK", true);
          this.popupLaunch();
        }
      )
      .catch(console.error);
  }

  processSavedQuestionnaireResponses(
    partialResponses,
    displayErrorOnNoneFound
  ) {
    let noneFound = true;

    if (partialResponses && partialResponses.total > 0) {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      };

      let count = 0;

      partialResponses.entry.forEach((r) => {
        if (this.props.qform.id == r.resource.questionnaire) {
          count = count + 1;
          // add the option to the popupOptions
          let date = new Date(r.resource.authored);
          let option =
            date.toLocaleDateString(undefined, options) +
            " (" +
            r.resource.status +
            ")";
          this.setState({
            popupOptions: [...this.state.popupOptions, option]
          });
          this.partialForms[option] = r.resource;
        }
      });
      console.log(this.state.popupOptions);
      console.log(this.partialForms);

      // only show the popupOptions if there is one to show
      if (count > 0) {
        noneFound = false;
        this.popupLaunch();
      }
    }

    // display a message that none were found if necessary
    if (noneFound && displayErrorOnNoneFound) {
      this.popupClear("No saved forms available to load.", "OK", true);
      this.popupLaunch();
    }
  }

  loadAndMergeForms(newResponse) {
    console.log(JSON.stringify(this.props.qform));
    console.log(JSON.stringify(newResponse));

    let lform = LForms.Util.convertFHIRQuestionnaireToLForms(
      this.props.qform,
      this.props.fhirVersion
    );

    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeaders: false,
      showQuestionCode: false,
      hideFormControls: true,
      showFormOptionPanelButton: true
    };

    if (newResponse) {
      lform = LForms.Util.mergeFHIRDataIntoLForms(
        "QuestionnaireResponse",
        newResponse,
        lform,
        this.props.fhirVersion
      );
    }

    console.log(lform);
    LForms.Util.addFormToPage(lform, "formContainer");
    const header = document.getElementsByClassName("lf-form-title")[0];
    const el = document.createElement("div");
    el.setAttribute("id", "button-container");
    header.appendChild(el);
    this.props.renderButtons(el);
  }

  // Merge the items for the same linkId to comply with the LHCForm
  mergeResponseForSameLinkId(response) {
    let mergedResponse = {
      resourceType: response.resourceType,
      status: response.status,
      item: []
    };
    const responseItems = response.item;
    let itemKeyList = new Set();
    for (let i = 0; i < responseItems.length; i++) {
      itemKeyList.add(responseItems[i].linkId);
    }
    itemKeyList.forEach((linkId) => {
      let linkIdItem = {
        linkId,
        item: []
      };
      let filteredItems = responseItems.filter(
        (responseItem) => responseItem.linkId == linkId
      );
      if (filteredItems) {
        filteredItems.forEach((foundItem) => {
          if (foundItem.item) {
            linkIdItem.item.push(...foundItem.item);
          } else {
            linkIdItem = foundItem;
            linkIdItem.item = null;
          }
        });
        mergedResponse.item.push(linkIdItem);
      }
    });
    return mergedResponse;
  }

  // handlGtable expands the items with contains a table level expression
  // the expression should be a list of objects
  // this function creates the controls based on the size of the expression
  // then set the value of for each item
  // the expression should be a list of objects with keys, the keys will have to match
  // with the question text
  // e.g. expression object list is [{"RxNorm":"content", "Description": "description"}]
  // the corresponding item would be "item": [{"text": "RxNorm", "type": "string", "linkId": "MED.1.1"}, {"text": "Description", "type": "string", "linkId": "MED.1.2"} ]
  handleGtable(items, parentItems, responseItems) {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      let item = items[itemIndex];
      let response_item = {
        linkId: item.linkId
      };
      if (item.item) {
        parentItems.push(response_item);
      }

      if (item.type == "group" && item.extension) {
        let isGtable = item.extension.some(
          (e) =>
            e.url ==
              "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl" &&
            e.valueCodeableConcept.coding[0].code == "gtable"
        );
        let containsValueExpression = item.extension.some(
          (e) =>
            e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" ||
            e.url ==
              "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        );

        if (isGtable && containsValueExpression) {
          // check if the prepopulationResult contains any value
          // if yes, then need to add corresponding sub-items then provide the answer
          // need to figure out which value is provided from the prepopulationResult though

          // grab the population result
          let prepopulationResult = this.getLibraryPrepopulationResult(
            item,
            this.props.cqlPrepopulationResults
          );

          // console.log("prepopulationResult: ", prepopulationResult);
          if (prepopulationResult && prepopulationResult.length > 0) {
            let newItemList = this.buildGTableItems(item, prepopulationResult);
            parentItems.pop();
            let parentItem = parentItems.pop();
            if (newItemList.length > 0) {
              parentItem.item = [];
              for (let i = 0; i < newItemList.length; i++) {
                parentItem.item.push(newItemList[i]);
              }
              responseItems.push(parentItem);
            }
          } else {
            // remove valueExpression from item to prevent prepopulate function to fill empty response
            let valueExpressionIndex = item.extension.findIndex(
              (e) =>
                e.url ==
                  "http://hl7.org/fhir/StructureDefinition/cqf-expression" ||
                e.url ==
                  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
            );
            item.extension.splice(valueExpressionIndex, 1);
          }
        }
        continue;
      }

      if (item.item) {
        this.handleGtable(item.item, parentItems, responseItems);
      }
    }
  }

  // build multiple items if there are multiple items for the gtable
  buildGTableItems(item, prepopulationResult) {
    //remove expression extension
    let expressionExtensionIndex = item.extension.findIndex(
      (e) =>
        e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" ||
        e.url ==
          "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
    );
    item.extension.splice(expressionExtensionIndex, 1);
    //add item answer to the subitem
    let itemSubItems = item.item;
    let newItemResponseList = [];

    for (let index = 0; index < prepopulationResult.length; index++) {
      let result = prepopulationResult[index];

      let newItemResponse = {
        linkId: item.linkId,
        text: item.text
      };

      let newItemResponseSubItems = [];
      itemSubItems.forEach((subItem) => {
        let targetItem = {};
        newItemResponseSubItems.push(Object.assign(targetItem, subItem));
      });
      newItemResponse.item = newItemResponseSubItems;

      newItemResponse.item.forEach((subItem) => {
        let resultTextValue = result[subItem.text];
        if (resultTextValue) {
          subItem.answer = [
            {
              valueString: resultTextValue
            }
          ];
        }
      });
      newItemResponseList.push(newItemResponse);
    }

    return newItemResponseList;
  }

  getLibraryPrepopulationResult(item, cqlResults) {
    let prepopulationResult;
    item.extension.forEach((e) => {
      let value;
      if (
        e.url === "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue"
      ) {
        // stu3
        value = findValueByPrefix(e, "value");
      } else if (
        e.url === "http://hl7.org/fhir/StructureDefinition/cqf-expression" ||
        e.url ===
          "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
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
        libraryName = Object.keys(cqlResults)[0];
      }

      if (cqlResults[libraryName] != null) {
        prepopulationResult = cqlResults[libraryName][statementName];
      } else {
        prepopulationResult = null;
        console.log(`Couldn't find library "${libraryName}"`);
      }
    });
    return prepopulationResult;
  }

  prepopulate(items, response_items, saved_response) {
    items.map((item) => {
      let response_item = {
        linkId: item.linkId
      };

      if (item.item) {
        // add sub-items
        response_item.item = [];
        this.prepopulate(item.item, response_item.item, saved_response);
      }

      // Remove empty child item array
      if (response_item.item != undefined && response_item.item.length == 0) {
        response_item.item = undefined;
      }

      if (item.type === "choice" || item.type === "open-choice") {
        this.populateChoices(item);
      }

      // autofill fields
      if (item.extension && (!saved_response || item.type == 'open-choice') && !this.props.standalone) {
        response_item.answer = []
        item.extension.forEach(e => {
          let prepopulationResult = this.getLibraryPrepopulationResult(item, this.props.cqlPrepopulationResults);

          if (prepopulationResult != null && !saved_response) {
            switch (item.type) {
              case "boolean":
                response_item.answer.push({
                  valueBoolean: prepopulationResult
                });
                break;

              case "integer":
                response_item.answer.push({
                  valueInteger: prepopulationResult
                });
                break;

              case "decimal":
                response_item.answer.push({
                  valueDecimal: prepopulationResult
                });
                break;

              case "date":
                // LHC form could not correctly parse Date object.
                // Have to convert Date object to string.
                response_item.answer.push({
                  valueDate: prepopulationResult.toString()
                });
                break;

              case "choice":
                response_item.answer.push({
                  valueCoding: this.getDisplayCoding(prepopulationResult, item)
                });
                break;

              case "open-choice":
                //This is to populated dynamic options (option items generated from CQL expression)
                //R4 uses item.answerOption, STU3 uses item.option
                let populateAnswerOptions = false;
                let populateOptions = false;

                if (
                  item.answerOption != null &&
                  item.answerOption.length == 0
                ) {
                  populateAnswerOptions = true;
                } else if (item.option != null && item.option.length == 0) {
                  populateOptions = true;
                }

                prepopulationResult.forEach((v) => {
                  let displayCoding = this.getDisplayCoding(v, item);

                  if (populateAnswerOptions) {
                    item.answerOption.push({ valueCoding: displayCoding });
                  } else if (populateOptions) {
                    item.option.push({ valueCoding: displayCoding });
                  }

                  response_item.answer.push({ valueCoding: displayCoding });
                });
                break;

              case "quantity":
                response_item.answer.push({
                  valueQuantity: prepopulationResult
                });
                break;

              default:
                response_item.answer.push({ valueString: prepopulationResult });
            }
          }
        });

        // Remove empty answer array
        if (response_item.answer.length == 0) {
          response_item.answer = undefined;
        }
      }

      if (!saved_response) {
        // If there is no CQL value, check if item/prescription has initial value
        // This does NOT work for STU3 questionnaire which use item.initial[x]
        if (!response_item.answer && item.initial) {
          response_item.answer = item.initial;
        }

        // Don't need to add item for reloaded QuestionnaireResponse
        // Add QuestionnaireResponse item if the item has either answer(s) or child item(s)
        if (response_item.answer || response_item.item) {
          response_items.push(response_item);
        }
      }
    });
  }

  getDisplayCoding(v, item) {
    if (typeof v == "string") {
      const answerValueSetReference =
        item.answerValueSet || (item.options || {}).reference;
      const answerOption = item.answerOption || item.option;
      let selectedCode;

      if (answerValueSetReference && this.props.qform.contained) {
        const vs_id = answerValueSetReference.substr(1);
        const vs = this.props.qform.contained.find((r) => r.id == vs_id);
        if (vs && vs.expansion && vs.expansion.contains) {
          selectedCode = vs.expansion.contains.find((o) => o.code == v);
        }
      } else if (answerOption) {
        const ao = answerOption.find(
          (o) => o.valueCoding.code == v || o.valueCoding.display == v
        );
        if (ao) {
          selectedCode = ao.valueCoding;
        }
      }

      if (selectedCode) {
        return selectedCode;
      } else {
        return {
          display: v
        };
      }
    }

    let system = "";
    let displayText = v.display;

    if (v.type && v.type === "encounter" && v.periodStart) {
      displayText = "Encounter - " + v.display + " on " + v.periodStart;
    } else if (v.system) {
      if (v.system == "http://snomed.info/sct") {
        system = "SNOMED";
      } else if (v.system.startsWith("http://hl7.org/fhir/sid/icd-10")) {
        system = "ICD-10";
      } else if (v.system == "http://www.nlm.nih.gov/research/umls/rxnorm") {
        system = "RxNorm";
      }

      if (system.length > 0) {
        displayText = displayText + " - " + system + " - " + v.code;
      }
    }

    return {
      code: v.code,
      system: v.system,
      display: displayText
    };
  }

  populateMissingDisplay(codingList) {
    if (codingList) {
      codingList.forEach((v) => {
        if (v.valueCoding && !v.valueCoding.display) {
          v.valueCoding.display = v.valueCoding.code;
        }
      });
    }
  }

  populateChoices(item) {
    if (this.props.fhirVersion === "STU3") {
      this.populateMissingDisplay(item.option);
    } else {
      this.populateMissingDisplay(item.answerOption);
    }
  }

  storeQuestionnaireResponseToEhr(questionnaireReponse, showPopup) {
    // send the QuestionnaireResponse to the EHR FHIR server
    var questionnaireUrl =
      sessionStorage["serviceUri"] + "/QuestionnaireResponse";
    console.log("Storing QuestionnaireResponse to: " + questionnaireUrl);
    this.smart
      .create(questionnaireReponse)
      .then(
        (result) => {
          if (showPopup) {
            this.popupClear(
              "Partially completed form (QuestionnaireResponse) saved to EHR",
              "OK",
              true
            );
            this.popupLaunch();
          }
        },
        (result) => {
          this.popupClear(
            "Error: Partially completed form (QuestionnaireResponse) Failed to save to EHR",
            "OK",
            true
          );
          this.popupLaunch();
        }
      )
      .catch(console.error);
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
    pdfDocGenerator.getBase64((b64pdf) => {
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

  getPractitioner() {
    var p = "Unknown";
    var requestType = "Unknown";
    if (this.props.deviceRequest) {
      requestType = this.props.deviceRequest.resourceType;
      if (requestType == "DeviceRequest") {
        p = this.props.deviceRequest.performer.referencee;
      } else if (requestType == "ServiceRequest") {
        p = this.props.deviceRequest.performer.reference;
      } else if (requestType == "MedicationRequest") {
        p = this.props.deviceRequest.requester.reference;
      }
    }
    console.log("getPractitioner(): " + requestType + ": " + p);
    return p;
  }

  getPatient() {
    var p = "Unknown";
    var requestType = "Unknown";
    if (this.patientId) {
        p = `Patient/${this.patientId}`;
    } else if (this.props.deviceRequest) {
      requestType = this.props.deviceRequest.resourceType;
      if (requestType == "DeviceRequest") {
        p = this.props.deviceRequest.subject.reference;
      } else if (requestType == "ServiceRequest") {
        p = this.props.deviceRequest.subject.reference;
      } else if (requestType == "MedicationRequest") {
        p = this.props.deviceRequest.subject.reference;
      }
    }
    console.log("getPatient(): " + requestType + ": " + p);
    return p;
  }

  getCode() {
    var c = "Unknown";
    var requestType = "Unknown";
    if (this.props.deviceRequest) {
      requestType = this.props.deviceRequest.resourceType;
      if (requestType == "DeviceRequest") {
        c = this.props.deviceRequest.codeCodeableConcept;
      } else if (requestType == "ServiceRequest") {
        c = this.props.deviceRequest.code;
      } else if (requestType == "MedicationRequest") {
        c = this.props.deviceRequest.medicationCodeableConcept;
      }
    }
    console.log("getCode(): " + requestType + ": ");
    console.log(c);
    return c;
  }

  getQuestionnaireResponse(status) {
    var qr = window.LForms.Util.getFormFHIRData(
      "QuestionnaireResponse",
      "R4",
      "#formContainer"
    );
    console.log(qr);
    qr.status = status;
    qr.author = {
      reference: this.getPractitioner()
    };
    this.getPatient();
    qr.subject = {
      reference: this.getPatient()
    };

    qr.questionnaire = this.props.qform.id;

    console.log(this.props.attested);
    const aa = searchQuestionnaire(qr, this.props.attested);
    console.log(aa);
    return qr;
  }

  sendQuestionnaireResponseToPayer() {
    console.log(this.state.sectionLinks);
    var qr = this.getQuestionnaireResponse("completed");

    // do a fetch back to the dtr server to post the QuestionnaireResponse to CRD
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify(qr)
    };

    function handleFetchErrors(response) {
      if (!response.ok) {
        let msg = "Failure when fetching resource";
        let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
        console.log(msg + ": errorClass: " + details);
      }
      return response;
    }

    console.log(requestOptions);
    let url = this.FHIR_PREFIX + this.fhirVersion + "/QuestionnaireResponse";
    console.log(url);
    fetch(url, requestOptions)
      .then(handleFetchErrors)
      .then((r) => {
        let msg = "QuestionnaireResponse sent to Payer";
        console.log(msg);
        alert(msg);
      })
      .catch((err) => {
        console.log(
          "error sending new QuestionnaireResponse to the Payer: ",
          err
        );
      });

    return;
  }

  // create the questionnaire response based on the current state
  outputResponse(status) {
    var qr = this.getQuestionnaireResponse(status);

    if (status == "in-progress") {
      this.storeQuestionnaireResponseToEhr(qr, true);
      this.popupClear(
        "Partially completed form (QuestionnaireResponse) saved to EHR",
        "OK",
        true
      );
      this.popupLaunch();
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
    priorAuthBundle.entry.unshift({ resource: qr });
    console.log(priorAuthBundle);

    this.generateAndStoreDocumentReference(qr, priorAuthBundle);
    this.storeQuestionnaireResponseToEhr(qr, false);

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
      identifier: [
        {
          system: "urn:uuid:mitre-drls",
          value: shortid.generate()
        }
      ],
      use: "preauthorization",
      patient: { reference: this.makeReference(priorAuthBundle, "Patient") },
      created: qr.authored,
      provider: {
        // TODO: make this an organization
        reference: this.makeReference(priorAuthBundle, "Practitioner")
      },
      insurer: {
        reference: this.makeReference(priorAuthBundle, "Organization")
      },
      facility: {
        reference: this.makeReference(priorAuthBundle, "Location")
      },
      priority: { coding: [{ code: "normal" }] },
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
          sequence: 1,
          careTeamSequence: [1],
          productOrService: this.getCode(),
          quantity: {
            value: 1
          }
          // TODO: add extension
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
        // TOOD: diagnosis is not a reference it must be a codeableconcept
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
    try {
      if (resourceType == undefined || resourceType == null) {
        console.log("resourceType undefined or null");
      }
    } catch (error) {
      console.log(error.message);
      console.log(error.name);
      return;
    }
    if (resourceType == "DeviceRequest") {
      entry.resource.resourceType = resourceType;
    } else if (resourceType == "ServiceRequest") {
      entry.resource.resourceType = resourceType;
    } else if (resourceType == "MedicationRequest") {
      entry.resource.resourceType = resourceType;
    }
    var entry = bundle.entry.find(function (entry) {
      return entry.resource.resourceType == resourceType;
    });
    return resourceType + "/" + entry.resource.id;
  }

  popupClear(title, finalOption, logTitle) {
    this.setState({
      popupTitle: title,
      popupOptions: [],
      popupFinalOption: finalOption
    });
    if (logTitle) {
      console.log(title);
    }
  }

  popupLaunch() {
    this.clickChild();
  }

  popupCallback(returnValue) {
    // display the form loaded
    this.setState({
      formLoaded: returnValue
    });

    if (this.partialForms[returnValue]) {
      // load the selected form
      let partialResponse = this.partialForms[returnValue];
      let saved_response = true;

      console.log(partialResponse);

      this.setState({ savedResponse: partialResponse });

      // If not using saved QuestionnaireResponse, create a new one
      let newResponse = {
        resourceType: "QuestionnaireResponse",
        status: "draft",
        item: []
      };

      const items = this.props.qform.item;
      this.prepopulate(items, newResponse.item, saved_response);

      // force it to reload the form
      this.loadAndMergeForms(partialResponse);
    } else {
      console.log("No form loaded.");
    }
  }

  popupClear(title, finalOption, logTitle) {
    this.setState({
      popupTitle: title,
      popupOptions: [],
      popupFinalOption: finalOption
    });
    if (logTitle) {
      console.log(title);
    }
  }

  popupLaunch() {
    this.clickChild();
  }

  render() {
    console.log(this.state.savedResponse);
    return (
      <div>
        <div id="formContainer"></div>
        <SelectPopup
          title={this.state.popupTitle}
          options={this.state.popupOptions}
          finalOption={this.state.popupFinalOption}
          selectedCallback={this.popupCallback.bind(this)}
          setClick={(click) => (this.clickChild = click)}
        />
        <div className="status-panel">Form Loaded: {this.state.formLoaded}</div>
        <div className="submit-button-panel">
          <button
            className="btn submit-button"
            onClick={this.loadPreviousForm.bind(this)}
          >
            Load Previous Form
          </button>
          <button
            className="btn submit-button"
            onClick={this.sendQuestionnaireResponseToPayer.bind(this)}
          >
            Send to Payer
          </button>
          <button
            className="btn submit-button"
            onClick={this.outputResponse.bind(this, "in-progress")}
          >
            Save
          </button>
          <button
            className="btn submit-button"
            onClick={this.outputResponse.bind(this, "completed")}
          >
            Next
          </button>
        </div>
      </div>
    );
  }
}
