import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PocketData, ClientTaskData, ClientTaskType, Point3D } from "../custom-types";
import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";
import qh from 'quickhull3d';

const pocketVolumes = new Map<string, number>();

// https://stackoverflow.com/questions/1406029/how-to-calculate-the-volume-of-a-3d-mesh-object-the-surface-of-which-is-made-up-t
function SignedVolumeOfTriangle(p1: Point3D, p2: Point3D, p3: Point3D) {
    const v321 = p3.x*p2.y*p1.z;
    const v231 = p2.x*p3.y*p1.z;
    const v312 = p3.x*p1.y*p2.z;
    const v132 = p1.x*p3.y*p2.z;
    const v213 = p2.x*p1.y*p3.z;
    const v123 = p1.x*p2.y*p3.z;

    return (1.0/6.0)*(-v321 + v231 + v312 - v132 - v213 + v123);
}

export async function computePocketVolume(plugin: PluginUIContext, pocket: PocketData): Promise<ClientTaskData> {

    if(pocketVolumes.has(pocket.name)) {
        return {
            "numericValue": pocketVolumes.get(pocket.name),
            "type": ClientTaskType.Volume
        };
    }

    const coords = getPocketAtomCoordinates(plugin, pocket.surface);

    /*for(const coord of coords) {
        console.log(`${coord.x} ${coord.y} ${coord.z}`);
    }*/

    const points: Array<Array<number>> = [];
    coords.forEach(coord => points.push([coord.x, coord.y, coord.z]));

    const hull = qh(points); //compute the convex hull

    const volumes = [];
    
    for(const face of hull) {
        volumes.push(SignedVolumeOfTriangle(coords[face[0]], coords[face[1]], coords[face[2]]));
    }

    const finalVolume = Math.abs(volumes.reduce((a, b) => a + b, 0));

    pocketVolumes.set(pocket.name, finalVolume);

    const data: ClientTaskData = {
        "numericValue": finalVolume,
        "type": ClientTaskType.Volume
    };

    return data;
}
