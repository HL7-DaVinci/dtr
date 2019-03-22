import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './BooleanInput.css';
import '../../ComponentStyles.css';

import {findValueByPrefix} from '../../../util/util.js';


export default class BooleanInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: null
        };

    }

    componentDidMount() {
        // setup
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }
    }

    setValue(value) {
        if(this.state.value === value) {
            value = null;
        }
        this.setState({value});
        this.props.updateCallback(this.props.item.linkId, value)
    }

    render() {
        return (
            <div className="text-input">
                <p className="header-input">{this.props.item.text}</p>
                <div className="toggle">
                    <div>
                        <button
                            className={"boolButton true btn " + (this.state.value?"selected":null)}
                            onClick={()=>{
                                this.setValue(true)
                            }}>
                        </button>
                        <span>true</span>
                    </div>
                    <div>
                        <button
                            className={"boolButton false btn " + (this.state.value===false?"selected":null)}
                            onClick={()=>{
                                this.setValue(false)
                            }}>
                        </button>
                        <span>false</span>
                    </div>
                </div>

            </div>
        );
    }
}
