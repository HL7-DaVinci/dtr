import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
// import sample from './sample_questionnaire.json';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      cqlPrepoulationResults: null,
      deviceRequest: null,
      bundle: null,
      logs: []
    }
    this.smart = props.smart;
    this.consoleLog = this.consoleLog.bind(this);
  }

  componentDidMount(){
    const fhirWrapper = cqlfhir.FHIRWrapper.FHIRv300();
    this.consoleLog("fetching artifacts", "infoClass");
    fetchArtifacts(this.props.FHIR_URI_PREFIX, this.props.questionnaireUri, this.smart, this.props.filepath, this.consoleLog)
    .then(artifacts => {
      console.log("fetched needed artifacts:", artifacts)
      this.setState({questionnaire: artifacts.questionnaire})
      this.setState({deviceRequest: this.props.deviceRequest})
      const executionInputs = {
        elm: artifacts.mainLibraryElm,
        elmDependencies: artifacts.dependentElms,
        valueSetDB: {},
        parameters: {device_request: fhirWrapper.wrap(this.props.deviceRequest)}
      }
      this.consoleLog("executing elm", "infoClass");
      return executeElm(this.smart, "stu3", executionInputs, this.consoleLog);
    })
    .then(cqlResults => {
      this.consoleLog("executed cql, result:"+JSON.stringify(cqlResults),"infoClass");
      this.setState({bundle: cqlResults.bundle})
      this.setState({cqlPrepoulationResults: cqlResults.elmResults})
    });
  }

  consoleLog(content, type) {
    let jsonContent = {
        content: content,
        type: type
    }
    this.setState(prevState => ({
        logs: [...prevState.logs, jsonContent]
    }))
   }

  render() {
    if (this.state.questionnaire && this.state.cqlPrepoulationResults && this.state.bundle){
      return (
        <div className="App">
          <QuestionnaireForm qform = {this.state.questionnaire} cqlPrepoulationResults= {this.state.cqlPrepoulationResults} deviceRequest = {this.state.deviceRequest} bundle = {this.state.bundle} />
        </div>
      );
    } else {
      return (
        <div className="App">
            <p>Loading...</p>
            <Testing logs = {this.state.logs}/>
        </div>
      );
    }
  }
}

export default hot(module)(App);