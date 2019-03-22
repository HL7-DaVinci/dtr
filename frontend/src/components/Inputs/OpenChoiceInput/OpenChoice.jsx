import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './OpenChoice.css';
import '../../ComponentStyles.css';

export default class OpenChoice extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            open: false
            
        };

    this.onInputChange = this.onInputChange.bind(this);
    }

    componentDidMount() {
        this.setState({value: this.props.options[0]})
    }

    onInputChange(event) {
        this.setState({value: event.target.value})
    }
    formatArea(val){
        switch(val){
            case '<':
                return <>&lt;</>
            case '>':
                return <>&gt;</>
            case '>=':
                return <>&ge;</>
            case '<=':
                return <>&le;</>
            default:
                return <>{val}</>
        }
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
                            {this.props.options.map((e)=>{
                            if(e!=this.state.value){
                                return (
                                    <div key={e} className="unselected-option" onClick={()=>{
                                        this.setState({value:e});
                                        this.setState({open:false})
                                    }}
                                    // prevent the dropdown from stealing focus and closing
                                    onMouseDown={(e)=>{e.preventDefault()}}>
                                        {this.formatArea(e)}
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
