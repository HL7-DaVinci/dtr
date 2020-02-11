import React, { Component } from "react";
import "./PriorAuth.css";

import SendDMEOrder from "../../util/DMEOrders";
import endpointConfig from "./endpointConfig.json";

// Note: code to enable/disable DME Orders
var dMEOrdersEnabled = false;

export default class PriorAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      claimResponseBundle: null,
      subscriptionType: null,
      subscribeMsg: "",
      showRestHookForm: false,
      showLink: false,
      priorAuthBase: endpointConfig[0].url,
      isSubmitted: false,
      priorAuthId: null,
      patientId: null
    };
    this.subscriptionType = {
      WEBSOCKET: "WebSocket",
      RESTHOOK: "Rest-Hook",
      POLLING: "Polling"
    };
    this.priorAuthService = {
      CLAIM_RESPONSE: "/ClaimResponse",
      SUBSCRIPTION: "/Subscription",
      WS_CONNECT: "/connect",
      WS_SUBSCRIBE: "/private/notification",
      WS_BIND: "/subscribe"
    };
  }

  /**
   * Subscription select dropdown handler to update the subscription type of the form
   * Changes the subscriptionType and showRestHookForm in this.state
   *
   * @param subscriptionType - the selected subscription type
   */
  handleSubscribeTypeSelect(subscriptionType) {
    console.log("Subscription Type: " + subscriptionType);
    this.setState({
      subscriptionType: subscriptionType,
      showRestHookForm:
        subscriptionType === this.subscriptionType.RESTHOOK ? true : false
    });
  }

  /**
   * Poll for a pended claim based on the IG specification
   * Specification: no more than 4 times in first hour
   *                no more than once per hour after that
   *                at least once every 12 hours
   */
  polling() {
    // let hourInSec = 3600;
    let hourInSec = 32; // For testing purposes make an hour 16 seconds

    // Poll every 15 minutes in the first hour
    this.getLatestResponse();
    let numPolls = 1;
    let context = this;
    let polling = setInterval(function() {
      context.getLatestResponse();
      numPolls += 1;
      if (numPolls >= 4 || context.getClaimResponse().outcome != "queued") {
        clearInterval(polling);
        context.poll(hourInSec * 1000);
      }
    }, (hourInSec * 1000) / 4);
  }

  /**
   * Poll constantly at given interval until the final disposition comes back
   * @param interval - time in ms to delay between polling
   */
  poll(interval) {
    let context = this;
    let polling = setInterval(function() {
      context.getLatestResponse();
      if (context.getClaimResponse().outcome != "queued") {
        clearInterval(polling);
      }
    }, interval);
  }

  /**
   * Query the PriorAuth server for the most updated ClaimRespnose
   * Sets this.state.claimResponseBundle
   */
  getLatestResponse() {
    let priorAuth = this; // Save this context to use in the onload function
    const claimResponseUri =
      this.state.priorAuthBase +
      this.priorAuthService.CLAIM_RESPONSE +
      "?identifier=" +
      this.state.priorAuthId +
      "&patient.identifier=" +
      this.state.patientId;
    console.log("polling: " + claimResponseUri);
    this.setState({
      subscribeMsg: "Last updated " + new Date()
    });
    const claimResponseGet = new XMLHttpRequest();
    claimResponseGet.open("GET", claimResponseUri, false);
    claimResponseGet.setRequestHeader("Accept", "application/json");
    claimResponseGet.onload = function() {
      if (this.status === 200) {
        priorAuth.setState({
          claimResponseBundle: JSON.parse(this.responseText)
        });
      } else {
        let message = "Unable to retrieve update\n";
        message += "Uri: " + claimResponseUri;
        console.log(e);
        console.log(message);
        alert(message);
        return;
      }
    };
    claimResponseGet.send();
  }

  /**
   * Get link button handler to show the full url for the current page
   * Set this.state.showLink
   */
  handleGetLink() {
    console.log(window.location.href);
    this.setState({
      showLink: true
    });
  }

  /**
   * Subscribe button handler to submit a new subscription
   */
  handleSubscribe() {
    let claimResponse = this.getClaimResponse();
    if (this.state.subscriptionType == null) {
      this.setState({
        subscribeMsg: "Unable to subscribe. Select a subscription type"
      });
    } else if (claimResponse.outcome !== "queued") {
      this.setState({
        subscribeMsg:
          "Unable to subscribe. ClaimResponse outcome is " +
          claimResponse.outcome
      });
    } else if (this.state.subscriptionType === this.subscriptionType.RESTHOOK)
      this.handleRestHookSubscribe();
    else if (this.state.subscriptionType === this.subscriptionType.WEBSOCKET)
      this.handleWebSocketSubscribe();
    else if (this.state.subscriptionType === this.subscriptionType.POLLING)
      this.polling();
  }

  handleRestHookSubscribe() {
    let restHookEndpoint = document.getElementById("restHookEndpoint").value;
    const subscription = {
      resourceType: "Subscription",
      criteria:
        "identifier=" +
        this.state.priorAuthId +
        "&patient.identifier=" +
        this.state.patientId +
        "&status=active",
      channel: {
        type: "rest-hook",
        endpoint: restHookEndpoint
      }
    };
    const subscriptionUri =
      this.state.priorAuthBase + this.priorAuthService.SUBSCRIPTION;
    const subscriptionPost = new XMLHttpRequest();
    subscriptionPost.open("POST", subscriptionUri);
    subscriptionPost.setRequestHeader("Content-Type", "application/fhir+json");
    subscriptionPost.onload = function() {
      let subscriptionResponse = JSON.parse(this.responseText);
      console.log(subscriptionResponse);
      this.setState({
        subscribeMsg: "Rest-Hook Subscription Successful!"
      });
    };
    subscriptionPost.send(JSON.stringify(subscription));
  }

  handleWebSocketSubscribe() {
    // Post subscription
    const subscription = {
      resourceType: "Subscription",
      criteria:
        "identifier=" +
        this.state.priorAuthId +
        "&patient.identifier=" +
        this.state.patientId +
        "&status=active",
      channel: {
        type: "websocket"
      }
    };
    let priorAuth = this;
    const subscriptionUri =
      this.state.priorAuthBase + this.priorAuthService.SUBSCRIPTION;
    const subscriptionPost = new XMLHttpRequest();
    subscriptionPost.open("POST", subscriptionUri);
    subscriptionPost.setRequestHeader("Content-Type", "application/fhir+json");
    subscriptionPost.onload = function() {
      let subscriptionResponse = JSON.parse(this.responseText);
      // TODO: update this to use conformance statement
      let subscriptionBase = priorAuth.state.priorAuthBase.replace(
        /^http/g,
        "ws"
      );
      let ws = subscriptionBase + priorAuth.priorAuthService.WS_CONNECT;
      priorAuth.webSocketConnectAndBind(ws, subscriptionResponse.id);
    };
    subscriptionPost.send(JSON.stringify(subscription));
  }

  /**
   * Connect to the websocket and bind the Subscription id to it
   *
   * @param ws - the web socket url (should begin with ws://)
   * @param id - the Subscription id (from the Subscription response to /fhir/Subscription)
   */
  webSocketConnectAndBind(ws, id) {
    let priorAuth = this;
    let socket = new WebSocket(ws);
    this.setState({
      stompClient: Stomp.over(socket)
    });
    this.state.stompClient.connect({}, function(frame) {
      console.log("Connected: " + frame);
      priorAuth.state.stompClient.subscribe(
        priorAuth.priorAuthService.WS_SUBSCRIBE,
        function(msg) {
          priorAuth.webSocketReceiveMessage(msg.body, id);
        }
      );
      priorAuth.state.stompClient.send(
        priorAuth.priorAuthService.WS_BIND,
        {},
        "bind: " + id
      );
    });
  }

  /**
   * Handler for receiving a new message over the websocket
   *
   * @param message - ws message body
   * @param id -
   */
  webSocketReceiveMessage(message, id) {
    let msgType = message.replace(" ", "").split(":")[0];
    if (msgType === "ping") {
      this.poll();
      let claimResponse = this.getClaimResponse();
      console.log(claimResponse);
      if (
        claimResponse.outcome === "complete" ||
        claimResponse.outcome === "error"
      ) {
        this.setState({
          subscribeMsg: "Updated ClaimResponse loaded"
        });
        this.deleteSubscription(id);
      }
    } else if (msgType === "bound") {
      this.setState({
        subscribeMsg: "WebSocket Subscription Successful!"
      });
    } else {
      this.setState({
        subscribeMsg: message
      });
    }
  }

  /**
   * Delete a Subscription
   *
   * @param id - the Subscription id to delete
   */
  deleteSubscription(id) {
    const subscriptionUri =
      this.state.priorAuthBase +
      this.priorAuthService.SUBSCRIPTION +
      "?identifier=" +
      id +
      "&patient.identifier=" +
      this.state.patientId;
    const subscriptionDelete = new XMLHttpRequest();
    subscriptionDelete.open("DELETE", subscriptionUri);
    subscriptionDelete.setRequestHeader("Content-Type", "application/json");
    subscriptionDelete.onload = function() {
      if (this.status === 200) {
        console.log("Deleted subscription: " + id);
      } else {
        console.log(
          "Unable to performd delete\nSubscription: " +
            id +
            "\nStatus: " +
            this.status
        );
      }
    };
    subscriptionDelete.send();
  }

  /**
   * Get the current ClaimResponse resource from the bundle loaded
   */
  getClaimResponse() {
    return this.state.claimResponseBundle
      ? this.state.claimResponseBundle.entry[0].resource
      : null;
  }

  /**
   * Submit the claim (this.props.claimBundle) to the correct PAS endpoint
   */
  submitClaim() {
    const Http = new XMLHttpRequest();
    const priorAuthUrl = this.state.priorAuthBase + "/Claim/$submit";
    Http.open("POST", priorAuthUrl);
    Http.setRequestHeader("Content-Type", "application/fhir+json");
    Http.send(JSON.stringify(this.props.claimBundle));
    let priorAuth = this;
    Http.onreadystatechange = function() {
      if (this.readyState === XMLHttpRequest.DONE) {
        var message =
          "Prior Authorization Failed.\nNo ClaimResponse found within bundle.";
        if (this.status === 201 || this.status === 200) {
          var claimResponseBundle = JSON.parse(this.responseText);
          var claimResponse = claimResponseBundle.entry[0].resource;
          message = "Prior Authorization " + claimResponse.disposition + "\n";
          message +=
            "Prior Authorization Number: " + claimResponse.identifier[0].value;

          // DME Orders
          if (dMEOrdersEnabled) SendDMEOrder(priorAuth, response);
        } else {
          console.log(this);
          console.log(this.responseText);
          message = "Prior Authorization Request Failed.";
        }
        console.log(message);

        // TODO pass the message to the PriorAuth page instead of having it query again
        let patientEntry = claimResponseBundle.entry.find(function(entry) {
          return entry.resource.resourceType == "Patient";
        });

        // fall back to resource.id if resource.identifier is not populated
        let patientId;
        if (patientEntry.resource.identifier == null) {
          patientId = patientEntry.resource.id;
        } else {
          patientId = patientEntry.resource.identifier[0].value;
        }

        priorAuth.setState({
          isSubmitted: true,
          claimResponseBundle: claimResponseBundle,
          priorAuthId: claimResponse.identifier[0].value,
          patientId: patientId
        });
      }
    };
  }

  selectBase(e) {
    this.setState({ priorAuthBase: e.target.value });
  }

  render() {
    // TODO: modify this to only run once when isSubmitted
    window.scrollTo(0, 0);
    const claimResponse = this.getClaimResponse();
    const disabled = claimResponse
      ? claimResponse.outcome !== "queued"
        ? "disabled"
        : ""
      : "";
    const dropdownLabel =
      this.state.subscriptionType === null
        ? "Select Type"
        : this.state.subscriptionType;
    return (
      <div className="row">
        <div className="raw-claim-response col col-md-6">
          {this.state.isSubmitted ? (
            <pre>{JSON.stringify(claimResponse, undefined, 2)}</pre>
          ) : (
            <pre>{JSON.stringify(this.props.claimBundle, undefined, 2)}</pre>
          )}
        </div>
        {this.state.isSubmitted ? (
          <div className="right col col-md-6">
            <div>
              <h4 className="inline">Prior Authorization: </h4>
              <p className="inline">{claimResponse.id}</p>
            </div>
            <div>
              <h5 className="inline">Patient: </h5>
              <p className="inline">{this.state.patientId}</p>
            </div>
            <div>
              <h5 className="inline">Outcome: </h5>
              <p className="inline">{claimResponse.outcome}</p>
            </div>
            <div>
              <h5 className="inline">Disposition: </h5>
              <p className="inline">{claimResponse.disposition}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => this.getLatestResponse()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => this.handleGetLink()}
            >
              Get Link
            </button>
            <br />
            <a
              className={this.state.showLink ? "" : "hidden"}
              href={window.location.href}
              target="_blank"
            >
              {window.location.href}
            </a>
            <hr />
            <h4>Subscribe to Updates</h4>
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="dropdownMenuButton"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                {dropdownLabel}
              </button>
              <div
                className="dropdown-menu"
                aria-labelledby="dropdownMenuButton"
              >
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => this.handleSubscribeTypeSelect("Rest-Hook")}
                >
                  Rest-Hook
                </a>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => this.handleSubscribeTypeSelect("WebSocket")}
                >
                  WebSocket
                </a>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={() => this.handleSubscribeTypeSelect("Polling")}
                >
                  Polling
                </a>
              </div>
            </div>
            <div
              className={
                "form-group " + (this.state.showRestHookForm ? "" : "hidden")
              }
            >
              <label htmlFor="restHookEndpoint">Rest Hook Endpoint</label>
              <input
                type="text"
                className="form-control"
                id="restHookEndpoint"
                defaultValue="http://localhost:9090/fhir/SubscriptionNotification?identifier=0000000000&patient.identifier=pat013&status=active"
              />
            </div>
            <button
              type="button"
              className={"btn btn-primary " + disabled}
              onClick={() => this.handleSubscribe()}
            >
              Subscribe
            </button>
            <p>{this.state.subscribeMsg}</p>
          </div>
        ) : (
          <div className="right col col-md-6">
            <h2>Submit Prior Auth</h2>
            <form>
              <div className="row">
                <div className="col">
                  <label>Select PriorAuth Endpoint:</label>
                  <br />
                  <select
                    value={this.state.priorAuthBase}
                    onChange={this.selectBase.bind(this)}
                  >
                    {endpointConfig.map(e => {
                      return (
                        <option key={e.name} value={e.url}>
                          {e.name}: {e.url}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="col">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={this.submitClaim.bind(this)}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }
}
