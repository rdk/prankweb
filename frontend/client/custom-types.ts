import { RcsbFv } from "@rcsb/rcsb-saguaro";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { StateTree } from "molstar/lib/mol-state/tree/immutable"
import { PredictionInfo } from "./prankweb-api";

export interface CustomWindow extends Window {
    MolstarPlugin: PluginUIContext;
    StateTree: StateTree;
    MS: any;
    Script: any;
    RcsbPlugin: RcsbFv;
}

export interface RegionData {
    name: string;
    start: number;
    end: number;
}

export interface ScoresData {
    conservation?: number[];
    plddt?: number[];
}

export interface StructureData {
    indices: string[];
    sequence: string[];
    binding: number[];
    regions: RegionData[];
    scores: ScoresData;
}

export interface PocketData {
    name: string;
    rank: string;
    score: string;
    probability: string;
    center: string[];
    residues: string[];
    surface: string[];
    color?: string; //color of the pocket, if any (e.g. "00ff00")
    isReactVisible?: boolean; //if the pocket is visible in the react component
    avgConservation?: number; //computed average conservation of the pocket
}

export interface Metadata {
}

export interface PredictionData {
    structure: StructureData;
    pockets: PocketData[];
    metadata: Metadata;
}

export const aminoCodeMap : any[] = [
    { letter: "A", code: "ALA", name: "Alanine" },
    { letter: "R", code: "ARG", name: "Arginine" },
    { letter: "N", code: "ASN", name: "Asparagine" },
    { letter: "D", code: "ASP", name: "Aspartic Acid" },
    { letter: "C", code: "CYS", name: "Cysteine" },
    { letter: "Q", code: "GLN", name: "Glutamine" },
    { letter: "E", code: "GLU", name: "Glutamic Acid" },
    { letter: "G", code: "GLY", name: "Glycine" },
    { letter: "H", code: "HIS", name: "Histidine" },
    { letter: "I", code: "ILE", name: "Isoleucine" },
    { letter: "L", code: "LEU", name: "Leucine" },
    { letter: "K", code: "LYS", name: "Lysine" },
    { letter: "M", code: "MET", name: "Methionine" },
    { letter: "F", code: "PHE", name: "Phenylalanine" },
    { letter: "P", code: "PRO", name: "Proline" },
    { letter: "S", code: "SER", name: "Serine" },
    { letter: "T", code: "THR", name: "Threonine" },
    { letter: "W", code: "TRP", name: "Tryptophan" },
    { letter: "Y", code: "TYR", name: "Tyrosine" },
    { letter: "V", code: "VAL", name: "Valine" },
];

// cc: https://github.com/scheuerv/molart/
export type MolstarResidue = {
    authName: string;
    authSeqNumber: number;
    chain: {
        asymId: string;
        authAsymId: string;
        entity: {
            entityId: string;
            index: number;
        };
        index: number;
    };
    index: number;
    insCode: string;
    isHet: boolean;
    name: string;
    seqNumber: number;
};

export type chainResidueAtom = {
    chain?: any,
    residue?: (r: any) => any,
    atom?: any
}

export enum PolymerViewType {
    Atoms = 0,
    Surface = 1,
    Cartoon = 2
}

export enum PocketsViewType {
    Atoms = 0,
    Surface = 1
}

export interface ReactApplicationProps {
    plugin: PluginUIContext,
    predictionInfo: PredictionInfo,
    polymerView: PolymerViewType,
    pocketsView: PocketsViewType,
}

export interface ReactApplicationState {
    isLoading: boolean,
    data: PredictionData,
    error: Error | undefined,
    polymerView: PolymerViewType,
    pocketsView: PocketsViewType,
    isShowOnlyPredicted: boolean,
    pluginRcsb: RcsbFv | undefined,
}