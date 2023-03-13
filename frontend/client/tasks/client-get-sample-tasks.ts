import { ClientTaskData, ClientTaskType } from "../custom-types";
import { PredictionInfo } from "../prankweb-api";

export async function getSampleTaskCount(prediction: PredictionInfo): Promise<ClientTaskData> {

    const json = await fetch(`./api/v2/sample/${prediction.database}/${prediction.id}/tasks`).then(res => res.json()).catch(err => { console.log(err); setTimeout(() => getSampleTaskCount(prediction), 1000)} );
    if(json) {
        const numOfTasks = json["tasks"].length;
        return {
            "numericValue": numOfTasks,
            "type": ClientTaskType.SampleTaskCount
        };
    }
    return {
        "numericValue": 0,
        "type": ClientTaskType.SampleTaskCount
    }
}