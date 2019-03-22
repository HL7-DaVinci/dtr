import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './QuestionnaireForm.css';

import Section from '../Section/Section';
import TextInput from '../Inputs/TextInput/TextInput';
import ChoiceInput from '../Inputs/ChoiceInput/ChoiceInput';
import BooleanInput from '../Inputs/BooleanInput/BooleanInput';
import QuantityInput from '../Inputs/QuantityInput/QuantityInput';
import {findValueByPrefix} from '../../util/util.js';
import OpenChoice from '../Inputs/OpenChoiceInput/OpenChoice';


export default class QuestionnaireForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            containedResources: null,
            items: null,
            values: {
                "1.1":"henlo"
            },
            view: null
        };
        this.updateQuestionValue = this.updateQuestionValue.bind(this);
        this.renderComponent = this.renderComponent.bind(this);
        this.retrieveValue = this.retrieveValue.bind(this);
    }

    componentWillMount() {
        // setup
        // get all contained resources
        if(this.props.qform.contained) {
            this.distributeContained(this.props.qform.contained)
        }
        const items = this.props.qform.item;
        this.setState({items});
        console.log(items);
    }

    componentDidMount() {
 

    }
    evaluateOperator(operator, questionValue, answerValue) {
        switch(operator) {
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
        }
    }

    // to get FHIR properties of the form answer{whatever}
    findValueByPrefix(object, prefix) {
        for (var property in object) {
          if (object.hasOwnProperty(property) && 
             property.toString().startsWith(prefix)) {
             return object[property];
          }
        }
      }

    retrieveValue(elementName) {
        return this.state.values[elementName];
    }

    updateQuestionValue(elementName, object) {
        // callback function for children to update
        // parent state containing the linkIds
        this.setState(prevState => ({
            values: {
                ...prevState.values,
                [elementName]: object 
            }
        }))
    }

    distributeContained(contained) {
        // make a key:value map for the contained
        // resources with their id so they can be 
        // referenced by #{id}
        const containedResources = {};
        contained.map((resource)=>{
            containedResources[resource.id] = resource;
        });
        this.setState({containedResources})
    }

    checkEnable(item) {
        if(item.hasOwnProperty("enableWhen")) {
            const enableCriteria = item.enableWhen;
            const results = [];
            // false if we need all behaviorType to be "all"
            const checkAny = enableCriteria.length > 1 ? item.enableBehavior === 'any' : false
            enableCriteria.forEach((rule) => {
                const question = this.state.values[rule.question]
                const answer = this.findValueByPrefix(rule,"answer");
                results.push(this.evaluateOperator(rule.operator,question,answer))
            });
            return checkAny ? results.some((i)=>{return i}) : results.every((i)=>{return i});
        } else {
            // default to showing the item
            return true;
        }
    }



    renderComponent(item, level) {
        if(this.checkEnable(item)) {
            switch(item.type) {
                case "group":
                    return <Section
                                key = {item.linkId}
                                componentRenderer = {this.renderComponent}
                                item = {item} 
                                level = {level}
                            />
                case "string":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "text"
                                inputTypeDisplay = "text"
                            />
                case "choice":
                    return <ChoiceInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                containedResources = {this.state.containedResources}
                            />
                case "boolean":
                    return <BooleanInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                            />
                case "decimal":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "number"
                                inputTypeDisplay = "decimal"
                            />

                case "url":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "url"
                                inputTypeDisplay = "url"
                            />
                case "date":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "date"
                                inputTypeDisplay = "date"
                            />
                case "time":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "time"
                                inputTypeDisplay = "time"
                            />
                case "dateTime":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "datetime-local"
                                inputTypeDisplay = "datetime"
                            />

                case "attachment":
                    return <TextInput
                                key = {item.linkId}
                                item = {item}
                                updateCallback = {this.updateQuestionValue}
                                retrieveCallback = {this.retrieveValue}
                                inputType = "file"
                                inputTypeDisplay = "attachment"
                            />

                case "integer":
                return <TextInput
                            key = {item.linkId}
                            item = {item}
                            updateCallback = {this.updateQuestionValue}
                            retrieveCallback = {this.retrieveValue}
                            inputType = "number"
                            inputTypeDisplay = "integer"
                        />

                case "quantity":
                return <QuantityInput
                            key = {item.linkId}
                            item = {item}
                            updateCallback = {this.updateQuestionValue}
                            retrieveCallback = {this.retrieveValue}
                            inputTypeDisplay = "quantity"
                        />

                case "open-choice":
                return <OpenChoice
                            key = {item.linkId}
                            item = {item}
                            updateCallback = {this.updateQuestionValue}
                            retrieveCallback = {this.retrieveValue}
                            inputTypeDisplay = "open-choice"
                            options ={[1,2,3,4,5,6,7,"adsfijaoeijgaoweijgoaidsjgapdsfoijadpiajgoahpodshadpoghadspoguh apsodhasdpogh aposdh apsodfuha wopeugh paowsuehg paoh "]}
                        />
            }
        }
    }

    render() {
        return (
            <div>
                <h2>{this.props.qform.title}</h2>
                <div className="wrapper">
                    {
                        this.state.items.map((item) => {
                            return this.renderComponent(item, 0);
                        })
                    }        
                </div>
            </div>
        );
    }
}

// QuestionnaireForm.propTypes = {
// }
