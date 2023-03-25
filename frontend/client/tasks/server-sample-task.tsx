import React from "react";

import { PredictionInfo } from "../prankweb-api";
import { PocketData } from "../custom-types";
import { ServerTaskData } from "../custom-types";

export async function computeSampleTaskOnBackend(firstFetch: boolean, prediction: PredictionInfo, pocket: PocketData, hash: string, serverTasks: ServerTaskData[]) {
    if(firstFetch) {
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
            //wait 3 seconds before checking if the task is finished
            setTimeout(() => {}, 3000);
            return res.json();
        }
        ).catch(err => {
            console.log(err);
            setTimeout(() => computeSampleTaskOnBackend(true, prediction, pocket, hash, serverTasks), 1000); //repeat the request
        });
    }

    //check if the task is finished
    let matchingTasks = (serverTasks.filter((e: ServerTaskData) => e.data.initialData.hash === hash && e.data.initialData.pocket === pocket.rank));

    if(matchingTasks.length === 0) {
        setTimeout(() => computeSampleTaskOnBackend(false, prediction, pocket, hash, serverTasks), 1000); //repeat the request
        return;
    }

    if(matchingTasks[0].data.status !== "successful") {
        setTimeout(() => computeSampleTaskOnBackend(false, prediction, pocket, hash, serverTasks), 1000); //repeat the request
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
        setTimeout(() => computeSampleTaskOnBackend(false, prediction, pocket, hash, serverTasks), 3000); //repeat the request
        return;
    }

    matchingTasks[0].data.responseData = data;
    return data;
}

export function renderOnServerSampleTaskCompleted(responseData: any, pocket: PocketData) {
    return (
        <span style={{float: "right", marginLeft: "1rem"}}>
            {responseData.filter((e: any) => e["rank"] == pocket.rank)[0]["count"]}
        </span>
    );
}