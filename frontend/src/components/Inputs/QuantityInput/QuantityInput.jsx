import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './QuantityInput.css';
import '../../ComponentStyles.css';
import DropdownInput from '../DropdownInput/DropdownInput';

const options = [
    '=',
    '<',
    '>',
    '<=',
    '>='
]
export default class QuantityInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            comparator:"",
            unit: "",
            system:"",
            code:""
        };

    this.onInputChange = this.onInputChange.bind(this);
    this.updateState = this.updateState.bind(this);


    }

    componentDidMount() {
        // setup initial value from qForm
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }


    }

    updateState(elementName,object) {
        const obj = object.target.value;
        this.setState(prevState => ({
            [elementName]: obj
        }))
    }
    onInputChange(event) {
        // update the parent state
        this.props.updateCallback(this.props.item.linkId, event.target.value)
        // update local state
        this.setState({value: event.target.value})
    }

    render() {
        return (
            
            <div className="text-input">
                <p className="header-input">{this.props.item.text}</p>
                <div className="text-input-label quantity">{this.props.inputTypeDisplay}</div>
                <div className="quantity-border">
                    <DropdownInput options={options}></DropdownInput>
                    <input className="quantity-input value" placeholder="value" value = {this.state.value} onChange={(e)=>{this.updateState("value",e)}}></input>
                    <input className="quantity-input unit"  placeholder="unit" value = {this.state.unit} onChange={(e)=>{this.updateState("unit",e)}}></input>
                </div>
                <div>
                    <input className="quantity-input code" placeholder="code" value = {this.state.code} onChange={(e)=>{this.updateState("code",e)}}></input>
                    <input className="quantity-input system" placeholder="system" value = {this.state.system} onChange={(e)=>{this.updateState("system",e)}}></input>
                </div>
            </div>
        );
    }
}
