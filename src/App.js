import React, { Component } from "react";
import ReactDOM from 'react-dom'
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import fetchFhirVersion from "./util/fetchFhirVersion";
import PriorAuth from "./components/PriorAuth/PriorAuth";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
import UserMessage from "./components/UserMessage/UserMessage";
import TaskPopup from "./components/Popup/TaskPopup";

// uncomment for testing UserMessage
// let sampleError = {
//   annotation: [
//     {
//       startLine: 74,
//       startChar: 11,
//       endLine: 74,
//       endChar: 48,
//       message: "Could not resolve type name Diagnosis.",
//       errorType: "semantic",
//       errorSeverity: "error",
//       type: "CqlToElmError"
//     }
//   ]
// };

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      priorAuthClaim: null,
      cqlPrepopulationResults: null,
      deviceRequest: null,
      bundle: null,
      filter: true,
      tasks: false,
      showPopup: true,
      showOverlay: false,
      attested: [],
      logs: [],
      errors: [
        // uncomment the following for testing UserMessage, in normal operations, this is an empty array
        // {
        //   content: "error for testing",
        //   details: sampleError,
        //   infoClass: "error"
        // }
      ]
    };
    this.smart = props.smart;
    this.consoleLog = this.consoleLog.bind(this);
    this.fhirVersion = "unknown";
    this.renderButtons = this.renderButtons.bind(this);
  }

  componentDidMount() {
    this.consoleLog("fetching artifacts", "infoClass");
    fetchFhirVersion(this.props.smart.state.serverUrl)
    .then(fhirVersion => {
      this.fhirVersion = fhirVersion;

      fetchArtifacts(
        this.props.FHIR_PREFIX,
        this.props.FILE_PREFIX,
        this.props.questionnaireUri,
        this.fhirVersion,
        this.smart,
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
              } else if (this.props.deviceRequest.resourceType === "MedicationRequest") {
                parameterObj = {
                  medication_request: fhirWrapper.wrap(this.props.deviceRequest)
                };
              } else if (this.props.deviceRequest.resourceType === "MedicationDispense") {
                parameterObj = {
                  medication_dispense: fhirWrapper.wrap(this.props.deviceRequest)
                };
              }

              const executionInputs = {
                elm: mainLibraryElm,
                // look at main library elms to determine dependent elms to include
                elmDependencies: mainLibraryElm.library.includes.def.map(
                  includeStatement => {
                    let foundLibrary = artifacts.dependentElms.find(elm => {
                      return (
                        elm.library.identifier.id == includeStatement.path &&
                        elm.library.identifier.version ==
                          includeStatement.version
                      );
                    });
                    if (foundLibrary != null) {
                      return foundLibrary;
                    } else {
                      this.consoleLog(`Could not find library ${includeStatement.path}. Check if it is referenced in FHIR Library (${mainLibraryElm.library.identifier.id}) properly.`, `errorClass`)
                    }
                  }
                ),
                valueSetDB: {},
                parameters: parameterObj,
                mainLibraryMaps: artifacts.mainLibraryMaps
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
          this.setState({ cqlPrepopulationResults: allLibrariesResults });
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
          valueSet => valueSet.id == valueSetDef.id || valueSet.url == valueSetDef.id
        );
        if (valueSet != null) {
          // make sure it has an expansion
          if (valueSet.expansion != null) {
            // add all codes to the the value set db. it is a map in a map, where the first layer key
            // is the value set id and second layer key is the value set version. for this purpose we are using un-versioned valuesets
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][
              ""
            ] = valueSet.expansion.contains.map(code => {
              return {
                code: code.code,
                system: code.system,
                version: code.version
              };
            });
          } else {
            this.consoleLog(`Valueset ${valueSet.id} does not have an expansion.`, 'errorClass');
          }
        } else {
          this.consoleLog(`Could not find valueset ${valueSetDef.id}. Try reloading with VSAC credentials in CRD.`, 'errorClass');
        }
      });
    });
  }

  consoleLog(content, type, details = null) {
    if (details == null) {
      console.log(content, type);
    } else {
      console.log(content, type, details);
    }
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
    this.setState({ priorAuthClaim: claimBundle });
  }

  getQuestionByName(question) {
      //question should be the HTML node
      const temp = question.getElementsByClassName("lf-item-code ng-hide")[0].innerText.trim();
      const linkId = temp.substring(1, temp.length-1);
      const questionName = question.children[0].innerText;
      const header = question.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.children[0].children[0].innerText;
      return linkId;
  }



  setAttested(icon, linkId) {
    this.setState({ attested: [...this.state.attested, linkId] }) //simple value
    icon.className='fas fa-check';
    icon.onclick = () => {
        this.removeAttested(icon, linkId);
    };
  }

  removeAttested(icon, linkId) {
    this.setState({attested: this.state.attested.filter(function(id) { 
        return id !== linkId
    })});
    icon.className='fas fa-clipboard';
    icon.onclick = () => {
        this.setAttested(icon, linkId);
    };
  }
  setTasks() { 
      if(!this.state.tasks) {
        const questions = Array.from(document.querySelectorAll(`[ng-click="setActiveRow(item)"]:not(.lf-section-header)`));

            questions.map((q)=>{
                var node = document.createElement("div");
                node.className = "task-input draft"
                const linkId = this.getQuestionByName(q);
                if(this.state.attested && this.state.attested.find((e)=>{return e==linkId})){
                    const icon = document.createElement('i');
                    icon.className='fas fa-check';
                    node.appendChild(icon);
                    icon.onclick = () => {
                        this.removeAttested(icon, linkId);
                    };
                } else {
                    const icon = document.createElement('i');
                    icon.className='fas fa-clipboard';
                    node.appendChild(icon);
                    icon.onclick = () => {
                        this.setAttested(icon, linkId);
                    };
                }

                node.className = "task-input"

                q.children[0].children[0].appendChild(node)
              })
              this.setState({tasks: true});

      } else {
          const tasks = Array.from(document.getElementsByClassName('task-input'))
          tasks.map((task) => {
              task.remove();
          })
          this.setState({tasks: false});
      }
  }

  filter() {
      var items = Array.from(document.getElementsByClassName("ng-not-empty"));
      var sections = Array.from(document.getElementsByClassName("section"));
      var empty = Array.from(document.getElementsByClassName("ng-empty"));

      items.map((element) => {
          // filter all not-empty items
          if(element.tagName === "INPUT") { 
            element.closest('.lf-table-item').hidden=this.state.filter;
          }
      });

      sections.map((element) => {
        if(!element.querySelector(".ng-empty")) {
            // filter out sections without any empty items
            element.parentElement.hidden=this.state.filter;
        } else {
            // deals with case where the only empty question
            // is a disabled question.
            // though the disabled question is hidden, the empty
            // section remains because of it.
            if(element.querySelector(".ng-empty:not([disabled])")===null) { 
                element.parentElement.hidden=this.state.filter;
            };
        }
      });

      empty.map((element) => {
        if(element.type === "checkbox") {
            // we make an exception for checkboxes we've touched
            // a checked checkbox that we've unchecked can be filtered out, despite
            // having the "empty" class.
            const d = Array.from(element.classList);
            if( d.includes("ng-touched")) {
                element.closest('.lf-table-item').hidden=this.state.filter;
            }
        }
        // we don't want to show disabled items in the filtered view
        if(element.disabled) {
            element.closest('.lf-table-item').hidden=this.state.filter;
        }

      });

      this.setState({filter: !this.state.filter})
  }

  renderButtons(ref) {
    const element = (<div><div><TaskPopup smart = {this.smart} />
    <div className="task-button">
        <label>Attestation</label>  <input type="checkbox" onChange={()=>{this.setTasks()}}></input>
    </div>
    <div className="task-button">
        <label>Filter</label>  <input type="checkbox" onChange={()=>{this.filter()}}></input>
    </div></div></div>)
    ReactDOM.render(element, ref);
  }

  render() {
    // set up messages, if any are needed
    let messages;
    if (this.state.errors.length > 0) {
      let errs = _.map(this.state.errors, "details"); // new array of only the details
      messages = (
        <UserMessage
          variant={"warning"}
          title={"Warning!"}
          message={
            "Problems(s) occurred while prefilling this request.  You will need to manually fill out the necessary information."
          }
          details={errs}
        />
      );
    }

    if (
      this.state.questionnaire &&
      this.state.cqlPrepopulationResults &&
      this.state.bundle
    ) {
      return (
          <div>
        <div className="App">
          {messages}
          {/* <TextField
            margin="normal"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
            label="Enter Name"
          /> */}
          <div 
            className={"overlay " + (this.state.showOverlay ? 'on' : 'off')}
            onClick={()=>{console.log(this.state.showOverlay); this.toggleOverlay()}}
          >

          </div>
          {this.state.priorAuthClaim ? (
            <PriorAuth claimBundle={this.state.priorAuthClaim} />
          ) : (
            <QuestionnaireForm
              qform={this.state.questionnaire}
              cqlPrepopulationResults={this.state.cqlPrepopulationResults}
              deviceRequest={this.state.deviceRequest}
              bundle={this.state.bundle}
              attested={this.state.attested}
              priorAuthReq={this.props.priorAuthReq === "true" ? true : false}
              setPriorAuthClaim={this.setPriorAuthClaim.bind(this)}
              fhirVersion={this.fhirVersion.toUpperCase()}
              smart={this.smart}
              FHIR_PREFIX={this.props.FHIR_PREFIX}
              renderButtons={this.renderButtons}
            />
          )}
        </div>
        </div>
      );
    } else {
      return (
        <div className="App">
          <p>Loading...</p>
          <Testing logs={this.state.logs} />
        </div>
      );
    }
  }
}

export default hot(module)(App);
