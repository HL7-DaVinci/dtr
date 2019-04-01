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
    // parse out the list of choices from the answerOption
    const answer = findValueByPrefix(props.item,"answer")
    let returnAnswer = null;
    if(typeof answer === "string") {
        // answerValueSet
        if(answer.startsWith("#")) { 
            // contained resource reference
            const resource = props.containedResources[answer.substr(1,answer.length)];
            const values = resource.compose.include;
            values.forEach((element)=>{
                element.concept.forEach((concept)=>{
                    const pair = {
                        "code": concept.code,
                        "display": concept.display,
                    }
                    setChoice(pair);
                });

            })             
        }

    }else{
        // list of answer options
        answer.forEach((concept)=>{
            // TODO: The value could be a code/date/time/reference, need to account for that.
            const value = findValueByPrefix(concept,"value");
            const pair = {
            };
            // "code": value.code,
            // "display": value.display,
            // "system": value.system,
            // "version": value.version,
            Object.keys(value).forEach((e) => {
                pair[e] = value[e]
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


export {
    findValueByPrefix,
    getListOfChoices
}