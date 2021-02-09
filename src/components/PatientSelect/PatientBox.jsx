import React, { Component } from "react";
import SelectPopup from "../QuestionnaireForm/SelectPopup";
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import "./PatientStyles.css";


export default class PatientBox extends Component {
  constructor(props) {
    super(props);
    this.state = {
        questionnaireResponse: null,
        responseId: ''
    };

    this.handleRequestChange = this.handleRequestChange.bind(this);
    this.getQuestionnaires = this.getQuestionnaires.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.updateValues = this.updateValues.bind(this);

  }

  componentDidMount() {
      console.log(this.props);
  }

  getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }   

  makeOption(request, options) {
    let code = this.getCoding(request);

    let option = {
      key: request.id,
      text: "(" + code.code + ") " + code.display,
      value: JSON.stringify(request),
      content: (
        <div>henlo</div>
      )
    }
    options.push(option);
  }

  updateValues(patient, responseId) {
    const response = this.props.responses.find((response) => {
        return response.id === responseId;
    });

    const patientId = patient.split('/')[1];
    console.log(patientId);
    this.props.callback(patientId, response);
  }
  
  getQuestionnaires() {

  }

  handleChange(e, value) {
      console.log(e.target.value);
      this.setState({responseId: e.target.value});
      console.log(value);
  }

  handleRequestChange(e, data) {
    if (data.value === "none") {
      this.setState({
        questionnaireResponse: "none"
      });
    } else {
      let request = JSON.parse(data.value);
      let coding = this.getCoding(request);
      //console.log(request.resourceType + " for code " + coding.code + " selected");
      this.setState({
        questionnaireResponse: data.value
      });
    }
  }

  render() {
    const patient = this.props.patient;
    // let name = "";
    // if (patient.name) {
    //   name = (
    //     <span> {`${patient.name[0].given[0]} ${patient.name[0].family}`} </span>
    //   );
    // }

    // add all of the requests to the list of options
    let options = []
    let returned = true;
    
    let noResults = 'No results found.'
    if(!returned) {
        noResults = 'Loading...';
    }

    return (
      <div>
        <div
          className="patient-selection-box"
          key={patient.id}
        >
          <div className="patient-info">
            <span style={{ fontWeight: "bold" }}>ID</span>: {patient}
            {/* <div>
              <span style={{ fontWeight: "bold" }}>Name</span>:{" "}
              {name ? name : "N/A"}
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Gender</span>:{" "}
              {patient.gender}
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Age</span>:{" "}
              {this.getAge(patient.birthDate)}
            </div> */}
          </div>
            <FormControl className="request-info">
                <InputLabel id="Questionnaire">Questionnaire:</InputLabel>
                <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={this.state.responseId}
                onChange={this.handleChange}
                >
                {this.props.responses.map((response) =>{
                    return <MenuItem key={response.id} value={response.id}>{`${response.questionnaire} - ${new Date(response.authored).toDateString()}`}</MenuItem>
                })}
                </Select>
            </FormControl>

            <div>
                <button  
                onClick={() => {
                    this.updateValues(patient, this.state.responseId);
                }}>
                    Select
                </button>
            </div>
        </div>
      </div>
    );
  }
}
