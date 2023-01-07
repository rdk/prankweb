import { SampleJSONData } from "../custom-types";

let computed = false;

export async function sendRandomJSONData() : Promise<SampleJSONData> {
    const data = { "value": 420 };
    if (computed) return data;
    
    computed = true;
    await new Promise(resolve => setTimeout(resolve, 2000));
    return data;
}
