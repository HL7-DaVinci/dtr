// to get FHIR properties of the form answer{whatever}
function findValueByPrefix(object, prefix) {
    for (var property in object) {
        if (object.hasOwnProperty(property) && 
            property.toString().startsWith(prefix)) {
            return object[property];
        }
    }
}

function getListOfChoices(props, setChoice){
    // parse out the list of choices from 'option'
    let returnAnswer = null;
    const answerOptionsReference = (props.item.options || {}).reference;
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
        const answerOption = props.item.option; // in r4 this is item.answerOption, but we support stu3 only
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
    logRequest.open("POST", "../logs");
    logRequest.setRequestHeader("Content-Type", "application/json");
    logRequest.onload = function() {
        callback(JSON.parse(logRequest.responseText));
    };
    logRequest.send(JSON.stringify(log));
}

function updateLog(log) {
    const logRequest = new XMLHttpRequest();
    logRequest.open("PUT", "../logs/"+log.id);
    logRequest.setRequestHeader("Content-Type", "application/json");
    logRequest.send(JSON.stringify(log));
}

function postToClients(log, callback) {
    getClients((clients)=>{
        const filteredClients = clients.filter((e)=>{return log.name === e.name;});
        if(filteredClients.length) {
            const clientRequest = new XMLHttpRequest();
            clientRequest.open("PUT", "../clients/" + filteredClients[0].id);
            clientRequest.setRequestHeader("Content-Type", "application/json");
            clientRequest.onload = function() {
                callback(JSON.parse(clientRequest.responseText));
            };
            clientRequest.send(JSON.stringify(log));
        } else {
            const clientRequest = new XMLHttpRequest();
            clientRequest.open("POST", "../clients");
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
    clientRequest.open("DELETE", "../clients/" + id);
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = function() {
        callback();
    };
    clientRequest.send();
}

function getClients(callback) {
    const clientRequest = new XMLHttpRequest();
    clientRequest.open("GET", "../clients/");
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = function() {
        callback(JSON.parse(clientRequest.responseText));
    };
    clientRequest.send();
}


export {
    findValueByPrefix,
    getListOfChoices,
    postToLogs,
    updateLog,
    postToClients,
    deleteClient,
    getClients
};