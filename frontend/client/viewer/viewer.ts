import { renderProteinView } from "./application";

import "../bootstrap.scss";
import { fetchPrediction } from "../prankweb-api";

/**
 * A function that handles wrong input.
 */
function handleError() {
    document.getElementById('message')!.style.display = 'block';
    document.getElementById('message-text')!.innerHTML = "<br/>Incomplete or incorrect task specification.<br/>Please go back to the <a href='/'>home page</a>.";
    document.getElementById('analyze')!.style.display = 'none';
}

/**
 * A function that initializes the viewer.
 * @returns void
 */
async function initialize() {
    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");
    const database = params.get("database");

    if(id === null || database === null) {
        handleError();
        return;
    }

    const predictionInfo = await fetchPrediction(database, id);

    if(predictionInfo.content === null) {
        handleError();
        return;
    }

    document.getElementById('footer')!.style.display = 'none';
    renderProteinView(predictionInfo.content);
};

initialize();