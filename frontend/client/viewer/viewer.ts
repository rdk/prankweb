import { renderProteinView } from "./application";

import "../bootstrap.scss";

function getPredictionInfoFromUrl() {
    const params = new URLSearchParams(window.location.search);

    let id = params.get("id");
    let database = params.get("database");
    let created = params.get("created");
    let lastChange = params.get("lastChange");
    let structureName = params.get("structureName");
    let predictionName = params.get("predictionName");

    if (id === null || database === null || created === null || lastChange === null || structureName === null || predictionName === null) {
        return null;
    }

    let predictedStructure = params.get("predictedStructure");
    if (predictedStructure && predictedStructure === "undefined") {
        predictedStructure = "false";
    }

    return {
        "id": id,
        "database": database,
        "created": created,
        "lastChange": lastChange,
        "status": "successful", //because we got here we know the task is finished
        "metadata": {
            "structureName": structureName,
            "predictionName": predictionName,
            "predictedStructure": (predictedStructure === 'true'),
        }
    }
}

(function initialize() {
    const data = getPredictionInfoFromUrl();
    if(data === null) {
        document.getElementById('message-text')!.innerHTML = "<br/>Incomplete task specification.<br/>Please go back to the <a href='/'>home page</a>.";
        document.getElementById('analyze')!.style.display = 'none';
        return;
    }
    renderProteinView(data!); //we have already checked that data is not null
})();
