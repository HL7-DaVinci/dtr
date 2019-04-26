import React, { Component } from 'react';

import './ChoiceInput.css';
import '../../ComponentStyles.css';

import {getListOfChoices} from '../../../util/util.js';


export default class ChoiceInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            values: [],
            choices:[]
        };

        this.setChoice = this.setChoice.bind(this);
        this.ref = React.createRef();
    }

    componentWillUnmount() {
        this.props.updateCallback(this.props.item.linkId,  
            {"type":"choice", 
            "text":this.props.item.text, 
            "valueType":"valueCoding",
            "ref":this.ref,
            "enabled":false}, "itemTypes")
    }

    componentWillMount() {
        // setup
        const returnAnswer = getListOfChoices(this.props, this.setChoice);
        if(returnAnswer) {
            this.setValue(returnAnswer);
        }

        this.props.updateCallback(this.props.item.linkId,  
            {"type":"choice", 
            "text":this.props.item.text, 
            "valueType":"valueCoding",
            "ref":this.ref,
            "enabled":true}, "itemTypes")
    }

    componentDidMount() {
        // autofill takes priority of initial selected
        const value = this.props.retrieveCallback(this.props.item.linkId);
        this.autofill(this.state.choices, value);
    }

    autofill(choices, value) {
        // check if the value is the same
        choices.forEach((choice) => {
            if(typeof value === 'string') {
                // value is of type `code` - it assumes some specific valueSet
                if(choice.code === value) {
                    this.setValue(choice);
                }
            }else if(value){
                // value is of type `coding`
                if(Array.isArray(value)) {
                    value.forEach((val)=> {
                        
                        if(choice.code === val.code) {
                            this.setValue(choice);
                        }
                    })
                }

            }
        })
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
            
            <div className="text-input" ref={this.ref}>
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
