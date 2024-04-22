import React, { Component } from "react";
import ReactDOM from "react-dom";
import QuestionnaireForm from './components/QuestionnaireForm/QuestionnaireForm';


export default class CdexQuestionnaire extends Component {

  constructor(props) {
    super(props);
    console.log('CdexQuestionnaire constructor props:', props);

    this.state = {
      questionnaire: props.questionnaire,
      questionnaireResponse: null,
      task: props.task
    }

    this.saveResponse = this.saveResponse.bind(this);
    this.taskCompleted = this.taskCompleted.bind(this);
  }


  componentDidMount() {
    console.log('CdexQuestionnaire componentDidMount state:', this.state);
    this.createForm();    
  }


  async createForm() {

    // if we have a QuestionnaireResponse, load it into the form
    const qrRef = (this.state.task.output || []).find((o) => {
      return o.type.coding.find((c) => c.system === 'http://hl7.org/fhir/uv/sdc/CodeSystem/temp' && c.code === 'questionnaire-response');
    });

    console.log('qrRef:', qrRef);
    if (qrRef) {
      const qr = await this.props.client.request(qrRef.valueReference.reference);
      this.setState({questionnaireResponse: qr});

      const form = LForms.Util.convertFHIRQuestionnaireToLForms(this.state.questionnaire, 'R4');
      const formWithData = LForms.Util.mergeFHIRDataIntoLForms("QuestionnaireResponse", qr, form, 'R4');
      LForms.Util.addFormToPage(formWithData, 'questionnaireForm');
    }
    else {
      LForms.Util.addFormToPage(this.state.questionnaire, 'questionnaireForm');
    }

    
  }


  async saveResponse() {
    const qr = LForms.Util.getFormFHIRData('QuestionnaireResponse', 'R4');
    console.log('qr:', qr);

    // if we have a QuestionnaireResponse, update it, otherwise create a new one
    if (!!this.state.questionnaireResponse) {
      qr.id = this.state.questionnaireResponse.id;
      const response = await this.props.client.update(qr);
      this.setState({questionnaireResponse: response});
    } else {

      // new QuestionnaireResponse
      const response = await this.props.client.create(qr);
      this.setState({questionnaireResponse: response});

      // update the task with the new QuestionnaireResponse
      const task = this.state.task;
      task.output = task.output || [];
      task.output.push({
        type: {
          coding: [
            {
              system: 'http://hl7.org/fhir/uv/sdc/CodeSystem/temp',
              code: 'questionnaire-response'
            }
          ]
        },
        valueReference: {
          reference: `QuestionnaireResponse/${response.id}`
        }
      });
      const updatedTask = await this.props.client.update(task);
      this.setState({task: updatedTask});
    }

  }

  async taskCompleted() {
    this.state.task.status = 'completed';
    const task = await this.props.client.update(this.state.task);
    this.setState({task: task});
  }


  render() {
    return (
      <div>
        <h2>Questionnaire</h2>
        <div className="mb-3 row">
          <label for="questionnaireUrl" className="col-sm-2 col-form-label">Questionnaire source:</label>
          <div className="col-sm-10">
            <input type="text" id="questionnaireUrl" className="form-control-plaintext" value={this.props.questionnaireUrl} readOnly />
          </div>
        </div>
        <div id="questionnaireForm"></div>
        <button className="btn btn-primary mt-3" onClick={this.saveResponse}>Save QuestionnaireResponse</button>

        <hr className="border border-primary" />

        <h2>Task</h2>
        <div className="mb-3 row">
          <label for="taskUrl" className="col-sm-2 col-form-label">Task source:</label>
          <div className="col-sm-10">
            <input type="text" id="taskUrl" className="form-control-plaintext" value={`${this.props.client.state.serverUrl}/${this.props.fhirContext?.task}`} readOnly />
          </div>
        </div>

        <button className="btn btn-primary mb-3" onClick={this.taskCompleted}>Mark Task Completed</button>

        <div className="accordion">
          <div className="accordion-item">
            <h2 className="accordion-header" id="taskHeader">
              <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#taskCollapse" aria-expanded="true" aria-controls="taskCollapse">
                Task
                  ID: {this.state.task?.id}, Status: {this.state.task?.status}, 
                  QuestionnaireResponse: { 
                    this.state.task?.output?.find(
                      (o) => o.type.coding.find(
                        (c) => c.system === 'http://hl7.org/fhir/uv/sdc/CodeSystem/temp' && c.code === "questionnaire-response")
                      )?.valueReference?.reference ?? 'none'
                  }
              </button>
            </h2>
            <div id="taskCollapse" className="accordion-collapse collapse show" aria-labelledby="taskHeader" data-bs-parent="#accordionTask">
              <div className="accordion-body">
                <pre>{JSON.stringify(this.state.task, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

}
