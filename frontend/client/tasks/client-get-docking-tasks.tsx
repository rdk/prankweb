import React from "react";

import { ClientTaskData, ClientTaskType } from "../custom-types";
import { PredictionInfo } from "../prankweb-api";

/**
 * Fetches the number of tasks associated with this prediction.
 * @param prediction Prediction info
 * @returns Data with a number of tasks
*/
export async function getDockingTaskCount(prediction: PredictionInfo): Promise<ClientTaskData> {

    const json = await fetch(`./api/v2/docking/${prediction.database}/${prediction.id}/tasks`)
        .then(res => res.json())
        .catch(err => { 
            console.log(err);
            setTimeout(() => getDockingTaskCount(prediction), 1000);
        });

    if(json) {
        const numOfTasks = json["tasks"].length;
        return {
            "data": numOfTasks,
            "type": ClientTaskType.DockingTaskCount
        };
    }
    
    return {
        "data": 0,
        "type": ClientTaskType.DockingTaskCount
    }
}

/**
 * Renders the final data of this task as a JSX element.
 * @param data Data to render
 * @returns JSX element
 */
export function renderOnTaskDockingTasksCountCompleted(data: ClientTaskData) {
    return (
        <span style={{float: "right", marginLeft: "1rem"}}>{data.data}</span>
    );
}