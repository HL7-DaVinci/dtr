import React, { Component } from "react";
import "./RegisterPage.css";
import {postToClients, deleteClient} from "./util/util";

class RegisterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clientId: "",
      fhirUrl: "",
      toggle: false,
      json: {},
      clients: []
    }

    this.submit = this.submit.bind(this);
    this.update = this.update.bind(this);
  }

  componentDidMount(){
    this.update();
  }

  update(e) {
    const clientRequest = new XMLHttpRequest();
    clientRequest.open("GET", "../clients");
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = (e) => {
        this.setState({clients: JSON.parse(clientRequest.responseText)});
    };
    clientRequest.send();
  }

  submit(){
    if(this.state.toggle) {
        postToClients({name: "default", client: this.state.clientId}, this.update)
    }else{
        postToClients({name: this.state.fhirUrl, client: this.state.clientId}, this.update);
    }
  }

  delete(log) {
        deleteClient(log.id, this.update);
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
                {this.state.clients.map((e)=>{return <div key={e.id}><p><span className="bold">{e.name}</span>: {e.client} <span className="delete" onClick={()=>{this.delete(e)}}>x</span></p> </div>})}
            </div>
        </div>


    )
  }
}
export default RegisterPage;