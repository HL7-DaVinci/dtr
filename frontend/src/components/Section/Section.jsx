import React, { Component } from 'react';

import './Section.css';

export default class Section extends Component {
    constructor(props) {
        super(props);
        this.state = {
            containedResources: null,
            items: null
        };
    }

    componentDidMount() {
        // setup


    }

    render() {
        return (
            <div className="section">
                <h3>{this.props.item.text}</h3>
                {this.props.item.item.map((_item)=>{
                    const component = this.props.componentRenderer(_item, this.props.level+1);
                    return component?_item.type!=="group"?(
                    <div key ={_item.linkId}>
                        <div className={"entry-block " + (_item.readOnly?"read-only":null)}>
                        <p className="header-input">
                            <span 
                                className="info-block"
                                style={
                                    // Moves the label off to the side so its aligned on the right
                                    {marginLeft:-_item.linkId.length * 7 - 9}
                                }
                            >
                                {_item.linkId}&nbsp;
                            </span>
                            {_item.text}
                            {_item.required?<span className="required-asterisk">&nbsp;*</span>:null}
                            {_item.repeats?<span className="glyph">&#8634;</span>:null}
                        </p>
                        {component}
                        </div>



                    </div>

                    ):<div key={_item.linkId}>{component}</div>:null
                })}
            </div>
        );
    }
}
