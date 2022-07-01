import React from "react";
import ReactDOM from "react-dom";

import "./application.css";
import {PredictionInfo} from "../prankweb-api";

//////////
import { sendDataToPlugins } from './data-loader';
import { CustomWindow } from "./types";


import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { Script } from "molstar/lib/mol-script/script"
import { MolScriptBuilder as MS} from "molstar/lib/mol-script/language/builder";
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { RcsbFv } from "@rcsb/rcsb-saguaro";


declare let window: CustomWindow;

export async function renderProteinView(predictionInfo: PredictionInfo) {
  const wrapper = document.getElementById('application-litemol')!;
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
  const RcsbPlugin = window.RcsbPlugin;

  console.log("!!!!!!!!!!!!!!!!!!");
  console.log(predictionInfo);
  // Render pocket list using React.
  ReactDOM.render(<Application plugin={MolstarPlugin} predictionInfo={predictionInfo} pluginRcsb={RcsbPlugin}/>, document.getElementById('pocket-list-aside'));
  
}
export class Application extends React.Component<{
  plugin: PluginUIContext,
  predictionInfo: PredictionInfo,
  pluginRcsb: RcsbFv
}> {

  state = {
    "isLoading": true,
    "data": undefined,
    "error": undefined,
    /*"polymerView": PolymerViewType.Surface,
    "pocketsView": PocketsViewType.Surface,
    "pockets": [],
    "isShowOnlyPredicted": false,*/
  };

  constructor(props: any) {
    super(props);
  }

  componentDidMount() {
    console.log("Application::componentDidMount");
    this.loadData();
  }

  loadData() {

    this.setState({
      "isLoading": true,
      "error": undefined,
    });
    const {plugin, predictionInfo, pluginRcsb} = this.props;
    const _this = this;

    //at first we need the plugins to download the needed data and visualise them
    sendDataToPlugins(
      plugin,
      pluginRcsb,
      predictionInfo.database,
      predictionInfo.id,
      predictionInfo.metadata.structureName
    ).then((data: any) => {
      _this.setState({
        "isLoading": false,
        //"data": data
        /*,
        "pockets": createPocketList(
          _this.props.plugin,
          data.model,
          data.prediction.props.pockets,
          data.sequence.props.sequence),
      */
      });
    })
    .catch((error) => _this.setState({"isLoading": false, "error": error}));
    //TODO: after successfully visualising the data via the plugins, we may render the useful data about pockets.

    /*
      .then((data: PrankData) => {
        const isPredicted =
          predictionInfo.metadata["predictedStructure"] === true;
        return DataLoader.visualizeData(plugin, data, isPredicted);
      })
      .then((data: PrankData) => {
        return new LiteMol.Promise<DataLoader.PrankData>((accept, reject) => {
          if (DataLoader.colorProtein(plugin)) {
            accept(data);
          } else {
            reject("Mapping or model not found!");
          }
        });
      })
      .then((data: PrankData) => {
        _this.setState({
          "isLoading": false,
          "data": data,
          "pockets": createPocketList(
            _this.props.plugin,
            data.model,
            // These are objects from DataLoader, but they are wrapped
            // by LiteMol, so we need to use "props" to get to them.
            data.prediction.props.pockets,
            data.sequence.props.sequence),
        });
      })
      .catch((error) => _this.setState({"isLoading": false, "error": error}));
    */
  }

  render() {
    console.log("Application::render");
    return (
      <div>
        <h1 className="text-center">Loading...</h1>
      </div>
    );
    /*
    const {predictionInfo} = this.props;
    const downloadAs = `prankweb-${predictionInfo.metadata.predictionName}.zip`;
    if (this.state.data) {
      const isPredicted = predictionInfo.metadata["predictedStructure"] === true;
      return (
        <div>
          <ToolsBox
            plugin={this.props.plugin}
            downloadUrl={getApiDownloadUrl(predictionInfo)}
            downloadAs={downloadAs}
            polymerView={this.state.polymerView}
            pocketsView={this.state.pocketsView}
            onPolymerViewChange={this.onPolymerViewChange}
            onPocketsViewChange={this.onPocketsViewChange}
            isPredicted={isPredicted}
            isShowOnlyPredicted={this.state.isShowOnlyPredicted}
            onShowConfidentChange={this.onShowConfidentChange}
          />
          <StructureInformation
            metadata={predictionInfo.metadata}
            database={predictionInfo.database}
          />
          <PocketList
            pockets={this.state.pockets}
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
    */
  }
}