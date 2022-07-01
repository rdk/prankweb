import { getApiEndpoint } from "../prankweb-api";
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { loadStructureIntoMolstar } from './molstar-visualise';
import { PredictionData } from "./types";
import { initRcsb } from './rcsb-visualise'
import { RcsbFv, RcsbFvDisplayTypes, RcsbFvTrackDataElementInterface, RcsbFvRowConfigInterface, RcsbFvBoardConfigInterface, RcsbFvTrackData } from "@rcsb/rcsb-saguaro";

export async function sendDataToPlugins(molstarPlugin: PluginUIContext, rcsbPlugin: RcsbFv, database: string, identifier: string, structureName: string) {
    return new Promise(async (accept, reject) => {
        const baseUrl: string = getApiEndpoint(database, identifier) + "/public";
        
        /*console.log(`${baseUrl}/${structureName}`)
        console.log(`${baseUrl}/prediction.json`);*/

        // Download pdb/mmcif and create a model in Mol*.
        loadStructureIntoMolstar(molstarPlugin, `${baseUrl}/${structureName}`);

        // Download the prediction.
        const prediction : PredictionData = await downloadJsonFromUrl(`${baseUrl}/prediction.json`);

        // Initialize RCSB plugin.
        initRcsb(prediction, rcsbPlugin);

        // TODO: Add pockets etc. from the prediction to Mol*.

    });
}

async function downloadJsonFromUrl(url: string) {
    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        const jsonResp = await response.json();
        return jsonResp;
    } catch (error) {
        console.error(error);
    }
  }