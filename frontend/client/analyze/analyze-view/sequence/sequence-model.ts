import LiteMol from "litemol";

export interface Sequence {
  indices: string[]
  sequence: string[]
  scores: number[]
  scoresLabel: string
  regions: Array<{ name: string, start: number, end: number }>
  bindingSites: number[]
}

export interface SequenceListEntity extends LiteMol.Bootstrap.Entity<{ sequence: Sequence }> {
}

export const SequenceModel = LiteMol.Bootstrap.Entity.create<{ sequence: Sequence }>({
  "name": "Protein sequence",
  "typeClass": "Data",
  "shortName": "PS",
  "description": "Represents sequence of the protein."
});
