import React, { Component } from 'react';

import './OpenChoice.css';
import '../../ComponentStyles.css';
import {getListOfChoices} from '../../../util/util.js';

export default class OpenChoice extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: {display:""},
            open: false,
            choices:[],
            display:""
        };

    this.onInputChange = this.onInputChange.bind(this);
    this.setChoice = this.setChoice.bind(this);
    }

    componentWillMount() {
        const returnAnswer = getListOfChoices(this.props, this.setChoice);
        if(returnAnswer) {
            this.setState({"value":returnAnswer});
            this.props.updateCallback(this.props.item.linkId, returnAnswer,"values");
        }
        
    }

    componentDidMount() {
        this.props.updateCallback(this.props.item.linkId,  {"type":this.props.inputTypeDisplay,"text":this.props.item.text,"valueType":"valueCoding"}, "itemTypes")
    }
    onInputChange(event) {
        console.log(this.state.value);
        console.log(event.target.value);
        this.setState({value: event.target.value})
        this.props.updateCallback(this.props.item.linkId, event.target.value,"values")
        if (this.state.choices.findIndex(p => p.code == event.target.value) === -1) {
            this.props.updateCallback(this.props.item.linkId,  {"type":this.props.inputTypeDisplay,"text":this.props.item.text,"valueType":"valueString"}, "itemTypes")
        }else{
            this.props.updateCallback(this.props.item.linkId,  {"type":this.props.inputTypeDisplay,"text":this.props.item.text,"valueType":"valueCoding"}, "itemTypes")
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

    render() {
        return (
            <div className="open-choice">
                <div className="text-input-label">{this.props.item.type}</div>
                <div className="dropdown">
                    <div className="dropdown-input"
                    tabIndex="0"
                    onBlur={()=>{
                        this.setState({open:false})
                    }}
                    >
                        <input value = {this.state.value.display?this.state.value.display:this.state.value} 
                        className={"input-block top-block " + (this.props.item.repeats?"repeated-choice":null)}
                        onClick={()=>{
                            this.setState(prevState=>({
                                open:!prevState.open
                            }))
                        }} 
                        spellCheck="false"
                        onChange={this.onInputChange}
                        onKeyPress={(e)=>{
                            if(e.key==="Enter"){
                                e.target.blur();
                            }
                        }}/>
                        <div className={"dropdown-block option-block " + (this.state.open?'':"hide-block")}>
                            {this.state.choices.map((e)=>{
                                if(e.display!=this.state.value.display){
                                    return (
                                        <div key={e.code} className="unselected-option" onClick={()=>{
                                            this.setState({value:e});
                                            this.setState({open:false});
                                            this.props.updateCallback(this.props.item.linkId, e,"values");
                                            this.props.updateCallback(this.props.item.linkId,  {"type":this.props.inputTypeDisplay,"text":this.props.item.text,"valueType":"valueCoding"}, "itemTypes")
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
