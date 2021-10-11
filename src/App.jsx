import React, { Component } from "react";
import ReactDOM from 'react-dom'
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import fetchFhirVersion from "./util/fetchFhirVersion";
import { buildFhirUrl } from "./util/util";
import PriorAuth from "./components/PriorAuth/PriorAuth";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
import UserMessage from "./components/UserMessage/UserMessage";
import TaskPopup from "./components/Popup/TaskPopup";
import PatientSelect from "./components/PatientSelect/PatientSelect";

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

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      response: null,
      priorAuthClaim: null,
      cqlPrepopulationResults: null,
      deviceRequest: null,
      bundle: null,
      filter: true,
      filterChecked: true,
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
      ],
      allFieldsFilled: false,
      isAdaptiveFormWithoutExtension: false
    };
    this.smart = props.smart;
    this.patientId = props.patientId;
    this.appContext = props.appContext;
    this.consoleLog = this.consoleLog.bind(this);
    this.fhirVersion = "unknown";
    this.renderButtons = this.renderButtons.bind(this);
    this.ehrLaunch = this.ehrLaunch.bind(this);
    this.standaloneLaunch = this.standaloneLaunch.bind(this);
    this.filter = this.filter.bind(this);
    this.onFilterCheckboxRefChange = this.onFilterCheckboxRefChange.bind(this);
  }

  componentDidMount() {
      if(!this.props.standalone) {
          this.ehrLaunch();
      }
  }

  standaloneLaunch(patient, response) {
      const template = `Questionnaire/${response.questionnaire}`;
      fetchFhirVersion(this.props.smart.state.serverUrl)
      .then(fhirVersion => {
        this.fhirVersion = fhirVersion;
        const questionnaireUrl = buildFhirUrl(template, this.props.FHIR_PREFIX, this.fhirVersion);
        fetch(questionnaireUrl).then(r => r.json())
        .then(questionnaire => {
            this.setState({ questionnaire: questionnaire });
            this.setState({ response: response});
        });
      });
  }

  updateQuestionnaire(updatedQuestionnaire) {
    this.setState({ questionnaire: updatedQuestionnaire });
  }

  ehrLaunch() {
    const deviceRequest = JSON.parse(this.appContext.request.replace(/\\/g,""));
    this.consoleLog("fetching artifacts", "infoClass");
    fetchFhirVersion(this.props.smart.state.serverUrl)
    .then(fhirVersion => {
      this.fhirVersion = fhirVersion;

      fetchArtifacts(
        this.props.FHIR_PREFIX,
        this.props.FILE_PREFIX,
        this.appContext.template,
        this.fhirVersion,
        this.smart,
        this.consoleLog
      )
        .then(artifacts => {
          console.log("fetched needed artifacts:", artifacts);

          let fhirWrapper = this.getFhirWrapper(this.fhirVersion);

          this.setState({ questionnaire: artifacts.questionnaire });
          this.setState({ deviceRequest: deviceRequest });
          this.setState({ isAdaptiveFormWithoutExtension: artifacts.questionnaire.meta.profile.includes("http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-adapt") && artifacts.questionnaire.extension === undefined });
          // execute for each main library
          return Promise.all(
            artifacts.mainLibraryElms.map(mainLibraryElm => {
              let parameterObj;
              if (deviceRequest.resourceType === "DeviceRequest") {
                parameterObj = {
                  device_request: fhirWrapper.wrap(deviceRequest)
                };
              } else if (
                deviceRequest.resourceType === "ServiceRequest"
              ) {
                parameterObj = {
                  service_request: fhirWrapper.wrap(deviceRequest)
                };
              } else if (deviceRequest.resourceType === "MedicationRequest") {
                parameterObj = {
                  medication_request: fhirWrapper.wrap(deviceRequest)
                };
              } else if (deviceRequest.resourceType === "MedicationDispense") {
                parameterObj = {
                  medication_dispense: fhirWrapper.wrap(deviceRequest)
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
                deviceRequest,
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
          } else if (valueSet.compose != null) {
           this.consoleLog(`Valueset ${valueSet.id} has a compose.`, 'infoClass');
            
            var codeList = valueSet.compose.include.map(code => {
              if (code.filter != null) {
                this.consoleLog(`code ${code} has a filter and is not supported.`, 'infoClass');
              }
              var conceptList = code.filter == null ? code.concept : [];
              var system = code.system;
              var codeList = [];
              conceptList.forEach(concept => {
                codeList.push( {
                  code: concept.code,
                  system: system,
                  version: concept.version
                });
              });
              return codeList;
            });
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][
              ""
            ] = codeList.length > 0 ? codeList[0] : null;
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

  filter(defaultFilter) {
      var items = Array.from(document.getElementsByClassName("ng-not-empty"));
      var sections = Array.from(document.getElementsByClassName("section"));
      var empty = Array.from(document.getElementsByClassName("ng-empty"));

      let checked, filterCheckbox;
      if(!defaultFilter) {
        filterCheckbox = document.getElementById("filterCheckbox");
        checked = filterCheckbox ? filterCheckbox.checked : false;
      } else {
        checked = true;
      }

      items.map((element) => {
          // filter all not-empty items
          if(element.tagName === "INPUT") { 
            // check if the item is one of the gtable, if yes, need to make sure all the
            let inputRowElement = element.closest('.lf-table-item');
            if (inputRowElement) {
              if(inputRowElement.classList.contains('lf-layout-horizontal')) {
                // check if all questions in the row are answered before filtering
                const totalQs = inputRowElement.querySelectorAll("td").length;
                const filledQs = inputRowElement.querySelectorAll(".ng-not-empty:not([disabled]):not(.tooltipContent)").length;
                if(totalQs === filledQs) {
                    inputRowElement.hidden=checked;
                }
              } else if(inputRowElement.parentElement.querySelector("ul")) {
                  // case for multi-answer questions
                  // TODO: what's the filter case for these?  Filter if they have any answers?
                  if(inputRowElement.parentElement.querySelector("ul").querySelector("li")) {
                      // has elements in its list
                      inputRowElement.hidden=checked;
                  }
              } else {
                //check if all the children input have been filled
                let childrenInputs = Array.from(inputRowElement.getElementsByTagName('INPUT'));
                let allFilled = true;
                for(let input of childrenInputs) {
                  if(input && !input.value) {
                    allFilled = false;
                    break;
                  }
                }
                if(allFilled) {
                  inputRowElement.hidden = checked;
                }
              }
            }
          }
      });

      sections.map((element) => {
        if(!element.querySelector(".ng-empty")) {
            const nonEmpty = Array.from(element.querySelectorAll(".ng-not-empty"))
            let actuallyNotEmpty = true;
            // check multi-choice questions to make sure
            // they actually have an answer before we 
            // filter out the entire section
            nonEmpty.forEach(e=> {
                const ul = e.parentElement.querySelector("ul");
                if (ul && !ul.querySelector("li")) {
                    // the multi-choice question doesn't have an answer
                    // it's actually empty
                    actuallyNotEmpty = false;
                }
            })
            // filter out sections without any empty items
            if(actuallyNotEmpty && !element.parentElement.querySelector(".ng-empty")){
                element.parentElement.hidden=checked;
            }
        } else {
            // deals with case where the only empty question
            // is a disabled question and a tooltip.
            // though the disabled question is hidden, the empty
            // section remains because of it.
            if(element.querySelector(".ng-empty:not([disabled]):not(.tooltipContent)")===null) { 
                element.parentElement.hidden=checked;
            } else {
                // check for multi-choice questions
                // get all empty questions
                const emptyq = element.querySelectorAll(".ng-empty");
                let doFilter = true;
                emptyq.forEach(e=>{
                    const ul = e.parentElement.querySelector("ul");
                    if (ul && !ul.querySelector("li")) {
                        // the multi-choice question doesn't have an answer
                        doFilter = false;
                    } else if (!ul) {
                        // this question is empty and isn't multi-choice
                        doFilter = false;
                    }
                })
                if(doFilter) {
                    element.parentElement.hidden=checked;
                }
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
                element.closest('.lf-table-item').hidden=checked;
            }
        }
        // we don't want to show disabled items in the filtered view
        if(element.disabled) {
            element.closest('.lf-table-item').hidden=checked;
        }

      });

      this.setState({filter: checked});
      this.setState({allFieldsFilled: document.querySelector("input.ng-empty:not([disabled])") == null});
    }

  onFilterCheckboxRefChange = node => {
    let filterCheckbox = document.getElementById("filterCheckbox");
    if (filterCheckbox != null) {
      filterCheckbox.checked = this.state.filter;
    }
  };
  
  renderButtons(ref) {
    const element = (<div><div><TaskPopup smart = {this.smart} />
    <div className="task-button">
        <label>Attestation</label>  <input type="checkbox" onChange={()=>{this.setTasks()}} id="attestationCheckbox"></input>
    </div>
    <div className="task-button">
        <label>Only Show Unfilled Fields</label>  <input type="checkbox" onChange={()=>{this.filter(false)}} id="filterCheckbox" ref={this.onFilterCheckboxRefChange}></input>
    </div></div></div>)
    ReactDOM.render(element, ref);
  }

  renderErrors() {
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

    return messages;
  }

  render() {
    console.log("--- Need to wait for additional resource to load: ", this.state.isAdaptiveFormWithoutExtension);
    if (
      (this.state.questionnaire &&
        this.state.cqlPrepopulationResults &&
        this.state.bundle)
      ||
      (this.state.questionnaire && 
        this.state.response && 
        this.props.standalone)
      || (this.state.questionnaire && 
        this.state.isAdaptiveFormWithoutExtension)
    ) {
      return (
          <div>
        <div className="App">
          {this.renderErrors()}
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
              patientId={this.patientId}
              standalone={this.props.standalone}
              response={this.state.response}
              attested={this.state.attested}
              priorAuthReq={this.props.priorAuthReq === "true" ? true : false}
              setPriorAuthClaim={this.setPriorAuthClaim.bind(this)}
              fhirVersion={this.fhirVersion.toUpperCase()}
              smart={this.smart}
              FHIR_PREFIX={this.props.FHIR_PREFIX}
              FILE_PATH={this.props.FILE_PREFIX}
              renderButtons={this.renderButtons}
              filterFieldsFn={this.filter}
              filterChecked={this.state.filter}
              formFilled={this.state.allFieldsFilled}
              formFilledSetFn={(status)=> this.setState({allFieldsFilled: status})}
              updateQuestionnaire={this.updateQuestionnaire.bind(this)}
            />
          )}
        </div>
        </div>
      );
    } else if (this.props.standalone) {
        return (
            <PatientSelect
            smart={this.smart}
            callback={this.standaloneLaunch}>
            </PatientSelect>
        )
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