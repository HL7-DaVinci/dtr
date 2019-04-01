import React, { Component } from 'react';

import './ChoiceInput.css';
import '../../ComponentStyles.css';

import {getListOfChoices} from '../../../util/util.js';


export default class ChoiceInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            values: [],
            choices:[]
        };

        this.setChoice = this.setChoice.bind(this);
    }

    componentDidMount() {
        // setup
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }

        const returnAnswer = getListOfChoices(this.props, this.setChoice);
        if(returnAnswer) {
            this.setValue(returnAnswer);
        }

        this.props.updateCallback(this.props.item.linkId,  {"type":"choice", "text":this.props.item.text, "valueType":"valueCoding"}, "itemTypes")


    }


    setChoice(pair) {
        this.setState(previousState => ({
            choices: [...previousState.choices, pair]
        }));

    }
    setValue(value) {

        const newArray = this.state.values.filter((e)=>{
            return e.code !== value.code;
        })
        if(newArray.length===this.state.values.length) {
            // no changes
            if(newArray.length===1 && !this.props.item.repeats) {
                newArray.pop();
            }
            newArray.push(value);
        }

        this.setState({values: newArray});
        this.props.updateCallback(this.props.item.linkId, newArray, "values")

    }

    render() {
        return (
            
            <div className="text-input">
                <div>
                    
                    {this.state.choices.map((element)=>{
                        return (
                            <div key={element.display}>
                                <button 
                                    className={"radio-button btn "+(this.state.values.some(e => e.code === element.code)?"selected":null)}
                                    onClick={()=>{
                                        this.setValue(element)
                                    }}
                                >
                                    
                                </button>
                                <span className="text-radio tooltip-x">{element.display}
                                    <span className="tooltiptext-x">{element.code}</span>
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }
}
