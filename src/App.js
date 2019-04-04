import React, { Component } from "react";
import "./App.css";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import sample from './home_oxygen_questionnaire.json';
import sample2 from './sample_questionnaire.json';
class App extends Component {
  render() {
    return (
      <div className="App">
        <QuestionnaireForm qform = {sample} />
      </div>
    );
  }
}

export default App;