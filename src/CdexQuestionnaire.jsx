import React, { Component } from "react";
import ReactDOM from "react-dom";
import QuestionnaireForm from './components/QuestionnaireForm/QuestionnaireForm';
import { 
  Button, 
  Typography, 
  Box, 
  TextField, 
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';


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
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Questionnaire
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={2}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Questionnaire source:
            </Typography>
          </Grid>
          <Grid item xs={12} sm={10}>
            <TextField
              fullWidth
              variant="standard"
              value={this.props.questionnaireUrl}
              InputProps={{ readOnly: true }}
              sx={{ '& .MuiInput-input': { padding: 0 } }}
            />
          </Grid>
        </Grid>
        <div id="questionnaireForm"></div>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={this.saveResponse}
        >
          Save QuestionnaireResponse
        </Button>

        <Divider sx={{ my: 4, borderColor: 'primary.main', borderWidth: 2 }} />

        <Typography variant="h4" component="h2" gutterBottom>
          Task
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={2}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Task source:
            </Typography>
          </Grid>
          <Grid item xs={12} sm={10}>
            <TextField
              fullWidth
              variant="standard"
              value={`${this.props.client.state.serverUrl}/${this.props.fhirContext?.task}`}
              InputProps={{ readOnly: true }}
              sx={{ '& .MuiInput-input': { padding: 0 } }}
            />
          </Grid>
        </Grid>

        <Button 
          variant="contained" 
          sx={{ mb: 3 }}
          onClick={this.taskCompleted}
        >
          Mark Task Completed
        </Button>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">
              Task - ID: {this.state.task?.id}, Status: {this.state.task?.status}, 
              QuestionnaireResponse: { 
                this.state.task?.output?.find(
                  (o) => o.type.coding.find(
                    (c) => c.system === 'http://hl7.org/fhir/uv/sdc/CodeSystem/temp' && c.code === "questionnaire-response")
                  )?.valueReference?.reference ?? 'none'
              }
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre>{JSON.stringify(this.state.task, null, 2)}</pre>
          </AccordionDetails>
        </Accordion>

      </Box>
    );
  }

}
