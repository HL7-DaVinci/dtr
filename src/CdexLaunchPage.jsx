import { Component } from "react";
import { getClients, getExample } from "./util/util";
import shortid from "shortid";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  List,
  ListItem,
  Divider,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPre = styled('pre')(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  border: `1px solid ${theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  overflow: 'auto',
  whiteSpace: 'pre-wrap'
}));

export default class CdexLaunchPage extends Component {

  constructor(props) {
    super(props);

    this.state = {
      fhirUrl: "",
      launchUrl: localStorage.getItem("lastCdexLaunchUrl") ?? window.origin + "/launch-cdex",
      launchId: "",
      launchIdUrl: "",
      fetchLaunchIdResult: "",
      taskResource: "",
      taskId: "",
      taskResourceError: "",
      saveTaskError: "",
      clients: [],
      prereqChecks: [
        {id: "questionnaire", label: "Questionnaire", status: "Not Checked"},
        {id: "task", label: "Task", status: "Not Checked"}
      ]
    }
    
    // set FHIR URL to last accessed or first in client list
    this.setFhirUrl(localStorage.getItem("lastAccessedServiceUri"));
    if (!this.state.fhirUrl || this.state.fhirUrl.length === 0) {
      getClients((clients) => {
        this.setState({clients: clients});
        if (clients.length > 0) {
          this.setFhirUrl(clients[0].name);
        }
      });
    }
    
    this.setFhirUrl = this.setFhirUrl.bind(this);
    this.setQuestionnaireUrl = this.setQuestionnaireUrl.bind(this);
    this.taskIdChanged = this.taskIdChanged.bind(this);
    this.taskResourceChanged = this.setTaskResource.bind(this);
    this.launchUrlChanged = this.launchUrlChanged.bind(this);
    this.launchIdChanged = this.launchIdChanged.bind(this);
    this.launchIdUrlChanged = this.launchIdUrlChanged.bind(this);
    
    this.fetchTask = this.fetchTask.bind(this);
    this.fetchExampleTask = this.fetchExampleTask.bind(this);
    this.fetchLaunchId = this.fetchLaunchId.bind(this);

    this.saveTask = this.saveTask.bind(this);
    this.checkPrereqs = this.checkPrereqs.bind(this);
    
    this.launch = this.launch.bind(this);
  }

  
  setFhirUrl(newUrl) {
    console.log('setting FHIR URL:', newUrl);
    this.setState({fhirUrl: newUrl});
    localStorage.setItem("lastAccessedServiceUri", newUrl);
    if (!this.state.launchIdUrl || this.state.launchIdUrl.length === 0) {
      this.setState({launchIdUrl: newUrl + "/_services/smart/Launch"});
    }
    if (!this.state.questionnaireUrl || this.state.questionnaireUrl.length === 0) {
      this.setQuestionnaireUrl(newUrl + "/Questionnaire/cdex-questionnaire-example1", newUrl);
    }
  }

  setQuestionnaireUrl(newUrl, newBaseUrl) {
    const fhirUrl = newBaseUrl || this.state.fhirUrl;

    if (!/^https?:\/\//.test(newUrl)) {
      newUrl = fhirUrl + '/' + newUrl.replace(/^\//, '');
      console.log('setting questionnaire URL with FHIR base:', newUrl);
    }

    this.setState({questionnaireUrl: newUrl});

    try {
      if (!!this.state.taskResource && this.state.taskResource.length > 0) {
        const task = JSON.parse(this.state.taskResource);
        const input = (task.input || []).find((i) => { return i.type.coding.find((c) => { return c.code === "questionnaire" && c.system === "http://hl7.org/fhir/uv/sdc/CodeSystem/temp" }) });
        input.valueCanonical = newUrl;
        this.setState({taskResource: JSON.stringify(task, null, 2)});
      }
    } catch (error) {
    }
  }

  setTaskResource(newText) {
    try {
      const task = JSON.parse(newText);
      this.setState({taskId: task.id});
      
      const input = (task.input || []).find((i) => { return i.type.coding.find((c) => { return c.code === "questionnaire" && c.system === "http://hl7.org/fhir/uv/sdc/CodeSystem/temp" }) });
      if (!!input?.valueCanonical) {
        this.setQuestionnaireUrl(input.valueCanonical);
      }
    } catch (error) {
    }
    this.setState({taskResource: newText});
  }

  taskIdChanged(event) {
    const newId = event.target.value;
    this.setState({taskId: newId});

    try {
      const task = JSON.parse(this.state.taskResource);
      task.id = newId;
      this.setState({taskResource: JSON.stringify(task, null, 2)}); 
    } catch (error) {
    }
  }

  launchUrlChanged(event) {
    const newUrl = event.target.value;
    this.setState({launchUrl: newUrl});
    localStorage.setItem("lastCdexLaunchUrl", newUrl);
  }

  launchIdChanged(event) {
    this.setState({launchId: event.target.value});
  }

  launchIdUrlChanged(event) {
    this.setState({launchIdUrl: event.target.value});
  }

  fetchTask() {
    this.setState({taskResourceError: ""});

    if (!this.state.taskId || this.state.taskId.length < 1) {
      this.setState({taskResourceError: {error: 'No Task ID specified'}});
      return;
    }

    fetch(`${this.state.fhirUrl}/Task/${this.state.taskId}`).then(async (response) => {
      if (response.ok) {
        const task = await response.json();
        if (task.resourceType !== "Task") {
          this.setState({taskResourceError: {error: 'resourceType is not Task'}});
        } else {
          this.setTaskResource(JSON.stringify(task, null, 2));
        }
      }
      else {
        console.error('Failed to fetch task:', response);
        this.setState({taskResourceError: {status: response.status, response: await response.json()}});
      }
    }).catch((error) => {
      console.error('Failed to fetch task:', error);
      this.setState({taskResourceError: {error: error?.toString()}});
    });
  }

  fetchExampleTask() {
    getExample("cdex-task-example.json", (example) => {
      
      const newId = shortid.generate().replace(/[^a-zA-Z0-9]/g, '');
      example.id = newId;
      example.input[0].valueCanonical = this.state.questionnaireUrl;
      
      this.setTaskResource(JSON.stringify(example, null, 2));
    });
  }


  fetchLaunchId() {

    this.setState({fetchLaunchIdResult: ""});

    const body = {
      launchUrl: this.state.launchUrl,
      parameters: {
        fhirContext: JSON.stringify({
          task: `Task/${this.state.taskId}`
        })
      }
    }

    fetch(
      this.state.launchIdUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    ).then(async (response) => {
      const body = await response.json();
      if (response.ok) {
        this.setState({fetchLaunchIdResult: body});
        if (!!body.launch_id) {
          this.setState({launchId: body.launch_id});
        } else {
          console.error('No "launch_id" in response:', body);
          this.setState({fetchLaunchIdResult: {error: 'No "launch_id" in response'}});
        }
      }
      else {
        console.error('Failed to fetch launch ID:', response);
        this.setState({fetchLaunchIdResult: {status: response.status, response: body}});
      }
    }).catch((error) => {
      console.error('Failed to fetch launch ID:', error);
      this.setState({fetchLaunchIdResult: {error: error?.toString()}});
    });
  }

  saveTask() {

    this.setState({saveTaskError: ""});
    
    fetch(
      `${this.state.fhirUrl}/Task/${this.state.taskId}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: this.state.taskResource }
    ).then(async (response) => {
      const body = await response.json();
      if (response.ok) {
        console.log('Task saved:', response);
      }
      else {
        console.error('Failed to save task:', response);
        this.setState({saveTaskError: {status: response.status, response: body}});
      }
    }).catch((error) => {
      console.error('Failed to save task:', error);
      this.setState({saveTaskError: {error: error?.toString()}});
    });
  }


  checkPrereqs() {
    const checks = this.state.prereqChecks;
    checks.forEach((check) => {
      check.status = "Pending";
    });
    this.setState({prereqChecks: checks});

    const checkQuestionnaire = (this.state.questionnaireUrl?.length > 0) ? fetch(this.state.questionnaireUrl).then(async (response) => {
      if (response.ok) {
        const questionnaire = await response.json();
        if (questionnaire.resourceType === "Questionnaire") {
          checks.find((c) => { return c.id === "questionnaire" }).status = "Found";
        } else {
          checks.find((c) => { return c.id === "questionnaire" }).status = "Error: resourceType is not Questionnaire";
        }
      } else {
        checks.find((c) => { return c.id === "questionnaire" }).status = "Not Found";
      }
    }).catch((error) => {
      console.error('Failed to check questionnaire:', error);
      checks.find((c) => { return c.id === "questionnaire" }).status = "Error: " + error;
    }) : checks.find((c) => { return c.id === "questionnaire" }).status = "Error: no Questionnaire URL specified";
    
    const checkTask = (this.state.taskId?.length > 0) ? fetch(`${this.state.fhirUrl}/Task/${this.state.taskId}`).then(async (response) => {
      if (response.ok) {
      const task = await response.json();
        if (task.resourceType === "Task") {
          checks.find((c) => { return c.id === "task" }).status = "Found";
        } else {
          checks.find((c) => { return c.id === "task" }).status = "Error: resourceType is not Task";
        }
      }
      else {
        checks.find((c) => { return c.id === "task" }).status = "Not Found";
      }
    }).catch((error) => {
      console.error('Failed to check task:', error);
      checks.find((c) => { return c.id === "task" }).status = "Error: " + error;
    }) : checks.find((c) => { return c.id === "task" }).status = "Error: no Task ID specified";

    Promise.all([checkQuestionnaire, checkTask]).then(() => {
      this.setState({prereqChecks: checks});
    });

  }

  launch() {
    const launchUrl = `${this.state.launchUrl}?iss=${this.state.fhirUrl}&launch=${this.state.launchId}`;
    console.log('launching:', launchUrl);

    window.open(launchUrl, '_blank');
  }
  

  render() {
    return(
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3">CDex Questionnaire as Task Input</Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          This form will guide you in the process of initiating a DTR launch following 
          the <a href="https://build.fhir.org/ig/HL7/davinci-ecdx/task-based-approach.html#using-da-vinci-dtr-to-complete-the-questionnaire" target="_blank">
          CDex Questionnaire as Task Input</a> flow.
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              FHIR Server
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This is the FHIR server that will store the Task and QuestionnaireResponse resources.
            </Typography>
            <TextField
              fullWidth
              label="Data Source Base FHIR URL"
              value={this.state.fhirUrl}
              onChange={(e) => {this.setFhirUrl(e.target.value)}}
              variant="outlined"
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Questionnaire
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Full URL for the Questionnaire to use as the Task input. (<em>Task.input.type.coding.valueCanonical</em> property)
            </Typography>
            <TextField
              fullWidth
              label="Questionnaire URL"
              value={this.state.questionnaireUrl}
              onChange={(e) => {this.setQuestionnaireUrl(e.target.value)}}
              variant="outlined"
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Task
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use an existing task ID on the FHIR server or create a new Task, save it to the server, and use that as the task ID for the launch.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Task ID"
                value={this.state.taskId}
                onChange={this.taskIdChanged}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">{this.state.fhirUrl}/Task/</InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button variant="contained" onClick={this.fetchTask}>
                          Load Task
                        </Button>
                      </InputAdornment>
                    )
                  }
                }}
                variant="outlined"
              />
              {this.state.taskResourceError && this.state.taskResourceError.length > 0 && (
                <StyledPre>
                  {JSON.stringify(this.state.taskResourceError, null, 2)}
                </StyledPre>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Task FHIR Resource"
                value={this.state.taskResource}
                onChange={(e) => {this.setTaskResource(e.target.value)}}
                multiline
                rows={10}
                variant="outlined"
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button variant="contained" onClick={this.fetchExampleTask}>
                  Load Example Task
                </Button>
                <Button variant="contained" onClick={this.saveTask}>
                  Save Task to FHIR Server
                </Button>
              </Box>
              {this.state.saveTaskError && this.state.saveTaskError.length > 0 && (
                <StyledPre>
                  {JSON.stringify(this.state.saveTaskError, null, 2)}
                </StyledPre>
              )}
            </Box>
          </CardContent>
        </Card>

        <Divider sx={{ my: 4 }} />

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Check Launch Prerequisites
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Check that the resources exist before retrieving a launch ID.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={3}>
                <Button 
                  variant="contained" 
                  onClick={this.checkPrereqs}
                  fullWidth
                >
                  Check Prerequisites
                </Button>
              </Grid>
              <Grid size={9}>
                <Box sx={{ width: '100%' }}>
                  <List sx={{ width: '100%', p: 0 }}>
                    {this.state.prereqChecks.map((check) => {
                      const getColor = (status) => {
                        if (status === 'Not Found' || status.startsWith('Error:')) return 'error';
                        if (status === 'Found') return 'success';
                        if (status === 'Pending') return 'info';
                        return 'warning';
                      };
                      
                      return (
                        <ListItem key={check.id} sx={{ px: 0, py: 1 }}>
                          <Alert severity={getColor(check.status)} sx={{ width: '100%' }}>
                            <Typography variant="h6" component="div">
                              {check.label}
                            </Typography>
                            <Typography variant="body2">
                              {check.status}
                            </Typography>
                          </Alert>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ my: 4 }} />

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              DTR Launch
            </Typography>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Launch URL"
                value={this.state.launchUrl}
                onChange={this.launchUrlChanged}
                variant="outlined"
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Launch ID"
                  value={this.state.launchId}
                  onChange={this.launchIdChanged}
                  variant="outlined"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Get Launch ID from Service"
                  value={this.state.launchIdUrl}
                  onChange={this.launchIdUrlChanged}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button variant="contained" onClick={this.fetchLaunchId}>
                            Get Launch ID
                          </Button>
                        </InputAdornment>
                      )
                    }
                  }}
                  variant="outlined"
                />
                {this.state.fetchLaunchIdResult && this.state.fetchLaunchIdResult.length > 0 && (
                  <StyledPre>
                    {JSON.stringify(this.state.fetchLaunchIdResult, null, 2)}
                  </StyledPre>
                )}
              </Grid>
            </Grid>

            <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', margin: 0 }}>
                Launch URL: {`${this.state.launchUrl}?iss=${this.state.fhirUrl}&launch=${this.state.launchId}`}
              </Typography>
            </Paper>
            
            <Button 
              variant="contained" 
              size="large" 
              onClick={this.launch}
              sx={{ py: 2 }}
            >
              Launch DTR
            </Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

}
