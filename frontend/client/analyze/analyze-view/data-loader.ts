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

interface Coloring {
  atoms: Uint8Array;
  atomsConservation: Uint8Array;
  residues: Uint8Array;
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

const cartoonsColors = LiteMol.Bootstrap.Visualization.Molecule.UniformBaseColors;

const surfaceColors = LiteMol.Bootstrap.Immutable.Map<string, LiteMol.Visualization.Color>()
  .set('Uniform', LiteMol.Visualization.Color.fromHex(0xffffff))
  .set('Selection', LiteMol.Visualization.Theme.Default.SelectionColor)
  .set('Highlight', LiteMol.Visualization.Theme.Default.HighlightColor);

const ligandColors = LiteMol.Bootstrap.Immutable.Map<string, LiteMol.Visualization.Color>()
  .set('Uniform', LiteMol.Visualization.Color.fromHex(0xe5cf42))
  .set('Selection', LiteMol.Visualization.Theme.Default.SelectionColor)
  .set('Highlight', LiteMol.Visualization.Theme.Default.HighlightColor);

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

    predictions.then(ParseAndCreatePrediction, {}, {
      "ref": "pockets",
      "isHidden": true
    });

    predictions.then(LoadSequenceFromJson, {}, {
      "ref": "sequence",
      "isHidden": true,
    });

    plugin.applyTransform(model)
      .then(function () {
        let model = plugin.context.select("model")[0] as LiteMol.Bootstrap.Entity.Molecule.Model;
        let prediction = plugin.context.select("pockets")[0] as PocketListEntity;
        let sequence = plugin.context.select("sequence")[0] as SequenceListEntity;
        console.log("Apply transform:\n  model:", model,
          "\n  prediction:", prediction,
          "\n  sequence:", sequence);

       const mappings = initColorMapping(model, prediction, sequence);
       setAtomColorMapping(plugin, model, mappings.atoms);
       setConservationAtomColorMapping(plugin, model, mappings.atomsConservation);
       setResidueColorMapping(plugin, model, mappings.residues);
        if (!prediction)
          reject("Unable to load predictions.");
        else if (!sequence)
          reject("Unable to load protein sequence.");
        else {
          accept({model, prediction, sequence});
        }
      })
      .catch((e) => reject(e));
  });
}

function initColorMapping(
  modelContainer: LiteMol.Bootstrap.Entity.Molecule.Model,
  prediction: PocketListEntity, sequence: SequenceListEntity): Coloring {
  //
  const model = modelContainer.props.model;
  const atomColorMapConservation = new Uint8Array(model.data.atoms.count);
  const atomColorMap = new Uint8Array(model.data.atoms.count);
  const residueColorMap = new Uint8Array(model.data.atoms.count);

  let seq = sequence.props.sequence;
  let seqIndices = seq.indices;
  let seqScores = seq.scores;

  const seqScoreMin = Math.min.apply(Math, seqScores);
  const seqScoreMax = Math.max.apply(Math, seqScores);
  const seqScoreRange = seqScoreMax - seqScoreMin;

  if (seqScores != null) {
    seqIndices.forEach((seqIndex, i) => {
      // Scale to value [0,1].
      let normalizedScore = (seqScores[i] - seqScoreMin) / seqScoreRange;
      // Move [0,1] to [-1,0] and with abs [1,0]. So high values are black.
      normalizedScore = Math.abs(normalizedScore - 1);
      // The shade needs to be number [0, 10] from black to white.
      const shade = 2 + Math.round(normalizedScore * 8);
      //
      let query = residuesBySeqNums(seqIndex).compile();
      for (const atom of query(model.queryContext).unionAtomIndices()) {
        // First there is fallbackColor(0), then pocketColors(1-9) and lastly conservation colors.
        atomColorMap[atom] = shade + Colors.size + 1;
        atomColorMapConservation[atom] = shade + Colors.size + 1;
        residueColorMap[atom] = shade + Colors.size + 1;
      }
    });
  }

  let pockets = prediction.props.pockets;
  pockets.forEach((pocket, i) => {
    let pocketQuery = LiteMol.Core.Structure.Query.atomsById.apply(null, pocket.surfAtomIds).compile()
    let pocketResQuery = residuesBySeqNums(...pocket.residueIds).compile()
    // Index of color that we want for the particular atom. i.e. Colors.get(i%Colors.size);
    const colorIndex = (i % Colors.size) + 1;
    for (const atom of pocketQuery(model.queryContext).unionAtomIndices()) {
      atomColorMap[atom] = colorIndex;
    }
    for (const atom of pocketResQuery(model.queryContext).unionAtomIndices()) {
      residueColorMap[atom] = colorIndex;
    }
  });
  return {
    "atoms": atomColorMap,
    "atomsConservation": atomColorMapConservation,
    "residues": residueColorMap,
  };
}

/**
 * As all data are loaded this creates records in LiteMol.
 */
export function visualizeData(
  plugin: LiteMol.Plugin.Controller, data: PrankData, crateConfident: boolean
) {
  return new LiteMol.Promise<PrankData>((accept, reject) => {
    let action = plugin.createTransform();

    createPolymerGroups(data, action);
    if (crateConfident) {
      createConfidentPolymerGroups(data, action);
    }
    createWaterGroup(data, action);
    createLigandGroup(data, action);
    createPocketsGroup(data, action, data.prediction.props.pockets);

    plugin.applyTransform(action)
      .then(() => accept(data))
      .catch((error) => reject(error));
  });
}

function createPolymerGroups(
  data: PrankData, action: LiteMol.Bootstrap.Tree.Transform.Builder) {
  const polymer = action.add(
    data.model,
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": LiteMol.Core.Structure.Query.nonHetPolymer(),
      "name": "Polymer",
      "silent": true
    }, {
      "isBinding": true,
      "ref": "polymer"
    });

  addPolymerVisualisations(polymer);
}

function addPolymerVisualisations(polymer: LiteMol.Bootstrap.Tree.Transform.Builder, refPrefix = "") {
  // Add visual styles for Polymer.
  const colPolymerGroup = polymer.then(
    LiteMol.Bootstrap.Entity.Transformer.Basic.CreateGroup, {
      "label": "Color view",
      "description": "Colored views"
    });
  // Cartoon
  colPolymerGroup.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {"style": createCartoonStyle()},
    {"ref": refPrefix + TREE_REF_CARTOON}
  );
  // Surface
  colPolymerGroup.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {"style": createSurfaceStyle()},
    {"ref": refPrefix + TREE_REF_SURFACE});
  // Balls and sticks
  colPolymerGroup.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {"style": createBallsAndSticksStyle()},
    {"ref": refPrefix + TREE_REF_ATOMS});
}

function createCartoonStyle(): LiteMol.Bootstrap.Visualization.Molecule.Style<any> {
  return {
    "type": "Cartoons",
    "params": {
      "detail": "Automatic"
    },
    "theme": {
      "template": LiteMol.Bootstrap.Visualization.Molecule.Default.UniformThemeTemplate,
      "colors": cartoonsColors
    }
  };
}

function createSurfaceStyle(): LiteMol.Bootstrap.Visualization.Molecule.Style<LiteMol.Bootstrap.Visualization.Molecule.SurfaceParams> {
  return {
    "type": "Surface",
    "params": {
      "probeRadius": 0.55,
      "density": 1.4,
      "smoothing": 4,
      "isWireframe": false
    },
    "theme": {
      "template": LiteMol.Bootstrap.Visualization.Molecule.Default.UniformThemeTemplate,
      "colors": surfaceColors,
      "transparency": {
        "alpha": 0.6
      }
    }
  }
}

function createBallsAndSticksStyle(): LiteMol.Bootstrap.Visualization.Molecule.Style<any> {
  return LiteMol.Bootstrap.Visualization.Molecule.Default
    .ForType.get("BallsAndSticks") as any;
}

function createConfidentPolymerGroups(
  data: PrankData, action: LiteMol.Bootstrap.Tree.Transform.Builder) {
  const atoms = data.model.props.model.data.atoms;
  const confidentResidues =
    atoms.residueIndex.filter((element, index) =>
      atoms.tempFactor[index] > TEMP_FACTOR_THRESHOLD
    );
  const confidentQuery =
    LiteMol.Core.Structure.Query.residuesFromIndices(confidentResidues);
  const confidencePolymer = action.add(
    data.model,
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": confidentQuery,
      "name": `Confident Polymer ${TEMP_FACTOR_THRESHOLD}`
    },
    {
      "ref": "confidence",
      "isBinding": false
    }
  );
  addPolymerVisualisations(confidencePolymer, CONFIDENT_REF_PREFIX);
}


function createWaterGroup(data: PrankData, action: LiteMol.Bootstrap.Tree.Transform.Builder) {
  let water = action.add(
    data.model,
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": LiteMol.Core.Structure.Query.entities({"type": "water"}),
      "name": "Water",
      "silent": true
    }, {
      "isBinding": true,
      "ref": "water"
    });
  water.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {
      "style": createBallsAndSticksStyleWater()
    });
}

function createBallsAndSticksStyleWater(): LiteMol.Bootstrap.Visualization.Molecule.Style<LiteMol.Bootstrap.Visualization.Molecule.BallsAndSticksParams> {
  return {
    type: "BallsAndSticks",
    params: {
      useVDW: false,
      atomRadius: 0.23,
      bondRadius: 0.09,
      detail: "Automatic"
    },
    theme: {
      template: LiteMol.Bootstrap.Visualization.Molecule.Default.ElementSymbolThemeTemplate,
      colors: LiteMol.Bootstrap.Visualization.Molecule.Default.ElementSymbolThemeTemplate.colors,
      transparency: {alpha: 0.25}
    }
  }
}

function createLigandGroup(data: PrankData, action: LiteMol.Bootstrap.Tree.Transform.Builder) {
  let ligand = action.add(
    data.model,
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": LiteMol.Core.Structure.Query.hetGroups(),
      "name": "HET",
      "silent": true
    }, {
      "isBinding": true
    });
  ligand.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {
      "style": createBallsAndSticksStyleLigand()
    }
  );
}

function createBallsAndSticksStyleLigand(): LiteMol.Bootstrap.Visualization.Molecule.Style<LiteMol.Bootstrap.Visualization.Molecule.BallsAndSticksParams> {
  return {
    type: "BallsAndSticks",
    params: LiteMol.Bootstrap.Visualization.Molecule.Default.BallsAndSticksParams,
    theme: {
      template: LiteMol.Bootstrap.Visualization.Molecule.Default.UniformThemeTemplate,
      colors: ligandColors,
      transparency: {alpha: 1}
    }
  }
}

function createPocketsGroup(data: PrankData, action: LiteMol.Bootstrap.Tree.Transform.Builder, pockets: PrankPocket[]) {
  let pocketGroup = action.add(data.model, LiteMol.Bootstrap.Entity.Transformer.Basic.CreateGroup, {
    "label": "Pockets",
    "description": "This group contains all pockets predicted using p2rank."
  }, {
    "ref": "pockets"
  });
  // For each pocket create selections, but don't create any visuals for them.
  pockets.forEach((pocket) => {
    createPocketGroup(pocketGroup, pocket);
  });
}

/**
 * As groups does not show without visualisation we need to add one.
 */
function createPocketGroup(pocketsGroup: LiteMol.Bootstrap.Tree.Transform.Builder, pocket: PrankPocket) {
  // One group for one pocket.
  let pocketGroup = pocketsGroup.then(LiteMol.Bootstrap.Entity.Transformer.Basic.CreateGroup, {
    "label": pocket.name,
    "description": pocket.name
  }, {
    "ref": pocket.name
  });

  // Surface atoms are on the surface and are defined by p2rank.
  let pocketSurfaceAtomsQuery: LiteMol.Core.Structure.Query.Builder =
    LiteMol.Core.Structure.Query.atomsById.apply(null, pocket.surfAtomIds);
  let surfaceAtoms = pocketGroup.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": pocketSurfaceAtomsQuery,
      "name": "surface atoms",
      "silent": true
    }, {"ref": pocket.name + "-atom-surface"});

  // We use residues to get the interacting pockets.
  let allAtoms: LiteMol.Core.Structure.Query.Builder =
    residuesBySeqNums(...pocket.residueIds);
  let resSel = pocketGroup.then(
    LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateSelectionFromQuery,
    {
      "query": allAtoms,
      "name": "atoms",
      "silent": true
    }, {"ref": pocket.name + "-atom-all"});

  resSel.then(<any>LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {
      "style": createSurfaceStyle()
    }, {"isHidden": false, "ref": getPocketSurfaceAtomsRefVisual(pocket)});

  resSel.then(<any>LiteMol.Bootstrap.Entity.Transformer.Molecule.CreateVisual,
    {
      "style": LiteMol.Bootstrap.Visualization.Molecule.Default
        .ForType.get("BallsAndSticks")
    }, {"isHidden": false, "ref": getPocketAtomsRefVisual(pocket)});

}

/**
 * Only surface atoms (as defined by p2rank) that create the pocket.
 */
export function getPocketSurfaceAtomsRefVisual(pocket: PrankPocket) {
  return pocket.name + "-visual-surface";
}

/**
 * All atoms (as defined by residues) that create pocket.
 */
export function getPocketAtomsRefVisual(pocket: PrankPocket) {
  return pocket.name + "-visual-atoms";
}

export function setAtomColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model, mapping: Uint8Array) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__atomColorMapping__";
  cache.set(model as any, cacheId, mapping)
}

export function setConservationAtomColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model, mapping: Uint8Array) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__atomColorMapping__original__";
  cache.set(model as any, cacheId, mapping)
}

export function getAtomColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__atomColorMapping__";
  return cache.get<Uint8Array>(model as any, cacheId);
}

export function getConservationAtomColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__atomColorMapping__original__";
  return cache.get<Uint8Array>(model as any, cacheId);
}

export function setResidueColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model, mapping: Uint8Array) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__residueColorMapping__";
  cache.set(model as any, cacheId, mapping)
}

export function getResidueColorMapping(plugin: LiteMol.Plugin.Controller, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
  const cache = plugin.context.entityCache;
  const cacheId = "__PrankWeb__residueColorMapping__";
  return cache.get<Uint8Array>(model as any, cacheId);
}

let surfaceAlpha = 1.0;

export function colorProtein(plugin: LiteMol.Plugin.Controller) {
  let model = plugin.context.select("model")[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
  if (!model) {
    return false;
  }
  let atomColorMapping = getAtomColorMapping(plugin, model);
  if (!atomColorMapping) {
    return false;
  }
  let residueColorMapping = getResidueColorMapping(plugin, model);
  if (!residueColorMapping) {
    return false;
  }

  const fallbackColor = LiteMol.Visualization.Color.fromHex(0xffffff); // white
  let colorMap = createColorMap(fallbackColor);
  const colors = createColors(fallbackColor);

  // Create mapping, theme and apply to all protein visuals.
  const atomMapping = LiteMol.Visualization.Theme.createColorMapMapping(i => atomColorMapping![i], colorMap, fallbackColor);
  const residueMapping = LiteMol.Visualization.Theme.createColorMapMapping(i => residueColorMapping![i], colorMap, fallbackColor);
  // make the theme "sticky" so that it persist "ResetScene" command.
  const theme = LiteMol.Visualization.Theme.createMapping(atomMapping, {
    colors,
    isSticky: true,
    transparency: {alpha: surfaceAlpha}
  });
  const residueTheme = LiteMol.Visualization.Theme.createMapping(residueMapping, {
    colors,
    isSticky: true
  });

  updateVisual(plugin, TREE_REF_SURFACE, theme);
  updateVisual(plugin, TREE_REF_CARTOON, residueTheme);
  updateVisual(plugin, TREE_REF_ATOMS, theme);

  updateVisual(plugin, TREE_REF_CONFIDENT_SURFACE, theme);
  updateVisual(plugin, TREE_REF_CONFIDENT_CARTOON, residueTheme);
  updateVisual(plugin, TREE_REF_CONFIDENT_ATOMS, theme);

  plugin.selectEntities(LiteMol.Bootstrap.Tree.Selection
    .byRef("pockets").subtree()
    .ofType(LiteMol.Bootstrap.Entity.Molecule.Visual))
    .forEach(visual => {
      plugin.command(LiteMol.Bootstrap.Command.Visual.UpdateBasicTheme, {
        visual: visual as any,
        theme: theme
      });
    });

  return true;
}

function createColorMap(fallbackColor: LiteMol.Visualization.Color) {
  const colorMap = LiteMol.Core.Utils.FastMap.create<number, LiteMol.Visualization.Color>();
  colorMap.set(0, fallbackColor);
  // Fill the color map with colors.
  Colors.forEach((color, i) => colorMap.set(i! + 1, color!));
  for (const shade of [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
    let c = shade * 255;
    colorMap.set(colorMap.size, LiteMol.Visualization.Color.fromRgb(c, c, c));
  }
  return colorMap;
}

function createColors(fallbackColor: LiteMol.Visualization.Color) {
  const colors = LiteMol.Core.Utils.FastMap.create<string, LiteMol.Visualization.Color>();
  colors.set("Uniform", fallbackColor);
  colors.set("Selection", LiteMol.Visualization.Theme.Default.SelectionColor);
  colors.set("Highlight", LiteMol.Visualization.Theme.Default.HighlightColor);
  return colors;
}

function updateVisual(plugin: LiteMol.Plugin.Controller, ref: string, theme: any) {
  const refSelection = LiteMol.Bootstrap.Tree.Selection
    .byRef(ref).subtree().ofType(LiteMol.Bootstrap.Entity.Molecule.Visual);
  const entities = plugin.selectEntities(refSelection);
  if (entities.length === 0) {
    return;
  }
  plugin.command(LiteMol.Bootstrap.Command.Visual.UpdateBasicTheme, {
    "visual": entities[0] as any,
    "theme": theme
  });
}

/**
 * Very similar to colorProtein.
 * TODO Merge shared code, check for effectiveness?
 */
export function setSurfaceAlpha(plugin: LiteMol.Plugin.Controller, alpha: number) {
  surfaceAlpha = alpha;
  let model = plugin.context.select("model")[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
  if (!model) {
    return false;
  }

  let atomColorMapping = getAtomColorMapping(plugin, model);
  if (!atomColorMapping) {
    return false;
  }

  const fallbackColor = LiteMol.Visualization.Color.fromHex(0xffffff); // white
  let colorMap = createColorMap(fallbackColor);
  const colors = createColors(fallbackColor);

  const atomMapping = LiteMol.Visualization.Theme.createColorMapMapping(i => atomColorMapping![i], colorMap, fallbackColor);

  const theme = LiteMol.Visualization.Theme.createMapping(atomMapping, {
    colors,
    isSticky: true,
    transparency: {alpha: surfaceAlpha}
  });
  const surface = plugin.selectEntities(LiteMol.Bootstrap.Tree.Selection.byRef(TREE_REF_SURFACE).subtree().ofType(LiteMol.Bootstrap.Entity.Molecule.Visual))[0];
  plugin.command(LiteMol.Bootstrap.Command.Visual.UpdateBasicTheme, {
    visual: surface as any,
    theme: theme
  });

  // We need to keep the alpha and not change it !

}
