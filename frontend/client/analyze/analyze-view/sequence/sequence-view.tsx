import React from "react";
import LiteMol from "litemol";
import * as DataLoader from "../data-loader";
import {PrankPocket, Colors} from "../prediction-entity";
import {
  ProtaelContent,
  ProtaelFeature,
  ProtaelRegion
} from "../protael/protael-model";
import {renderProtael} from "../protael/protael-render";
import {SequenceController} from "./sequence-controller";

class CacheItem {

  query: LiteMol.Core.Structure.Query.Builder;

  selectionInfo: LiteMol.Bootstrap.Interactivity.Molecule.SelectionInfo;

  constructor(
    query: LiteMol.Core.Structure.Query.Builder,
    selectionInfo: LiteMol.Bootstrap.Interactivity.Molecule.SelectionInfo
  ) {
    this.query = query;
    this.selectionInfo = selectionInfo
  }

}

export class SequenceView extends LiteMol.Plugin.Views.View<SequenceController, {}, {}> {

  indexMap: LiteMol.Core.Utils.FastMap<string, number> = LiteMol.Core.Utils.FastMap.create<string, number>();

  lastNumber: number | undefined;

  protaelView: any = void 0;

  subscriptionHandle: LiteMol.Bootstrap.Rx.IDisposable | undefined;

  getResidue(seqIndex: number, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
    let cacheId = `__resSelectionInfo-${seqIndex}`;
    let result = this.getCacheItem(cacheId, model);
    if (!result) {
      let pdbResIndex = this.controller.latestState.sequence.indices[seqIndex];
      result = this.setCacheItem(cacheId, DataLoader.residuesBySeqNums(pdbResIndex), model)
    }
    return result;
  }

  getPocket(pocket: PrankPocket, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
    let cacheId = `__resSelectionInfo-${pocket.name}-${pocket.rank}`
    let result = this.getCacheItem(cacheId, model);
    if (!result) result = this.setCacheItem(cacheId, LiteMol.Core.Structure.Query.atomsById.apply(null, pocket.surfAtomIds), model)
    return result;
  }

  setCacheItem(cacheId: string, query: LiteMol.Core.Structure.Query.Builder, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
    let cache = this.controller.context.entityCache;
    let elements = LiteMol.Core.Structure.Query.apply(query, model.props.model).unionAtomIndices();
    let selection = LiteMol.Bootstrap.Interactivity.Info.selection(model as any, elements);
    let selectionInfo = LiteMol.Bootstrap.Interactivity.Molecule.transformInteraction(selection)!;
    let item = new CacheItem(query, selectionInfo);
    cache.set(model as any, cacheId, item);
    return item;
  }

  getCacheItem(cacheId: string, model: LiteMol.Bootstrap.Entity.Molecule.Model) {
    let cache = this.controller.context.entityCache;
    let item = cache.get<CacheItem>(model as any, cacheId);
    if (!item) return void 0;
    return item;
  }

  indicesToSequenceSegments(sortedIndices: number[]) {
    let result: { start: number, end: number }[] = [];
    // Transform indices to sequential indices and then sort them
    let lastStart = -1;
    let lastResNum = -1;
    sortedIndices.forEach((resNum, y) => {
      if (y == 0) {
        lastStart = resNum;
      } else {
        if (lastResNum + 1 < resNum) {
          result.push({start: lastStart, end: lastResNum});
          lastStart = resNum;
        }
      }
      lastResNum = resNum;
    })
    result.push({start: lastStart, end: lastResNum});
    return result;
  }

  addPocketFeatures(features: ProtaelFeature[]) {
    // Build hashmap index->sequential index one-based.
    this.controller.latestState.sequence.indices.forEach((index, seqIndex) => {
      this.indexMap.set(index, seqIndex);
    });
    let pockets = this.controller.latestState.pockets;
    let pocketVisibility = this.controller.latestState.pocketVisibility;
    pockets.forEach((pocket, i) => {
      if (!pocketVisibility[i]) return; // Skip over invisible pockets.

      let sortedIndices = pocket.residueIds.map((index) => this.indexMap.get(index)!)
        .sort((a, b) => (a - b));
      let segments = this.indicesToSequenceSegments(sortedIndices);
      for (const s of segments) {
        let c = Colors.get(i % Colors.size);
        features.push(new ProtaelFeature("Pockets", `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})`, s.start + 1, s.end + 1, pocket.rank.toString(), {"Pocket name": pocket.name}))
      }
    });
  }

  getBindingSites() {
    let result: ProtaelFeature[] = [];
    let sites = this.controller.latestState.sequence.bindingSites;
    if (sites && sites.length > 0) {
      let sortedIndices = sites.sort((left, right) => (left - right));
      let segments = this.indicesToSequenceSegments(sortedIndices);
      for (const s of segments) {
        result.push(new ProtaelFeature("Binding site", "purple", s.start + 1, s.end + 1, "", void 0));
      }
    }
    return result;
  }

  getChainRegions() {
    let result: ProtaelRegion[] = [];
    this.controller.latestState.sequence.regions.forEach((region, i) => {
      result.push(new ProtaelRegion(`Chain ${region.name}`, region.start + 1, region.end + 1, i % 2 != 0));
    });
    return result;
  }

  createProtaelContent() {
    let sequence = this.controller.latestState.sequence;
    if (sequence.sequence.length <= 0) {
      // Sequence isn't loaded yet.
      return null;
    }
    let features: Array<ProtaelFeature> = []
    this.addPocketFeatures(features); // Add pocket features.
    let chainRegions = this.getChainRegions();
    let bindingSites = this.getBindingSites();
    return new ProtaelContent(
      sequence.sequence.join(""),
      features,
      chainRegions,
      sequence.scores,
      sequence.scoresLabel,
      bindingSites);
  }

  updateProtael() {
    let content = this.createProtaelContent();
    if (content === null) {
      return;
    }
    // The element is rendered dynamically.
    this.protaelView = renderProtael(content, "sequence-view");
    // this.protaelView.draw();
    this.protaelView.onMouseOver((event: any) => {
      if (event.offsetX == 0) {
        return
      }
      // We use zero-based indexing for residues.
      let seqNum = this.protaelView.toOriginalX(this.protaelView.mouseToSvgXY(event).x) - 1;
      this.onLetterMouseEnter(seqNum)
    });
    this.resizeLiteMolToAccommodateForProtael();
    this.addMouseEvents();
  }

  addMouseEvents() {
    let protael = document.getElementById("sequence-view");
    if (!protael) return;
    let features = document.querySelectorAll(".pl-ftrack .pl-feature");
    forEachElement(features, element => {
      if (element.parentElement!.id == "Pockets") {
        let attr = element.attributes.getNamedItem("data-d");
        if (!attr) return;
        let pocket = this.parsePocketName(attr.value);
        element.onclick = () => this.onPocketClick(pocket);
        element.onmouseover = () => this.selectAndDisplayToastPocket(pocket, true);
        element.onmouseout = () => this.selectAndDisplayToastPocket(pocket, false);
      } else if (element.parentElement!.id == "Binding sites") {
        element.onmouseover = () => this.selectAndDisplayToastBindingSites(true);
        element.onmouseout = () => this.selectAndDisplayToastBindingSites(false);
      }
    })
  }

  /**
   * The Protael plugin can expand outside the LiteMol area, to fix that
   * we need to resize parts of the LieMol.
   */
  resizeLiteMolToAccommodateForProtael() {
    let element = document.getElementById("sequence-view")!;
    const height = `${element.scrollHeight}px`;

    const updateHeight = (element: HTMLElement) => element.style.height = height;
    forEachElement(
      document.querySelectorAll(
        ".lm-plugin .lm-layout-top"),
      updateHeight);

    const updateTop = (element: HTMLElement) => element.style.top = height;
    forEachElement(
      document.querySelectorAll(
        ".lm-plugin .lm-layout-main"),
      updateTop);

    this.controller.context.scene.scene.resized();
    this.selectAndDisplayToastLetter(this.lastNumber, false);
  }

  onLetterMouseEnter(seqNumber?: number) {
    if (!seqNumber && seqNumber != 0) {
      return
    }
    if (this.lastNumber) {
      if (this.lastNumber != seqNumber) {
        this.selectAndDisplayToastLetter(this.lastNumber, false);
        this.selectAndDisplayToastLetter(seqNumber, true);
      }
    } else {
      this.selectAndDisplayToastLetter(seqNumber, true);
    }
    this.lastNumber = seqNumber;
  }

  /**
   * Displays/Hides toast for given residue.
   * SeqNumber is ***zero-based index*** of the residue.
   */
  selectAndDisplayToastLetter(seqNumber: number | undefined, isOn: boolean) {
    if ((!seqNumber && seqNumber != 0) || seqNumber < 0) return;
    let ctx = this.controller.context;
    let model = ctx.select('model')[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
    if (!model) return;

    // Get the sequence selection
    let seqSel = this.getResidue(seqNumber, model)

    // Highlight in the 3D Visualization
    LiteMol.Bootstrap.Command.Molecule.Highlight.dispatch(ctx, {
      model: model,
      query: seqSel.query,
      isOn
    });
    if (isOn) {
      // Show tooltip
      let label = LiteMol.Bootstrap.Interactivity.Molecule.formatInfo(seqSel.selectionInfo)
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [label/*, 'some additional label'*/])
    } else {
      // Hide tooltip
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [])
    }
  }

  /**
   * Displays/Hides toast for all binding sites.
   */
  selectAndDisplayToastBindingSites(isOn: boolean) {
    let ctx = this.controller.context;
    let model = ctx.select('model')[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
    if (!model) return;

    // Get the sequence selection
    let cacheId = '__resSelectionInfo-bindingSites__';
    let sel = this.getCacheItem(cacheId, model);
    if (!sel) {
      let indices = this.controller.latestState.sequence.indices;
      let bindingSites = this.controller.latestState.sequence.bindingSites.map(index => indices[index]);
      sel = this.setCacheItem(cacheId, DataLoader.residuesBySeqNums(...bindingSites), model)
    }

    // Highlight in the 3D Visualization
    LiteMol.Bootstrap.Command.Molecule.Highlight.dispatch(ctx, {
      model: model,
      query: sel.query,
      isOn
    })
    if (isOn) {
      // Show tooltip
      let label = LiteMol.Bootstrap.Interactivity.Molecule.formatInfo(sel.selectionInfo);
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [label/*, 'some additional label'*/])
    } else {
      // Hide tooltip
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [])
    }
  }

  parsePocketName(featureData: string | undefined) {
    // Using the fact that * is greedy, so it will match everything up to and including the last space.
    if (!featureData) return void 0;
    let featureDataParsed = JSON.parse(featureData);
    if (!featureDataParsed) return void 0;
    let pocketName = featureDataParsed['Pocket name'];
    if (!pocketName) return void 0;
    let pocketRes: PrankPocket | undefined = void 0;
    this.controller.latestState.pockets.forEach((pocket) => {
      if (pocket.name == pocketName) pocketRes = pocket;
    });
    return pocketRes;
  }

  selectAndDisplayToastPocket(pocket: PrankPocket | undefined, isOn: boolean) {
    if (!pocket) return;
    let ctx = this.controller.context;
    let model = ctx.select('model')[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
    if (!model) return;

    // Get the pocket selection
    let seqSel = this.getPocket(pocket, model)

    // Highlight in the 3D Visualization
    LiteMol.Bootstrap.Command.Molecule.Highlight.dispatch(ctx, {
      model: model,
      query: seqSel.query,
      isOn
    })
    if (isOn) {
      // Show tooltip
      let label = LiteMol.Bootstrap.Interactivity.Molecule.formatInfo(seqSel.selectionInfo)
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [label/*, 'some additional label'*/])
    } else {
      // Hide tooltip
      LiteMol.Bootstrap.Event.Interactivity.Highlight.dispatch(ctx, [])
    }
  }

  onPocketClick(pocket: PrankPocket | undefined) {
    let ctx = this.controller.context;
    let model = ctx.select('model')[0] as unknown as LiteMol.Bootstrap.Entity.Molecule.Model;
    if (!model || !pocket) return;

    let query = this.getPocket(pocket, model).query;
    LiteMol.Bootstrap.Command.Molecule.FocusQuery.dispatch(ctx, {model, query})
  }

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // React methods.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  componentDidMount() {
    console.log("SequenceView::componentDidMount");
    this.subscriptionHandle = this.subscribe(this.controller.state, state => {
      this.updateProtael();
    });
    this.updateProtael();
  }

  componentWillUnmount() {
    console.log("SequenceView::componentWillUnmount");
    if (this.subscriptionHandle) {
      this.unsubscribe(this.subscriptionHandle);
    }
    document.getElementById("sequence-view")!.innerHTML = "";
  }

  componentDidUpdate() {
    console.log("SequenceView::componentDidUpdate");
    this.updateProtael();
  }

  render() {
    console.log("SequenceView::render");
    return (
      <div
        id="sequence-view"
        onMouseLeave={() => {
          this.onLetterMouseEnter(void 0);
        }}
      />
    );
  }

}

function forEachElement(
  elements: NodeListOf<Element>,
  callback: (element: HTMLElement, index?: number) => void) {
  for (let index: number = 0; index < elements.length; index++) {
    const element = elements.item(index) as HTMLElement;
    if (!element) {
      continue
    }
    callback(element, index);
  }
}
