import React, { Component } from "react";
import './Task.css';
import questionnaire from './TaskQuestionnaire';

export default class TaskPopup extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

componentDidMount() {
    this.renderTaskQuestionnaire();
}

renderTaskQuestionnaire() {
    let lform = LForms.Util.convertFHIRQuestionnaireToLForms(questionnaire, "R4");
    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeaders: false,
      showQuestionCode: false,
      hideFormControls: true,
      showFormOptionPanelButton: false//,
      //allowHTMLInInstructions: true,
      //showCodingInstruction: true
    };
    const bb = LForms.Util.addFormToPage(lform, 'taskContainer');
  }

  render() {
    return (
        <div>
              <div id="taskContainer"></div>
        </div>
      );
  }

}