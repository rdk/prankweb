import { PredictionInfo } from "../prankweb-api";
import { PocketData, Point3D } from "../custom-types";

import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";

/**
 * Computes distance of 2 points in 3D space.
 * @param point1 First point
 * @param point2 Second point
 * @returns Distance between the points
*/
function twoPointsDistance(point1: Point3D, point2: Point3D) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2) + Math.pow(point1.z - point2.z, 2));
}

/**
 * Computes a bounding box for the given pocket.
 * @param plugin Mol* plugin
 * @param pocket Pocket data
 * @returns Bounding box
*/
function computeBoundingBox(plugin: PluginUIContext, pocket: PocketData) {
    const coords: Point3D[] = getPocketAtomCoordinates(plugin, pocket.surface);

    const center: Point3D = {
        x: Number(pocket.center[0]),
        y: Number(pocket.center[1]),
        z: Number(pocket.center[2])
    };
    //compute max distance from the center
    let maxDistance = 0;
    coords.forEach(coord => {
        const distance = twoPointsDistance(coord, center);
        if (distance > maxDistance) {
            maxDistance = distance;
        }
    });

    let diagonal = maxDistance * 2;
    let sideLength = diagonal / Math.sqrt(3);

    return {
        center: {
            x: center.x,
            y: center.y,
            z: center.z
        },
        size: {
            x: Math.ceil(sideLength),
            y: Math.ceil(sideLength),
            z: Math.ceil(sideLength)
        }
    };
}

/**
 * Sends requests to the backend to compute the docking task and periodically checks if the task is finished.
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @param hash Task identifier (hash)
 * @param plugin Mol* plugin
 * @returns Completed task data
 */
export async function computeDockingTaskOnBackend(prediction: PredictionInfo, pocket: PocketData, hash: string, plugin: PluginUIContext): Promise<any> {
    if (hash === "") {
        return;
    }

    const box = computeBoundingBox(plugin, pocket);

    await fetch(`./api/v2/docking/${prediction.database}/${prediction.id}/post`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
            "pocket": pocket.rank,
            "bounding_box": box
        }),
    }).then((res) => {
        console.log(res);
    }
    ).catch(err => {
        console.log(err);
    });
    return;
}

/**
 * Returns a hash that identifies this task, in this case directly the user input.
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @param formData Form data (user input)
 * @returns Computed hash
*/
export function dockingHash(prediction: PredictionInfo, pocket: PocketData, formData: string) {
    return formData;
}

/**
 * Downloads the result of the task.
 * @param hash Task identifier (hash)
 * @param fileURL URL to download the result from
 * @returns void
*/
export function downloadDockingResult(hash: string, fileURL: string, pocket: string) {
    console.log(fileURL);
    // https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js
    fetch(fileURL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
            "pocket": pocket
        })
    })
        .then((response) => response.blob())
        .then((blob) => {
            // Create blob link to download
            const url = window.URL.createObjectURL(
                new Blob([blob]),
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `result.pdbqt`,
            );

            document.body.appendChild(link);
            link.click();
            link.parentNode!.removeChild(link);
        });
}
