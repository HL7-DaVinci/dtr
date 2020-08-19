function createTask(info, smart) {


    smart.patient.read().then((result) => {
        info.resourceType = "Task";
        info.status = info.status ? info.status : "draft";
        info.intent = info.intent ? info.intent : "order";
        info.for = info.for ? info.for : {reference:  `${result.resourceType}/${result.id}`};
        // const task = {
        //     resourceType: "Task",
        //     status: "draft",
        //     intent: "order",
        //     code: "approve",
        //     description: description,
        //     for: {
        //         reference: `${result.resourceType}/${result.id}`
        //     }
        // };
        smart.create(info);

    });
}

export {
    createTask
};
