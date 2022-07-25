import React from "react";
import { createRoot } from 'react-dom/client';

import "./application.css";
import { PredictionInfo, getApiDownloadUrl } from "../prankweb-api";

import { StructureInformation } from "./components/structure-information";
import ToolsBox from "./components/tools-box";
import PocketList from "./components/pocket-list";

//////////
import { sendDataToPlugins } from './data-loader';
import { CustomWindow, PocketsViewType, PolymerColorType, PolymerViewType, PredictionData, ReactApplicationProps, ReactApplicationState } from "../custom-types";


import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { Script } from "molstar/lib/mol-script/script"
import { MolScriptBuilder as MS} from "molstar/lib/mol-script/language/builder";
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { RcsbFv, RcsbFvTrackDataElementInterface } from "@rcsb/rcsb-saguaro";
import { highlightSurfaceAtomsInViewerLabelId } from './molstar-visualise';


declare let window: CustomWindow;

export async function renderProteinView(predictionInfo: PredictionInfo) {
  const wrapper = document.getElementById('application-molstar')!;
  window.MolstarPlugin = await createPluginUI(wrapper, {
      ...DefaultPluginUISpec(),
      layout: {
          initial: {
              isExpanded: false,
              showControls: true,
              controlsDisplay: "reactive",
              regionState: {
                  top: "full",        //sequence
                  left:"collapsed",   //tree with some components
                  bottom: "full",    //shows some log
                  right: "hidden"   //structure tools
              }
          }
      },
      components: {
          remoteState: 'none'
      }
  });
  window.MS = MS;
  window.Script = Script;
  const MolstarPlugin = window.MolstarPlugin;

  console.log(predictionInfo);
  // Render pocket list using React.
  const container = document.getElementById('pocket-list-aside');
  const root = createRoot(container!);
  root.render(<Application plugin={MolstarPlugin} predictionInfo={predictionInfo}
    pocketsView={PocketsViewType.Surface} polymerView={PolymerViewType.Surface} polymerColor={PolymerColorType.Clean}/>);
}
export class Application extends React.Component<ReactApplicationProps, ReactApplicationState> 
{
  state = {
    "isLoading": true,
    "data": {} as PredictionData,
    "error": undefined,
    "polymerView": this.props.polymerView,
    "pocketsView": this.props.pocketsView,
    "polymerColor": this.props.polymerColor,
    "isShowOnlyPredicted": false,
    "pluginRcsb": {} as RcsbFv,
  };

  constructor(props: any) {
    super(props);
    this.onPolymerViewChange = this.onPolymerViewChange.bind(this);
    this.onPocketsViewChange = this.onPocketsViewChange.bind(this);
    this.onPolymerColorChange = this.onPolymerColorChange.bind(this);
    this.onShowAllPockets = this.onShowAllPockets.bind(this);
    this.onSetPocketVisibility = this.onSetPocketVisibility.bind(this);
    this.onShowOnlyPocket = this.onShowOnlyPocket.bind(this);
    this.onFocusPocket = this.onFocusPocket.bind(this);
    this.onHighlightPocket = this.onHighlightPocket.bind(this);
    this.onShowConfidentChange = this.onShowConfidentChange.bind(this);
  }

  componentDidMount() {
    console.log("Application::componentDidMount");
    this.loadData();
  }

  async loadData() {

    this.setState({
      "isLoading": true,
      "error": undefined,
    });
    const {plugin, predictionInfo} = this.props;

    //at first we need the plugins to download the needed data and visualise them
    await sendDataToPlugins(
      plugin,
      predictionInfo.database,
      predictionInfo.id,
      predictionInfo.metadata.structureName
    ).then((data) => {
      this.setState({
      "isLoading": false,
      "data": data[0],
      "pluginRcsb": data[1]
    })}).catch((error) => {
      this.setState({
        "isLoading": false,
      })
      console.log(error);
    });
    //TODO: after successfully visualising the data via the plugins, we may render the useful data about pockets.
  }

  onPolymerViewChange(value: PolymerViewType) {
    this.setState({"polymerView": value});
    console.log(value);
    //TODO: show only the actual representation of the protein
    //updatePolymerView(this.props.plugin, value, this.state.isShowOnlyPredicted);
  }

  onPocketsViewChange(value: PocketsViewType) {
    this.setState({"pocketsView": value});
    console.log(value);
    //TODO: show only the actual representation of pockets
  }

  onPolymerColorChange(value: PolymerColorType) {
    this.setState({"polymerColor": value});
    console.log(value);
    //TODO: show only the actual representation of pockets
  }

  onShowConfidentChange() {
    const isShowOnlyPredicted= !this.state.isShowOnlyPredicted;
    this.setState({
      "isShowOnlyPredicted": isShowOnlyPredicted
    });
    //TODO: show only predicted residues in the current representation... is possibly based on AlphaFold scores
    //updatePolymerView(this.props.plugin, this.state.polymerView, isShowOnlyPredicted);
  }

  onShowAllPockets() {
    let index = 0;
    this.state.data.pockets.forEach(pocket => { 
      this.onSetPocketVisibility(index, true);
      index++;
    });
    //TODO: show all pockets in Molstar in the current representation
  }

  onSetPocketVisibility(index: number, isVisible: boolean) {
    let stateData : PredictionData = {...this.state.data};
    stateData.pockets[index].isReactVisible = isVisible;
    this.setState({
      data: stateData
    });

    //resolve RCSB at first - do it by recoloring the pocket
    const newColor = isVisible ? "#" + this.state.data.pockets[index].color : "#F9F9F9";
    //@ts-ignore Property 'rowConfigData' is private and only accessible within class 'RcsbFv'. - there is no other way to get to the rowConfigData though...
    const track = this.state.pluginRcsb.rowConfigData.find(e => e.trackId === "pocketsTrack");
    const nameToFind = "pocket" + (index + 1);
    track.trackData.filter((e : RcsbFvTrackDataElementInterface) => e.provenanceName === nameToFind).forEach((foundPocket : RcsbFvTrackDataElementInterface) => (foundPocket.color = newColor));
    const newData = track.trackData;
    this.state.pluginRcsb.updateTrackData("pocketsTrack", newData);

    //TODO: set pocket visibility in Molstar in the current representation
  }

  onShowOnlyPocket(index: number) {
    let i = 0;
    this.state.data.pockets.forEach(pocket => { 
      this.onSetPocketVisibility(i, (index === i) ? true : false);
      i++;
    });
    //TODO: show only one pocket in Molstar in the current representation
  }

  onFocusPocket(index: number) {
    const pocket = this.state.data.pockets[index];
    highlightSurfaceAtomsInViewerLabelId(this.props.plugin, pocket.surface, true);

    //TODO: consider other way to focus on the pocket?
  }

  onHighlightPocket(index: number, isHighlighted: boolean) {
    const pocket = this.state.data.pockets[index];
    highlightSurfaceAtomsInViewerLabelId(this.props.plugin, pocket.surface, false);

    //TODO: is it really needed to de-select it onmouseout?
  }

  render() {
    console.log("Application::render");
    if (this.state.isLoading) {
      return (
        <div>
          <h1 className="text-center">Loading ...</h1>
        </div>
      );
    }
    const {predictionInfo} = this.props;
    const downloadAs = `prankweb-${predictionInfo.metadata.predictionName}.zip`;
    if (this.state.data) {
      const isPredicted = predictionInfo.metadata["predictedStructure"] === true;
      return (
        <div>
          <ToolsBox
            downloadUrl={getApiDownloadUrl(predictionInfo)}
            downloadAs={downloadAs}
            polymerView={this.state.polymerView}
            pocketsView={this.state.pocketsView}
            polymerColor={this.state.polymerColor}
            onPolymerViewChange={this.onPolymerViewChange}
            onPocketsViewChange={this.onPocketsViewChange}
            onPolymerColorChange={this.onPolymerColorChange}
            isPredicted={isPredicted}
            isShowOnlyPredicted={this.state.isShowOnlyPredicted}
            onShowConfidentChange={this.onShowConfidentChange}
          />
          <StructureInformation
            metadata={predictionInfo.metadata}
            database={predictionInfo.database}
          />
          <PocketList 
            data={this.state.data}
            showAll={this.onShowAllPockets}
            setPocketVisibility={this.onSetPocketVisibility}
            showOnlyPocket={this.onShowOnlyPocket}
            focusPocket={this.onFocusPocket}
            highlightPocket={this.onHighlightPocket}
          />
        </div>
      );
    }
    console.error("Can't load data:", this.state.error);
    return (
      <div style={{"textAlign": "center"}}>
        <h1 className="text-center">Can't load data</h1>
        <button className="btn btn-warning" onClick={this.loadData}>
          Force reload
        </button>
      </div>
    );
  }
}