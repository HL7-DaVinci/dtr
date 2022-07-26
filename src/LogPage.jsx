import React, { Component } from "react";
import "./LogPage.css";

class LogPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
        logs: []
    }

  }

  componentDidMount(){
    const logRequest = new XMLHttpRequest();
    logRequest.open("GET", "../api/logs");
    logRequest.setRequestHeader("Content-Type", "application/json");
    logRequest.onload = (e) => {
        this.setState({logs: JSON.parse(logRequest.responseText).sort((a,b)=>{return b.createdAt - a.createdAt})});
    };
    logRequest.send();
  }
  renderLog(log){
      const style = {borderLeftColor: "#28a745"}
      if(log.error || log.status !== "Rendering app") {
          style.borderLeftColor = "#dc3545"
      }
      return (
          <div key = {log.id} className="log" style = {style}>
              <div className="section" style ={{width: "200px"}}>
              Status: {log.status}
              </div>
              <div className="section" style ={{width: "300px"}}>
              Timestamp: {new Date(log.createdAt).toISOString()}
              </div>
              <div className="section">
              clientId: {log.clientId}
              </div>
          </div>
      )
  }
  render() {
      console.log(this.state.logs);
    return(
        <div>
            {this.state.logs.map((e)=>{
                return this.renderLog(e);
            })}
        </div>


    )
  }


}
export default LogPage;