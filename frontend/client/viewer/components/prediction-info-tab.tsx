import React from "react";
import { PredictionInfo } from "../../prankweb-api";

export default function PredictionInfoTab(props: { predictionInfo: PredictionInfo; }) {
    const pInfo = props.predictionInfo;
    const isUserProvided = pInfo.database.includes("user-upload");
    const isPredicted = pInfo.metadata.predictedStructure === true;

    let url = "";

    if (isPredicted) {
        url = `https://alphafold.ebi.ac.uk/entry/${pInfo.metadata.predictionName}`;
    }
    else if (!isUserProvided) { //this means that the structure is experimental
        url = `https://www.rcsb.org/structure/${pInfo.metadata.predictionName}`;
    }

    return (
        <div>
            <h2>Prediction info</h2>
            <ul>
                <li>Structure ID: {pInfo.id}</li>
                <li>Database: {pInfo.database}</li>
                <li>Created: {pInfo.created}</li>
                <li>Last change: {pInfo.lastChange}</li>
                <li>Metadata - structure name: {pInfo.metadata.structureName}</li>
                <li>Metadata - prediction name: <a href={url} target="_blank" rel="nofollow noopener noreferrer">{pInfo.metadata.predictionName}</a></li>
                <li>{isUserProvided ? "Structure provided by the user" : "Structure not provided by the user"}</li>
                <li>{pInfo.metadata.predictedStructure === true ? "Structure is predicted" : "Structure is not predicted"}</li>
                TODO: here we should add something about the prediction model (P2Rank version etc.)
            </ul>
        </div>
    );
}