import LiteMol from "litemol";
import {SequenceModel, Sequence} from "./sequence-model";
import {PrankPocket, PredictionEntity} from "../prediction-entity";


export class SequenceController extends LiteMol.Bootstrap.Components.Component<{
  sequence: Sequence,
  pockets: PrankPocket[],
  pocketVisibility: boolean[],
  version: number
}> {

  constructor(context: LiteMol.Bootstrap.Context) {
    super(context, {
      sequence: {
        indices: [],
        sequence: [],
        scores: [],
        scoresLabel: "",
        bindingSites: [],
        regions: []
      }, pockets: [], pocketVisibility: [], version: 0
    });

    LiteMol.Bootstrap.Event.Tree.NodeAdded.getStream(context).subscribe(e => {
      if (e.data.type === SequenceModel) {
        this.setState({sequence: e.data.props.sequence});
      } else if (e.data.type === PredictionEntity) {
        let pockets = e.data.props.pockets;
        this.setState({pockets, pocketVisibility: pockets.map(() => true)});
      }
    });

    // Subscribe to get updates about visibility of pockets.
    LiteMol.Bootstrap.Event.Tree.NodeUpdated.getStream(context).subscribe(e => {
      let entityRef = e.data.ref; // Pocket name whose visibility just changed.
      let pockets = this.latestState.pockets;
      let changed = false;
      let pocketVisibility = this.latestState.pocketVisibility;
      let index = 0;
      for (let pocket of pockets) {
        if (pocket.name !== entityRef) {
          index++;
          continue;
        }
        // It should still be visible even if some children are invisible.
        const visibility = e.data.state.visibility;
        // Using partial visibility allow for pocket to remain visible,
        // after it was hidden for the first time.
        let visible = visibility === LiteMol.Bootstrap.Entity.Visibility.Full;
        if (pocketVisibility[index] !== visible) {
          pocketVisibility[index] = visible;
          changed = true;
        }
        break;
      }
      if (changed) {
        // Keeping version field in the state, so that event about state
        // update is fired.
        this.setState({
          pockets,
          pocketVisibility,
          version: this.latestState.version + 1
        });
      }
    });
  }

}
