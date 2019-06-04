import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./RegisterPage.css";

class RegisterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clientId: "",
      fhirUrl: "",
      toggle: false,
      json: {}
    }

    this.submit = this.submit.bind(this);
  }

  componentDidMount(){
    let storedJSON = localStorage.getItem("dtrAppTempClientSet")
    if(!storedJSON) {
        storedJSON = {};
    }else{
        storedJSON = JSON.parse(storedJSON);
    }
    this.setState({"json": storedJSON});
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

    this.setState({"json": storedJSON});
    localStorage.setItem("dtrAppTempClientSet", JSON.stringify(storedJSON));
    console.log(localStorage);
  }

  delete(fhirUrl) {
        let storedJSON = localStorage.getItem("dtrAppTempClientSet")
        if(!storedJSON) {
            storedJSON = {};
        }else{
            storedJSON = JSON.parse(storedJSON);
        }
        delete storedJSON[fhirUrl];
        localStorage.setItem("dtrAppTempClientSet", JSON.stringify(storedJSON));
        this.setState({"json": storedJSON});
  }

  render() {
    return(
        <div>
            <div className="left">
                <p>Client Id</p>
                <input className="client-id" value={this.state.clientId} onChange={(e)=>{this.setState({clientId:e.target.value})}}></input>

                <p>Fhir Server (iss)</p>
                <input className="client-id" value={this.state.fhirUrl} onChange={(e)=>{this.setState({fhirUrl:e.target.value})}} disabled = {this.state.toggle}></input>

                <p>Last Accessed Fhir Server:</p>
                <p>{localStorage.getItem("lastAccessedServiceUri") || "None"}</p>
                <br></br>
                <input className="bool-checkbox" type="checkbox" onClick={()=>{this.setState({toggle: !this.state.toggle})}}></input>
                <span>Use this client ID by default for all FHIR Servers</span>
                <button className="btn submit-btn" onClick={this.submit} >Submit</button>
            </div>
            <div className="sep">
                <p>Current Client Ids</p>
                {Object.keys(this.state.json).map((e)=>{return <div><p><span className="bold">{e}</span>: {this.state.json[e]} <span className="delete" onClick={()=>{this.delete(e)}}>x</span></p> </div>})}
            </div>
        </div>


    )
  }
}
export default hot(module)(RegisterPage);