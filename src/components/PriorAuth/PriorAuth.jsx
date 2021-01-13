import React, { Component } from "react";
import "./PriorAuth.css";

import SendDMEOrder from "../../util/DMEOrders";
import PASConfig from "./config.json";
import { createSign } from "crypto";
import base64 from "base64url";
import shortid from "shortid";
import axios from "axios";

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
      priorAuthBase: PASConfig.endpoints[0].url,
      isSubmitted: false,
      priorAuthId: null,
      patientId: null,
      useOauth: false,
      accessToken: null,
      tokenUrl: null
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
   * Specification: every 5 min for the first half hour
   *                no more than once per hour after that
   *                at least once every 12 hours
   */
  polling() {
    const hourInSec = PASConfig.pollingTimeDevelop || 3200; // Use develop value if available for this RI
    const hourInMS = hourInSec * 1000;
    const fiveMin = hourInMS / 12;

    // Poll every 5 minutes in the first half hour
    let numPolls = 1;
    let context = this;
    let polling = setInterval(function () {
      context.getLatestResponse();
      if (numPolls >= 6 || context.getClaimResponse().outcome != "queued") {
        clearInterval(polling);
        numPolls += 1;
      }
    }, fiveMin);

    // Poll every hour until claim comes back
    polling = setInterval(function () {
      context.getLatestResponse();
      if (context.getClaimResponse().outcome != "queued")
        clearInterval(polling);
    }, hourInMS);
  }

  /**
   * Query the PriorAuth server for the most updated ClaimRespnose
   * Sets this.state.claimResponseBundle
   */
  async getLatestResponse() {
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

    const options = {
      headers: {
        Accept: "application/json"
      }
    };
    if (this.state.useOauth) {
      const accessToken = this.state.accessToken
        ? this.state.accessToken
        : await this.getNewAccessToken();
      options.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return axios
      .get(claimResponseUri, options)
      .then((data) => {
        if (data.status !== 200) {
          alert(
            "GET ClaimResponse must return 200. More details printed to console.error"
          );
          console.error(`GET ${claimResponseUri} returned ${data.status}`);
          return null;
        } else {
          this.setState({ claimResponseBundle: data.data });
          return data.data;
        }
      })
      .catch((err) => {
        alert(
          "Error getting ClaimResponse. More details printed to console.error"
        );
        console.error(`Unable to GET ${claimResponseUri}`);
        console.error(err);
        return null;
      });
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
    } else if (this.state.subscriptionType === this.subscriptionType.RESTHOOK) {
      this.handleRestHookSubscribe();
    } else if (
      this.state.subscriptionType === this.subscriptionType.WEBSOCKET
    ) {
      this.handleWebSocketSubscribe();
    } else if (this.state.subscriptionType === this.subscriptionType.POLLING) {
      this.polling();
    }
  }

  async handleRestHookSubscribe() {
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

    const options = await this.getAxiosOptions();
    axios
      .post(subscriptionUri, subscription, options)
      .then((data) => {
        console.log(data.data);
        this.setState({
          subscribeMsg: "Rest-Hook Subscription Successful!"
        });
      })
      .catch((err) => console.error(err));
  }

  async handleWebSocketSubscribe() {
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
    const subscriptionUri =
      this.state.priorAuthBase + this.priorAuthService.SUBSCRIPTION;

    const options = await this.getAxiosOptions();
    axios
      .post(subscriptionUri, subscription, options)
      .then((data) => {
        // TODO: update this to use conformance statement
        const subscriptionBase = this.state.priorAuthBase.replace(
          /^http/g,
          "ws"
        );
        const ws = subscriptionBase + this.priorAuthService.WS_CONNECT;
        this.webSocketConnectAndBind(ws, data.data.id);
      })
      .catch((err) => console.error(err));
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
    this.state.stompClient.connect({}, function (frame) {
      console.log("Connected: " + frame);
      priorAuth.state.stompClient.subscribe(
        priorAuth.priorAuthService.WS_SUBSCRIBE,
        function (msg) {
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
  async webSocketReceiveMessage(message, id) {
    let msgType = message.replace(" ", "").split(":")[0];
    if (msgType === "ping") {
      const claimResponseBundle = await this.getLatestResponse();
      const claimResponse = this.getClaimResponse(claimResponseBundle);
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
  async deleteSubscription(id) {
    const subscriptionUri =
      this.state.priorAuthBase +
      this.priorAuthService.SUBSCRIPTION +
      "?identifier=" +
      id +
      "&patient.identifier=" +
      this.state.patientId;
    const options = await this.getAxiosOptions();
    axios
      .delete(subscriptionUri, options)
      .then((data) => {
        if (data.status !== 200) {
          alert("DELETE response must be 200. More details in console.error");
          console.error(`DELETE ${subscriptionUri} returned ${data.status}`);
        } else {
          console.log(`Deleted Subscription: ${id}`);
        }
      })
      .catch((err) => {
        alert(
          `Error deleting Subscription ${id}. More details in console.error`
        );
        console.error(err);
      });
  }

  /**
   * Get the current ClaimResponse resource from the bundle loaded
   * @param claimResponseBundle (optional) - get the ClaimResponse resource
   */
  getClaimResponse(claimResponseBundle = undefined) {
    if (claimResponseBundle) return claimResponseBundle.entry[0].resource;
    return this.state.claimResponseBundle
      ? this.state.claimResponseBundle.entry[0].resource
      : null;
  }

  /**
   * Create the client_assertion JWT for server-server oauth
   */
  createJWT() {
    const header = {
      alg: "RS384",
      typ: "JWT",
      kid: "3ab8b05b64d799e289e10a201786b38c"
    };
    const headerStr = JSON.stringify(header);

    const fiveMinutes = 350;
    const payload = {
      iss: PASConfig.clientId,
      sub: PASConfig.clientId,
      aud: this.state.tokenUrl,
      exp: Math.floor(Date.now() / 1000) + fiveMinutes,
      jti: shortid.generate()
    };
    const payloadStr = JSON.stringify(payload);

    const data = base64(headerStr) + "." + base64(payloadStr);
    const sign = createSign("RSA-SHA384");
    sign.update(data);

    const signature = base64.fromBase64(
      sign.sign(PASConfig.privateKey, "base64")
    );
    const jwt = data + "." + signature;

    console.log(jwt);
    return jwt;
  }

  /**
   * Construct the axios headers adding the Authorization header
   * only if this.state.useOauth is enabled
   */
  async getAxiosOptions() {
    const options = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/fhir+json"
      }
    };
    if (this.state.useOauth) {
      const accessToken = this.state.accessToken
        ? this.state.accessToken
        : await this.getNewAccessToken();
      options.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return options;
  }

  /**
   * Request a new access token from the authorization server
   */
  async getNewAccessToken() {
    const tokenUrl = await this.getTokenUrl();
    const jwt = this.createJWT();

    console.log(tokenUrl);
    const tokenAuthUrl = `${tokenUrl}?scope=system/*.read&grant_type=client_credentials&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=${jwt}`;
    const { data } = await axios.post(tokenAuthUrl);
    this.setState({ accessToken: data.access_token });
    return data.access_token;
  }

  /**
   * Submit the claim (this.props.claimBundle) to the correct PAS endpoint
   */
  async submitClaim() {
    const options = await this.getAxiosOptions();
    const priorAuthUrl = `${this.state.priorAuthBase}/Claim/$submit`;
    axios
      .post(priorAuthUrl, this.props.claimBundle, options)
      .then((data) => {
        console.log(data);
        if (data.status === 201 || data.status === 200) {
          const claimResponseBundle = data.data;
          const claimResponse = claimResponseBundle.entry[0].resource;
          console.log(
            `Prior Authorization ${claimResponse.disposition}\nPrior Authorization Number: ${claimResponse.identifier[0].value}`
          );

          // DME Orders
          if (dMEOrdersEnabled) SendDMEOrder(this, claimResponse);

          // TODO pass the message to the PriorAuth page instead of having it query again
          let patientEntry = claimResponseBundle.entry.find(function (entry) {
            return entry.resource.resourceType == "Patient";
          });

          // fall back to resource.id if resource.identifier is not populated
          let patientId;
          if (patientEntry.resource.identifier == null) {
            patientId = patientEntry.resource.id;
          } else {
            patientId = patientEntry.resource.identifier[0].value;
          }

          this.setState({
            isSubmitted: true,
            claimResponseBundle: claimResponseBundle,
            priorAuthId: claimResponse.identifier[0].value,
            patientId: patientId
          });
        } else {
          console.error(
            `Prior Authorization must return 200 or 201. Request returned ${data.status}`
          );
          console.error(data);
          alert(
            "Prior Authorization must return 200 or 201. Details printed to console.error"
          );
        }
      })
      .catch((err) => {
        console.error(`Prior Authorization Failed`);
        console.error(err);
        alert(
          "Prior Authorization Request Failed. Details printed to console.error"
        );
      });
  }

  /**
   * Get the token oauth url from the metadata and set this.state.tokenUrl
   */
  async getTokenUrl() {
    if (!this.state.priorAuthBase) {
      alert("Cannot get token url since prior auth base is not set");
      return;
    }

    // Return the cached token url
    if (this.state.tokenUrl) return this.state.tokenUrl;

    // Get the token url from the server metadata
    const options = {
      headers: {
        Accept: "application/json"
      }
    };
    return axios
      .get(`${this.state.priorAuthBase}/metadata`, options)
      .then((data) => {
        if (data.status !== 200) {
          console.error(data);
          alert("GET /metadata did not return 200");
        }
        for (const ext of data.data.rest[0].security.extension) {
          if (
            ext.url ===
            "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
          ) {
            for (const uri of ext.extension) {
              if (uri.url === "token") {
                this.setState({ tokenUrl: uri.valueUri });
                return uri.valueUri;
              }
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        alert("ERROR on GET /metadata");
      });
  }

  selectBase(e) {
    this.setState({ priorAuthBase: e.target.value });
  }

  setOauth(e) {
    this.setState({ useOauth: e.target.checked });
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
                    {PASConfig.endpoints.map((e) => {
                      return (
                        <option key={e.name} value={e.url}>
                          {e.name}: {e.url}
                        </option>
                      );
                    })}
                  </select>
                  <br />
                  <input
                    type="checkbox"
                    id="use_oauth"
                    value="oauth"
                    onChange={this.setOauth.bind(this)}
                  />
                  <label htmlFor="use_oauth">Use OAuth</label>
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
        <div className="raw-claim-response col col-md-6">
          {this.state.isSubmitted ? (
            <pre>{JSON.stringify(claimResponse, undefined, 2)}</pre>
          ) : (
            <pre>{JSON.stringify(this.props.claimBundle, undefined, 2)}</pre>
          )}
        </div>
      </div>
    );
  }
}
