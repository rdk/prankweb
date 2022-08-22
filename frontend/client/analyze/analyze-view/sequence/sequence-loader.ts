import LiteMol from "litemol";
import {Sequence, SequenceListEntity, SequenceModel} from "./sequence-model";

/**
 * LiteMol action for loading sequence from JSON.
 */
export const LoadSequenceFromJson =
  LiteMol.Bootstrap.Tree.Transformer.create<LiteMol.Bootstrap.Entity.Data.Json, SequenceListEntity, {}>(
    {
      "id": "protein-sequence-create",
      "name": "Protein sequence",
      "description": "Create protein sequence from string.",
      "from": [LiteMol.Bootstrap.Entity.Data.Json],
      "to": [SequenceModel],
      defaultParams: () => ({})
    }, (context, container, transform) => {
      return LiteMol.Bootstrap.Task.create<SequenceListEntity>(
        "Create sequence entity", "Normal", async ctx => {
          await ctx.updateProgress("Creating sequence entity...");
          const structure = container.props.data.structure;
          let scores: number[] = [];
          let scoresLabel = "";
          if (structure.scores["plddt"]) {
            scores = structure.scores["plddt"];
            scoresLabel = "AlphaFold confidence scores";
          } else if (structure.scores["conservation"]) {
            scores = structure.scores["conservation"];
            scoresLabel = "Evolutionary conservation";
          }
          console.log("Loading sequence from:", structure);
          // @ts-ignore
          return SequenceModel.create(transform, {
            "label": "Sequence",
            "sequence": {
              "indices": structure.indices,
              "sequence": structure.sequence,
              "scores": scores,
              "scoresLabel": scoresLabel,
              "regions": structure.regions,
              "bindingSites": structure.binding,
            },
          })
        }).setReportTime(true);
    }
  );

