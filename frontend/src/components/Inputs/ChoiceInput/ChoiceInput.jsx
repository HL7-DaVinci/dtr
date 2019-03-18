import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './ChoiceInput.css';
import '../../ComponentStyles.css';

import {findValueByPrefix} from '../../../util/util.js';


export default class ChoiceInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: null,
            choices:[]
        };

    this.getListOfChoices = this.getListOfChoices.bind(this);
    }

    componentDidMount() {
        // setup
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }

        const returnAnswer = this.getListOfChoices();
        if(returnAnswer) {
            this.setValue(returnAnswer);
        }

    }

    getListOfChoices(){
        // parse out the list of choices from the answerOption
        const answer = findValueByPrefix(this.props.item,"answer")
        let returnAnswer = null;
        if(typeof answer === "string") {
            // answerValueSet
            if(answer.startsWith("#")) { 
                // contained resource reference
                const resource = this.props.containedResources[answer.substr(1,answer.length)];
                const values = resource.compose.include;
                values.map((element)=>{
                    element.concept.map((concept)=>{
                        const pair = {
                            "code": concept.code,
                            "display": concept.display,
                            "selected": false
                        }
                        this.setState(previousState => ({
                            choices: [...previousState.choices, pair]
                        }));
                    });

                })             
            }

        }else{
            // list of answer options
            answer.map((concept)=>{
                // TODO: The value could be a code/date/time/reference, need to account for that.
                const value = findValueByPrefix(concept,"value");
                const pair = {
                    "code": value,
                    "display": value,
                    "selected": !!concept.initialSelected
                }
                this.setState(previousState => ({
                    choices: [...previousState.choices, pair]
                }));

                returnAnswer = concept.initialSelected?value:returnAnswer;
            });
        }
        return returnAnswer;
    }

    setValue(value) {
        console.log(value);
        this.setState({value});
        this.props.updateCallback(this.props.item.linkId, value)

    }

    render() {
        return (
            <div className="text-input">
                <p className="header-input">{this.props.item.text}</p>
                <div>
                    {this.state.choices.map((element)=>{
                        return (
                            <div key={element.display}>
                                <button 
                                    className={"radio-button btn "+(element.code===this.state.value?"selected":null)}
                                    onClick={()=>{
                                        this.setValue(element.code)
                                    }}
                                >
                                    
                                </button>
                                <span className="text-radio">{element.display}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }
}
