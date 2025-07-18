import { Component } from "react";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import {fetchArtifactsOperation, fetchFromQuestionnaireResponse, searchByOrder} from "./util/fetchArtifacts";
import fetchFhirVersion from "./util/fetchFhirVersion";
import PriorAuth from "./components/PriorAuth/PriorAuth";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
import UserMessage from "./components/UserMessage/UserMessage";
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
      orderResource: null,
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
      fatalError: null,
      allFieldsFilled: false,
      isAdaptiveFormWithoutExtension: false,
      isFetchingArtifacts: true,
      reloadQuestionnaire: false,
      adFormCompleted: false,
      adFormResponseFromServer: undefined,
    };
    this.smart = props.smart;
    this.patientId = props.patientId;
    this.appContext = props.appContext;
    this.consoleLog = this.consoleLog.bind(this);
    this.fhirVersion = 'unknown';
    this.renderButtons = this.renderButtons.bind(this);
    this.ehrLaunch = this.ehrLaunch.bind(this);
    this.standaloneLaunch = this.standaloneLaunch.bind(this);
    this.filter = this.filter.bind(this);
    this.onFilterCheckboxRefChange = this.onFilterCheckboxRefChange.bind(this);
    this.fetchResourcesAndExecuteCql =
      this.fetchResourcesAndExecuteCql.bind(this);
  }

  componentDidMount() {
    if (!this.props.standalone) {
      this.ehrLaunch(false);
    }
  }

  standaloneLaunch(patient, response) {
    fetchFhirVersion(this.props.smart.state.serverUrl).then((fhirVersion) => {
      this.fhirVersion = fhirVersion;
      const questionnaireUrl = response.questionnaire;
      fetch(questionnaireUrl)
        .then((r) => r.json())
        .then((questionnaire) => {
          this.setState({ questionnaire: questionnaire });
          this.setState({ response: response });
          this.setState({ isFetchingArtifacts: false });
        });
    });
  }

  updateQuestionnaire(updatedQuestionnaire) {
    this.setState({
      questionnaire: updatedQuestionnaire,
      reloadQuestionnaire: true,
    });
  }

  ehrLaunch(isContainedQuestionnaire, questionnaire) {
    // Extract context from SMART launch context, supporting both legacy and new formats
    let acOrder = this.appContext.order;
    let acCoverage = this.appContext.coverage;
    let acQuestionnaire = this.appContext.questionnaire;
    let acResponse = this.appContext.response;
    console.log('App Context:', this.appContext);

    // Handle fhirContext-based references for DTR
    // Look for order references from fhirContext if not found in legacy context
    if (!acOrder && this.appContext.fhirContext) {
      const orderContext = this.appContext.fhirContext.find((ctx) => {
        if (ctx.reference) {
          const resourceType = ctx.reference.split('/')[0].toLowerCase();
          return [
            'servicerequest',
            'devicerequest',
            'medicationrequest',
            'nutritionorder',
          ].includes(resourceType);
        }
        return false;
      });
      if (orderContext) {
        acOrder = orderContext.reference;
      }
    }

    // Handle coverage references from fhirContext
    if (!acCoverage && this.appContext.fhirContext) {
      const coverageContext = this.appContext.fhirContext.find((ctx) => {
        if (ctx.reference) {
          return ctx.reference.split('/')[0].toLowerCase() === 'coverage';
        }
        return false;
      });
      if (coverageContext) {
        acCoverage = coverageContext.reference;
      }
    }

    // Handle questionnaire from fhirContext (canonical or reference)
    if (!acQuestionnaire && this.appContext.fhirContext) {
      const questionnaireContext = this.appContext.fhirContext.find((ctx) => {
        return (
          ctx.canonical ||
          (ctx.reference &&
            ctx.reference.split('/')[0].toLowerCase() === 'questionnaire')
        );
      });
      if (questionnaireContext) {
        acQuestionnaire =
          questionnaireContext.canonical || questionnaireContext.reference;
      }
    }

    console.log('DTR Launch Context:', {
      order: acOrder,
      coverage: acCoverage,
      questionnaire: acQuestionnaire,
      response: acResponse,
      fullContext: this.appContext,
    });

    if (isContainedQuestionnaire && questionnaire) {
      // TODO: This is a workaround for getting adaptive forms to work
      // in its current form, adaptive forms do not operate with the
      // package operation
      const reloadQuestionnaire = questionnaire !== undefined;
      this.setState({
        isFetchingArtifacts: true,
        reloadQuestionnaire,
      });
      this.fetchResourcesAndExecuteCql(
        acOrder,
        acCoverage,
        acQuestionnaire,
        questionnaire,
        this.appContext.context
      );
    } else if (acOrder && acCoverage && !acQuestionnaire && !acResponse) {
      searchByOrder(acOrder, this.smart)
        .then((res) => {
          // TODO: Don't know how to deal with multiple QRs
          // Let user pick with a UI?  Force orders to
          // uniquely identify QRs?
          // for now just pick the first one
          acResponse = res[0].resource;
          acQuestionnaire = acResponse.questionnaire;
          this.setState({ response: acResponse });
          this.fetchResourcesAndExecuteCql(
            acOrder,
            acCoverage,
            acQuestionnaire,
            null,
            this.appContext.context
          );
        })
        .catch((error) => {
          console.error('Error searching by order:', error);
        });
    } else if (acResponse) {
      // start relaunch
      // TODO: could potentially pass order to this function and avoid
      // needing to search the QR context extension for it
      // which would also support QRs without the extension.
      fetchFromQuestionnaireResponse(acResponse, this.smart).then(
        (relaunchContext) => {
          this.setState({ response: relaunchContext.response });
          this.fetchResourcesAndExecuteCql(
            relaunchContext.order,
            relaunchContext.coverage,
            relaunchContext.questionnaire,
            null,
            this.appContext.context
          );
        }
      );
    } else if (acQuestionnaire && acOrder && acCoverage) {
      this.consoleLog('fetching artifacts', 'infoClass');
      this.setState({
        isFetchingArtifacts: true,
      });
      const reloadQuestionnaire = questionnaire !== undefined;
      this.setState({ reloadQuestionnaire });
      this.fetchResourcesAndExecuteCql(
        acOrder,
        acCoverage,
        acQuestionnaire,
        null,
        this.appContext.context
      );
    } else {
      alert('invalid app context');
    }
  }

  fetchResourcesAndExecuteCql(
    order,
    coverage,
    questionnaire,
    containedQuestionnaire,
    context
  ) {
    fetchFhirVersion(this.props.smart.state.serverUrl).then((fhirVersion) => {
      this.fhirVersion = fhirVersion;

      fetchArtifactsOperation(
        order,
        coverage,
        questionnaire,
        this.smart,
        this.consoleLog,
        containedQuestionnaire,
        context
      )
        .then((artifacts) => {
          console.log('fetched needed artifacts:', artifacts);
          const orderResource = artifacts.order;
          let fhirWrapper = this.getFhirWrapper(this.fhirVersion);
          this.setState({ questionnaire: artifacts.questionnaire });
          this.setState({ orderResource: orderResource });
          this.setState({
            isAdaptiveFormWithoutExtension:
              artifacts.questionnaire.meta &&
              artifacts.questionnaire.meta.profile &&
              artifacts.questionnaire.meta.profile.includes(
                'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-adapt'
              ) &&
              (artifacts.questionnaire.extension === undefined ||
                !artifacts.questionnaire.extension.includes(
                  (e) =>
                    e.url ===
                    'http://hl7.org/fhir/StructureDefinition/cqf-library'
                )),
          });
          this.setState({});
          // execute for each main library
          return Promise.all(
            artifacts.mainLibraryElms.map((mainLibraryElm) => {
              let parameterObj;
              if (orderResource.resourceType === 'DeviceRequest') {
                parameterObj = {
                  device_request: fhirWrapper.wrap(orderResource),
                };
              } else if (orderResource.resourceType === 'ServiceRequest') {
                parameterObj = {
                  service_request: fhirWrapper.wrap(orderResource),
                };
              } else if (orderResource.resourceType === 'MedicationRequest') {
                parameterObj = {
                  medication_request: fhirWrapper.wrap(orderResource),
                };
              } else if (orderResource.resourceType === 'MedicationDispense') {
                parameterObj = {
                  medication_dispense: fhirWrapper.wrap(orderResource),
                };
              }

              const executionInputs = {
                elm: mainLibraryElm,
                // look at main library elms to determine dependent elms to include
                elmDependencies: mainLibraryElm.library.includes
                  ? mainLibraryElm.library.includes.def.map(
                      (includeStatement) => {
                        let foundLibrary = artifacts.dependentElms.find(
                          (elm) => {
                            return (
                              elm.library.identifier.id ==
                                includeStatement.path &&
                              elm.library.identifier.version ==
                                includeStatement.version
                            );
                          }
                        );
                        if (foundLibrary != null) {
                          return foundLibrary;
                        } else {
                          this.consoleLog(
                            `Could not find library ${includeStatement.path}. Check if it is referenced in FHIR Library (${mainLibraryElm.library.identifier.id}) properly.`,
                            `errorClass`
                          );
                        }
                      }
                    )
                  : undefined,
                valueSetDB: {},
                parameters: parameterObj,
                mainLibraryMaps: artifacts.mainLibraryMaps,
              };

              // add the required value sets to the valueSetDB
              this.fillValueSetDB(executionInputs, artifacts);

              this.consoleLog('executing elm', 'infoClass');
              console.log('executing elm');
              return executeElm(
                this.smart,
                this.fhirVersion,
                orderResource,
                executionInputs,
                this.consoleLog
              );
            })
          );
        })

        .then((cqlResults) => {
          this.consoleLog(
            'executed cql, result:' + JSON.stringify(cqlResults),
            'infoClass'
          );
          console.log('executed cql, result:', cqlResults);

          // Collect all library results into a single bundle
          let allLibrariesResults = {};
          let fullBundle = null;
          cqlResults.forEach((libraryResult) => {
            // add results to hash indexed by library name
            allLibrariesResults[libraryResult.libraryName] =
              libraryResult.elmResults;

            if (fullBundle == null) {
              fullBundle = libraryResult.bundle;
              // copy entire first bundle");
            } else {
              // add next bundle");
              libraryResult.bundle.entry.forEach((libraryEntry) => {
                // search for the entry to see if it is already in the bundle
                let found = false;
                fullBundle.entry.forEach((fullBundleEntry) => {
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
          this.setState({
            bundle: fullBundle,
            cqlPrepopulationResults: allLibrariesResults,
            isFetchingArtifacts: false,
          });
        })
        .catch((error) => {
          this.setState({ fatalError: error.message });
          this.setState({ isFetchingArtifacts: false });
        });
    });
  }
  getFhirWrapper(fhirVersion) {
    if (fhirVersion == 'r4') {
      return cqlfhir.FHIRWrapper.FHIRv400();
    } else if (fhirVersion == 'stu3') {
      return cqlfhir.FHIRWrapper.FHIRv300();
    } else if (fhirVersion == 'dstu2') {
      return cqlfhir.FHIRWrapper.FHIRv200();
    } else if (fhirVersion == 'dstu1') {
      return cqlfhir.FHIRWrapper.FHIRv100();
    } else {
      console.log('ERROR: unknown FHIR version');
      return null;
    }
  }

  // fill the valueSetDB in executionInputs with the required valuesets from their artifact source
  fillValueSetDB(executionInputs, artifacts) {
    if (!executionInputs.elmDependencies) {
      return;
    }
    // create list of all ELMs that will be used
    let allElms = executionInputs.elmDependencies.slice();
    allElms.push(executionInputs.elm);

    // iterate over all elms
    allElms.forEach((elm) => {
      // leave if this elm has no value set references
      if (elm.library.valueSets == null) return;

      // iterate over valueSet definitions
      elm.library.valueSets.def.forEach((valueSetDef) => {
        // find FHIR value set artifact
        let valueSet = artifacts.valueSets.find(
          (valueSet) =>
            valueSet.id == valueSetDef.id || valueSet.url == valueSetDef.id
        );
        if (valueSet != null) {
          // make sure it has an expansion
          if (valueSet.expansion != null) {
            // add all codes to the the value set db. it is a map in a map, where the first layer key
            // is the value set id and second layer key is the value set version. for this purpose we are using un-versioned valuesets
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][''] =
              valueSet.expansion.contains.map((code) => {
                return {
                  code: code.code,
                  system: code.system,
                  version: code.version,
                };
              });
          } else if (valueSet.compose != null) {
            this.consoleLog(
              `Valueset ${valueSet.id} has a compose.`,
              'infoClass'
            );

            var codeList = valueSet.compose.include.map((code) => {
              if (code.filter != null) {
                this.consoleLog(
                  `code ${code} has a filter and is not supported.`,
                  'infoClass'
                );
              }
              var conceptList = code.filter == null ? code.concept : [];
              var system = code.system;
              var codeList = [];
              conceptList.forEach((concept) => {
                codeList.push({
                  code: concept.code,
                  system: system,
                  version: concept.version,
                });
              });
              return codeList;
            });
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][''] =
              codeList.length > 0 ? codeList[0] : null;
          }
        } else {
          this.consoleLog(
            `Could not find valueset ${valueSetDef.id}. Try reloading with VSAC credentials in CRD.`,
            'errorClass'
          );
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
      type,
    };
    this.setState((prevState) => ({
      logs: [...prevState.logs, jsonContent],
    }));
    if (type === 'errorClass') {
      this.setState((prevState) => ({
        errors: [...prevState.errors, jsonContent],
      }));
    }
  }

  setPriorAuthClaim(claimBundle) {
    this.setState({ priorAuthClaim: claimBundle });
  }

  getQuestionByName(question) {
    //question should be the HTML node
    const temp = question
      .getElementsByClassName('lf-item-code ng-hide')[0]
      .innerText.trim();
    const linkId = temp.substring(1, temp.length - 1);
    const questionName = question.children[0].innerText;
    const header =
      question.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
        .parentNode.children[0].children[0].innerText;
    return linkId;
  }

  setAttested(icon, linkId) {
    this.setState({ attested: [...this.state.attested, linkId] }); //simple value
    icon.className = 'fas fa-check';
    icon.onclick = () => {
      this.removeAttested(icon, linkId);
    };
  }

  removeAttested(icon, linkId) {
    this.setState({
      attested: this.state.attested.filter(function (id) {
        return id !== linkId;
      }),
    });
    icon.className = 'fas fa-clipboard';
    icon.onclick = () => {
      this.setAttested(icon, linkId);
    };
  }
  setTasks() {
    if (!this.state.tasks) {
      const questions = Array.from(
        document.querySelectorAll(
          `[ng-click="setActiveRow(item)"]:not(.lf-section-header)`
        )
      );
      questions.map((q) => {
        var node = document.createElement('div');
        node.className = 'task-input draft';
        const linkId = this.getQuestionByName(q);
        if (
          this.state.attested &&
          this.state.attested.find((e) => {
            return e == linkId;
          })
        ) {
          const icon = document.createElement('i');
          icon.className = 'fas fa-check';
          node.appendChild(icon);
          icon.onclick = () => {
            this.removeAttested(icon, linkId);
          };
        } else {
          const icon = document.createElement('i');
          icon.className = 'fas fa-clipboard';
          node.appendChild(icon);
          icon.onclick = () => {
            this.setAttested(icon, linkId);
          };
        }

        node.className = 'task-input';

        q.children[0].children[0].appendChild(node);
      });
      this.setState({ tasks: true });
    } else {
      const tasks = Array.from(document.getElementsByClassName('task-input'));
      tasks.map((task) => {
        task.remove();
      });
      this.setState({ tasks: false });
    }
  }

  filter(defaultFilter) {
    var items = Array.from(document.getElementsByClassName("ng-not-empty"));
    var sections = Array.from(document.getElementsByClassName("section"));
    var empty = Array.from(document.getElementsByClassName("ng-empty"));

    let checked, filterCheckbox;
    if (!defaultFilter) {
      filterCheckbox = document.getElementById('filterCheckbox');
      checked = filterCheckbox ? filterCheckbox.checked : false;
    } else {
      checked = true;
    }

    items.map((element) => {
      // filter all not-empty items
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        // check if the item is one of the gtable, if yes, need to make sure all the
        let inputRowElement = element.closest('.lf-table-item');
        if (inputRowElement) {
          if (inputRowElement.classList.contains('lf-layout-horizontal')) {
            // check if all questions in the row are answered before filtering
            const totalQs = inputRowElement.querySelectorAll('td').length;
            const filledQs = inputRowElement.querySelectorAll(
              '.ng-not-empty:not([disabled]):not(.tooltipContent)'
            ).length;
            if (totalQs === filledQs) {
              inputRowElement.hidden = checked;
            }
          } else if (inputRowElement.parentElement.querySelector('ul')) {
            // case for multi-answer questions
            // TODO: what's the filter case for these?  Filter if they have any answers?
            if (
              inputRowElement.parentElement
                .querySelector('ul')
                .querySelector('li')
            ) {
              // has elements in its list
              inputRowElement.hidden = checked;
            }
          } else {
            //check if all the children input have been filled
            let childrenInputs = Array.from(
              inputRowElement.getElementsByTagName('INPUT')
            );
            let allFilled = true;
            for (let input of childrenInputs) {
              if (input && !input.value) {
                allFilled = false;
                break;
              }
            }
            if (allFilled) {
              inputRowElement.hidden = checked;
            }
          }
        }
      }
    });

    sections.map((element) => {
      if (!element.querySelector('.ng-empty')) {
        const nonEmpty = Array.from(element.querySelectorAll('.ng-not-empty')); 
        let actuallyNotEmpty = true;
        // check multi-choice questions to make sure
        // they actually have an answer before we
        // filter out the entire section
        nonEmpty.forEach((e) => {
          const ul = e.parentElement.querySelector('ul');
          if (ul && !ul.querySelector('li')) {
            // the multi-choice question doesn't have an answer
            // it's actually empty
            actuallyNotEmpty = false;
          }
        });
        // filter out sections without any empty items
        if (
          actuallyNotEmpty &&
          !element.parentElement.querySelector('.ng-empty')
        ) {
          element.parentElement.hidden = checked;
        }
      } else {
        // deals with case where the only empty question
        // is a disabled question and a tooltip.
        // though the disabled question is hidden, the empty
        // section remains because of it.
        if (
          element.querySelector(
            '.ng-empty:not([disabled]):not(.tooltipContent)'
          ) === null
        ) {
          element.parentElement.hidden = checked;
        } else {
          // check for multi-choice questions
          // get all empty questions
          const emptyq = element.querySelectorAll('.ng-empty');
          let doFilter = true;
          emptyq.forEach((e) => {
            const ul = e.parentElement.querySelector('ul');
            if (ul && !ul.querySelector('li')) {
              // the multi-choice question doesn't have an answer
              doFilter = false;
            } else if (!ul) {
              // this question is empty and isn't multi-choice
              doFilter = false;
            }
          });
          if (doFilter) {
            element.parentElement.hidden = checked;
          }
        }
      }
    });

    empty.map((element) => {
      if (element.type === 'checkbox') {
        // we make an exception for checkboxes we've touched
        // a checked checkbox that we've unchecked can be filtered out, despite
        // having the "empty" class.
        const d = Array.from(element.classList);
        if (d.includes('ng-touched')) {
          element.closest('.lf-table-item').hidden = checked;
        }
      }
      // we don't want to show disabled items in the filtered view
      if (element.disabled) {
        element.closest('.lf-table-item').hidden = checked;
      }
    });

    this.setState({ filter: checked });
    this.setState({
      allFieldsFilled:
        document.querySelector('input.ng-empty:not([disabled])') == null,
    });
  }

  onFilterCheckboxRefChange = (node) => {
    let filterCheckbox = document.getElementById('filterCheckbox');
    if (filterCheckbox != null) {
      filterCheckbox.checked = this.state.filter;
    }
  };

  renderButtons() {
    return (
      <div>
        {/* <TaskPopup smart={this.smart} /> */}
        {/* <div className='task-button'>
          <label>Attestation</label>{' '}
          <input
            type='checkbox'
            onChange={() => {
              this.setTasks();
            }}
            id='attestationCheckbox'
          ></input>
        </div>
        <div className='task-button'>
          <label>Only Show Unfilled Fields</label>{' '}
          <input
            type='checkbox'
            onChange={() => {
              this.filter(false);
            }}
            id='filterCheckbox'
            ref={this.onFilterCheckboxRefChange}
          ></input>
        </div> */}
      </div>
    );
  }

  renderErrors() {
    // set up messages, if any are needed
    let messages;
    if (this.state.errors.length > 0) {
      let errs = _.map(this.state.errors, 'details'); // new array of only the details
      messages = (
        <UserMessage
          variant={'warning'}
          title={'Warning!'}
          message={
            'Problems(s) occurred while prefilling this request.  You will need to manually fill out the necessary information.'
          }
          details={errs}
        />
      );
    }

    return messages;
  }

  render() {
    if (
      (this.state.questionnaire &&
        this.state.cqlPrepopulationResults &&
        this.state.bundle) ||
      (this.state.questionnaire &&
        this.state.response &&
        this.props.standalone) ||
      (this.state.questionnaire && this.state.isAdaptiveFormWithoutExtension)
    ) {
      return this.state.isFetchingArtifacts ? (
        <div> Fetching resources ... </div>
      ) : (
        <div>
          <div className='App'>
            {this.renderErrors()}
            <div
              className={'overlay ' + (this.state.showOverlay ? 'on' : 'off')}
              onClick={() => {
                console.log(this.state.showOverlay);
                this.toggleOverlay();
              }}
            ></div>
            {this.state.priorAuthClaim ? (
              <PriorAuth claimBundle={this.state.priorAuthClaim} />
            ) : (
              <QuestionnaireForm
                qform={this.state.questionnaire}
                appContext={this.appContext}
                cqlPrepopulationResults={this.state.cqlPrepopulationResults}
                deviceRequest={this.state.orderResource}
                bundle={this.state.bundle}
                patientId={this.patientId}
                standalone={this.props.standalone}
                response={this.state.response}
                attested={this.state.attested}
                priorAuthReq={this.props.priorAuthReq === 'true' ? true : false}
                setPriorAuthClaim={this.setPriorAuthClaim.bind(this)}
                fhirVersion={this.fhirVersion.toUpperCase()}
                smart={this.smart}
                renderButtons={this.renderButtons}
                filterFieldsFn={this.filter}
                filterChecked={this.state.filter}
                formFilled={this.state.allFieldsFilled}
                formFilledSetFn={(status) =>
                  this.setState({ allFieldsFilled: status })
                }
                updateQuestionnaire={this.updateQuestionnaire.bind(this)}
                ehrLaunch={this.ehrLaunch}
                reloadQuestionnaire={this.state.reloadQuestionnaire}
                updateReloadQuestionnaire={(reload) =>
                  this.setState({ reloadQuestionnaire: reload })
                }
                adFormCompleted={this.state.adFormCompleted}
                updateAdFormCompleted={(completed) =>
                  this.setState({ adFormCompleted: completed })
                }
                adFormResponseFromServer={this.state.adFormResponseFromServer}
                updateAdFormResponseFromServer={(response) =>
                  this.setState({ adFormResponseFromServer: response })
                }
              />
            )}
          </div>
        </div>
      );
    } else if (this.props.standalone) {
      return (
        <PatientSelect
          smart={this.smart}
          callback={this.standaloneLaunch}
        ></PatientSelect>
      );
    } else {
      return (
        <div className='App'>
          {this.state.fatalError ? (
            <UserMessage
              variant={'error'}
              title={'Error!'}
              message={'An error has occurred.'}
              details={this.state.fatalError}
            />
          ) : (
            <p>Loading...</p>
          )}
          <Testing logs={this.state.logs} />
        </div>
      );
    }
  }
}