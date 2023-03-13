import React from "react";
import { PredictionData, ServerTaskData } from "../../custom-types";
import Pocket from "./pocket";

import "./pocket-list.css";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

export default class PocketList extends React.Component
  <{
    data: PredictionData,
    showAll: () => void,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void,
    plugin: PluginUIContext,
    prediction: PredictionInfo,
    serverTasks: ServerTaskData[]
  }, {}> {

  render() {
    if (this.props.data.pockets.length === 0) {
      return (
        <div className="pockets">
          <h3 className="text-center">No pockets found</h3>
        </div>
      );
    }
    return (
      <div className="pockets">
        <h3 className="text-center">
          Pockets &nbsp;
          <button
            type="button"
            className="btn btn-outline-secondary btn-show-pockets"
            title="Show all pockets."
            onClick={this.props.showAll}
          >
          <i className="bi bi-eye" style={{"width": "1em"}}></i>
          </button>
        </h3>
        {this.props.data.pockets.map((item, index) => (
          <Pocket
            key={index}
            pocket={item}
            index={index}
            setPocketVisibility={this.props.setPocketVisibility}
            showOnlyPocket={this.props.showOnlyPocket}
            focusPocket={this.props.focusPocket}
            highlightPocket={this.props.highlightPocket}
            plugin={this.props.plugin}
            prediction={this.props.prediction}
            serverTasks={this.props.serverTasks}
          />
        ))}
      </div>);
  }
}