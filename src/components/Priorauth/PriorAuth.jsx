import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./PriorAuth.css";

class PriorAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      claimResponseBundle: props.claimResponseBundle,
      subscriptionType: null,
      subscribeMsg: "",
      showRestHookForm: false,
      showLink: false
    };
    this.subscriptionType = {
      WEBSOCKET: "WebSocket",
      RESTHOOK: "Rest-Hook",
      POLLING: "Polling"
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
      this.props.priorAuthService.BASE +
      this.props.priorAuthService.CLAIM_RESPONSE +
      "?identifier=" +
      this.props.priorAuthId +
      "&patient.identifier=" +
      this.props.patientId;
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
        this.props.priorAuthId +
        "&patient.identifier=" +
        this.props.patientId +
        "&status=active",
      channel: {
        type: "rest-hook",
        endpoint: restHookEndpoint
      }
    };
    const subscriptionUri =
      this.props.priorAuthService.BASE +
      this.props.priorAuthService.SUBSCRIPTION;
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
        this.props.priorAuthId +
        "&patient.identifier=" +
        this.props.patientId +
        "&status=active",
      channel: {
        type: "websocket"
      }
    };
    let priorAuth = this;
    const subscriptionUri =
      this.props.priorAuthService.BASE +
      this.props.priorAuthService.SUBSCRIPTION;
    const subscriptionPost = new XMLHttpRequest();
    subscriptionPost.open("POST", subscriptionUri);
    subscriptionPost.setRequestHeader("Content-Type", "application/fhir+json");
    subscriptionPost.onload = function() {
      let subscriptionResponse = JSON.parse(this.responseText);
      let ws =
        priorAuth.props.priorAuthService.WS_BASE +
        priorAuth.props.priorAuthService.WS_CONNECT;
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
        priorAuth.props.priorAuthService.WS_SUBSCRIBE,
        function(msg) {
          priorAuth.webSocketReceiveMessage(msg.body, id);
        }
      );
      priorAuth.state.stompClient.send(
        priorAuth.props.priorAuthService.WS_BIND,
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
      this.props.priorAuthService.BASE +
      this.props.priorAuthService.SUBSCRIPTION +
      "?identifier=" +
      id +
      "&patient.identifier=" +
      this.props.patientId;
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
    return this.state.claimResponseBundle.entry[0].resource;
  }

  render() {
    const claimResponse = this.getClaimResponse();
    const disabled = claimResponse.outcome !== "queued" ? "disabled" : "";
    const dropdownLabel =
      this.state.subscriptionType === null
        ? "Select Type"
        : this.state.subscriptionType;
    return (
      <div className="row">
        <div className="raw-claim-response col col-md-6">
          <pre>{JSON.stringify(claimResponse, undefined, 2)}</pre>
        </div>
        <div className="right col col-md-6">
          <div>
            <h4 className="inline">Prior Authorization: </h4>
            <p className="inline">{claimResponse.id}</p>
          </div>
          <div>
            <h5 className="inline">Patient: </h5>
            <p className="inline">{this.props.patientId}</p>
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
            <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
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
      </div>
    );
  }
}
export default hot(module)(PriorAuth);
