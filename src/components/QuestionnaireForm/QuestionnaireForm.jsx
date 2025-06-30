import React, { Component } from "react";
import "./QuestionnaireForm.css";
import { findValueByPrefix, searchQuestionnaire } from "../../util/util.js";
import SelectPopup from './SelectPopup';
import shortid from "shortid";
import _ from "lodash";
import ConfigData from "../../config.json";
import ReactDOM from 'react-dom'
import {createTask} from "../../util/taskCreation";
import retrieveQuestions, { buildNextQuestionRequest } from "../../util/retrieveQuestions";

// NOTE: need to append the right FHIR version to have valid profile URL
var DTRQuestionnaireResponseURL = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-questionnaireresponse-";

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
      savedResponse: null,
      formLoaded: "New",
      popupTitle: "Would you like to continue an in-process questionnaire?",
      popupOptions: [],
      popupFinalOption: "Cancel",
      formFilled: true,
      formValidationErrors: []
    };

    this.outputResponse = this.outputResponse.bind(this);
    this.smart = props.smart;
    this.patientId = props.patientId;
    this.fhirVersion = props.fhirVersion;
    this.appContext = props.appContext;
    this.partialForms = {};
    this.handleGtable = this.handleGtable.bind(this);
    this.getLibraryPrepopulationResult = this.getLibraryPrepopulationResult.bind(this);
    this.buildGTableItems = this.buildGTableItems.bind(this);
    this.mergeResponseForSameLinkId = this.mergeResponseForSameLinkId.bind(this);
    this.getRetrieveSaveQuestionnaireUrl = this.getRetrieveSaveQuestionnaireUrl.bind(this);
    this.addAuthorToResponse = this.addAuthorToResponse.bind(this);
    this.updateSavedResponseWithPrepopulation = this.updateSavedResponseWithPrepopulation.bind(this);
    DTRQuestionnaireResponseURL += this.fhirVersion.toLowerCase();
    this.repopulateAndReload = this.repopulateAndReload.bind(this);
    this.loadNextQuestions = this.loadNextQuestions.bind(this);
    this.mergeResponses = this.mergeResponses.bind(this);
    this.isAdaptiveForm = this.isAdaptiveForm.bind(this);
    this.getDisplayButtons = this.getDisplayButtons.bind(this);
    this.isAdaptiveFormWithoutItem = this.isAdaptiveFormWithoutItem.bind(this);
    this.isAdaptiveFormWithItem = this.isAdaptiveFormWithItem.bind(this);
    this.loadPreviousForm = this.loadPreviousForm.bind(this);
  }

  componentWillMount() {
    // search for any partially completed QuestionnaireResponses
    if (this.props.response) {
      const response = this.props.response;
      const items = this.props.qform.item;
      const parentItems = [];
      this.handleGtable(items, parentItems, response.item);
      this.prepopulate(items, response.item, true);
      const mergedResponse = this.mergeResponseForSameLinkId(response);
      this.setState({
        savedResponse: mergedResponse
      })
    } else {
      this.loadPreviousForm(false);

      // If not using saved QuestionnaireResponse, create a new one
      let newResponse = {
        resourceType: 'QuestionnaireResponse',
        status: 'draft',
        item: []
      }
      const items = this.props.qform.item || [];
      const parentItems = [];
      this.handleGtable(items, parentItems, newResponse.item);
      this.prepopulate(items, newResponse.item, false);
      let mergedResponse = this.mergeResponseForSameLinkId(newResponse);
      this.setState({
        savedResponse: mergedResponse
      })
      localStorage.setItem("lastSavedResponse", JSON.stringify(mergedResponse));
    }
  }

  componentDidMount() {
    this.loadAndMergeForms(this.state.savedResponse);
    const formErrors = LForms.Util.checkValidity();
    this.setState({
      formValidationErrors: formErrors == null ? [] : formErrors
    });

    document.addEventListener('change', event => {
      if (this.props.filterChecked && event.target.id != "filterCheckbox" && event.target.id != "attestationCheckbox") {
        const checkIfFilter = (currentErrors, newErrors, targetElementName) => {
          if (currentErrors.length < newErrors.length)
            return false;

          const addedErrors = newErrors.filter(error => !currentErrors.includes(error));
          if (addedErrors.some(error => error.includes(targetElementName))) {
            return false;
          }

          return true;
        };
        const newErrors = LForms.Util.checkValidity();
        const ifFilter = checkIfFilter(this.state.formValidationErrors, newErrors == null ? [] : newErrors, event.target.getAttribute("name"));

        if (ifFilter) {
          this.props.filterFieldsFn(this.props.formFilled);
        } else {
          console.log("Modified field is invalid. Skip filtering.");
        }
        this.setState({
          formValidationErrors: newErrors
        });
      }
    });
  }

  repopulateAndReload() {
    console.log("----- Re-populating and reloading form ----");
    // rerun pre-population
    let newResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'draft',
      item: []
    }
    const items = this.props.qform.item || [];
    const parentItems = [];
    this.handleGtable(items, parentItems, newResponse.item);
    this.prepopulate(items, newResponse.item, false);

    // merge pre-populated response and response from the server
    let mergedResponse = newResponse;
    if (this.props.adFormResponseFromServer) {
      mergedResponse = this.mergeResponses(this.mergeResponseForSameLinkId(newResponse), this.mergeResponseForSameLinkId(this.props.adFormResponseFromServer));
    } else {
      mergedResponse = this.mergeResponses(this.mergeResponseForSameLinkId(newResponse), JSON.parse(localStorage.getItem("lastSavedResponse")));
    }

    this.loadAndMergeForms(mergedResponse);
    this.props.updateReloadQuestionnaire(false);
  }

  mergeResponses(firstResponse, secondResponse) {
    const combinedItems = firstResponse.item.concat(secondResponse.item);
    firstResponse.item = combinedItems;
    return firstResponse;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.reloadQuestionnaire) {
      this.repopulateAndReload();
    }
  }

  getRetrieveSaveQuestionnaireUrl = () => {
    // read configuration 
    let updateDate = new Date();
    updateDate.setDate(updateDate.getDate() - ConfigData.QUESTIONNAIRE_EXPIRATION_DAYS);
    return `QuestionnaireResponse?_lastUpdated=gt${updateDate.toISOString().split('T')[0]}&status=in-progress`
  }

  loadPreviousForm(showError = true) {
    // search for any QuestionnaireResponses
    let questionnaireResponseUrl = this.getRetrieveSaveQuestionnaireUrl();
    questionnaireResponseUrl = questionnaireResponseUrl + "&subject=" + this.getPatient();
    console.log("Using URL " + questionnaireResponseUrl);

    this.smart.request(questionnaireResponseUrl)
      .then((result) => {
        this.popupClear("Would you like to load a previously in-progress form?", "Cancel", false);
        this.processSavedQuestionnaireResponses(result, showError);
      })
      .catch((error) => {
        console.error("Error loading previous forms:", error);
        this.popupClear("Error: failed to load previous in-progress forms", "OK", true);
        this.popupLaunch();
      });
  }

  // retrieve next sets of questions
  loadNextQuestions() {
    const formQr = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', this.fhirVersion, "#formContainer");
    const questionnaireResponse = buildNextQuestionRequest(this.props.qform, formQr, this.getPatient());

    let url = "";
    try {

      if (!questionnaireResponse.questionnaire) {
        throw new Error("QuestionnaireResponse does not contain questionnaire reference");
      }

      const questionnaireId = questionnaireResponse.questionnaire.substr(1);
      const questionnaire = (questionnaireResponse.contained || []).find(c => c.id === questionnaireId);
      if (!questionnaire) {
        throw new Error(`QuestionnaireResponse does not have a contained Questionnaire with id "${questionnaireId}"`);
      }

      // extract the URL for the $next-question operation
      const adaptiveExtension = (questionnaire.extension || []).find(e => e.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-questionnaireAdaptive");
      if (!adaptiveExtension) {
        throw new Error("Questionnaire does not have sdc-questionnaire-questionnaireAdaptive extension");
      }
      url = adaptiveExtension.valueUrl;
      if (!url) {
        throw new Error("Questionnaire does not have a valid sdc-questionnaire-questionnaireAdaptive extension valueUrl");
      }
      
    } catch (error) {
      console.log("Error: ", error);
      alert("Failed to load next questions. Error: " + error.message);
      return; 
    }

    const currentQuestionnaireResponse = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', this.fhirVersion, "#formContainer");;
    //const mergedResponse = this.mergeResponseForSameLinkId(questionnaireResponse);
    retrieveQuestions(url, questionnaireResponse, this.smart)
      .then(result => {
        if (!result.ok) {
          console.log("Result: ", result);
          throw new Error(`${result.status} - ${result.statusText}`);
        }
        return result.json();
      })
      .then(result => {
        try {
          if (!result) {
            throw new Error("No response from server");
          }
          console.log("-- loadNextQuestions response returned from payer server questionnaireResponse ", result);

          if (result.error !== undefined) {
            throw new Error(result.error);
          }

          if (result.resourceType !== 'QuestionnaireResponse') {
            throw new Error("Expected QuestionnaireResponse resource type in out parameter, but got " + result.resourceType);
          }

          let newResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'draft',
            item: []
          };
          this.prepopulate(result.contained[0].item, newResponse.item, true);
          this.props.updateAdFormResponseFromServer(result);
          this.props.updateAdFormCompleted(result.status === "completed");
          this.props.ehrLaunch(true, result.contained[0]); 
        } catch (error) {
          alert("Failed to load next questions. Error: " + error.message);
        }
      })
      .catch(error => {
        console.log("retrieveQuestions Error: ", error);
        alert("Failed to load next questions. Error: " + error.message);
      });
  }

  processSavedQuestionnaireResponses(partialResponses, displayErrorOnNoneFound) {
    let noneFound = true;

    if (partialResponses && (partialResponses.total > 0)) {
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      };

      let count = 0;

      partialResponses.entry.forEach(bundleEntry => {
        let idMatch = false;
        if(bundleEntry.resource.contained){
          const questionnaireId = bundleEntry.resource?.contained[0].id;
          idMatch = this.props.qform.id === questionnaireId;
        }
        const questionnaireIdUrl = bundleEntry.resource.questionnaire;

        if ( idMatch || questionnaireIdUrl.includes(this.props.qform.id)) {
          count = count + 1;
          // add the option to the popupOptions
          let date = new Date(bundleEntry.resource.authored);
          let option = date.toLocaleDateString(undefined, options) + " (" + bundleEntry.resource.status + ")";
          this.setState({
            popupOptions: [...this.state.popupOptions, option]
          });
          this.partialForms[option] = bundleEntry.resource;
        }
      });
      console.log(this.state.popupOptions);
      console.log(this.partialForms);

      //check if show popup
      const showPopup = !this.isAdaptiveForm() || this.isAdaptiveFormWithoutItem();
      // only show the popupOptions if there is one to show
      if (count > 0 && showPopup) {
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

    let lform = LForms.Util.convertFHIRQuestionnaireToLForms(this.props.qform, this.props.fhirVersion);

    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeaders: false,
      showQuestionCode: false,
      hideFormControls: true,
      showFormOptionPanelButton: true
    };

    if (newResponse) {
      newResponse = this.mergeResponseForSameLinkId(newResponse);
      lform = LForms.Util.mergeFHIRDataIntoLForms("QuestionnaireResponse", newResponse, lform, this.props.fhirVersion);
    }

    console.log(lform);

    // Custom rendering for media fields
    this.renderMediaFields(lform);

    LForms.Util.addFormToPage(lform, "formContainer");
    const header = document.getElementsByClassName("lf-form-title")[0];
    const el = document.createElement('div');
    el.setAttribute("id", "button-container");
    header.appendChild(el);
    this.props.renderButtons(el);

    // Create and append patient info
    const patientInfoEl = document.createElement('div');
    patientInfoEl.setAttribute("id", "patientInfo-container");
    header.appendChild(patientInfoEl);
    let patientId = this.getPatient().replace("Patient/", "");
    let patientInfoElement = (display) => (<div className="patient-info-panel"><label>Patient: {display}</label></div>);
    
    this.smart.request(`Patient/${patientId}`)
      .then((result) => {
        ReactDOM.render(patientInfoElement(`${result.name[0].given[0]} ${result.name[0].family}`), patientInfoEl);
      })
      .catch((error) => {
        console.log("Failed to retrieve the patient information. Error is ", error);
        ReactDOM.render(patientInfoElement("Unknown"), patientInfoEl);
      });

    // Extract properties
    let authored = newResponse.authored || "Unknown";
    let authorName = newResponse.author?.resolve()?.name || "Unknown";
    let sourceName = newResponse.source?.resolve()?.name || "Unknown";

    // Create a container for the header info
    const headerInfoEl = document.createElement('div');
    headerInfoEl.setAttribute("id", "headerInfo-container");
    header.appendChild(headerInfoEl);

    const HeaderInfo = ({ questionnaireDisplay, title, authored, authorName, sourceName }) => (
        <div className="header-info-panel">
          <div>Authored: {authored}</div>
          <div>Author Name: {authorName}</div>
          <div>Source Name: {sourceName}</div>
        </div>
    );

    // Render the HeaderInfo component
    ReactDOM.render(
        <HeaderInfo
            authored={authored}
            authorName={authorName}
            sourceName={sourceName}
        />,
        headerInfoEl
    );

    this.props.filterFieldsFn(true);
  }

  // Function to handle custom rendering of media fields
  renderMediaFields(lform) {
    const formContainer = document.getElementById('formContainer');

    const processMediaField = (item) => {
      if (item.extension) {
        const mediaExtension = item.extension.find(ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemMedia');
        if (mediaExtension && mediaExtension.valueAttachment) {
          const mediaContainer = document.createElement('div');
          mediaContainer.className = 'media-field-container';

          if (mediaExtension.valueAttachment.contentType.startsWith('image/')) {
            const mediaElement = document.createElement('img');
            mediaElement.src = mediaExtension.valueAttachment.url;
            mediaElement.alt = item.text || 'Media';
            mediaContainer.appendChild(mediaElement);
          } else if (mediaExtension.valueAttachment.contentType.startsWith('video/')) {
            const mediaElement = document.createElement('video');
            mediaElement.src = mediaExtension.valueAttachment.url;
            mediaElement.controls = true;
            mediaContainer.appendChild(mediaElement);
          } else if (mediaExtension.valueAttachment.contentType === 'application/pdf') {
            const mediaElement = document.createElement('embed');
            mediaElement.src = mediaExtension.valueAttachment.url;
            mediaElement.type = 'application/pdf';
            mediaContainer.appendChild(mediaElement);
          } else {
            // TODO: Handle other media types if needed
          }

          // Find the question container to append the media
          const questionContainer = formContainer.querySelector(`[data-link-id="${item.linkId}"]`);
          if (questionContainer) {
            questionContainer.appendChild(mediaContainer);
          }
        }
      }
    };

    const traverseItems = (items) => {
      items.forEach(item => {
        processMediaField(item);
        if (item.item) {
          traverseItems(item.item);
        }
      });
    };

    traverseItems(lform.items);
  }

  // Merge the items for the same linkId to comply with the LHCForm
  mergeResponseForSameLinkId(response) {
    let mergedResponse = {
      resourceType: response.resourceType,
      status: response.status,
      item: []
    };
    const responseItems = response.item;
    if (responseItems) {
      let itemKeyList = new Set();
      for (let i = 0; i < responseItems.length; i++) {
        itemKeyList.add(responseItems[i].linkId);
      }
      itemKeyList.forEach(linkId => {
        let linkIdItem = {
          linkId,
          item: []
        };
        let filteredItems = responseItems.filter(responseItem => responseItem.linkId == linkId
        );
        if (filteredItems) {
          filteredItems.forEach(foundItem => {
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
    }
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
        "linkId": item.linkId
      };
      if (item.item) {
        parentItems.push(response_item);
      }

      if (item.type == "group" && item.extension) {

        let isGtable = item.extension.some(e =>
            e.url == "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl" && e.valueCodeableConcept.coding[0].code == "gtable"
        );
        let containsValueExpression = item.extension.some(e =>
            e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        );

        if (isGtable && containsValueExpression && !this.props.standalone) {
          // check if the prepopulationResult contains any value
          // if yes, then need to add corresponding sub-items then provide the answer
          // need to figure out which value is provided from the prepopulationResult though

          // grab the population result
          let prepopulationResult = this.getLibraryPrepopulationResult(item, this.props.cqlPrepopulationResults);

          // console.log("prepopulationResult: ", prepopulationResult);
          if (prepopulationResult && prepopulationResult.length > 0) {
            let newItemList = this.buildGTableItems(item, prepopulationResult);
            parentItems.pop();
            let parentItem = parentItems.pop();
            if (newItemList.length > 0) {
              parentItem.item = [];
              for (let i = 0; i < newItemList.length; i++) {
                parentItem.item.push(newItemList[i])
              }
              responseItems.push(parentItem);
            }
          } else {
            // remove valueExpression from item to prevent prepopulate function to fill empty response
            let valueExpressionIndex = item.extension.findIndex(e => e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression");
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
    let expressionExtensionIndex = item.extension.findIndex(e =>
        e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
    );
    item.extension.splice(expressionExtensionIndex, 1);
    //add item answer to the subitem
    let itemSubItems = item.item;
    let newItemResponseList = [];

    for (let index = 0; index < prepopulationResult.length; index++) {
      let result = prepopulationResult[index];

      let newItemResponse = {
        "linkId": item.linkId,
        "text": item.text
      }

      let newItemResponseSubItems = [];
      itemSubItems.forEach(subItem => {
        let targetItem = {};
        newItemResponseSubItems.push(Object.assign(targetItem, subItem));
      });
      newItemResponse.item = newItemResponseSubItems;

      newItemResponse.item.forEach(subItem => {
        let resultTextValue = result[subItem.text];
        if (resultTextValue) {
          subItem.answer = [{
            "valueString": resultTextValue
          }];
        }
      });
      newItemResponseList.push(newItemResponse);
    }

    return newItemResponseList;
  }

  getLibraryPrepopulationResult(item, cqlResults) {
    let prepopulationResult;
    item.extension.forEach(e => {
      let value, valueExpression;
      if (
          e.url ===
          "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue"
      ) {
        // stu3
        value = findValueByPrefix(e, "value");
      } else if (
          e.url === "http://hl7.org/fhir/StructureDefinition/cqf-expression" ||
          e.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
      ) {
        // r4
        value = findValueByPrefix(e, "value");
        valueExpression = value.expression;
      } else {
        // not a cql statement reference
        return;
      }

      let libraryName;
      let statementName;
      // this is embedded CQL in Questionnaire
      if(value.language === "application/elm+json") {
        libraryName = "LibraryLinkId" + item.linkId;
        statementName = "LinkId." + item.linkId;
      }
      else {
        //TODO: Check why this is sometimes undefined
        if (valueExpression !== undefined) {
          // split library designator from statement
          const valueComponents = valueExpression.split(".");

          if (valueComponents.length > 1) {
            libraryName = valueComponents[0].substring(
                1,
                valueComponents[0].length - 1
            );
            statementName = valueComponents[1];
          } else {
            // if there is not library name grab the first library name
            statementName = valueExpression;
            libraryName = Object.keys(cqlResults)[0];
          }
        }
      }

      if (cqlResults[libraryName] != null) {
        prepopulationResult = cqlResults[
            libraryName
            ][statementName];
        console.log(`Found library "${libraryName}"`);
      } else {
        prepopulationResult = null;
        console.log(`Couldn't find library "${libraryName}"`);
      }
    });
    return prepopulationResult;

  }

  prepopulate(items, response_items, saved_response) {
    items.map(item => {
      let response_item = {
        linkId: item.linkId,
      };

      if (item.item) {
        // add sub-items
        response_item.item = []
        this.prepopulate(item.item, response_item.item, saved_response);
      }

      // Remove empty child item array
      if ((response_item.item != undefined) && (response_item.item.length == 0)) {
        response_item.item = undefined
      }

      if (item.type === 'choice' || item.type === 'open-choice') {
        this.populateChoices(item)
      }

      // Handle itemMedia extension
      if (item.extension) {
        item.extension.forEach(ext => {
          if (ext.url === "http://hl7.org/fhir/StructureDefinition/questionnaire-itemMedia") {
            response_item.itemMedia = ext.itemMedia;
          }
        });
      }

      // autofill fields
      if (item.extension && (!saved_response || item.type == 'open-choice') && !this.props.standalone) {
        response_item.answer = []
        item.extension.forEach(e => {
          let prepopulationResult = this.getLibraryPrepopulationResult(item, this.props.cqlPrepopulationResults);

          if (prepopulationResult != null && !saved_response) {
            switch (item.type) {
              case 'boolean':
                response_item.answer.push({ valueBoolean: prepopulationResult });
                break;

              case 'integer':
                response_item.answer.push({ valueInteger: prepopulationResult });
                break;

              case 'decimal':
                response_item.answer.push({ valueDecimal: prepopulationResult });
                break;

              case 'date':
                // LHC form could not correctly parse Date object.
                // Have to convert Date object to string.
                response_item.answer.push({ valueDate: prepopulationResult.toString() });
                break;

              case 'choice':
                response_item.answer.push({ valueCoding: this.getDisplayCoding(prepopulationResult, item) });
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
                  let displayCoding = this.getDisplayCoding(v, item)

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
          }
        });

        // Remove empty answer array
        if (response_item.answer.length == 0) {
          response_item.answer = undefined
        }
      }

      if (!saved_response) {
        // If there is no CQL value, check if item/prescription has initial value
        // This does NOT work for STU3 questionnaire which use item.initial[x]
        if (!response_item.answer && item.initial) {
          response_item.answer = item.initial
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
    if (typeof v == 'string') {
      const answerValueSetReference = item.answerValueSet || (item.options || {}).reference
      const answerOption = item.answerOption || item.option
      let selectedCode;

      if (answerValueSetReference && this.props.qform.contained) {
        const vs_id = answerValueSetReference.substr(1);
        const vs = this.props.qform.contained.find(r => r.id == vs_id);
        if (vs && vs.expansion && vs.expansion.contains) {
          selectedCode = vs.expansion.contains.find(o => o.code == v)
        }
      } else if (answerOption) {
        const ao = answerOption.find(o => o.valueCoding.code == v || o.valueCoding.display == v)
        if (ao) {
          selectedCode = ao.valueCoding
        }
      }

      if (selectedCode) {
        return selectedCode
      } else {
        return {
          display: v
        }
      }
    }

    let system = '';
    let displayText = v.display

    if (v.type && v.type === 'encounter' && v.periodStart) {
      displayText = 'Encounter - ' + v.display + ' on ' + v.periodStart
    } else if (v.system) {
      if (v.system == 'http://snomed.info/sct') {
        system = 'SNOMED'
      } else if (v.system.startsWith('http://hl7.org/fhir/sid/icd-10')) {
        system = "ICD-10"
      } else if (v.system == "http://www.nlm.nih.gov/research/umls/rxnorm") {
        system = "RxNorm"
      }

      if (system.length > 0) {
        displayText = displayText + ' - ' + system + ' - ' + v.code
      }
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

  populateChoices(item) {
    if (this.props.fhirVersion === 'STU3') {
      this.populateMissingDisplay(item.option)
    } else {
      this.populateMissingDisplay(item.answerOption)
    }
  }

  storeQuestionnaireResponseToEhr(questionnaireReponse, showPopup) {
    // send the QuestionnaireResponse to the EHR FHIR server
    var questionnaireUrl = sessionStorage["serviceUri"] + "/QuestionnaireResponse";
    console.log("Storing QuestionnaireResponse to: " + questionnaireUrl);
    
    this.smart.request({
      url: questionnaireUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/fhir+json"
      },
      body: JSON.stringify(questionnaireReponse)
    }).then((result) => {
      if (showPopup) {
        this.popupClear("Partially completed form (QuestionnaireResponse) saved to EHR", "OK", true);
        this.popupLaunch();
      }
    }).catch((error) => {
      console.error("Error saving QuestionnaireResponse:", error);
      this.popupClear("Error: Partially completed form (QuestionnaireResponse) Failed to save to EHR", "OK", true);
      this.popupLaunch();
    });
  }
  generateAndStoreDocumentReference(questionnaireResponse, dataBundle) {
    var pdfMake = require("pdfmake/build/pdfmake.js");
    var pdfFonts = require("pdfmake/build/vfs_fonts.js");
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

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

  getPractitioner() {
    var p = "Unknown";
    var requestType = "Unknown";
    if (this.props.deviceRequest) {
      requestType = this.props.deviceRequest.resourceType;
      if (requestType == "DeviceRequest") {
        p = this.props.deviceRequest.performer.reference;
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
    console.log("getCode(): " + requestType + ": ")
    console.log(c);
    return c;
  }

  addAuthorToResponse(qr, practitionerRef) {
    function traverseToItemsLeafNode(item, practitionerRef) {
      if (!item.item) {
        return addAuthor(item, practitionerRef);
      }
      else {
        item.item.map(item => {
          traverseToItemsLeafNode(item, practitionerRef);
        })
      }
    }
    // url is a string
    function addAuthor(item, practitionerRef) {
      var url = "http://hl7.org/fhir/StructureDefinition/questionnaireresponse-author"
      const urlValRef =
          {
            "url": url,
            "valueReference":
                {
                  "reference": practitionerRef
                }
          }
      if (item.extension) {
        // if there is already an extension with author-extension url
        const completelyFound = item.extension.find(element => element.url === url && element.valueReference.reference === practitionerRef)
        const urlFound = item.extension.find(element => element.url === url && element.valueReference.reference !== practitionerRef)

        if (!completelyFound) {
          if (urlFound) {
            var urlFoundIndex = item.extension.findIndex(element => element.url === url)
            item.extension[urlFoundIndex].valueReference =
                {
                  "reference": practitionerRef
                }
          }
          else {
            item.extension.push(urlValRef)
          }
        }
      }
      else {
        item["extension"] = [urlValRef]
      }
    }
    if(qr.item) {
      qr.item.map(item => {
        traverseToItemsLeafNode(item, practitionerRef)
      })
    }
  }

  getQuestionnaireResponse(status) {
    var qr = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', this.fhirVersion, "#formContainer");
    //console.log(qr);
    qr.status = status;
    qr.author = {
      reference:
          this.getPractitioner()
    };
    this.getPatient();
    qr.subject = {
      reference:
          this.getPatient()
    };
    this.addAuthorToResponse(qr, this.getPractitioner());

    qr.questionnaire = this.appContext.questionnaire?this.appContext.questionnaire:this.props.response.questionnaire;
    console.log("GetQuestionnaireResponse final QuestionnaireResponse: ", qr);

    const request = this.props.deviceRequest;
    // add context extension
    qr.extension = [];
    if(request !== undefined) {
      const contextExtensionUrl = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/context";
      qr.extension.push({
        url: contextExtensionUrl,
        valueReference: {
          reference: `${request.resourceType}/${request.id}`,
          type: `${request.resourceType}`
        }
      })

      if(request.insurance !== null && request.insurance.length > 0) {
        const coverage = request.insurance[0];
        qr.extension.push({
          url: contextExtensionUrl,
          valueReference: {
            reference: `${coverage.reference}`,
            type: "Coverage"
          }
        })
      }
    }
    console.log(this.props.attested);
    const aa = searchQuestionnaire(qr, this.props.attested);
    console.log(aa);
    return qr;
  }

  sendQuestionnaireResponseToPayer() {
    console.log(this.state.sectionLinks);
    var qr = this.getQuestionnaireResponse("completed");

    // change QuestionnaireResponse meta to show DTR QuestionnaireResponse instead of SDC QuestionnaireResponse
    if (qr.meta && qr.meta.profile && qr.meta.profile.length) {
      qr['meta']['profile'][0] = DTRQuestionnaireResponseURL;
    }

    // do a fetch back to the dtr server to post the QuestionnaireResponse to CRD
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(qr)
    };

    // add the contained questionnaire for adaptive form 
    if (this.isAdaptiveForm()) {
      qr.contained = [];
      qr.contained.push(this.props.qform);
    }

    function handleFetchErrors(response) {
      if (!response.ok) {
        let msg = "Failure when fetching resource";
        let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
        console.log(msg + ": errorClass: " + details);
      }
      return response;
    }

    console.log(requestOptions);
    let url = this.props.appContext.questionnaire;
    if(url) {
      const urlArray = url.split('/');
      url = urlArray.slice(0, -2).join('/');
    } else {
      url = 'http://localhost:8090/fhir/r4'
    }
    url = url + "/QuestionnaireResponse";
    console.log(url);
    fetch(url, requestOptions).then(handleFetchErrors).then(r => {
      let msg = "QuestionnaireResponse sent to Payer";
      console.log(msg);
      alert(msg);
    })
        .catch(err => {
          console.log("error sending new QuestionnaireResponse to the Payer: ", err);
        });

    return;
  }

  isAdaptiveForm() {
    return this.props.qform.extension && this.props.qform.extension.some(e => e.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-questionnaireAdaptive");
  }

  isAdaptiveFormWithoutItem() {
    return this.isAdaptiveForm() && this.props.qform && (this.props.qform.item === undefined || this.props.qform.item.length <= 0);
  }

  isAdaptiveFormWithItem() {
    return this.isAdaptiveForm() && this.props.qform && this.props.qform.item && this.props.qform.item.length >0;
  }

  isPriorAuthBundleValid(bundle) {
    const resourceTypeList = ["Patient", "Practitioner"];

    return resourceTypeList.every(resourceType => {
      let foundEntry = bundle.entry.find(function (entry) {
        return entry.resource.resourceType === resourceType;
      });
      if (foundEntry === undefined) {
        console.warn("--- isPriorAuthBundleValid: bundle missing required resource ", resourceType);
      }
      return foundEntry !== undefined;
    });
  }

  // create the questionnaire response based on the current state
  outputResponse(status) {
    var qr = this.getQuestionnaireResponse(status);

    // add the contained questionnaire for adaptive form 
    if (this.isAdaptiveForm()) {
      qr.contained = [];
      qr.contained.push(this.props.qform);
    }

    if (status == "in-progress") {
      const showPopup = !this.isAdaptiveForm() || this.isAdaptiveFormWithoutItem();
      this.storeQuestionnaireResponseToEhr(qr, showPopup);
      if (this.appContext.task) {
        createTask(JSON.parse(this.appContext.task), this.props.smart);
      }
      this.popupClear("Partially completed form (QuestionnaireResponse) saved to EHR", "OK", true);
      if(showPopup) {
        this.popupLaunch();
      } else {
        alert("Partially completed form (QuestionnaireResponse) saved to EHR");
      }
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
    if (priorAuthBundle && this.isPriorAuthBundleValid(priorAuthBundle)) {
      priorAuthBundle.entry.unshift({ resource: managingOrg });
      priorAuthBundle.entry.unshift({ resource: facility });
      priorAuthBundle.entry.unshift({ resource: insurer });
      priorAuthBundle.entry.unshift({ resource: this.props.deviceRequest });
      priorAuthBundle.entry.unshift({ resource: qr });

      this.generateAndStoreDocumentReference(qr, priorAuthBundle);
      this.storeQuestionnaireResponseToEhr(qr, false);

      //If the app context contains a Task, save it
      //TODO: Handle when a task updates or is already saved
      if (this.appContext.task) {
        createTask(JSON.parse(this.appContext.task), this.props.smart);
      }

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
          // TODO: make this organization
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
            // TODO: add extensions
          }
        ],
        diagnosis: [],
        insurance: [
          {
            sequence: 1,
            focal: true,
            coverage: {
              // TODO: diagnosis is not a reference it must be CodeableConcept
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

      this.props.setPriorAuthClaim(priorAuthBundle);
    } else {
      alert("Prior Auth Bundle is not available or does not contain enough resources for Prior Auth. Can't submit to prior auth.")
    }
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
    if(!entry) {
      console.warn("Couldn't find entry for resource ", resourceType);
      return;
    }
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
      let saved_response = false;

      console.log(partialResponse);

      if(partialResponse.contained && partialResponse.contained[0].resourceType === "Questionnaire") {
        localStorage.setItem("lastSavedResponse", JSON.stringify(partialResponse));
        this.props.updateQuestionnaire(partialResponse.contained[0]);
      } else {
        // If not using saved QuestionnaireResponse, create a new one
        let newResponse = {
          resourceType: 'QuestionnaireResponse',
          item: []
        }

        const items = this.props.qform.item;
        this.prepopulate(items, newResponse.item, saved_response)

        this.updateSavedResponseWithPrepopulation(newResponse, partialResponse);

        // force it to reload the form
        this.loadAndMergeForms(partialResponse);
      }
    } else {
      console.log("No form loaded.");
    }
  }


  updateSavedResponseWithPrepopulation = (newOne, saved) => {
    const updateMergeItem = (newItem, savedItem, parentLinkId) => {
      if (newItem.item == undefined) {
        //find the corresponding linkId in savedItem and replace it
        const findSavedParentItem = (parentLinkId, savedItem) => {
          if (savedItem.linkId === parentLinkId) {
            return savedItem;
          } else {
            if (savedItem.item) {
              const parentIndex = savedItem.item.findIndex(item => item.linkId == parentLinkId);
              if (parentIndex != -1) {
                return savedItem.item[parentIndex];
              } else {
                findSavedParentItem(parentLinkId, savedItem.item);
              }
            }
          }
        };

        const savedParentItem = findSavedParentItem(parentLinkId, savedItem);
        const replaceOrInsertItem = (newResponseItem, savedParentItem) => {
          const replaceIndex = savedParentItem.item.findIndex(item => item.linkId == newResponseItem.linkId);
          if (replaceIndex != -1) {
            savedParentItem.item[replaceIndex] = newResponseItem;
          } else {
            savedParentItem.item.push(newResponseItem);
          }
        };
        if (savedParentItem != undefined) {
          replaceOrInsertItem(newItem, savedParentItem);
        }
      } else {
        if(newItem.item) {
          newItem.item.forEach(newSubItem => {
            updateMergeItem(newSubItem, savedItem, newItem.linkId);
          });
        }
      }
    };

    newOne.item.map(newItem => {
      if (saved.item !== undefined) {
        let savedIndex = saved.item.findIndex(savedItem => newItem.linkId == savedItem.linkId);
        if (savedIndex != -1) {
          updateMergeItem(newItem, saved.item[savedIndex], newOne.linkId);
        }
      }
    });
  };

  getDisplayButtons() {
    if (!this.isAdaptiveForm()) {
      return (<div className="submit-button-panel">
        <button className="btn submit-button" onClick={this.loadPreviousForm.bind(this)}>
          Load Previous Form
        </button>
        <button className="btn submit-button" onClick={this.sendQuestionnaireResponseToPayer.bind(this)}>
          Send to Payer
        </button>
        <button className="btn submit-button" onClick={this.outputResponse.bind(this, "in-progress")}>
          Save to EHR
        </button>
        <button className="btn submit-button" onClick={this.outputResponse.bind(this, "completed")}>
          Proceed To Prior Auth
        </button>
      </div>)
    }
    else {
      if (this.props.adFormCompleted) {
        return (
            <div className="submit-button-panel">
              <button className="btn submit-button" onClick={this.sendQuestionnaireResponseToPayer.bind(this)}>
                Send to Payer
              </button>
              <button className="btn submit-button" onClick={this.outputResponse.bind(this, "completed")}>
                Proceed To Prior Auth
              </button>
            </div>
        )
      }
      else {
        return (
            <div className="submit-button-panel">
              {this.isAdaptiveFormWithoutItem() ? (
                  <button className="btn submit-button" onClick={this.loadPreviousForm.bind(this)}>
                    Load Previous Form
                  </button>
              ) : null}
              {this.isAdaptiveFormWithItem() ? (<button className="btn submit-button" onClick={this.outputResponse.bind(this, "in-progress")}>
                Save To EHR
              </button>) : null}
            </div>
        )
      }
    }
  }

  render() {
    const isAdaptiveForm = this.isAdaptiveForm();
    const showPopup = !isAdaptiveForm || this.isAdaptiveFormWithoutItem();
    return (
        <div>
          <div id="formContainer">
          </div>
          {!isAdaptiveForm && this.props.formFilled ? <div className="form-message-panel"><p>All fields have been filled. Continue or uncheck "Only Show Unfilled Fields" to review and modify the form.</p></div> : null}
          {
            showPopup ? (
                <SelectPopup
                    title={this.state.popupTitle}
                    options={this.state.popupOptions}
                    finalOption={this.state.popupFinalOption}
                    selectedCallback={this.popupCallback.bind(this)}
                    setClick={click => this.clickChild = click}
                />
            ) : null
          }
          {
            isAdaptiveForm ? (
                <div className="form-message-panel">
                  {this.isAdaptiveFormWithoutItem() && !this.props.adFormCompleted ? (<p>Click Next Question button to proceed.</p>) : null}
                  {!this.props.adFormCompleted ? (<div> <button className="btn submit-button" onClick={this.loadNextQuestions}>
                    Next Question
                  </button>
                  </div>) : null}
                </div>) : null
          }
          {
            !isAdaptiveForm ? (<div className="status-panel">
              Form Loaded: {this.state.formLoaded}
            </div>) : null
          }
          {this.getDisplayButtons()}
        </div>)
        ;
  }
}

