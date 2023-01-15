import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PocketData, ClientTaskData } from "../custom-types";
import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";

//const pocketVolumes = new Map<string, Promise<ClientTaskData>>();

export async function computePocketVolume(plugin: PluginUIContext, pocket: PocketData) {

    /*if(pocketVolumes.has(pocket.name)) {
        return pocketVolumes.get(pocket.name)!;
    }*/

    const coords = getPocketAtomCoordinates(plugin, pocket.surface);

    for(const coord of coords) {
        console.log(`${coord.x} ${coord.y} ${coord.z}`);
    }

    const data = { "numericValue": 420 };

    //pocketVolumes.set(pocket.name, Promise.resolve(data));

    await new Promise(resolve => setTimeout(resolve, 2000));
    return data;
}
