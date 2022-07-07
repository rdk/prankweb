import React from "react";

import "./tools-box.css";
import { PocketsViewType, PolymerViewType } from "../types";
import 'css.gg/icons/css/arrow-down-o.css';
import 'css.gg/icons/css/arrow-up-o.css';

export default class ToolsBox extends React.Component<{
  downloadUrl: string,
  downloadAs: string,
  polymerView: PolymerViewType,
  pocketsView: PocketsViewType,
  onPolymerViewChange: (value: PolymerViewType) => void,
  onPocketsViewChange: (value: PocketsViewType) => void,
  isPredicted: boolean,
  isShowOnlyPredicted: boolean,
  onShowConfidentChange: () => void,
}, {
  /**
   * True for expanded component false for minimized component.
   */
  visible: boolean
}> {

  state = {
    "visible": true,
    "showConfident": false,
  };

  constructor(props: any) {
    super(props);
    this.toggleVisible = this.toggleVisible.bind(this);
  }

  toggleVisible() {
    this.setState({"visible": !this.state.visible});
  }

  render() {
    return (
      <div className="card my-2">
        <div className="card-header">
          <h3 style={{"margin": "0"}}>
            Tools
            <button
              type="button"
              className="btn btn-default btn-icon-right"
              title="Show/Hide tools."
              onClick={this.toggleVisible}
            >
            {this.state.visible ? <i className="gg-arrow-up-o" style={{fontSize: "1em"}}></i>:<i className="gg-arrow-down-o" style={{fontSize: "1em"}}></i>}
            </button>
          </h3>
        </div>
        {this.state.visible && <div className="card-body">
          <ControlBoxContent
            downloadUrl={this.props.downloadUrl}
            downloadAs={this.props.downloadAs}
            polymerView={this.props.polymerView}
            onPolymerViewChange={this.props.onPolymerViewChange}
            pocketsView={this.props.pocketsView}
            onPocketsViewChange={this.props.onPocketsViewChange}
            isPredicted={this.props.isPredicted}
            isShowOnlyPredicted={this.props.isShowOnlyPredicted}
            onShowConfidentChange={this.props.onShowConfidentChange}
          />
        </div>
        }
      </div>
    );
  }
}

function ControlBoxContent(
  props: {
    downloadUrl: string,
    downloadAs: string,
    polymerView: PolymerViewType,
    onPolymerViewChange: (value: PolymerViewType) => void,
    pocketsView: PocketsViewType,
    onPocketsViewChange: (value: PocketsViewType) => void,
    isPredicted: boolean,
    isShowOnlyPredicted: boolean,
    onShowConfidentChange: () => void,
  }) {
  return (
    <div className="d-grid gap-2">
      <a
        className="btn btn-outline-secondary"
        href={props.downloadUrl}
        download={props.downloadAs}
      >
        Download data
      </a>
      <label>
        Protein visualisation
        <select
          id="polymer-visual"
          className="form-select"
          value={props.polymerView}
          onChange={(event) =>
            props.onPolymerViewChange(parseInt(event.target.value))}
        >
          <option value="0">Balls and Sticks</option>
          <option value="1">Surface</option>
          <option value="2">Cartoon</option>
        </select>
      </label>
      <label>
        Pockets visualisation
        <select
          id="pockets-visual"
          className="form-select"
          value={props.pocketsView}
          onChange={(event) =>
            props.onPocketsViewChange(parseInt(event.target.value))}
        >
          <option value="0">Balls and Sticks</option>
          <option value="1">Surface</option>
        </select>
      </label>
      {props.isPredicted && (
        <button
          type="button"
          className="btn btn-predicted"
          onClick={props.onShowConfidentChange}
        >
          {props.isShowOnlyPredicted ?
            "Show all regions" :
            "Show confident regions"}
        </button>
      )}
    </div>
  )
}