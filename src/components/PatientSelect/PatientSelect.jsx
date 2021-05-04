import React, { Component } from "react";
import PatientBox from './PatientBox';
import Dialog from '@material-ui/core/Dialog';
import InfoIcon from '@material-ui/icons/Info';
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
            open: false
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
        return (<div>
            <div className="patient-header">
                Select Patient and in-progress Questionnaire
                <InfoIcon onClick={()=>{this.setState({open: true})}}></InfoIcon>
                <Dialog onClose={()=>{this.setState({open: false})}} classes={{paper: 'info-padding'}} open={this.state.open}>
                    <div>Info</div>
                    <hr />
                    <div>The standalone launch for DTR skips the CRD workflow and 
                        provides access to the EHR without a selected questionnaire or patient.
                        Patients with in-progress questionnaires can be selected from the dropdown 
                        below to continue with the DTR process.  Patients in the list only appear
                        if they have an outstanding in-progress questionnaire.  Use the dropdown in the patient
                        box to select a questionnaire, and then select the patient to continue the DTR workflow.  
                        If no patients appear in the box, there are no outstanding questionnaires to be continued.
                    </div>
                </Dialog>
            </div>
            <div className="patient-box">

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
        </div>)
    }
}