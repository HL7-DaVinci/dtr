import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
                    return this.props.componentRenderer(_item, this.props.level+1)
                })}
            </div>
        );
    }
}
