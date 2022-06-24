import LiteMol from "litemol";
import {
  PrankPocket,
  PocketListEntity,
  Colors,
  ParseAndCreatePrediction,
} from "./prediction-entity";
import {SequenceListEntity} from "./sequence/sequence-model";
import {LoadSequenceFromJson} from "./sequence/sequence-loader";
import {getApiEndpoint} from "../prankweb-api";

export interface PrankData {
  model: LiteMol.Bootstrap.Entity.Molecule.Model;
  prediction: PocketListEntity;
  sequence: SequenceListEntity;
}

export const TREE_REF_SURFACE: string = 'polymer-visual-surface';

export const TREE_REF_ATOMS: string = 'polymer-visual-atoms';

export const TREE_REF_CARTOON: string = 'polymer-visual-cartoon';

export const CONFIDENT_REF_PREFIX: string = 'confidence-';

export const TREE_REF_CONFIDENT_SURFACE: string =
  CONFIDENT_REF_PREFIX + 'polymer-visual-surface';

export const TREE_REF_CONFIDENT_ATOMS: string =
  CONFIDENT_REF_PREFIX + 'polymer-visual-atoms';

export const TREE_REF_CONFIDENT_CARTOON: string =
  CONFIDENT_REF_PREFIX + 'polymer-visual-cartoon';

const TEMP_FACTOR_THRESHOLD: number = 70;

export function residuesBySeqNums(...seqNums: string[]) {
  return LiteMol.Core.Structure.Query.residues(...seqNums.map(seqNum => {
    let parsedObject = seqNum.trim().match(/^([A-Z]*)_?([0-9]+)([A-Z])*$/);
    if (parsedObject == null) {
      console.warn(
        "Cannot parse residue from seq. number:",
        JSON.stringify(seqNum), parsedObject);
      return {};
    }
    let result: LiteMol.Core.Structure.Query.ResidueIdSchema = {};
    if (parsedObject[1]) { // Chain found
      result.authAsymId = parsedObject[1]
    }
    if (parsedObject[2]) { // ResId found
      result.authSeqNumber = parseInt(parsedObject[2])
    }
    if (parsedObject[3]) { // InsCode found
      result.insCode = parsedObject[3]
    }
    return result;
  }));
}

export function loadData(
  plugin: LiteMol.Plugin.Controller,
  database: string,
  identifier: string,
  structureName: string
) {
  return new LiteMol.Promise<PrankData>((accept, reject) => {
    plugin.clear();
    const baseUrl: string = getApiEndpoint(database, identifier) + "/public";
    // Download pdb and create a model.
    let model = plugin.createTransform().add(
      plugin.root, LiteMol.Bootstrap.Entity.Transformer.Data.Download, {
        "url": `${baseUrl}/${structureName}`,
        "type": "String",
        "id": database
      })
      .then(LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateFromData, {
        "format": structureName.toLowerCase().endsWith(".cif") ?
          LiteMol.Core.Formats.Molecule.SupportedFormats.mmCIF :
          LiteMol.Core.Formats.Molecule.SupportedFormats.PDB
      }, {"isBinding": true})
      .then(LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateModel, {
        "modelIndex": 0
      }, {"ref": "model"});

    // Download and parse predictions.
    const predictions = model.add(
      plugin.root, LiteMol.Bootstrap.Entity.Transformer.Data.Download,
      {
        "url": `${baseUrl}/prediction.json`,
        "type": "String",
        "id": "predictions"
      }, {
        "isHidden": true
      }
    ).then(LiteMol.Bootstrap.Entity.Transformer.Data.ParseJson, {
      "id": "prankweb-predictions"
    });
    console.log(`${baseUrl}/prediction.json`);

    predictions.then(ParseAndCreatePrediction, {}, {
      "ref": "pockets",
      "isHidden": true
    });

    predictions.then(LoadSequenceFromJson, {}, {
      "ref": "sequence",
      "isHidden": true,
    });

    plugin.applyTransform(model).then(function () {}).catch((e) => reject(e));
  });
}