import React, { Component } from 'react';

import './BooleanInput.css';
import '../../ComponentStyles.css';

import {findValueByPrefix} from '../../../util/util.js';


export default class BooleanInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: null
        };
        this.ref = React.createRef();
    }

    componentWillUnmount() {
        this.props.updateCallback(this.props.item.linkId,  
            {"type":"boolean",
            "text":this.props.item.text, 
            "valueType":"valueBoolean",
            "ref":this.ref,
            "enabled": false}, "itemTypes");
    }

    componentDidMount() {
        // setup
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value!==undefined && value!==null) {
            this.setValue(value);
        }
        this.props.updateCallback(this.props.item.linkId,  
            {"type":"boolean",
            "text":this.props.item.text, 
            "valueType":"valueBoolean",
            "ref":this.ref,
            "enabled": true}, "itemTypes");

    }

    setValue(value) {
        if(this.state.value === value) {
            value = null;
        }
        this.setState({value});
        this.props.updateCallback(this.props.item.linkId, value, "values")
    }

    render() {
        return (
            <div className="text-input" ref={this.ref}>
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
