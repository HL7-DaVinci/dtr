import React, { Component } from "react";
import { getClients, getExample } from "./util/util";
import shortid from "shortid";
import UserMessage from "./components/UserMessage/UserMessage";

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
    this.setState({fhirUrl: newUrl});
    localStorage.setItem("lastAccessedServiceUri", newUrl);
    if (!this.state.launchIdUrl || this.state.launchIdUrl.length === 0) {
      this.setState({launchIdUrl: newUrl + "/_services/smart/Launch"});
    }
    if (!this.state.questionnaireUrl || this.state.questionnaireUrl.length === 0) {
      this.setQuestionnaireUrl(this.state.fhirUrl + "/Questionnaire/cdex-questionnaire-example1");
    }
  }

  setQuestionnaireUrl(newUrl) {
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
      <div>

        <p>
          This form will guide you in the process of initiating a DTR launch following 
          the <a href="https://build.fhir.org/ig/HL7/davinci-ecdx/task-based-approach.html#using-da-vinci-dtr-to-complete-the-questionnaire" target="_blank">
          CDex Questionnaire as Task Input</a> flow.
        </p>

        <h2>FHIR Server</h2>
        <p>This is the FHIR server that will store the Task and QuestionnaireResponse resources.</p>
        <div className="mb-3">
          <label htmlFor="fhirUrl" className="form-label">Data Source Base FHIR URL</label>
          <input type="text" id="fhirUrl" className="form-control" value={this.state.fhirUrl} onChange={(e) => {this.setFhirUrl(e.target.value)}} />
        </div>

        <h2>Questionnaire</h2>
        <p>Full URL for the Questionnaire to use as the Task input. (<em>Task.input.type.coding.valueCanonical</em> property)</p>
        <div className="mb-3">
          <label htmlFor="questionnaireUrl" className="form-label">Questionnaire URL</label>
          <input type="text" id="questionnaireUrl" className="form-control" value={this.state.questionnaireUrl} onChange={(e) => {this.setQuestionnaireUrl(e.target.value)}} />
        </div>

        <h2>Task</h2>
        <p>Use an existing task ID on the FHIR server or create a new Task, save it to the server, and use that as the task ID for the launch.</p>
        <div className="mb-3">
          <label htmlFor="taskId" className="form-label">Task ID</label>
          <div className="input-group">
            <span className="input-group-text">{this.state.fhirUrl}/Task/</span>
            <input type="text" id="taskId" className="form-control" value={this.state.taskId} onChange={this.taskIdChanged} />
            <button className="btn btn-primary" onClick={this.fetchTask}>Load Task</button>
          </div>
          <pre hidden={ !this.state.taskResourceError || this.state.taskResourceError.length < 1 } className="bg-body-tertiary border rounded-3">{ JSON.stringify(this.state.taskResourceError, null, 2) }</pre>
        </div>

        <div className="mb-3">
          <label htmlFor="taskResource" className="form-label">Task FHIR Resource</label>
          <textarea id="taskResource" className="form-control" rows="10" value={this.state.taskResource} onChange={(e) => {this.setTaskResource(e.target.value)}}></textarea>
          <div className="d-flex justify-content-between mt-1">
            <button className="btn btn-primary" onClick={this.fetchExampleTask}>Load Example Task</button>
            <button className="btn btn-primary" onClick={this.saveTask}>Save Task to FHIR Server</button>
          </div>
          <pre hidden={ !this.state.saveTaskError || this.state.saveTaskError.length < 1 } className="bg-body-tertiary border rounded-3">{ JSON.stringify(this.state.saveTaskError, null, 2) }</pre>
        </div>

        <hr className="border border-5 border-primary" />

        <h2>Check Launch Prerequisites</h2>
        <p>Check that the resources exist before retrieving a launch ID.</p>
        <div className="mb-3 row">
          <div className="col-2">
            <button className="btn btn-primary" onClick={this.checkPrereqs}>Check Prerequisites</button>
          </div>
          <div className="col-10">
            <ul class="list-group">
              {this.state.prereqChecks.map((check) => {
                return <li className={
                  "list-group-item list-group-item-" + (check.status === 'Not Found' || check.status.startsWith('Error:') ? 'danger' : check.status === 'Found' ? 'success' : check.status === 'Pending' ? 'info' : 'warning')
                } key={check.id}>
                    <h5>{check.label}</h5>
                    <small>{check.status}</small>
                  </li>
              })}
            </ul>
          </div>
        </div>

        <hr className="border border-5 border-primary" />

        <h2>DTR Launch</h2>

        <div className="mb-3">
          <label htmlFor="launchUrl" className="form-label">Launch URL</label>
          <input type="text" id="launchUrl" className="form-control" value={this.state.launchUrl} onChange={this.launchUrlChanged} />
        </div>

        <div className="mb-3 row">
          <div className="col-6">
            <label htmlFor="launchId" className="form-label">Launch ID</label>
            <input type="text" id="launchId" className="form-control" value={this.state.launchId} onChange={this.launchIdChanged} />
          </div>

          <div className="mb-3 col-6">
            <label htmlFor="launchId" className="form-label">Get Launch ID from Service</label>
            <div className="input-group mb-1">
              <input type="text" id="launchId" className="form-control" value={this.state.launchIdUrl} onChange={this.launchIdUrlChanged} />
              <button className="btn btn-primary" type="button" onClick={this.fetchLaunchId}>Get Launch ID</button>
            </div>
            <pre hidden={ !this.state.fetchLaunchIdResult || this.state.fetchLaunchIdResult.length < 1 } className="bg-body-tertiary border rounded-3">{ JSON.stringify(this.state.fetchLaunchIdResult, null, 2) }</pre>
          </div>
        </div>

        <div>
          <pre>Launch URL: {`${this.state.launchUrl}?iss=${this.state.fhirUrl}&launch=${this.state.launchId}` }</pre>
        </div>
        <button className="btn btn-primary my-3" onClick={this.launch}>Launch DTR</button>

      </div>
    )
  }

}
