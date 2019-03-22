import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './OpenChoice.css';
import '../../ComponentStyles.css';
import {getListOfChoices} from '../../../util/util.js';

export default class OpenChoice extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            open: false,
            choices:[],
            display:""
        };

    this.onInputChange = this.onInputChange.bind(this);
    this.setChoice = this.setChoice.bind(this);
    }

    componentDidMount() {
        // this.setState({value: this.props.options[0]})
        getListOfChoices(this.props, this.setChoice);
    }

    onInputChange(event) {
        this.setState({value: event.target.value})
    }

    setChoice(pair) {
        this.setState(previousState => ({
            choices: [...previousState.choices, pair]
        }));
    }

    render() {
        return (
            <div className="open-choice">
                <p className="header-input">{this.props.item.text}</p>
                <div className="text-input-label">{this.props.item.type}</div>
                <div className="dropdown">
                    <div className="dropdown-input"
                        tabIndex="0"
                        onBlur={()=>{
                            this.setState({open:false})
                        }}
                    >
                        <input value = {this.state.value} className="input-block top-block" onClick={()=>{
                            this.setState(prevState=>({
                                open:!prevState.open
                            }))
                        }} 
                        
                        onChange={this.onInputChange}
                        
                        onKeyPress={(e)=>{
                            if(e.key==="Enter"){
                                e.target.blur();
                            }
                        }}/>
                        <div className={"dropdown-block option-block " + (this.state.open?'':"hide-block")}>
                            {this.state.choices.map((e)=>{
                            if(e.code!=this.state.value){
                                return (
                                    <div key={e.code} className="unselected-option" onClick={()=>{
                                        this.setState({value:e.code});
                                        this.setState({open:false})
                                    }}
                                    // prevent the dropdown from stealing focus and closing
                                    onMouseDown={(event)=>{event.preventDefault()}}>
                                        {e.code}
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
