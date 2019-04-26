import React, { Component } from 'react';

import './Section.css';

export default class Section extends Component {
    constructor(props) {
        super(props);
        this.state = {
            containedResources: null,
            items: null,
            components:[],
            len: []
        };
    }

    componentDidMount() {
        // setup
        const len = this.getComponents(this.props);
        this.setState({len});
        this.props.updateCallback(this.props.item.linkId,{level: this.props.level, text: this.props.item.text, values: len}, "sectionLinks");
    }

    componentWillReceiveProps(props) {
        const len = this.getComponents(props);
        this.setState({len});

        let areEqual = len.length === this.state.len.length && len.every(item => this.state.len.indexOf(item) > -1);
        if(!areEqual) {
            props.updateCallback(props.item.linkId,{level: props.level, text: props.item.text, values: len}, "sectionLinks");

        }

    }

    getComponents(props) {
        const newArray = [];
        const linkArray = []
        props.item.item.map((_item)=>{
            const component = props.componentRenderer(_item, props.level+1);
            if(component) {
                newArray.push({component,_item});
                linkArray.push(_item.linkId)
            }
        });
        this.setState({components: newArray});
        return linkArray;
    }

    render() {
        return (
            <div className={"section " + (this.state.components.length===0?"disabled":"")}>
                <h3 className="section-header"
                    style={{marginLeft:-15 - (15*this.props.level)}}>{this.props.item.text}</h3>
                {this.state.components.map((obj)=>{
                    const component = obj.component;
                    const _item = obj._item;
                    return component?_item.type!=="group"?(
                    <div key ={_item.linkId}>
                        <div className={"entry-block " + (_item.readOnly?"read-only":"")}>
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
                <br /><hr></hr>
            </div>
        );
    }
}
