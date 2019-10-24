import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
import UserMessage from "./components/UserMessage/UserMessage";

// import sample from './sample_questionnaire.json';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      cqlPrepoulationResults: null,
      deviceRequest: null,
      bundle: null,
      logs: [],
      errors: []
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
      // console.log( `cqlResults= `, cqlResults );
    })
  }

  consoleLog(content, type, details=null) {
    let jsonContent = {
        content,
        details,
        type
    }
    this.setState(prevState => ({
        logs: [...prevState.logs, jsonContent]
    }));
    if ( type==="errorClass" ) {
      this.setState(prevState => ({
        errors: [...prevState.errors, jsonContent]
      }));
    }
    // console.log("this.state.logs:", this.state.logs)
    // console.log("this.state.errors:", this.state.errors)
  }

  render() {
    if (this.state.questionnaire && this.state.cqlPrepoulationResults && this.state.bundle){
      return (
        <div className="App">
          <QuestionnaireForm qform = {this.state.questionnaire} cqlPrepoulationResults= {this.state.cqlPrepoulationResults} deviceRequest = {this.state.deviceRequest} bundle = {this.state.bundle} />
        </div>
      );
    }
    else if ( this.state.errors.length > 0 ) {
      let errs = _.map( this.state.errors, 'details');  // new array of only the details
      return (
        <div className="App">
          <UserMessage variant={'danger'}
                        title={'Error!'}
                        message={'An error occurred while processing the request.  You will need to fill out a paper form.'}
                        details={errs} />
        </div>
      );
    }
    else {
      return (
        <p>Loading...</p>
        <Testing logs = {this.state.logs}/>
      )
    }
  }
}

export default hot(module)(App);