import React, { Component } from "react";
import ResourceEntry from './ResourceEntry';
import "./RemsInterface.css";
import axios from "axios";
import { SystemUpdateTwoTone } from "@material-ui/icons";
import Paper from "@material-ui/core/Paper";
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import Button from '@material-ui/core/Button';
import AutorenewIcon from '@material-ui/icons/Autorenew';
const colorPicker = {
  "Pending": "#f0ad4e",
  "Approved": "#5cb85c",
}
export default class RemsInterface extends Component {

  constructor(props) {
    super(props);
    this.state = {
      claimResponseBundle: null,
      remsAdminResponse: null,
      response: null,
      spin: false,
      spinPis: false,
      viewBundle: false,
      viewPisBundle: false,
    };

    this.getAxiosOptions = this.getAxiosOptions.bind(this);
    this.sendRemsMessage = this.sendRemsMessage.bind(this);
    this.renderBundle = this.renderBundle.bind(this);
    this.refreshBundle = this.refreshBundle.bind(this);
    this.refreshPisBundle = this.refreshPisBundle.bind(this);
    this.toggleBundle = this.toggleBundle.bind(this);
    this.togglePisBundle = this.togglePisBundle.bind(this);
  }

  componentDidMount() {
    this.sendRemsMessage();
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

  async sendRemsMessage() {
    const remsAdminResponse = await axios.post("http://localhost:8090/api/rems", this.props.specialtyRxBundle, this.getAxiosOptions());
    this.setState({ remsAdminResponse });
    console.log(remsAdminResponse)
    axios.post("http://localhost:3010/api/doctorOrder/fhir/rems", remsAdminResponse.data, this.getAxiosOptions()).then((response) => {
      this.setState({ response });
      console.log(response);
      console.log(response.data);
    });


  }

  toggleBundle() {
    this.setState((prevState)=>{
      return {...prevState, viewBundle: !prevState.viewBundle}
    })
  }

  togglePisBundle() {
    this.setState((prevState)=>{
      return {...prevState, viewPisBundle: !prevState.viewPisBundle}
    })
  }

  renderBundle(bundle) {
    return bundle.entry.map((entry) => {
      const resource = entry.resource;
      console.log(resource);
      return (
        <div>
          <ResourceEntry resource={resource}></ResourceEntry>
        </div>
      )
    })
  }

  refreshPisBundle() {
    this.setState({spinPis: true});
    axios.get(`http://localhost:3010/api/doctorOrder/${this.state.response.data.doctorOrder._id}`).then((response)=>{
      this.setState({response: response});
    })
  }
  refreshBundle() {
    this.setState({spin: true});
    axios.get(`http://localhost:8090/api/rems/${this.state.remsAdminResponse.data.case_number}`).then((response)=>{
      this.setState({remsAdminResponse: response});
    })
  }
  render() {
    const status = this.state.remsAdminResponse?.data?.status;
    let color = "#f7f7f7"
    if (status === "Approved") {
      color = "#5cb85c"
    } else if (status === "Pending") {
      color = "#f0ad4e"
    }

    let colorPis  = "#f7f7f7"
    const statusPis = this.state.response?.data?.doctorOrder?.dispenseStatus;

    if (statusPis === "Approved") {
      colorPis = "#5cb85c"
    } else if (statusPis === "Pending") {
      colorPis = "#f0ad4e"
    } else if (statusPis === "Picked Up") {
      colorPis = "#0275d8"
    }

    return (
      <div>
        <div className="container left-form">
          <h1>REMS Admin Status</h1>
          <Paper style={{paddingBottom: "5px"}}>
            <div className="status-icon" style={{ backgroundColor: color }}></div>
            <div className="bundle-entry">
              Case Number : {this.state.remsAdminResponse?.data?.case_number || "N/A"}
            </div>
            <div className="bundle-entry">
              Status: {this.state.remsAdminResponse?.data?.status}
            </div>
            <div className="bundle-entry">
              <Button variant="contained" onClick={this.toggleBundle}>View Bundle</Button>
              {this.state.remsAdminResponse?.data?.case_number ? 
                            <AutorenewIcon
                            className={this.state.spin === true ? "refresh" : "renew-icon"}
                            onClick={this.refreshBundle}
                            onAnimationEnd={() => this.setState({spin: false})}
                        />
                      :""
                }

            </div>

          </Paper>
          {this.state.viewBundle ? <div className="bundle-view">
            {this.renderBundle(this.props.specialtyRxBundle)}
          </div>: ""}



        </div>

        <div className="right-form">
          <h1>Pharmacy Status</h1>
          <Paper style={{paddingBottom: "5px"}}>
              <div className="status-icon" style={{ backgroundColor: colorPis }}></div>
              <div className="bundle-entry">
                ID : {this.state.response?.data?.doctorOrder?._id || "N/A"}
              </div>
              <div className="bundle-entry">
                Status: {this.state.response?.data?.doctorOrder?.dispenseStatus}
              </div>
              <div className="bundle-entry">
                <Button variant="contained" onClick={this.togglePisBundle}>View Bundle</Button>
                {this.state.response?.data?.doctorOrder?._id ? 
                              <AutorenewIcon
                              className={this.state.spinPis === true ? "refresh" : "renew-icon"}
                              onClick={this.refreshPisBundle}
                              onAnimationEnd={() => this.setState({spinPis: false})}
                          />
                        :""
                  }

              </div>

            </Paper>
            {this.state.viewPisBundle ? <div className="bundle-view">
            {this.renderBundle(this.props.specialtyRxBundle)}
          </div>: ""}
        </div>
        {/* <button className="submit-btn" onClick={() => { this.sendRemsMessage() }}>Submit</button> */}

      </div>
    )
  }
}
