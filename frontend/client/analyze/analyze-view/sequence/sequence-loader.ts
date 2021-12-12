import LiteMol from "litemol";
import {Sequence, SequenceListEntity, SequenceModel} from "./sequence-model";
import compilePolymerNames = LiteMol.Core.Structure.Query.Compiler.compilePolymerNames;

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
          console.log("Loading sequence from:", structure);
          // @ts-ignore
          return SequenceModel.create(transform, {
            "label": "Sequence",
            "sequence": {
              "indices": structure.indices,
              "sequence": structure.sequence,
              "scores": structure.scores,
              "regions": structure.regions,
              "bindingSites": structure.bindingSites,
            },
          })
        }).setReportTime(true);
    }
  );
