// to get FHIR properties of the form answer{whatever}
function findValueByPrefix(object, prefix) {
    for (var property in object) {
        if (object.hasOwnProperty(property) && 
            property.toString().startsWith(prefix)) {
            return object[property];
        }
    }
}

function buildFhirUrl(reference, fhirPrefix, fhirVersion) {
    if (reference.startsWith("http")) {
      var endIndex = reference.lastIndexOf("/");
      var startIndex = reference.lastIndexOf("/", endIndex -1) + 1;
      var resoruce = reference.substr(startIndex, endIndex - startIndex);
      return fhirPrefix + fhirVersion + "/" + resoruce + "?url=" + reference;        
    } else {        
      return fhirPrefix + fhirVersion + "/" + reference;
    }
  }

  

function getListOfChoices(props, setChoice){
    // parse out the list of choices from 'option'
    let returnAnswer = null;
    // R4 has referenced valuesets at `item.answerValueSet`, in STU3 it is at `item.options.reference`.
    const answerOptionsReference = props.item.answerValueSet || (props.item.options || {}).reference;
    if(typeof answerOptionsReference === "string") {
        // answerValueSet
        if(answerOptionsReference.startsWith("#")) {
            // contained resource reference
            const resource = props.containedResources[answerOptionsReference.substr(1,answerOptionsReference.length)];
            const values = resource.compose.include;
            values.forEach((element)=>{
                element.concept.forEach((concept)=>{
                    const pair = {
                        "code": concept.code,
                        "display": concept.display,
                    };
                    setChoice(pair);
                });
            });
        }

    }else{
        const answerOption = props.item.answerOption || props.item.option; // in R4 this is item.answerOption, in STU3 it is item.option
        // list of answerOption options
        answerOption.forEach((concept)=>{
            // TODO: The value could be a code/date/time/reference, need to account for that.
            const value = findValueByPrefix(concept,"value");
            const pair = {
            };
            // "code": value.code,
            // "display": value.display,
            // "system": value.system,
            // "version": value.version,
            Object.keys(value).forEach((e) => {
                pair[e] = value[e];
            });

            if(pair.display === undefined && pair.code){
                pair.display = pair.code;
            }
            setChoice(pair);

            returnAnswer = concept.initialSelected?pair:returnAnswer;
        });
    }
    return returnAnswer;
}

function postToLogs(log, callback) {
    const logRequest = new XMLHttpRequest();
    logRequest.open("POST", "../db/logs");
    logRequest.setRequestHeader("Content-Type", "application/json");
    logRequest.onload = function() {
        callback(JSON.parse(logRequest.responseText));
    };
    logRequest.send(JSON.stringify(log));
}

function updateLog(log) {
    const logRequest = new XMLHttpRequest();
    logRequest.open("PUT", "../db/logs/"+log.id);
    logRequest.setRequestHeader("Content-Type", "application/json");
    logRequest.send(JSON.stringify(log));
}

function postToClients(log, callback) {
    getClients((clients)=>{
        const filteredClients = clients.filter((e)=>{return log.name === e.name;});
        if(filteredClients.length) {
            const clientRequest = new XMLHttpRequest();
            clientRequest.open("PUT", "../db/clients/" + filteredClients[0].id);
            clientRequest.setRequestHeader("Content-Type", "application/json");
            clientRequest.onload = function() {
                callback(JSON.parse(clientRequest.responseText));
            };
            clientRequest.send(JSON.stringify(log));
        } else {
            const clientRequest = new XMLHttpRequest();
            clientRequest.open("POST", "../db/clients");
            clientRequest.setRequestHeader("Content-Type", "application/json");
            clientRequest.onload = function() {
                callback(JSON.parse(clientRequest.responseText));
            };
            clientRequest.send(JSON.stringify(log));
        }


    });

}

function deleteClient(id, callback) {
    const clientRequest = new XMLHttpRequest();
    clientRequest.open("DELETE", "../db/clients/" + id);
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = function() {
        callback();
    };
    clientRequest.send();
}

function getClients(callback) {
    const clientRequest = new XMLHttpRequest();
    clientRequest.open("GET", "../db/clients/");
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = function() {
        callback(JSON.parse(clientRequest.responseText));
    };
    clientRequest.send();
}

function searchQuestionnaire(questionnaire, attestation) {
    var result = questionnaire;
    if(questionnaire.item) {
        questionnaire.item.forEach((item) => {
            searchQuestionnaire(item, attestation);
            console.log(item);
        });
    } else {
        if(attestation.find((e)=>{return e===questionnaire.linkId;})) {
            return questionnaire.answer.push({
                valueCoding: {
                    code: "410515003",
                    system: "http://snomed.info/sct",
                    display: "known present"
                }
            });
        }
    }
    return result;
}

export {
    findValueByPrefix,
    getListOfChoices,
    postToLogs,
    updateLog,
    postToClients,
    deleteClient,
    getClients,
    searchQuestionnaire,
    buildFhirUrl
};