import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./RegisterPage.css";

class RegisterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clientId: "",
      fhirUrl: "",
      toggle: false
    }

    this.submit = this.submit.bind(this);
  }

  componentDidMount(){
  }


  submit(){
    let storedJSON = localStorage.getItem("dtrAppTempClientSet")
    if(!storedJSON) {
        storedJSON = {};
    }else{
        storedJSON = JSON.parse(storedJSON);
    }

    if(this.state.toggle) {
        storedJSON["default"] = this.state.clientId;
    }else{
        storedJSON[this.state.fhirUrl] = this.state.clientId;
    }

    localStorage.setItem("dtrAppTempClientSet", JSON.stringify(storedJSON));
    console.log(localStorage);
  }

  render() {
    return(
        <div>
            <p>Client Id</p>
            <input className="client-id" value={this.state.clientId} onChange={(e)=>{this.setState({clientId:e.target.value})}}></input>

            <p>Fhir Server (iss)</p>
            <input className="client-id" value={this.state.fhirUrl} onChange={(e)=>{this.setState({fhirUrl:e.target.value})}} disabled = {this.state.toggle}></input>

            <p>Last Accessed Fhir Server:</p>
            <p>{localStorage.getItem("lastAccessedServiceUri") || "None"}</p>
            <br></br>
            <input className="bool-checkbox" type="checkbox" onClick={()=>{this.setState({toggle: !this.state.toggle})}}></input>
            <span>Default</span>
            <button className="btn submit-btn" onClick={this.submit} >Submit</button>
        </div>
    )
  }
}
export default hot(module)(RegisterPage);