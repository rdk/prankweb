import React from "react";
import { PocketData } from "../types";

export default class Pocket extends React.Component
  <{
    pocket: PocketData,
    index: number,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void
  }, {}> {

  state = {
    "visible": true
  };

  constructor(props: any) {
    super(props);
    this.onPocketMouseEnter = this.onPocketMouseEnter.bind(this);
    this.onPocketMouseLeave = this.onPocketMouseLeave.bind(this);
    this.onPocketClick = this.onPocketClick.bind(this);
    this.showOnlyClick = this.showOnlyClick.bind(this);
    this.togglePocketVisibility = this.togglePocketVisibility.bind(this);
    this.toggleCardVisibility = this.toggleCardVisibility.bind(this);
  }

  onPocketMouseEnter() {
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, true);
  }

  onPocketMouseLeave() {
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, false);
  }

  onPocketClick() {
    // Cannot focus on hidden pocket.
    if (!this.props.pocket.isReactVisible) {
      return;
    }
    this.props.focusPocket(this.props.index);
  }

  showOnlyClick() {
    this.props.showOnlyPocket(this.props.index);
  }

  togglePocketVisibility() {
    this.props.setPocketVisibility(this.props.index, !this.props.pocket.isReactVisible);
  }

  toggleCardVisibility() {
    this.setState({"visible": !this.state.visible});
  }

  render() {
    const pocket = this.props.pocket;
    let borderColor = "#" + this.props.pocket.color;
    if(pocket.isReactVisible === undefined) {
      pocket.isReactVisible = true; //TODO: look at this once more
    }
    if (!this.props.pocket.isReactVisible) {
      borderColor = "gray";
    }
    return (
      <div className="card pocket" style={{"borderColor": borderColor}}>
        <div className="card-header text-center">
          <h5 className="card-title">POCKET {pocket.rank}
          <button
              type="button"
              style={{"float": "right"}}
              title="HIDE/SHOW"
              className="btn btn-outline-secondary"
              onClick={this.toggleCardVisibility}
            >
            <span className="fontello-icon">&#59430;</span>
          </button>
          </h5>
        </div>
        {this.state.visible && <div className="card-body">
          <dl className="pocket-properties">
            <dt>Pocket rank:</dt>
            <dd>{pocket.rank}</dd>
            <dt>Pocket score:</dt>
            <dd>{pocket.score}</dd>
            <dt>Probability score:</dt>
            <dd>{pocket.probability || "N/A"}</dd>
            <dt>AA count:</dt>
            <dd>{pocket.residues.length}</dd>
            <dt>Conservation:</dt>
            <dd>{pocket.avgConservation || "N/A"}</dd>
          </dl>
        </div>
        }
        {this.state.visible && <div className="card-footer">
          <button
            type="button"
            style={{"float": "left"}}
            title="Show only this pocket"
            className="btn btn-outline-secondary"
            onClick={this.showOnlyClick}
          >
            <span className="fontello-icon">&#59430;</span>
          </button>
          <button
            type="button"
            style={{
              "float": "left",
              "display": this.props.pocket.isReactVisible ? "inherit" : "none",
            }}
            title="Focus/highlight to this pocket."
            className="btn btn-outline-secondary"
            onClick={this.onPocketClick}
            onMouseEnter={this.onPocketMouseEnter}
            onMouseLeave={this.onPocketMouseLeave}
          >
            <span className="fontello-icon">&#59555;</span>
          </button>
          <button
            type="button"
            style={{"float": "right"}}
            title="Show / Hide pocket."
            className="btn btn-outline-secondary"
            onClick={this.togglePocketVisibility}>
            {this.props.pocket.isReactVisible ?
              <span>
                VIS
              </span>:
              <span>
                NOT
              </span>}
          </button>
        </div>}
      </div>
    )
  }
}