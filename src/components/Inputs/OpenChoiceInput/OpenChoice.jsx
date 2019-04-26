import React, { Component } from 'react';

import './OpenChoice.css';
import '../../ComponentStyles.css';
import {getListOfChoices} from '../../../util/util.js';

export default class OpenChoice extends Component {
    constructor(props) {
        super(props);
        this.state = {
            values: [],
            open: false,
            choices:[],
            display:""
        };

    this.onInputChange = this.onInputChange.bind(this);
    this.setChoice = this.setChoice.bind(this);
    this.ref = React.createRef();

    }

    componentWillUnmount() {
        this.props.updateCallback(this.props.item.linkId,  
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType":"valueCoding",
            "ref":this.ref,
            "enabled": false}, "itemTypes");
    }

    componentWillMount() {
        const returnAnswer = getListOfChoices(this.props, this.setChoice);
        if(returnAnswer) {
            this.setState({"values":[returnAnswer]});
            if(!this.props.item.repeats) {
                this.setState({"display":returnAnswer.display});
            }
            this.props.updateCallback(this.props.item.linkId, returnAnswer,"values");
        }
        
    }

    componentDidMount() {
        const value = this.props.retrieveCallback(this.props.item.linkId);
        this.autofill(this.state.choices, value);
        this.props.updateCallback(this.props.item.linkId,  
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType":"valueCoding",
            "ref":this.ref,
            "enabled": true}, "itemTypes");
    }

    autofill(choices, values) {
        const options = []
        values && values.forEach((value) => {
            choices.forEach((choice) => {
                if(value.code) {
                    value = value.code;
                }
                if(choice.code === value) { 
                    options.push(choice);
                }
            })
            if(value.valueTypeFinal==="valueString") {
                // manually entered info
                options.push(value);
            }
        })
        this.addOption(options);
    }

    onInputChange(event) {
        this.setState({display: event.target.value})
        if(!this.props.item.repeats) {
            this.setState({"values":[{display:event.target.value}]})
        }
        this.props.updateCallback(this.props.item.linkId, event.target.value,"values")
        if (this.state.choices.findIndex(p => p.code == event.target.value) === -1 && !this.props.item.repeats) {
            this.props.updateCallback(this.props.item.linkId,  
                {"type":this.props.inputTypeDisplay,
                "text":this.props.item.text,
                "valueType":"valueString",
                "ref":this.ref,
                "enabled": true}, "itemTypes");
        }else{
            this.props.updateCallback(this.props.item.linkId,  
                {"type":this.props.inputTypeDisplay,
                "text":this.props.item.text,
                "valueType":"valueCoding",
                "ref":this.ref,
                "enabled": true}, "itemTypes");
        }
    }

    checkStateForValue(value) {
        return ;
    }

    setChoice(pair) {
        this.setState(previousState => ({
            choices: [...previousState.choices, pair]
        }));
    }

    addOption(e) {
        let newArray;
        if(Array.isArray(e)) {
            newArray = [...this.state.values, ...e];
        } else {
            newArray = [...this.state.values, e];
        }
        this.setState({values:newArray});
        this.props.updateCallback(this.props.item.linkId, newArray,"values");

        return newArray;
    }

    saveToDisplay(e){
        if(this.props.item.repeats){
            if(this.state.display.trim().length>0) {
                if(this.state.values.filter((el)=>{return el.display.trim()===this.state.display.trim()}).length===0){
                    this.addOption({display:this.state.display, valueTypeFinal:"valueString"});
                }
            }
            this.setState({display:""});
        }else{
            e.target.blur();
        }
    }
    render() {
        return (
            <div className="open-choice" ref={this.ref}>
                <div className="text-input-label">{this.props.item.type}</div>
                <div className="dropdown">
                    <div className={"dropdown-input " + (this.props.item.repeats?"repeated-choice":"")}
                    tabIndex="0"
                    onBlur={(e)=>{
                        this.setState({open:false})
                        this.saveToDisplay(e);
                    }}
                    onClick={()=>{
                        if(this.props.item.repeats) {
                            this.myInp.focus();
                            this.setState(prevState=>({
                                open:true
                            }))
                        }else{
                            this.setState(prevState=>({
                                open:!prevState.open
                            }))
                        }

                    }} 
                    >
                    {this.props.item.repeats?this.state.values.map((value)=>{
                        return <a 
                                    key={value.display} 
                                    className="selected-value"
                                    onClick={()=>{
                                        const newArray = this.state.values.filter((e)=>{
                                            return e.display!==value.display;
                                        })
                                        this.setState({values:newArray});
                                        this.props.updateCallback(this.props.item.linkId, newArray,"values");
                                    }}
                                    onMouseDown={(event)=>{event.preventDefault()}}
                                >
                                    {value.display}
                                </a>
                    }):null}

                        <input 
                        ref={(ip)=>this.myInp = ip}
                        value = {this.state.display} 
                        style={{width:this.state.display.length+2 + "ch"}}
                        className={"input-block top-block " + (this.props.item.repeats?"repeated-input":"")}
                        spellCheck="false"
                        onChange={this.onInputChange}
                        onKeyPress={(e)=>{
                            if(e.key==="Enter"){
                                this.saveToDisplay(e);
                            }
                        }}
                            />

                        <div className={"dropdown-block option-block " + (this.state.open?'':"hide-block ") + (this.props.item.repeats?"repeated-choice":"")}>
                            {this.state.choices.map((e)=>{
                                if(this.state.values.filter((el)=>{return el.display===e.display}).length===0){
                                    return (
                                        <div key={e.code} className="unselected-option" onClick={()=>{
                                            if(this.props.item.repeats) {
                                                const newArray = this.addOption(e);
                                                this.props.updateCallback(this.props.item.linkId, newArray,"values");
                                            }else{
                                                
                                                this.setState({"values":[e]});
                                                this.setState({"display":e.display});
                                                this.props.updateCallback(this.props.item.linkId, [e],"values");
                                                this.props.updateCallback(this.props.item.linkId,  
                                                    {"type":this.props.inputTypeDisplay,
                                                    "text":this.props.item.text,
                                                    "valueType":"valueCoding",
                                                    "ref":this.ref,
                                                    "enabled": true}, "itemTypes");
                                            }
                                            
                                        }}
                                        // prevent the dropdown from stealing focus and closing
                                        onMouseDown={(event)=>{event.preventDefault()}}>
                                            {e.display}
                                        </div>
                                    )
                                }

                            })}
                        </div>

                    </div>
                </div>

            </div>
            
            
        );
    }
}
