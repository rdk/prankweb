import React from "react";

import { ClientTask, ClientTaskType, PocketData, ServerTaskInfo } from "../custom-types";
import { PredictionInfo } from "../prankweb-api";

/**
 * Fetches the number of tasks associated with this prediction.
 * @param prediction Prediction info
 * @returns Data with a number of tasks
*/
export async function getDockingTaskCount(prediction: PredictionInfo, pocket: PocketData): Promise<ClientTask> {

    const json = await fetch(`./api/v2/docking/${prediction.database}/${prediction.id}/tasks`)
        .then(res => res.json())
        .catch(err => { 
            console.log(err);
            setTimeout(() => getDockingTaskCount(prediction, pocket), 1000);
        });

    if(json) {
        const numOfTasks = json["tasks"].filter((task: ServerTaskInfo) => task.initialData.pocket == pocket.rank).length;
        return {
            "data": numOfTasks,
            "pocket": pocket.rank,
            "type": ClientTaskType.DockingTaskCount
        };
    }
    
    return {
        "data": 0,
        "pocket": pocket.rank,
        "type": ClientTaskType.DockingTaskCount
    }
}

/**
 * Renders the final data of this task as a JSX element.
 * @param data Data to render
 * @returns JSX element
 */
export function renderOnTaskDockingTasksCountCompleted(data: ClientTask) {
    return (
        <span style={{float: "right", marginLeft: "1rem"}}>{data.data}</span>
    );
}