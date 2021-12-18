import React from "react";
import LiteMol from "litemol";
import {PolymerViewType, PocketsViewType} from "../application";

import "./tools-box.css";

export default class ToolsBox extends React.Component<{
  plugin: LiteMol.Plugin.Controller,
  downloadUrl: string,
  downloadAs: string,
  polymerView: PolymerViewType,
  pocketsView: PocketsViewType,
  onPolymerViewChange: (value: PolymerViewType) => void,
  onPocketsViewChange: (value: PocketsViewType) => void
}, {
  /**
   * True for expanded component false for minimized component.
   */
  visible: boolean
}> {

  state = {
    "visible": true,
  };

  constructor(props: any) {
    super(props);
    this.toggleVisible = this.toggleVisible.bind(this);
    this.toggleSequenceView = this.toggleSequenceView.bind(this);
  }

  render() {
    return (
      <div className="card control-box">
        <div className="card-header">
          <h3 style={{"margin": "0"}}>
            Tools
            <button
              type="button"
              className="btn btn-default btn-toggle-tools"
              title="Show/Hyde tools."
              onClick={this.toggleVisible}
            >
              {
                this.state.visible ?
                  <span className="fontello-icon">
                    &#xe87f;
                  </span> :
                  <span className="fontello-icon">
                    &#xe882;
                  </span>
              }
            </button>
          </h3>
        </div>
        {this.state.visible && <div className="card-body">
          <ControlBoxContent
            downloadUrl={this.props.downloadUrl}
            downloadAs={this.props.downloadAs}
            toggleSequenceView={this.toggleSequenceView}
            polymerView={this.props.polymerView}
            onPolymerViewChange={this.props.onPolymerViewChange}
            pocketsView={this.props.pocketsView}
            onPocketsViewChange={this.props.onPocketsViewChange}/>
        </div>
        }
      </div>
    );
  }

  toggleVisible() {
    this.setState({"visible": !this.state.visible});
  }

  toggleSequenceView() {
    let regionStates =
      this.props.plugin.context.layout.latestState.regionStates;
    // TODO FIX Resize!
    if (!regionStates) {
      return;
    }
    let regionState = regionStates[LiteMol.Bootstrap.Components.LayoutRegion.Top];
    this.props.plugin.command(LiteMol.Bootstrap.Command.Layout.SetState, {
      "regionStates": {
        [LiteMol.Bootstrap.Components.LayoutRegion.Top]:
          regionState == "Sticky" ? "Hidden" : "Sticky",
      },
    })
  }

}

function ControlBoxContent(
  props: {
    downloadUrl: string,
    downloadAs: string,
    toggleSequenceView: () => void,
    polymerView: PolymerViewType,
    onPolymerViewChange: (value: PolymerViewType) => void,
    pocketsView: PocketsViewType,
    onPocketsViewChange: (value: PocketsViewType) => void
  }) {
  return (
    <div className="d-grid gap-2">
      <a
        className="btn btn-outline-secondary"
        href={props.downloadUrl}
        download={props.downloadAs}
      >
        <span className="fontello-icon">&#xe82d;</span>&nbsp;
        Download
      </a>
      {/*
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={props.toggleSequenceView}
        >
          <span className="fontello-icon">&#xe86d;</span>&nbsp;
          Toggle sequence view
        </button>
      */}
      <label>
        Peptide visualisation
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
    </div>
  )
}