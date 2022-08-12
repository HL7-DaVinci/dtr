import React, {Component} from 'react'
import "./RemsInterface.css";

export default class ResourceEntry extends Component {
    constructor(props) {
        super(props);
        this.state = {
            viewDetails: null,
          };
        this.openDetails = this.openDetails.bind(this);

    }


    openDetails() {

        this.setState((prevState) => {
            return { viewDetails: !prevState.viewDetails };
        })


    }
    render() {
        return (
            <div>
                <div className={"resource-entry " + [this.state.viewDetails ? "active" : ""]} onClick={this.openDetails}>
                    <div>{this.props.resource["resourceType"]}</div>
                </div>
                {this.state.viewDetails ? <div className="details"><pre>{JSON.stringify(this.props.resource,null,'\t')}</pre></div> : null}
            </div>
        )
    }
}