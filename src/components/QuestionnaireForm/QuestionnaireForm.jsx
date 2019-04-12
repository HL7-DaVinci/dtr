import React, { Component } from 'react';

import './QuestionnaireForm.css';

import Section from '../Section/Section';
import TextInput from '../Inputs/TextInput/TextInput';
import ChoiceInput from '../Inputs/ChoiceInput/ChoiceInput';
import BooleanInput from '../Inputs/BooleanInput/BooleanInput';
import QuantityInput from '../Inputs/QuantityInput/QuantityInput';
import { findValueByPrefix } from '../../util/util.js';
import OpenChoice from '../Inputs/OpenChoiceInput/OpenChoice';


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
        this.setState({ orderedLinks: links })
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
                if (typeof question === 'object' && typeof answer === 'object') {
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
                this.prepopulate(item.item, links);
            } else {

                // autofill fields
                links.push(item.linkId);
                if (item.enableWhen) {
                    console.log(item.enableWhen);
                }
                if (item.extension) {
                    item.extension.forEach((e) => {
                        if (e.url === "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue") {
                            // stu3 
                            const value = findValueByPrefix(e, "value");
                            this.updateQuestionValue(item.linkId, this.props.cqlPrepoulationResults[value], 'values')
                        }
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
            if (itemType && (itemType.enabled || this.state.turnOffValues.indexOf(item) >= 0)) {
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
                response.item.push(answerItem);
            }
        });
        console.log(response);
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
            console.log(returnArray);
            this.setState({ turnOffValues: returnArray });
        }
    }
    render() {
        return (
            <div>
                <div className="floating-tools">
                    <p className="filter-filled" >filter: <input type="checkbox" onClick={() => {
                        this.removeFilledFields();
                    }}></input></p>
                </div>
                <h2 className="document-header">{this.props.qform.title}

                </h2>

                <div className="sidenav">
                    {this.state.orderedLinks.map((e) => {
                        const value = this.state.values[e];
                        let extraClass;
                        let indicator;
                        if (this.state.itemTypes[e] && this.state.itemTypes[e].enabled) {
                            extraClass = (this.isNotEmpty(value) ? "sidenav-active" : "")
                            indicator = true;
                        } else {
                            if (this.isNotEmpty(this.state.values[e]) && this.state.turnOffValues.indexOf(e) > -1) {
                                extraClass = "sidenav-manually-disabled";
                            } else if (this.state.values[e]) {
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
