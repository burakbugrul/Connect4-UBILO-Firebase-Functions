var log = (action, actorID, data = {}) => Object.assign({
    date: Date.now(),
    action: action,
    actorID: actorID,
}, data);

var sendSuccess = (request, response, log, message, data) => {
    console.log(log);
    response.send({ status: 'success', message: message, data: data });
};

var sendError = (request, response, error, message, code = 500) => {
    console.log(error);
    response.status(code).send({ status: "error", message: message, error: error.toString() });
};

var fieldFilter = (data, acceptedData, deleteNulls = true) => {
    for (let attributeName in data) {
        if (!acceptedData.includes(attributeName) || (deleteNulls && data[attributeName] === null)) {
            delete data[attributeName];
        }
    }

    return data;
};

var typeCheck = (request, response, data, acceptedTypes, acceptUndefined = false) => {
    for (let attributeName in acceptedTypes) {
        if (typeof data[attributeName] !== 'undefined') {
            if (typeof data[attributeName] !== acceptedTypes[attributeName]) {
                sendError(
                    request,
                    response,
                    new Error(attributeName + " is " + (typeof data[attributeName]) + "." + attributeName + " should be a " + acceptedTypes[attributeName]),
                    attributeName + " should be a " + acceptedTypes[attributeName],
                    400
                );

                return false;
            }
        } else if (!acceptUndefined) {
            sendError(
                request,
                response,
                new Error("The data provided has no \"" + attributeName + "\" field."),
                "Consider removing \"" + attributeName + "\" as a type check requirement",
                400
            );

            return false;
        }
    }

    return true;
};


module.exports = {
    log,
    sendSuccess,
    sendError,
    fieldFilter,
    typeCheck
};