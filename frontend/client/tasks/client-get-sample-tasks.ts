import { ClientTaskData, ClientTaskType } from "../custom-types";
import { PredictionInfo } from "../prankweb-api";

export async function getSampleTaskCount(prediction: PredictionInfo): Promise<ClientTaskData> {

    const json = await fetch(`./api/v2/sample/${prediction.database}/${prediction.id}/tasks`).then(res => res.json()).catch(err => console.log(err));
    //TODO: handle error in a better way
    const numOfTasks = json["tasks"].length;
    return {
        "numericValue": numOfTasks,
        "type": ClientTaskType.SampleTaskCount
    };
}