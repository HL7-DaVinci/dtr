import React, { Component } from "react";
import { hot } from "react-hot-loader";
import Button from 'react-bootstrap/Button';
import "./App.css";

class App extends Component {
  render() {
    return (
      <div className="App">
        <Button variant="primary">Primary</Button>
        <h1> Hello, World! </h1>
      </div>
    );
  }
}

export default hot(module)(App);