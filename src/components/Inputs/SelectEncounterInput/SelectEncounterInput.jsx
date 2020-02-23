import React, { Component } from "react";

import "../../Inputs/TextInput/TextInput.css";
import "../../ComponentStyles.css";
import "./SelectEncounterInput.css";

class SelectEncounterInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      values: []
    };
    this.handleChange = this.handleChange.bind(this);
    this.getCurrentEncounterDetails = this.getCurrentEncounterDetails.bind(
      this
    );
  }

  componentDidMount() {
    const value = this.props.retrieveCallback(this.props.item.linkId);
    let listOfEncounter = value.map(encounter => {
      return {
        name: encounter.id.value,
        id: encounter.id.value,
        encounter
      };
    });
    this.setState({ values: listOfEncounter });
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
    const currentEncounter = this.state.values.filter(
      value => value.id === event.target.value
    );
    const encounterDetails = this.getCurrentEncounterDetails(currentEncounter);
    // select from the drop down will clear the text input
    if (encounterDetails) {
      this.refs.manualInput.value = "";
    }

    this.props.updateCallback(
      this.props.item.linkId,
      encounterDetails || this.state.value,
      "values"
    );
  }

  getCurrentEncounterDetails(currentEncounter) {
    const encounterDetails =
      currentEncounter && currentEncounter.length > 0
        ? {
            performer: `Practitioner: ${currentEncounter[0].encounter.participant[0].individual.display.value}`,
            date: `Evaluation date: from ${currentEncounter[0].encounter.period.start.value} to ${currentEncounter[0].encounter.period.end.value}`,
            type: `Type: ${currentEncounter[0].encounter.type[0].coding[0].display.value}`
          }
        : null;
    return encounterDetails;
  }

  render() {
    let optionTemplate = this.state.values.map(v => (
      <option value={v.id} key={v.id}>
        Encounter {v.name}
      </option>
    ));
    //get the current selected encounter
    const currentEncounter = this.state.values.filter(
      value => value.id === this.state.value
    );
    const encounterDetails = this.getCurrentEncounterDetails(currentEncounter);

    return (
      <div>
        <div>
          {optionTemplate.length > 0 ? (
            <div className="dropdown-input">
              <select value={this.state.value} onChange={this.handleChange}>
                <option value="" defaultValue>
                  Pick one encounter or enter below
                </option>
                {optionTemplate}
              </select>
            </div>
          ) : (
            <div className="info-label">
              <label>
                A Face-to-Face (F2F) encounter within 6 months is required by
                Medicare for most of the hospital bed orderings. Could not find any
                from the patient's records. Enter one below with the date and
                the provider information.
              </label>
            </div>
          )}
          {currentEncounter && (
            <div className="info-label">
              <div>{encounterDetails && encounterDetails.performer}</div>
              <div>{encounterDetails && encounterDetails.type}</div>
              <div>{encounterDetails && encounterDetails.date}</div>
            </div>
          )}
        </div>
        <div className="header-input">
          <label>Other qualified Face-to-Face evaluation:</label>
        </div>
        <div className="text-input">
          <textarea
            className="text-input-box"
            ref="manualInput"
            onChange={this.handleChange}
          ></textarea>
        </div>
      </div>
    );
  }
}

export default SelectEncounterInput;
