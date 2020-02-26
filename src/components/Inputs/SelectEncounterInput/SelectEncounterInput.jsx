import React, { Component } from "react";

import "../../Inputs/TextInput/TextInput.css";
import "../../ComponentStyles.css";
import "./SelectEncounterInput.css";

class SelectEncounterInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      values: [],
      encounterDetails: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.getCurrentEncounterDetails = this.getCurrentEncounterDetails.bind(
      this
    );
    this.getEncounterDetails = this.getEncounterDetails.bind(this);
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

    if (encounterDetails && encounterDetails.performerId) {
      //get the practitioner details
      const q = {
        _id: encounterDetails.performerId
      };

      this.props.smart.patient.api
        .search({ type: "Practitioner", query: q })
        .then(
          response => {
            const data = response.data;
            if (data) {
              const practitionerNames = data.entry[0].resource.name.filter(
                n => n.use === "official"
              );

              if (practitionerNames.length > 0) {
                const practitionerName = practitionerNames[0];
                const displayName = practitionerName
                  ? `Provider: ${practitionerName.prefix} ${practitionerName.given[0]} ${practitionerName.family} `
                  : `Provider: ${encounterDetails.performerId}`;
                this.setState({
                  encounterDetails: {
                    ...encounterDetails,
                    performer: displayName
                  }
                });
              }
            }
          },
          error => console.log(error)
        );
    }

    // select from the drop down will clear the text input
    if (encounterDetails) {
      this.refs.manualInput.value = "";
    }

    this.props.updateCallback(
      this.props.item.linkId,
      this.state.encounterDetails || this.state.value,
      "values"
    );
  }

  getCurrentEncounterDetails(currentEncounter) {
    let encounterDetails =
      currentEncounter && currentEncounter.length > 0
        ? this.getEncounterDetails(currentEncounter[0])
        : null;
    this.setState({ encounterDetails });
    return encounterDetails;
  }

  getEncounterDetails = rawEncounter => {
    const encounter = rawEncounter.encounter;
    let details = {};
    if (encounter) {
      if (encounter.period.end) {
        details.date = `Evaluation date: from ${encounter.period.start.value} to ${encounter.period.end.value}`;
      } else {
        details.date = `Evaluation date: from ${encounter.period.start.value} till now`;
      }
      details.performerId = `${encounter.participant[0].individual.reference.value}`;
      details.type = `Type: ${encounter.type[0].coding[0].display.value}`;
    }
    return details;
  };

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

    const encounterDetails = this.state.encounterDetails;

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
                Medicare for most of the hospital bed orderings. Could not find
                any from the patient's records. Enter one below with the date
                and the provider information.
              </label>
            </div>
          )}
          {currentEncounter && (
            <div className="info-label">
              {encounterDetails && encounterDetails.performer && (
                <div>{encounterDetails && encounterDetails.performer}</div>
              )}
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
