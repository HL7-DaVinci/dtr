import React, { Component } from "react";
import ResourceEntry from './ResourceEntry';
import "./RemsInterface.css";

import axios from "axios";
import { SystemUpdateTwoTone } from "@material-ui/icons";


export default class RemsInterface extends Component {
  constructor(props) {
    super(props);
    this.state = {
      claimResponseBundle: null,
    };

    this.getAxiosOptions = this.getAxiosOptions.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.renderBundle= this.renderBundle.bind(this);
  }
  getAxiosOptions() {
    const options = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    };
    return options;
  }

  sendMessage(destination) {
      console.log(this.props.specialtyRxBundle);
    axios.post(destination, this.props.specialtyRxBundle, this.getAxiosOptions());
  }

  renderBundle() {
      return this.props.specialtyRxBundle.entry.map((entry) => {
          const resource = entry.resource;
          console.log(resource);
          return(
              <div>
                  <ResourceEntry resource={resource}></ResourceEntry>
              </div>
          ) 
      })
  }
  render() {
    return (
        <div>
            <div className="container left-form">
                {this.renderBundle()}
                <button className="submit-btn" onClick={()=>{this.sendMessage("http://localhost:3010/api/doctorOrder/FHIR")}}>Submit</button>

            </div>
            <div className="right-form">
            </div>
        </div>
    )
  }
}
