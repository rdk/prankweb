import { getApiEndpoint } from "../prankweb-api";
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { loadStructureIntoMolstar, createPocketsGroupFromJson, linkMolstarToRcsb, getSelectionFromIndices, addPredictedPolymerRepresentation } from './molstar-visualise';
import { PredictionData } from "../custom-types";
import { initRcsb } from './rcsb-visualise'
import { RcsbFv } from "@rcsb/rcsb-saguaro";

export async function sendDataToPlugins(molstarPlugin: PluginUIContext, database: string, identifier: string, structureName: string, predicted: boolean) : Promise<[PredictionData, RcsbFv]>{
    const baseUrl: string = getApiEndpoint(database, identifier) + "/public";
    
    /*console.log(`${baseUrl}/${structureName}`)
    console.log(`${baseUrl}/prediction.json`);*/

    // Download pdb/mmcif and create a model in Mol*.
    const molData = await loadStructureIntoMolstar(molstarPlugin, `${baseUrl}/${structureName}`, predicted).then(result => result);
    
    let structure = molData[1];

    // Download the prediction.
    let prediction : PredictionData = await downloadJsonFromUrl(`${baseUrl}/prediction.json`);

    // Initialize RCSB plugin + link it to Mol*.
    let rcsbPlugin : RcsbFv = initRcsb(prediction, molstarPlugin);

    // Add pockets etc. from the prediction to Mol*.
    await createPocketsGroupFromJson(molstarPlugin, structure, "Pockets", prediction);

    //TODO: Add predicted representation
    //if(predicted) await addPredictedPolymerRepresentation(molstarPlugin, prediction, structure);

    // Link Molstar to RCSB.
    linkMolstarToRcsb(molstarPlugin, prediction, rcsbPlugin);
    
    // Compute average conservation for each pocket.
    prediction = computePocketConservationAverage(prediction);

    return [prediction, rcsbPlugin];
}

function getResidueIndices(toBeFound: string[], allResidues: string[]) {
    let final : number[] = [];
    toBeFound.forEach(residue => {
        let index = allResidues.indexOf(residue);
        if (index > -1) {
            final.push(index);
        }
    });
    return final;
}

function computePocketConservationAverage(data: PredictionData) {
    if (!data.structure.scores) {
        data.pockets.forEach(pocket => {pocket.avgConservation = 0});
    }

    data.pockets.forEach(pocket => {
        let avg = 0;
        getResidueIndices(pocket.residues, data.structure.indices).forEach(index => {
            if(data.structure.scores.conservation) {
                avg += data.structure.scores.conservation[index];
            }
            else if(data.structure.scores.plddt) {
                avg += data.structure.scores.plddt[index];
            }
        });
        avg /= pocket.residues.length;
        pocket.avgConservation = Number(avg.toFixed(3));
    });

    return data;
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