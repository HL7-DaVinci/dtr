import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
// import sample from './sample_questionnaire.json';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      cqlPrepoulationResults: null,
      deviceRequest: null,
      bundle: null
    }
    this.smart = props.smart;
  }

  componentDidMount(){
    const fhirWrapper = cqlfhir.FHIRWrapper.FHIRv300();
    fetchArtifacts(this.props.FHIR_URI_PREFIX, this.props.questionnaireUri, this.smart, this.props.deviceRequestUri)
    .then(artifacts => {
      console.log("fetched needed artifacts:", artifacts)
      this.setState({questionnaire: artifacts.questionnaire})
      this.setState({deviceRequest: artifacts.deviceRequest})
      const executionInputs = {
        elm: artifacts.mainLibraryElm,
        elmDependencies: artifacts.dependentElms,
        valueSetDB: {},
        parameters: {device_request: fhirWrapper.wrap(artifacts.deviceRequest)}
      }
      return executeElm(this.smart, "stu3", executionInputs);
    })
    .then(cqlResults => {
      console.log("executed cql, result:", cqlResults);
      this.setState({bundle: cqlResults.bundle})
      this.setState({cqlPrepoulationResults: cqlResults.elmResults})
    });
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
        </div>
      );
    }
  }
}

export default hot(module)(App);