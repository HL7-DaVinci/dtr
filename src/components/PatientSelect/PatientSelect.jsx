import React, { Component } from "react";
import PatientBox from './PatientBox';
import './PatientStyles.css';
export default class PatientSelect extends Component {
    constructor(props) {
        super(props);

        // store patients with their
        // questionnaire responses:
        // {
        //  patientId: [questionnaireResponses]
        //  ...
        // }
        this.state = {
            responseList: {},
        };
    }

    componentDidMount() {
        // we find it in reverse since
        // we're less likely to have qResponses
        const patientList = {};
        this.props.smart
            .request("QuestionnaireResponse?status=in-progress", { flat: true })
            .then((result) => {
                result.forEach((response) => {
                    if( response.subject && response.subject.reference) {
                        // check if the patient already has an entry
                        if (patientList[response.subject.reference]) {
                            // we don't need the actual patient resource until the user
                            // chooses a patient, unless we want to show demographic data
                            patientList[response.subject.reference].push(response);
                        } else {
                            patientList[response.subject.reference] = [response];
                        }
                    }
                })
                this.setState({responseList: patientList});
        })
    }

    render() {
        return <div className="patient-box">
            {Object.keys(this.state.responseList).map((patient) => {
                return <div 
                key={patient}>
                    {<PatientBox 
                        patient={patient} 
                        responses={this.state.responseList[patient]}
                        callback={this.props.callback}>
                    </PatientBox>}
                </div>
            })}
        </div>
    }
}