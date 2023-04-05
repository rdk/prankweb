import React from "react";

import { PredictionInfo } from "../prankweb-api";
import { PocketData, ServerTaskType } from "../custom-types";
import { ServerTaskData } from "../custom-types";

import PocketProperty from "../viewer/components/pocket-property";

/**
 * Sends requests to the backend to compute the sample task and periodically checks if the task is finished.
 * @param firstFetch True if this is the first request (including fails), false otherwise
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @param hash Task identifier (hash)
 * @param serverTasks A list of all server tasks
 * @returns Completed task data
 */
export async function computeSampleTaskOnBackend(firstFetch: boolean, prediction: PredictionInfo, pocket: PocketData, hash: string, serverTasks: ServerTaskData[]): Promise<any>{
    if(hash === "") {
        return;
    }
    await fetch(`./api/v2/sample/${prediction.database}/${prediction.id}/post`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
            "pocket": pocket.rank,
        }),
    }).then((res) => {
        setTimeout(() => {}, 500); //wait for the backend to process the request
    }
    ).catch(err => {
        console.log(err);
    });

    //check if the task is finished
    let matchingTasks = (serverTasks.filter((e: ServerTaskData) => e.type === ServerTaskType.Sample && e.data.initialData.hash === hash && e.data.initialData.pocket === pocket.rank));

    if(matchingTasks.length === 0) {
        return;
    }

    if(matchingTasks[0].data.status !== "successful") {
        return;
    }

    const data = await fetch(`./api/v2/sample/${prediction.database}/${prediction.id}/public/result.json`, {
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
        "type": ServerTaskType.Sample
    };
}

/**
 * Returns a JSX element that renders the final data of this task.
 * @param responseData Response data received from the backend (i.e. the result of the task)
 * @param pocket Pocket data
 * @returns JSX element
 */
export function renderOnServerSampleTaskCompleted(taskData: ServerTaskData, pocket: PocketData, hash: string) {
    return (
        <PocketProperty inDialog={true} title={"Sample task (" + hash + ")"} data={
            taskData.data.responseData.find((p: any) => p.rank === pocket.rank)?.count
        }/>
    );
}

export function renderOnServerSampleTaskRunning(pocket: PocketData, hash: string) {
    return (
        <PocketProperty inDialog={true} title={"Sample task (" + hash + ")"} data={"running"}/>
    );
}