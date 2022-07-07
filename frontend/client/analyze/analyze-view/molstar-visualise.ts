import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Color } from "molstar/lib/mol-util/color";
import { Asset } from "molstar/lib/mol-util/assets";
import { PredictionData, PocketData, MolstarResidue } from './types';
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { MolScriptBuilder as MS} from "molstar/lib/mol-script/language/builder";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { StructureSelection, QueryContext, StructureElement, StructureProperties, Unit, Bond } from "molstar/lib/mol-model/structure"
import { Script } from "molstar/lib/mol-script/script"
import {Canvas3D} from "molstar/lib/mol-canvas3d/canvas3d";
import { RcsbFv } from '@rcsb/rcsb-saguaro';
import {Loci} from "molstar/lib/mol-model/loci";

export async function loadStructureIntoMolstar(plugin: PluginUIContext, structureUrl: string) {
    // if (plugin) {
    //     await plugin.clear();
    // }
    /* let getUrl = (pdbId: string) => `https://www.ebi.ac.uk/pdbe/static/entry/${pdbId.toLowerCase()}_updated.cif`

    if(predicted) getUrl = (pdbId: string) => `https://alphafold.ebi.ac.uk/files/AF-${pdbId.toUpperCase()}-F1-model_v2.cif`
    */

    let data = await plugin.builders.data.download({
        url: Asset.Url(structureUrl),
        isBinary: false
    }, {state: {isGhost: true}});

    let trajectory;
    if(structureUrl.endsWith("cif")) trajectory = await plugin.builders.structure.parseTrajectory(data, "mmcif");
    else trajectory = await plugin.builders.structure.parseTrajectory(data, "pdb");

    const model = await plugin.builders.structure.createModel(trajectory);
    let structure = await plugin.builders.structure.createStructure(model, {name: 'model', params: {}});

    //adds polymer representation
    const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, 'polymer');
    if (polymer) {
        await plugin.builders.structure.representation.addRepresentation(polymer, {
            type: 'gaussian-surface', //molecular-surface is probably better, but slower
            //type: 'cartoon',
            color: 'uniform', colorParams: {value: Color(0xFFFFFF)}
        });
    }

    //adds water molecules
    const water = await plugin.builders.structure.tryCreateComponentStatic(structure, 'water');
    if (water) {
        await plugin.builders.structure.representation.addRepresentation(water, {
            //type: 'gaussian-surface',
            type: 'ball-and-stick',
        });
    }

    //adds ligands
    const ligands = await plugin.builders.structure.tryCreateComponentStatic(structure, 'ligand');
    if (ligands) {
        await plugin.builders.structure.representation.addRepresentation(ligands, {
            type: 'ball-and-stick',
        });
    }

    return [model, structure, polymer]
}

export async function createPocketsGroupFromJson(plugin: PluginUIContext, structure: any, groupName: string, prediction: PredictionData) {
    const builder = plugin.state.data.build();
    const group = builder.to(structure).apply(StateTransforms.Misc.CreateGroup, {label: groupName}, {ref: groupName})
    for(let i = 0; i < prediction.pockets.length; i++) {
        console.log(prediction);
        createPocketFromJsonByAtoms(plugin, structure, prediction.pockets[i], "Pocket " + (i+1), Number("0x" + prediction.pockets[i].color), group);
    }
    await builder.commit();
}

//creates pockets' representation one by one and assigns them to the group
async function createPocketFromJsonByAtoms(plugin: PluginUIContext, structure: any, pocket: PocketData, groupName: string, color: number, group: any) { //group should not be any but i cannot figure out the right type
    
    const group2 = group.apply(StateTransforms.Misc.CreateGroup, {label: groupName}, {ref: groupName}, {selectionTags: groupName});

    let x = pocket.surface;
    /*
    let pocketSurfaceAtomsQuery: LiteMol.Core.Structure.Query.Builder =
    LiteMol.Core.Structure.Query.atomsById.apply(null, pocket.surfAtomIds);
    */
    const expression2 = MS.struct.generator.atomGroups({
        'atom-test': MS.core.set.has([MS.set(...x.map(Number)), MS.struct.atomProperty.macromolecular.id()]) 
    });
    group2.apply(StateTransforms.Model.StructureSelectionFromExpression, {expression: expression2})
        .apply(StateTransforms.Representation.StructureRepresentation3D,
        createStructureRepresentationParams(plugin, structure.data, {
            type: 'gaussian-surface',
            color: 'uniform', colorParams: {value: Color(color)},
            size: 'physical', sizeParams: {scale: 1.10}
        })
    )
}

//focuses on the residues loci specidfied by the user, can be called from anywhere
export function highlightInViewerLabelIdWithoutFocus(plugin: PluginUIContext, chain: string, ids: number[]) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSelectionFromChainAuthId(plugin, chain, ids);
    let loci = StructureSelection.toLociWithSourceUnits(sel);
    //loci = StructureElement.Loci.firstResidue(loci);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
}

//focuses on the loci specidfied by the user, can be called from anywhere
export function highlightSurfaceAtomsInViewerLabelId(plugin: PluginUIContext, ids: string[], focus: boolean) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSurfaceAtomSelection(plugin, ids);
    let loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
    if(focus) plugin.managers.camera.focusLoci(loci);
}

function getSurfaceAtomSelection(plugin: PluginUIContext, ids: string[]) { //gets selection from surface atom numbers
    const expression2 = MS.struct.generator.atomGroups({
        'atom-test': MS.core.set.has([MS.set(...ids.map(Number)), MS.struct.atomProperty.macromolecular.id()]) 
    });
    //@ts-ignore
    return Script.getStructureSelection(expression2, plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);
}

function getSelectionFromChainAuthId(plugin: PluginUIContext, chainId: string, positions: number[]) { // gets selection from chainId
    const query = MS.struct.generator.atomGroups({
        'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), chainId]),
        'residue-test': MS.core.set.has([MS.set(...positions), MS.struct.atomProperty.macromolecular.auth_seq_id()]),
        'group-by': MS.struct.atomProperty.macromolecular.residueKey()
    });
    console.log(plugin.managers.structure.hierarchy.current.structures);
    //@ts-ignore
    return Script.getStructureSelection(query, plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);
}

//focuses on the loci specidfied by the user, can be called from anywhere
export function highlightInViewerAuthId(plugin: PluginUIContext, chain: string, ids: number[]) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSelectionFromChainAuthId(plugin, chain, ids);
    let loci = StructureSelection.toLociWithSourceUnits(sel);
    //loci = StructureElement.Loci.firstResidue(loci);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
    plugin.managers.camera.focusLoci(loci);
}

function getStructureElementLoci(loci: Loci): StructureElement.Loci | undefined {
    if (loci.kind == "bond-loci") {
        return Bond.toStructureElementLoci(loci);
    } else if (loci.kind == "element-loci") {
        return loci;
    }
    return undefined;
}

export function linkMolstarToRcsb(plugin: PluginUIContext, structureData: PredictionData, rcsbPlugin: RcsbFv) {
    //cc: https://github.com/scheuerv/molart/
    //listens for hover event over anything on Mol* plugin and then it determines
    //if it is loci of type StructureElement. If it is StructureElement then it
    //propagates this event from MolstarPlugin transformed as MolstarResidue.
    //in our modification it also highlights the section in RCSB viewer
    plugin.canvas3d?.interaction.hover.subscribe((event: Canvas3D.HoverEvent) => {
        const structureElementLoci = getStructureElementLoci(event.current.loci);
        console.log(rcsbPlugin);
        if(structureElementLoci)
        {
            const structureElement = StructureElement.Stats.ofLoci(structureElementLoci);
            const location = structureElement.firstElementLoc;
            const residue: MolstarResidue = {
                authName: StructureProperties.atom.auth_comp_id(location),
                name: StructureProperties.atom.label_comp_id(location),
                isHet: StructureProperties.residue.hasMicroheterogeneity(location),
                insCode: StructureProperties.residue.pdbx_PDB_ins_code(location),
                index: StructureProperties.residue.key(location),
                seqNumber: StructureProperties.residue.label_seq_id(location),
                authSeqNumber: StructureProperties.residue.auth_seq_id(location),
                chain: {
                    asymId: StructureProperties.chain.label_asym_id(location),
                    authAsymId: StructureProperties.chain.auth_asym_id(location),
                    entity: {
                        entityId: StructureProperties.entity.id(location),
                        index: StructureProperties.entity.key(location)
                    },
                    index: StructureProperties.chain.key(location)
                }
            };
            let toFind = residue.chain.authAsymId + "_" + residue.authSeqNumber;
            let element = structureData.structure.indices.indexOf(toFind);
            rcsbPlugin.setSelection({
                elements: {
                    begin: element + 1
                },
                mode: 'hover'
            })
            // console.log(residue);
            // console.log(plugin.managers.structure.hierarchy.current.structures[0].components);
            //highlightInViewer([60,61,62,63]);
            //this.mouseOverHighlightedResiduesInStructure = [structureElementLoci];
            //this.emitOnHover.emit(residue);
        }
    });
}