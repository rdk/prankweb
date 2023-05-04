import React from "react";
import { Button } from '@mui/material';

import { PredictionInfo } from "../prankweb-api";
import { PocketData, ServerTaskType, Point3D } from "../custom-types";
import { ServerTaskData } from "../custom-types";

import PocketProperty from "../viewer/components/pocket-property";
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
        if(distance > maxDistance) {
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
 * @param firstFetch True if this is the first request (including fails), false otherwise
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @param hash Task identifier (hash)
 * @param serverTasks A list of all server tasks
 * @returns Completed task data
 */
export async function computeDockingTaskOnBackend(firstFetch: boolean, prediction: PredictionInfo, pocket: PocketData, hash: string, serverTasks: ServerTaskData[], plugin: PluginUIContext): Promise<any>{
    if(hash === "") {
        return;
    }

    let matchingTasks = (serverTasks.filter((e: ServerTaskData) => e.type === ServerTaskType.Docking && e.data.initialData.hash === hash && e.data.initialData.pocket === pocket.rank));

    //check if the task is finished
    if(matchingTasks.length !== 0) {
        if(matchingTasks[0].data.status === "successful") {
            const data = await fetch(`./api/v2/docking/${prediction.database}/${prediction.id}/public/result.json`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "hash": hash,
                }
            )}).then(res => res.json()).catch(err => console.log(err));
            if(!data) {
                return;
            }
        
            matchingTasks[0].data.responseData = data;
            return {
                "data": matchingTasks[0].data,
                "type": ServerTaskType.Docking
            };
        }
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
        //let the next call handle the response
    }
    ).catch(err => {
        console.log(err);
    });
    return;
}

/**
 * Returns a JSX element that renders the final data of this task.
 * @param responseData Response data received from the backend (i.e. the result of the task)
 * @param pocket Pocket data
 * @returns JSX element
 */
export function renderOnServerDockingTaskCompleted(taskData: ServerTaskData, pocket: PocketData, hash: string) {
    let shorterHash = hash;
    if(hash.length > 15) {
        shorterHash = hash.substring(0, 15) + "...";
    }
    return (
        <PocketProperty inDialog={true} title={"Docking task (" + shorterHash + ")"} data={
            //there should be only one result
            taskData.data.responseData.map((e: any) =>
                <Button variant="contained" color="success" size="small" onClick={() => downloadResult(hash, e.url)}>
                    Result
                </Button>
            )
        }/>
    );
}

/**
 * Returns a JSX element that renders the visuals when the task is running.
 * @param pocket Pocket data
 * @param hash Task identifier (hash)
 * @returns JSX element
 */
export function renderOnServerDockingTaskRunning(pocket: PocketData, hash: string) {
    let shorterHash = hash;
    if(hash.length > 15) {
        shorterHash = hash.substring(0, 15) + "...";
    }
    return (
        <PocketProperty inDialog={true} title={"Docking task (" + shorterHash + ")"} data={"running"}/>
    );
}

/**
 * Returns a JSX element that renders the visuals when the task failed.
 * @param pocket Pocket data
 * @param hash Task identifier (hash)
 * @returns JSX element
*/
export function renderOnServerDockingTaskFailed(pocket: PocketData, hash: string) {
    let shorterHash = hash;
    if(hash.length > 15) {
        shorterHash = hash.substring(0, 15) + "...";
    }
    return (
        <PocketProperty inDialog={true} title={"Docking task (" + shorterHash + ")"} data={"failed"}/>
    );
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
function downloadResult(hash: string, fileURL: string) {
    // https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js
    fetch(fileURL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
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
