import React, { Component } from "react";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { findValueByPrefix } from "../../util/util.js";
import {createTask} from "../../util/taskCreation";

import './Task.css';
import questionnaire from './TaskQuestionnaire';
import TaskForm from './TaskForm';

export default class TaskPopup extends Component {
    constructor(props) {
        super(props);
        this.state = {
          open: false
        };
        this.handleClickOpen = this.handleClickOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.submitTask = this.submitTask.bind(this);
    }

componentDidMount() {
    this.renderTaskQuestionnaire();
    document.body.style.overflow = 'auto';
}

handleClickOpen() {
    this.setState({open: true});
  };

handleClose() {
    document.body.style.overflow = 'auto';
    this.setState({open: false})
  };
  
submitTask() {
    var qr = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', 'R4', "#taskContainer");
    const returnValue = {};
    if(qr.item) {
        qr.item.map((qitem) => {
            if(qitem.item) {
                qitem.item.map((e)=>{
                    if(e.answer) {
                        const value = findValueByPrefix(e.answer[0],"value");
                        if(value.code && qitem.linkId === "1") {
                            returnValue[e.text] = value.code;
                        } else {
                            returnValue[e.text] = value;
                        }
    
                    }
    
                })
            }

        })

    }
    this.setState({open: false})
    createTask(returnValue, this.props.smart);
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
        <div style={{"float": "right"}}>
    
          <button className="task-popup-button" onClick={this.handleClickOpen}>
            Create Task
          </button>
          <Dialog classes = {{
              root: "openPop",
              paperScrollPaper: " dialog",
          }} open={this.state.open} onClose={this.handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Task Form</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Fill out task info
              </DialogContentText>
              <TaskForm></TaskForm>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleClose} color="primary">
                Cancel
              </Button>
              <Button onClick={this.submitTask} color="primary">
                Submit
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      );
  }

}