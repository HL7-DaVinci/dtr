import React, { Component } from 'react';

import './DropdownInput.css';
import '../../ComponentStyles.css';

export default class DropdownInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            open: false
            
        };

    this.onInputChange = this.onInputChange.bind(this);
    }

    componentDidMount() {
        this.setState({value: this.props.options[0]});
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

    updateState(e){
        this.setState({value:e});
        this.setState({open:false})
    }

    render() {
        return (
            <div className="dropdown">
                <div className="dropdown-input"
                tabIndex="0"
                onBlur={()=>{
                    this.setState({open:false})
                }}
                >
                <div className="dropdown-block top-block" onClick={()=>{
                    this.setState(prevState=>({
                        open:!prevState.open
                    }))
                }}
                >
                {this.formatArea(this.state.value)}
                </div>
                <div className={"dropdown-block option-block " + (this.state.open?'':"hide-block")}>
                    {this.props.options.map((e)=>{
                        if(e!==this.state.value){
                            return (
                                <div key={e} className="unselected-option" onClick={()=>{
                                    this.setState({value:e});
                                    this.setState({open:false})
                                    this.props.callback(this.props.name, {"target":{"value":e}})
                                }}>
                                    {this.formatArea(e)}
                                </div>
                            )
                        }

                    })}
                </div>

            </div>
        </div>
            
        );
    }
}
