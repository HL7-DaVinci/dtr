import React, { Component } from "react";
import Button from 'react-bootstrap/Button';
import "./App.css";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import sample from './sample_questionnaire.json';
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