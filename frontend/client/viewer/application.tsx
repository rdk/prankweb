import React from "react";
import { createRoot } from 'react-dom/client';

import "./application.css";
import { PredictionInfo, getApiDownloadUrl } from "../prankweb-api";

import { StructureInformation } from "./components/structure-information";
import ToolBox from "./components/tool-box";
import PocketList from "./components/pocket-list";
import TaskList from "./components/task-list";

import { sendDataToPlugins } from './data-loader';
import { PocketsViewType, PolymerColorType, PolymerViewType, PredictionData, ReactApplicationProps, ReactApplicationState, ServerTaskData, ServerTaskDataContents, ServerTaskType } from "../custom-types";

import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { RcsbFv, RcsbFvTrackDataElementInterface } from "@rcsb/rcsb-saguaro";
import { highlightSurfaceAtomsInViewerLabelId, overPaintPolymer, updatePolymerView, showPocketInCurrentRepresentation } from './molstar-visualise';
import { VisualizationToolBox } from "./components/visualization-tool-box";

/**
 * A function to render the actual PrankWeb viewer.
 * @param predictionInfo Information about the prediction to be visualised.
 */
export async function renderProteinView(predictionInfo: PredictionInfo) {
  const wrapper = document.getElementById('application-molstar')!;
  const MolstarPlugin = await createPluginUI(wrapper, {
      ...DefaultPluginUISpec(),
      layout: {
          initial: {
              isExpanded: false,
              showControls: true,
              controlsDisplay: "reactive",
              regionState: {
                  top: "hidden",    //sequence
                  left: (window.innerWidth > 1200) ? "collapsed" : "hidden", 
                                    //tree with some components, hide for small and medium screens
                  bottom: "hidden", //shows log information
                  right: "hidden"   //structure tools
              }
          }
      },
      components: {
          remoteState: 'none'
      }
  });

  // Render pocket list on the right side (or bottom for smartphones) using React.
  const pocketListContainer = (window.innerWidth >= 768) ? document.getElementById('pocket-list-aside') : document.getElementById('pocket-list-aside-mobile');
  const pocketListRoot = createRoot(pocketListContainer!);
  pocketListRoot.render(<Application molstarPlugin={MolstarPlugin} predictionInfo={predictionInfo}
    pocketsView={PocketsViewType.Surface_Atoms_Color} polymerView={PolymerViewType.Gaussian_Surface} polymerColor={PolymerColorType.Clean}/>);

  // Render the tool box on the bottom of the visualization using React.
  const toolBoxContainer = document.getElementById('visualization-toolbox');
  const toolBoxRoot = createRoot(toolBoxContainer!);
  toolBoxRoot.render(<VisualizationToolBox/>);
}

/**
 * A React component containing all of the components other than the Mol* and RCSB plugins.
 */
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
    "serverTasks": [] // contains the list of server tasks requested by the user in this session
  };

  constructor(props: ReactApplicationProps) {
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
    //console.log("Application::componentDidMount");
    this.loadData();
    this.getTaskList();
  }

  /**
   * Loads the data from the server and sends them to the plugins.
   */
  async loadData() {
    this.setState({
      "isLoading": true,
      "error": undefined,
    });
    const {molstarPlugin, predictionInfo} = this.props;

    //at first we need the plugins to download the needed data and visualise them
    await sendDataToPlugins(
      molstarPlugin,
      predictionInfo.database,
      predictionInfo.id,
      predictionInfo.metadata.structureName,
      predictionInfo.metadata.predictedStructure ? true : false
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
  }

  // The following functions are called by the child components to change the visualisation via the child components.
  onPolymerViewChange(value: PolymerViewType) {
    this.setState({"polymerView": value});
    updatePolymerView(value, this.props.molstarPlugin, this.state.isShowOnlyPredicted);
  }

  onPocketsViewChange(value: PocketsViewType) {
    this.setState({"pocketsView": value});
    let index = 0;
    this.state.data.pockets.forEach(pocket => {
      this.onSetPocketVisibility(index, pocket.isVisible ? true : false, value);
      index++;
    });
  }

  onPolymerColorChange(value: PolymerColorType) {
    this.setState({"polymerColor": value});
    overPaintPolymer(value, this.props.molstarPlugin, this.state.data);
  }

  onShowConfidentChange() {
    const isShowOnlyPredicted= !this.state.isShowOnlyPredicted;
    this.setState({
      "isShowOnlyPredicted": isShowOnlyPredicted
    });
    updatePolymerView(this.state.polymerView, this.props.molstarPlugin, isShowOnlyPredicted);
  }

  onShowAllPockets() {
    let index = 0;
    this.state.data.pockets.forEach(pocket => { 
      this.onSetPocketVisibility(index, true);
      index++;
    });
  }

  onSetPocketVisibility(index: number, isVisible: boolean, value?: PocketsViewType) {
    let stateData: PredictionData = {...this.state.data};
    stateData.pockets[index].isVisible = isVisible;
    this.setState({
      data: stateData
    });

    //resolve RCSB at first - do it by recoloring the pocket to the default color value
    //currently there is no other way to "remove" one of the pockets without modyfing the others
    const newColor = isVisible ? "#" + this.state.data.pockets[index].color : "#F9F9F9";
    const track = this.state.pluginRcsb.getBoardData().find(e => e.trackId === "pocketsTrack");
    if(track) {
      track.trackData!.filter((e : RcsbFvTrackDataElementInterface) => e.provenanceName === `pocket${index+1}`).forEach((foundPocket : RcsbFvTrackDataElementInterface) => (foundPocket.color = newColor));
      const newData = track.trackData;
      this.state.pluginRcsb.updateTrackData("pocketsTrack", newData!);
    }

    //then resolve Mol*
    //here value may be passed as an parameter whilst changing the pocket view type, because the state is not updated yet.
    //Otherwise the value is taken from the state.
    if(value === null || value === undefined) {
      showPocketInCurrentRepresentation(this.props.molstarPlugin, this.state.pocketsView, index, isVisible);
    }
    else {
      showPocketInCurrentRepresentation(this.props.molstarPlugin, value, index, isVisible);
    }
  }

  onShowOnlyPocket(index: number) {
    let i = 0;
    this.state.data.pockets.forEach(pocket => { 
      this.onSetPocketVisibility(i, (index === i) ? true : false);
      i++;
    });
  }

  onFocusPocket(index: number) {
    const pocket = this.state.data.pockets[index];
    highlightSurfaceAtomsInViewerLabelId(this.props.molstarPlugin, pocket.surface, true);
  }

  onHighlightPocket(index: number, isHighlighted: boolean) {
    const pocket = this.state.data.pockets[index];
    highlightSurfaceAtomsInViewerLabelId(this.props.molstarPlugin, pocket.surface, false);
    //currently the residues are not de-selected on mouse out, could be potentially changed in the future
  }

  /**
   * Polls the server for the status of the tasks.
   */
  async getTaskList() {
    //this applies to the docking task only, may fetch multiple backend tasks in the future
    let json = await fetch(`./api/v2/docking/${this.props.predictionInfo.database}/${this.props.predictionInfo.id}/tasks`, {cache: "no-store"})
      .then(res => res.json())
      .catch(err => {
        return;
      }); //we could handle the error, but we do not care if the poll fails sometimes
    if(json) {
      //append the new tasks to the existing ones
      console.log(this.state.serverTasks);
      let newTasks: ServerTaskData[] = this.state.serverTasks;
      json["tasks"].forEach((task: ServerTaskDataContents) => {
        if(!newTasks.find((t: ServerTaskData) => t.data.id === task.id)) {
          newTasks.push({
            "type": ServerTaskType.Docking,
            "data": task
          });
        }
        else if (newTasks.find((t: ServerTaskData) => t.data.status !== task.status)) {
          //update the status
          const index = newTasks.findIndex((t: ServerTaskData) => t.data.id === task.id);
          let formerResponseData = newTasks[index].data.responseData;
          task.responseData = formerResponseData;
          newTasks[index].data = task;
        }
      });
      this.setState({serverTasks: newTasks});
    }
    //poll again after 7 seconds
    setTimeout(() => this.getTaskList(), 7000);
  }

  render() {
    //console.log("Application::render");
    if (this.state.isLoading) {
      return (
        <div>
          <h1 className="text-center">Loading...</h1>
        </div>
      );
    }
    const {predictionInfo} = this.props;
    const downloadAs = `prankweb-${predictionInfo.metadata.predictionName}.zip`;
    if (this.state.data) {
      const isPredicted = predictionInfo.metadata["predictedStructure"] === true;
      return (
        <div>
          <ToolBox
            predictionData={this.state.data}
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
          <TaskList 
            prediction={predictionInfo}
            tasks={this.state.serverTasks}
          />
          <PocketList 
            data={this.state.data}
            showAll={this.onShowAllPockets}
            setPocketVisibility={this.onSetPocketVisibility}
            showOnlyPocket={this.onShowOnlyPocket}
            focusPocket={this.onFocusPocket}
            highlightPocket={this.onHighlightPocket}
            plugin={this.props.molstarPlugin}
            prediction={this.props.predictionInfo}
            serverTasks={this.state.serverTasks}
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