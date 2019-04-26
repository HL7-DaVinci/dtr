import React, { Component } from 'react';

import './TextInput.css';
import '../../ComponentStyles.css';

export default class TextInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            area: false
        };

    this.onInputChange = this.onInputChange.bind(this);
    this.myRef = React.createRef();
    }

    componentWillUnmount() {
        this.props.updateCallback(this.props.item.linkId,  
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType": this.props.valueType,
            "ref":this.myRef,
            "enabled": false}, "itemTypes");
    }

    componentDidMount() {
        // setup initial value from qForm
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }
        if(this.props.inputType==="textArea"){
            this.setState({area:true});
        }

        this.props.updateCallback(this.props.item.linkId, 
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType": this.props.valueType,
            "ref":this.myRef,
            "enabled": true}
            , "itemTypes")

    }

    onInputChange(event) {
        // update the parent state
        this.props.updateCallback(this.props.item.linkId, event.target.value, "values")
        // update local state
        this.setState({value: event.target.value})
    }

    render() {
        return (
            <div className="text-input" ref={this.myRef}>
                <div className="text-input-label">{this.props.inputTypeDisplay}</div>
                {this.state.area?
                    <textarea 
                        className="text-input-box" 
                        value = {this.state.value} 
                        onChange={this.onInputChange}>
                    </textarea>
                    :
                    <input className="text-input-box" 
                        type={this.props.inputType} 
                        value = {this.state.value} 
                        onChange={this.onInputChange}
                        readOnly={this.props.item.readOnly}>
                         
                    </input>
                }
            </div>
        );
    }
}
