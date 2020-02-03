import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import fetchFhirVersion from "./util/fetchFhirVersion";
import PriorAuthSubmit from "./components/PriorAuthSubmit/PriorAuthSubmit";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
import UserMessage from "./components/UserMessage/UserMessage";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      priorAuthClaim: null,
      cqlPrepoulationResults: null,
      deviceRequest: null,
      bundle: null,
      logs: [],
      errors: []
    };
    this.smart = props.smart;
    this.consoleLog = this.consoleLog.bind(this);
    this.fhirVersion = "unknown";
  }

  componentDidMount() {
    this.consoleLog("fetching artifacts", "infoClass");

    fetchFhirVersion(this.props.smart.server.serviceUrl).then(fhirVersion => {
      this.fhirVersion = fhirVersion;

      fetchArtifacts(
        this.props.FHIR_URI_PREFIX,
        this.props.questionnaireUri,
        this.smart,
        this.props.filepath,
        this.consoleLog
      )
        .then(artifacts => {
          console.log("fetched needed artifacts:", artifacts);

          let fhirWrapper = this.getFhirWrapper(this.fhirVersion);

          this.setState({ questionnaire: artifacts.questionnaire });
          this.setState({ deviceRequest: this.props.deviceRequest });
          // execute for each main library
          return Promise.all(
            artifacts.mainLibraryElms.map(mainLibraryElm => {
              let parameterObj;
              if (this.props.deviceRequest.resourceType === "DeviceRequest") {
                parameterObj = {
                  device_request: fhirWrapper.wrap(this.props.deviceRequest)
                };
              } else if (
                this.props.deviceRequest.resourceType === "ServiceRequest"
              ) {
                parameterObj = {
                  service_request: fhirWrapper.wrap(this.props.deviceRequest)
                };
              }

              const executionInputs = {
                elm: mainLibraryElm,
                // look at main library elms to determine dependent elms to include
                elmDependencies: mainLibraryElm.library.includes.def.map(
                  includeStatement => {
                    return artifacts.dependentElms.find(elm => {
                      return (
                        elm.library.identifier.id == includeStatement.path &&
                        elm.library.identifier.version ==
                          includeStatement.version
                      );
                    });
                  }
                ),
                valueSetDB: {},
                parameters: parameterObj
              };

              // add the required value sets to the valueSetDB
              this.fillValueSetDB(executionInputs, artifacts);

              this.consoleLog("executing elm", "infoClass");
              console.log("executing elm");
              return executeElm(
                this.smart,
                this.fhirVersion,
                this.props.deviceRequest,
                executionInputs,
                this.consoleLog
              );
            })
          );
        })

        .then(cqlResults => {
          this.consoleLog(
            "executed cql, result:" + JSON.stringify(cqlResults),
            "infoClass"
          );
          console.log("executed cql, result:");

          // Collect all library results into a single bundle
          let allLibrariesResults = {};
          let fullBundle = null;
          cqlResults.forEach(libraryResult => {
            // add results to hash indexed by library name
            allLibrariesResults[libraryResult.libraryName] =
              libraryResult.elmResults;

            if (fullBundle == null) {
              fullBundle = libraryResult.bundle;
              // copy entire first bundle");
            } else {
              // add next bundle");
              libraryResult.bundle.entry.forEach(libraryEntry => {
                // search for the entry to see if it is already in the bundle
                let found = false;
                fullBundle.entry.forEach(fullBundleEntry => {
                  if (
                    fullBundleEntry.resource.id === libraryEntry.resource.id &&
                    fullBundleEntry.resource.resourceType ===
                      libraryEntry.resource.resourceType
                  ) {
                    // skip it
                    found = true;
                  }
                });

                // add the entry into the full bundle
                if (!found) {
                  fullBundle.entry.push(libraryEntry);
                }
              });
            }
          });
          console.log(fullBundle);
          this.setState({ bundle: fullBundle });
          this.setState({ cqlPrepoulationResults: allLibrariesResults });
        });
    });
  }

  getFhirWrapper(fhirVersion) {
    if (fhirVersion == "r4") {
      return cqlfhir.FHIRWrapper.FHIRv400();
    } else if (fhirVersion == "stu3") {
      return cqlfhir.FHIRWrapper.FHIRv300();
    } else if (fhirVersion == "dstu2") {
      return cqlfhir.FHIRWrapper.FHIRv200();
    } else if (fhirVersion == "dstu1") {
      return cqlfhir.FHIRWrapper.FHIRv100();
    } else {
      console.log("ERROR: unknown FHIR version");
      return null;
    }
  }

  // fill the valueSetDB in executionInputs with the required valuesets from their artifact source
  fillValueSetDB(executionInputs, artifacts) {
    // create list of all ELMs that will be used
    let allElms = executionInputs.elmDependencies.slice();
    allElms.push(executionInputs.elm);

    // iterate over all elms
    allElms.forEach(elm => {
      // leave if this elm has no value set references
      if (elm.library.valueSets == null) return;

      // iterate over valueSet definitions
      elm.library.valueSets.def.forEach(valueSetDef => {
        // find FHIR value set artifact
        let valueSet = artifacts.valueSets.find(
          valueSet => valueSet.id == valueSetDef.id
        );
        if (valueSet != null) {
          // make sure it has an expansion
          if (valueSet.expansion != null) {
            // add all codes to the the value set db. it is a map in a map, where the first layer key
            // is the value set id and second layer key is the value set version. for this purpose we are using un-versioned valuesets
            executionInputs.valueSetDB[valueSet.id] = {};
            executionInputs.valueSetDB[valueSet.id][
              ""
            ] = valueSet.expansion.contains.map(code => {
              return {
                code: code.code,
                system: code.system,
                version: code.version
              };
            });
          } else {
            console.error(
              `Valueset ${valueSet.id} does not have an expansion.`
            );
          }
        } else {
          console.error(`Could not find valueset ${valueSetDef.id}.`);
        }
      });
    });
  }

  consoleLog(content, type, details = null) {
    let jsonContent = {
      content,
      details,
      type
    };
    this.setState(prevState => ({
      logs: [...prevState.logs, jsonContent]
    }));
    if (type === "errorClass") {
      this.setState(prevState => ({
        errors: [...prevState.errors, jsonContent]
      }));
    }
  }

  setPriorAuthClaim(claimBundle) {
    console.log("setting the prior auth claim bundle in app state");
    this.setState({ priorAuthClaim: claimBundle });
  }

  render() {
    if (
      this.state.questionnaire &&
      this.state.cqlPrepoulationResults &&
      this.state.bundle
    ) {
      return (
        <div className="App">
          {this.state.priorAuthClaim ? (
            <PriorAuthSubmit claimBundle={this.state.priorAuthClaim} />
          ) : (
            <QuestionnaireForm
              qform={this.state.questionnaire}
              cqlPrepoulationResults={this.state.cqlPrepoulationResults}
              deviceRequest={this.state.deviceRequest}
              bundle={this.state.bundle}
              setPriorAuthClaim={this.setPriorAuthClaim}
            />
          )}
        </div>
      );
    } else if (this.state.errors.length > 0) {
      let errs = _.map(this.state.errors, "details"); // new array of only the details
      return (
        <div className="App">
          <UserMessage
            variant={"danger"}
            title={"Error!"}
            message={
              "An error occurred while processing the request.  You will need to fill out a paper form."
            }
            details={errs}
          />
        </div>
      );
    } else {
      return (
        <div>
          <p>Loading...</p>
          <Testing logs={this.state.logs} />
        </div>
      );
    }
  }
}

export default hot(module)(App);
