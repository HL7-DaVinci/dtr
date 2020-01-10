import React, { Component } from 'react';

import './QuestionnaireForm.css';

import Section from '../Section/Section';
import TextInput from '../Inputs/TextInput/TextInput';
import ChoiceInput from '../Inputs/ChoiceInput/ChoiceInput';
import BooleanInput from '../Inputs/BooleanInput/BooleanInput';
import QuantityInput from '../Inputs/QuantityInput/QuantityInput';
import { findValueByPrefix } from '../../util/util.js';
import OpenChoice from '../Inputs/OpenChoiceInput/OpenChoice';
import SendDMEOrder from "../../util/DMEOrders";

// Note: code to enable/disable DME Orders
var dMEOrdersEnabled = false;   

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
            sectionLinks:{},
            fullView: true,
            turnOffValues: []
        };
        this.updateQuestionValue = this.updateQuestionValue.bind(this);
        this.updateNestedQuestionValue = this.updateNestedQuestionValue.bind(this);

        this.renderComponent = this.renderComponent.bind(this);
        this.retrieveValue = this.retrieveValue.bind(this);
        this.outputResponse = this.outputResponse.bind(this);

    }

    componentWillMount() {
        // setup
        // get all contained resources
        if (this.props.qform.contained) {
            this.distributeContained(this.props.qform.contained)
        }
        const items = this.props.qform.item;
        this.setState({ items });
        const links = this.prepopulate(items, []);
        this.setState({ orderedLinks: links });
    }

    componentDidMount() {

    }

    evaluateOperator(operator, questionValue, answerValue) {

        switch (operator) {
            case "exists":
                return (answerValue) === (questionValue !== undefined);
            case "=":
                return questionValue === answerValue;
            case "!=":
                return questionValue !== answerValue;
            case "<":
                return questionValue < answerValue;
            case ">":
                return questionValue > answerValue;
            case "<=":
                return questionValue <= answerValue;
            case ">=":
                return questionValue >= answerValue;
            default:
                return questionValue === answerValue;
        }
    }

    retrieveValue(elementName) {
        return this.state.values[elementName];
    }

    updateQuestionValue(elementName, object, type) {
        // callback function for children to update
        // parent state containing the linkIds
        this.setState(prevState => ({
            [type]: {
                ...prevState[type],
                [elementName]: object
            }
        }))
    }

    updateNestedQuestionValue(linkId, elementName, object) {
        this.setState(prevState => ({
            values: {
                ...prevState.values,
                [linkId]: {
                    ...prevState.values[linkId],
                    [elementName]: object
                }
            }
        }))
    }


    distributeContained(contained) {
        // make a key:value map for the contained
        // resources with their id so they can be 
        // referenced by #{id}
        const containedResources = {};
        contained.forEach((resource) => {
            containedResources[resource.id] = resource;
        });
        this.setState({ containedResources })
    }

    checkEnable(item) {
        if (item.hasOwnProperty("enableWhen")) {
            const enableCriteria = item.enableWhen;
            const results = [];
            // false if we need all behaviorType to be "all"
            const checkAny = enableCriteria.length > 1 ? item.enableBehavior === 'any' : false
            enableCriteria.forEach((rule) => {
                const question = this.state.values[rule.question]
                const answer = findValueByPrefix(rule, "answer");
                if (typeof question === 'object' && typeof answer === 'object' && answer!== null && question!==null) {
                    if (rule.answerQuantity) {
                        // at the very least the unit and value need to be the same
                        results.push(this.evaluateOperator(rule.operator, question.value, answer.value.toString())
                            && this.evaluateOperator(rule.operator, question.unit, answer.unit));
                    } else if (rule.answerCoding) {
                        let result = false;
                        if (Array.isArray(question)) {
                            question.forEach((e) => {
                                result = result || (e.code === answer.code && e.system === answer.system);
                            })
                        }
                        results.push(result);
                    }
                } else {
                    results.push(this.evaluateOperator(rule.operator, question, answer));
                }
            });
            return !checkAny ? results.some((i) => { return i }) : results.every((i) => { return i });
        } else {
            // default to showing the item
            return true;
        }
    }


    prepopulate(items, links) {
        items.map((item) => {
            if (item.item) {
                // its a section/group
                links.push(item.linkId);
                this.prepopulate(item.item, links);
            } else {
                // autofill fields
                links.push(item.linkId);
                // if (item.enableWhen) {
                //     console.log(item.enableWhen);
                // }
                if (item.extension) {
                    item.extension.forEach((e) => {
                        let value;
                        if (e.url === "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue") {
                            // stu3 
                            value = findValueByPrefix(e, "value");
                        } else if(e.url === "http://hl7.org/fhir/StructureDefinition/cqf-expression") {
                            // r4
                            value = findValueByPrefix(e, "value");
                            value = value.expression;
                        } else {
                            // not a cql statement reference
                            return;
                        }

                        // split library designator from statement
                        const valueComponents = value.split('.')
                        let libraryName;
                        let statementName;
                        if (valueComponents.length > 1) {
                            libraryName = valueComponents[0].substring(1, valueComponents[0].length-1);
                            statementName = valueComponents[1];
                        } else { // if there is not library name grab the first library name
                            statementName = value
                            libraryName = Object.keys(this.props.cqlPrepoulationResults)[0]
                        }
                        // grab the population result
                        let prepopulationResult;
                        if (this.props.cqlPrepoulationResults[libraryName] != null) {
                            prepopulationResult = this.props.cqlPrepoulationResults[libraryName][statementName]
                        } else {
                            prepopulationResult = null
                            console.log(`Couldn't find library "${libraryName}"`)
                        }

                        this.updateQuestionValue(item.linkId, prepopulationResult, 'values')
                    })
                }
            }
        })
        return links;
    }

    isNotEmpty(value) {
        return (value !== undefined && value !== null && value !== "" && (Array.isArray(value) ? value.length > 0 : true));
    }

    renderComponent(item, level) {
        const enable = this.checkEnable(item);
        if (enable && (this.state.turnOffValues.indexOf(item.linkId) < 0)) {
            switch (item.type) {
                case "group":
                    return <Section
                        key={item.linkId}
                        componentRenderer={this.renderComponent}
                        updateCallback={this.updateQuestionValue}
                        item={item}
                        level={level}
                    />
                case "string":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="text"
                        inputTypeDisplay="string"
                        valueType="valueString"
                    />

                case "text":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="textArea"
                        inputTypeDisplay="text"
                        valueType="valueString"
                    />
                case "choice":
                    return <ChoiceInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        containedResources={this.state.containedResources}
                        valueType="valueCoding"
                    />
                case "boolean":
                    return <BooleanInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        valueType="valueBoolean"
                    />
                case "decimal":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="number"
                        inputTypeDisplay="decimal"
                        valueType="valueDecimal"
                    />

                case "url":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="url"
                        inputTypeDisplay="url"
                        valueType="valueUri"
                    />
                case "date":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="date"
                        inputTypeDisplay="date"
                        valueType="valueDate"
                    />
                case "time":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="time"
                        inputTypeDisplay="time"
                        valueType="valueTime"
                    />
                case "dateTime":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="datetime-local"
                        inputTypeDisplay="datetime"
                        valueType="valueDateTime"
                    />

                case "attachment":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="file"
                        inputTypeDisplay="attachment"
                        valueType="valueAttachment"
                    />

                case "integer":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="number"
                        inputTypeDisplay="valueInteger"
                        valueType="integer"
                    />

                case "quantity":
                    return <QuantityInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateNestedQuestionValue}
                        updateQuestionValue={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputTypeDisplay="quantity"
                        valueType="valueQuantity"
                    />

                case "open-choice":
                    return <OpenChoice
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputTypeDisplay="open-choice"
                        containedResources={this.state.containedResources}
                        valueType={["valueCoding", "valueString"]}
                    />
                default:
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="text"
                        inputTypeDisplay="string"
                        valueType="valueString"
                    />
            }
        }
    }

    generateAndStoreDocumentReference(questionnaireResponse, dataBundle) {
        var pdfMake = require('pdfmake/build/pdfmake.js');
        var pdfFonts = require('pdfmake/build/vfs_fonts.js');
        pdfMake.vfs = pdfFonts.pdfMake.vfs;

        var docDefinition = {
            content: [
                {
                    text: 'QuestionnaireResponse: ' + questionnaireResponse.id + ' (' + questionnaireResponse.authored + ')\n',
                    style: 'header'
                },
                {
                    text: JSON.stringify(questionnaireResponse, undefined, 4),
                    style: 'body'
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
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "55107-7",
                            "display": "Addendum Document"
                        }
                    ]
                },
                description: "PDF containing a QuestionnaireResponse",
                indexed: new Date().toISOString(),
                subject: { reference: this.makeReference(dataBundle, "Patient") },
                author: { reference: this.makeReference(dataBundle, "Practitioner") },
                content: [{
                    "attachment" : {
                        data: b64pdf,
                        contentType: "application/pdf"
                    }
                }]
            };
            console.log(documentReference);

            // send the DocumentReference to the EHR FHIR server
            var docReferenceUrl = sessionStorage["serviceUri"] + "/DocumentReference";
            console.log("Storing DocumentReference to: " + docReferenceUrl);

            const Http = new XMLHttpRequest();
            Http.open("POST", docReferenceUrl);
            Http.setRequestHeader("Content-Type", "application/fhir+json");
            Http.send(JSON.stringify(documentReference));
            Http.onreadystatechange = function() {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status == 201) {
                        console.log("Successfully stored DocumentReference ID: " + JSON.parse(this.response).id);
                    } else {
                        console.log("WARNING: something may be wrong with the DocumentReference storage response:");
                        console.log(this.response);
                    }
                }
            }
        });
    }

    // create the questionnaire response based on the current state
    outputResponse(status) {
        console.log(this.state.sectionLinks);
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();
        const authored = `${yyyy}-${mm}-${dd}`
        const response = {
            resourceType: "QuestionnaireResponse",
            id: "response1",
            authored: authored,
            status: "completed", //TODO: Get status from somewhere
            item: []

        }

        let currentItem = response.item;
        let currentLevel = 0;
        let currentValues = [];
        const chain = {0: {currentItem, currentValues}};
        this.state.orderedLinks.map((item) => {
            const itemType = this.state.itemTypes[item];

            if(Object.keys(this.state.sectionLinks).indexOf(item)>=0) {
                currentValues = currentValues.filter((e)=>{return e!==item});
                if(chain[currentLevel+1]){
                    chain[currentLevel+1].currentValues = currentValues;
                }
                const section = this.state.sectionLinks[item];
                currentValues = section.values;
                // new section
                currentItem = chain[section.level].currentItem
                const newItem = {
                    "linkId": item,
                    "text": section.text,
                    item: []
                };
                currentItem.push(newItem);
                currentItem = newItem.item;
                currentLevel = section.level;

                // filter out this section
                chain[section.level+1] = {currentItem, currentValues};
            }else{
                // not a new section, so it's an item
                if(currentValues.indexOf(item)<0 && itemType && itemType.enabled) {
                    // item not in this section, drop a level
                    const tempLevel = currentLevel;

                    while(chain[currentLevel].currentValues.length === 0 && currentLevel > 0) {
                        // keep dropping levels until we find an unfinished section
                        currentLevel--;
                    }

                    // check off current item
                    chain[tempLevel].currentValues = currentValues.filter((e)=>{return e!==item});

                    currentValues = chain[currentLevel].currentValues;
                    currentItem = chain[currentLevel].currentItem;
                } else {
                    // item is in this section, check it off

                    currentValues = currentValues.filter((e)=>{return e!==item});
                    chain[currentLevel + 1].currentValues = currentValues;
                }
            }
            if (itemType && (itemType.enabled || this.state.turnOffValues.indexOf(item) >= 0)) {
                const answerItem = {
                    "linkId": item,
                    "text": itemType.text,
                    "answer": []
                }
                switch (itemType.valueType) {
                    case "valueAttachment":
                        //TODO
                        break;
                    case "valueQuantity":
                        const quantity = this.state.values[item];
                        if (quantity && quantity.comparator === "=") {
                            delete quantity.comparator;
                        }
                        answerItem.answer.push({ [itemType.valueType]: quantity })
                        break;
                    case "valueDateTime":
                    case "valueDate":
                        const date = this.state.values[item];
                        answerItem.answer.push({ [itemType.valueType]: date.toString() });
                        break;
                    default:
                        const answer = this.state.values[item];
                        if (Array.isArray(answer)) {
                            answer.forEach((e) => {
                                // possible for an array to contain multiple types
                                let finalType;
                                if (e.valueTypeFinal) {
                                    finalType = e.valueTypeFinal;
                                    delete e.valueTypeFinal;
                                } else {
                                    finalType = itemType.valueType;
                                }
                                answerItem.answer.push({ [finalType]: e });
                            })
                        } else {
                            answerItem.answer.push({ [itemType.valueType]: answer });
                        }
                }
                // FHIR fields are not allowed to be empty or null, so we must prune
                if (this.isEmptyAnswer(answerItem.answer))
                {
                    // console.log("Removing empty answer: ", answerItem);
                    delete answerItem.answer;
                }
                currentItem.push(answerItem);
            }
        });
        console.log(response);

        const priorAuthBundle = JSON.parse(JSON.stringify(this.props.bundle));
        priorAuthBundle.entry.unshift({ resource: this.props.deviceRequest })
        priorAuthBundle.entry.unshift({ resource: response })
        console.log(priorAuthBundle);

        this.generateAndStoreDocumentReference(response, priorAuthBundle);

        const priorAuthClaim = {
            resourceType: "Claim",
            status: "active",
            type: {coding: [{
                system: "http://terminology.hl7.org/CodeSystem/claim-type",
                code: "professional",
                display: "Professional"
            }]},
            use: "preauthorization",
            patient: { reference: this.makeReference(priorAuthBundle, "Patient") },
            created: authored,
            provider: { reference: this.makeReference(priorAuthBundle, "Practitioner") },
            priority: {coding: [{"code": "normal"}]},
            prescription: { reference: this.makeReference(priorAuthBundle, "DeviceRequest") },
            supportingInfo: [{
                sequence: 1,
                category: {coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                    code: "info",
                    display: "Information"
                }]},
                valueReference: { reference: this.makeReference(priorAuthBundle, "QuestionnaireResponse") }
            }],
            diagnosis: [],
            insurance: [{
                sequence: 1,
                focal: true,
                coverage: { reference: this.makeReference(priorAuthBundle, "Coverage") }
            }]
        }
        var sequence = 1;
        priorAuthBundle.entry.forEach(function(entry, index) {
            if (entry.resource.resourceType == "Condition") {
                priorAuthClaim.diagnosis.push({
                    sequence: sequence++,
                    diagnosisReference: { reference: "Condition/" + entry.resource.id }
                });
            }
        })
        console.log(priorAuthClaim);

        priorAuthBundle.entry.unshift({ resource: priorAuthClaim })
        console.log(priorAuthBundle);

        const Http = new XMLHttpRequest();
        const priorAuthUrl = "https://davinci-prior-auth.logicahealth.org/fhir/Claim/$submit";
        // const priorAuthUrl = "http://localhost:9000/fhir/Claim/$submit";
        Http.open("POST", priorAuthUrl);
        Http.setRequestHeader("Content-Type", "application/fhir+json");
        Http.send(JSON.stringify(priorAuthBundle));          
        var qForm = this;        
        Http.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                var message = "Prior Authorization Failed.\nNo ClaimResponse found within bundle.";
                if (this.status === 201) {                   
                    var claimResponseBundle = JSON.parse(this.responseText);
                    var claimResponse = claimResponseBundle.entry[0].resource;
                    message = "Prior Authorization " + claimResponse.disposition + "\n";
                    message += "Prior Authorization Number: " + claimResponse.preAuthRef;  
                    
                    // DME Orders                
                    if (dMEOrdersEnabled) 
                        SendDMEOrder(qForm, response);
                } else {
                    console.log(this.responseText);
                    message = "Prior Authorization Request Failed."
                }
                console.log(message);

                // TODO pass the message to the PriorAuth page instead of having it query again
                var patientEntry = claimResponseBundle.entry.find(function(entry) {
                    return (entry.resource.resourceType == "Patient");
                });

                // fall back to resource.id if resource.identifier is not populated
                var patientId;
                if (patientEntry.resource.identifier == null) {
                    patientId = patientEntry.resource.id;
                } else {
                    patientId = patientEntry.resource.identifier[0].value;
                }
                let priorAuthUri = "priorauth?identifier=" + claimResponse.preAuthRef + "&patient.identifier=" + patientId;
                console.log(priorAuthUri)
                window.location.href = priorAuthUri;
            }
        }      
    }

    isEmptyAnswer(answer) {
        return ((answer.length < 1) ||
                (JSON.stringify(answer[0]) == "{}") ||
                (answer[0].hasOwnProperty("valueString") && (answer[0].valueString == null || answer[0].valueString == "")) ||
                (answer[0].hasOwnProperty("valueDateTime") && (answer[0].valueDateTime == null || answer[0].valueDateTime == "")) ||
                (answer[0].hasOwnProperty("valueDate") && (answer[0].valueDate == null || answer[0].valueDate == "")) ||
                (answer[0].hasOwnProperty("valueBoolean") && (answer[0].valueBoolean == null || answer[0].valueBoolean == "")) ||
                (answer[0].hasOwnProperty("valueQuantity") && (answer[0].valueQuantity == null || answer[0].valueQuantity.value == null || answer[0].valueQuantity.value == "")));
    }

    makeReference(bundle, resourceType) {
        var entry = bundle.entry.find(function(entry) {
            return (entry.resource.resourceType == resourceType);
        });
        // TODO: This is just a temporary fix. Coverage is referenced in the Claim but does not exist in the Bundle, causing
        // entry.resource.id to throw an error and the Bundle is never sent to PAS
        if (entry == undefined || entry == null)
            return resourceType + "/NotFound";
        return resourceType + "/" + entry.resource.id;
    }

    removeFilledFields() {
        if (this.state.turnOffValues.length > 0) {
            this.setState({ turnOffValues: [] });
        } else {
            const returnArray = [];
            this.state.orderedLinks.forEach((e) => {
                if (this.isNotEmpty(this.state.values[e]) && this.state.itemTypes[e] && this.state.itemTypes[e].enabled) {
                    returnArray.push(e);
                }
            });
            this.setState({ turnOffValues: returnArray });
        }
    }

    render() {
        return (
            <div className="questionaire-form">
                {/* <Container className="fluid">
                    <Row>
                        <Col xs={12}> */}
                            <div className="floating-tools float-right">
                                <p className="filter-filled" >filter: <input type="checkbox" onClick={() => {
                                    this.removeFilledFields();
                                }}></input></p>
                            </div>
                        {/* </Col>
                    </Row>
                    <Row>
                        <Col xs={1}>
                            left
                        </Col>
                        <Col xs={11}>(wider)</Col>
                    </Row>
                </Container> */}


                <h2 className="document-header">{this.props.qform.title}
                </h2>

                <div className="sidenav">
                    {this.state.orderedLinks.map((e) => {
                        if(Object.keys(this.state.sectionLinks).indexOf(e)<0) {
                            const value = this.state.values[e];
                            let extraClass;
                            let indicator;
                            if (this.state.itemTypes[e] && this.state.itemTypes[e].enabled) {
                                extraClass = (this.isNotEmpty(value) ? "sidenav-active" : "")
                                indicator = true;
                            } else {
                                if (this.isNotEmpty(value) && this.state.turnOffValues.indexOf(e) > -1) {
                                    extraClass = "sidenav-manually-disabled";
                                } else if (value) {
                                    extraClass = "sidenav-disabled filled"
                                } else {
                                    extraClass = "sidenav-disabled"
                                }
    
                            }
                            return <div
                                key={e}
                                className={"sidenav-box " + extraClass}
                                onClick={() => {
                                    indicator ? window.scrollTo(0, this.state.itemTypes[e].ref.current.previousSibling.offsetTop) : null;
                                }}
                            >
                                {e}
                            </div>
                        }
                    })}
                    <div className="sidenav-box "></div>
                </div>
                <div className="wrapper">
                    {
                        this.state.items.map((item) => {
                            return this.renderComponent(item, 0);
                        })
                    }
                </div>
                <button className="btn submit-button" onClick={this.outputResponse}>Submit</button>
            </div>
        );
    }
}
