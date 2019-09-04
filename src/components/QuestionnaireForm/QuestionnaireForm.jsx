import React, { Component } from 'react';

import './QuestionnaireForm.css';

import Section from '../Section/Section';
import TextInput from '../Inputs/TextInput/TextInput';
import ChoiceInput from '../Inputs/ChoiceInput/ChoiceInput';
import BooleanInput from '../Inputs/BooleanInput/BooleanInput';
import QuantityInput from '../Inputs/QuantityInput/QuantityInput';
import DocumentInput from '../Inputs/DocumentInput/DocumentInput';
import { saveDocu } from '../Inputs/DocumentInput/DocumentInput';
import { findValueByPrefix } from '../../util/util.js';
import OpenChoice from '../Inputs/OpenChoiceInput/OpenChoice';
import { appContext } from '../../index';

export default class QuestionnaireForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            containedResources: null,
            items: null,
            itemTypes: {},
            values: {
                // "1.1": "henlo"
            },
            view: null,
            files:[],
            communicationJson:{}
        };
        this.updateQuestionValue = this.updateQuestionValue.bind(this);
        this.updateNestedQuestionValue = this.updateNestedQuestionValue.bind(this);
        // this.saveDocuments = this.saveDocuments.bind(this);
        this.updateDocuments = this.updateDocuments.bind(this);
        this.practitionerResource = {}
        this.renderComponent = this.renderComponent.bind(this);
        this.retrieveValue = this.retrieveValue.bind(this);
        this.outputResponse = this.outputResponse.bind(this);

    }

    componentWillMount() {
        // setup
        // get all contained resources
        // console.log(this.props);
        if (this.props.qform.contained) {
            this.distributeContained(this.props.qform.contained)
        }
        const items = this.props.qform.item;
        this.setState({ items });
        // console.log("Items",items);
        let values = this.state.values;

        items.forEach((item) => {
            if (item['type'] == "group") {
                item.item.forEach((sub_item) => {
                    // console.log("sub_item:",sub_item)
                    if (sub_item.hasOwnProperty("extension")) {
                        // console.log("-- Value of sub_item:",sub_item.extension[0].valueString,this.props.cqlPrepoulationResults[sub_item.extension[0].valueString])
                        let value = this.props.cqlPrepoulationResults[sub_item.extension[0].valueString];
                        if (value != null && value != undefined && value != "") {
                            values[sub_item.linkId] = value
                        }
                    }
                })
            }
        });
        console.log("appContext-------", appContext);
        if (appContext.npi != undefined) {
            this.props.smart.patient.api.search({ type: "Practitioner", identifier: appContext.npi })
                .then(response => {
                    console.log("Practitioner", response)
                    this.practitionerResource = response.data.entry[0].resource
                }, err => console.log("Error", err))
            // console.log("VALESSS",values)
            this.setState({ values });
        }
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
                return (answerValue) === (questionValue !== undefined);
        }
    }

    retrieveValue(elementName) {
        // console.log("console.log(elementName) ::",elementName);
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
    updateDocuments(elementName, object){
        console.log(elementName,object,'is it workinggg')
        this.setState({[elementName]:object})
        var fileInputData = {
            "resourceType": "Communication",
            "id": "376",
            "meta": {
                "versionId": "1",
                "lastUpdated": "2018-10-08T07:22:32.421+00:00"
            },
            "status": "preparation",
            "identifier": [
                {
                    "use": "official"
                }
            ],
            "payload": [],
        }
        if (this.state.files != null) {
            for (var i = 0; i < this.state.files.length; i++) {
                (function (file) {
                    let content_type = file.type;
                    let file_name = file.name;
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        // get file content  
                        fileInputData.payload.push({
                            "contentAttachment": {
                                "data": reader.result,
                                "contentType": content_type,
                                "title": file_name,
                                "language": "en"
                            }
                        })
                    }
                    reader.readAsBinaryString(file);
                })(this.state.files[i])
            }
        }
        console.log("Resource Json before communication--",fileInputData );
        // this.props.saveDocuments(this.props.files,fileInputData)
        this.setState({communicationJson:fileInputData})
        // return fileInputData
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
                results.push(this.evaluateOperator(rule.operator, question, answer))
            });
            return !checkAny ? results.some((i) => { return i }) : results.every((i) => { return i });
        } else {
            // default to showing the item
            return true;
        }
    }



    renderComponent(item, level) {
        // console.log("item,level,this.retrieveValue")
        // console.log(item,level,this.retrieveValue)
        // if(item.hasOwnProperty("extension")){
        //     if(item.extension.linkId)
        // }
        if (this.checkEnable(item)) {
            switch (item.type) {
                case "group":
                    return <Section
                        key={item.linkId}
                        componentRenderer={this.renderComponent}
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

    // create the questionnaire response based on the current state
    outputResponse(status) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();
        const authored = `${yyyy}-${mm}-${dd}`
        const response = {
            id: "response1",
            authored: authored,
            status: "completed", //TODO: Get status from somewhere
            item: []

        }
        Object.keys(this.state.itemTypes).map((item) => {
            const itemType = this.state.itemTypes[item];
            const answerItem = {
                "linkId": item,
                "text": itemType.text,
                "answer": []
            }
            // TODO: Figure out what to do when a value is missing
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
            response.item.push(answerItem);
        });

        response.resourceType = "QuestionnaireResponse"
        let contained = [this.props.cqlPrepoulationResults.Patient._json, this.practitionerResource]
        response.contained = contained
        response.author = { reference: "#" + this.practitionerResource.id.toString() }
        response.subject = { reference: "#" + this.props.cqlPrepoulationResults.Patient._json.id.toString() }
        // console.log(response);
        this.props.smart.patient.api.create({ resource: response }).then(res => {
            console.log("RESSPSPS");
            console.log(res);
        }, err => {
            console.log("Err!");
            console.log(err);
            // reject(err)
        })
        this.props.smart.patient.api.create({resource:this.state.communicationJson}).then(commmunicationRes => {
            console.log("Communication REsponse");
            console.log(commmunicationRes);
            }, err => {
                console.log("Err!");
                console.log(err);
                // reject(err)
            })
    }

    render() {
        console.log(this.state.values);
        return (
            <div>
                <h2 className="document-header">{this.props.qform.title}</h2>
                <div className="sidenav">
                    {Object.keys(this.state.itemTypes).map((e) => {
                        const value = this.state.values[e];

                        return <div
                            key={e}
                            className={"sidenav-box " + (value !== undefined && value !== "" && (Array.isArray(value) ? value.length > 0 : true) ? "sidenav-active" : "")}
                            onClick={() => {
                                console.log(this.state.itemTypes[e].ref.current.offsetTop);
                                window.scrollTo(0, this.state.itemTypes[e].ref.current.previousSibling.offsetTop)
                            }}
                        >
                            {e}
                        </div>
                    })}
                    <div className="sidenav-box "></div>
                </div>
                <div className="wrapper1">
                    {
                        this.state.items.map((item) => {
                            // console.log(item.linkId, this.state.items.length/2);
                            if (item.linkId <= (this.state.items.length / 2 + 1)) {
                                return this.renderComponent(item, 0);
                            }
                        })
                    }
                </div>
                <div className="wrapper2">
                    <div>
                        {
                            this.state.items.map((item) => {
                                // console.log(item.linkId, this.state.items.length / 2);
                                if (item.linkId > (this.state.items.length / 2 + 1)) {
                                    return this.renderComponent(item, 0);
                                }
                            })
                        }
                        <DocumentInput
                            updateCallback={this.updateDocuments}
                        />
                    </div>
                </div>
                <button className="btn submit-button" onClick={this.outputResponse}>Submit</button>
            </div>
        );
    }
}
