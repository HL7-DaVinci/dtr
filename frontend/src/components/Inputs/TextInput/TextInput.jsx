import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './TextInput.css';
import '../../ComponentStyles.css';

export default class TextInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: ""
        };

    this.onInputChange = this.onInputChange.bind(this);
    }

    componentDidMount() {
        // setup initial value from qForm
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }


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
                <div className="text-input-label">{this.props.inputTypeDisplay}</div>
                <input className="text-input-box" type={this.props.inputType} value = {this.state.value} onChange={this.onInputChange}></input>
            </div>
        );
    }
}
