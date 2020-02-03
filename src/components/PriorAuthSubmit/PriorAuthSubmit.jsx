import React, { Component } from "react";

import "./PriorAuthSubmit.css";

import SendDMEOrder from "../../util/DMEOrders";

// Note: code to enable/disable DME Orders
var dMEOrdersEnabled = false;

export default class QuestionnaireForm extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {}

  componentDidMount() {}

  submitClaim() {
    console.log("submitting claim");
    const Http = new XMLHttpRequest();
    const priorAuthBase = document.getElementById("pas-endpoint").value;
    const priorAuthUrl = priorAuthBase + "/Claim/$submit";
    console.log("priorAuthUrl set to " + priorAuthUrl);
    Http.open("POST", priorAuthUrl);
    Http.setRequestHeader("Content-Type", "application/fhir+json");
    Http.send(JSON.stringify(priorAuthBundle));
    var qForm = this;
    Http.onreadystatechange = function() {
      if (this.readyState === XMLHttpRequest.DONE) {
        var message =
          "Prior Authorization Failed.\nNo ClaimResponse found within bundle.";
        if (this.status === 201) {
          var claimResponseBundle = JSON.parse(this.responseText);
          var claimResponse = claimResponseBundle.entry[0].resource;
          message = "Prior Authorization " + claimResponse.disposition + "\n";
          message += "Prior Authorization Number: " + claimResponse.preAuthRef;

          // DME Orders
          if (dMEOrdersEnabled) SendDMEOrder(qForm, response);
        } else {
          console.log(this.responseText);
          message = "Prior Authorization Request Failed.";
        }
        console.log(message);

        // TODO pass the message to the PriorAuth page instead of having it query again
        var patientEntry = claimResponseBundle.entry.find(function(entry) {
          return entry.resource.resourceType == "Patient";
        });

        // fall back to resource.id if resource.identifier is not populated
        var patientId;
        if (patientEntry.resource.identifier == null) {
          patientId = patientEntry.resource.id;
        } else {
          patientId = patientEntry.resource.identifier[0].value;
        }
        let priorAuthUri =
          "priorauth?identifier=" +
          claimResponse.preAuthRef +
          "&patient.identifier=" +
          patientId;
        console.log(priorAuthUri);
        window.location.href = priorAuthUri;
      }
    };
  }

  render() {
    return (
      <div>
        <h2>Submit Prior Auth</h2>
        <form>
          <select id="pas-endpoint">
            <option value="http://localhost:9000/fhir">
              http://localhost:9000/fhir
            </option>
            <option value="https://davinci-prior-auth.logicahealth.org/fhir">
              https://davinci-prior-auth.logicahealth.org/fhir
            </option>
          </select>
          <button type="submit" onClick={this.submitClaim()}>
            Submit
          </button>
        </form>
      </div>
    );
  }
}
