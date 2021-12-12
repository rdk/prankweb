import React from "react";
import {PrankPocket, Colors} from "../prediction-entity";

export default class Pocket extends React.Component
  <{
    pocket: PrankPocket,
    index: number,
    conservation: string,
    isVisible: boolean,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void
  }, {}> {

  constructor(props: any) {
    super(props);
    this.onPocketMouseEnter = this.onPocketMouseEnter.bind(this);
    this.onPocketMouseLeave = this.onPocketMouseLeave.bind(this);
    this.onPocketClick = this.onPocketClick.bind(this);
    this.showOnlyClick = this.showOnlyClick.bind(this);
    this.toggleVisibility = this.toggleVisibility.bind(this);
  }

  onPocketMouseEnter() {
    if (!this.props.isVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, true);
  }

  onPocketMouseLeave() {
    if (!this.props.isVisible) {
      return;
    }
    this.props.highlightPocket(this.props.index, false);
  }

  onPocketClick() {
    // Cannot focus on hidden pocket.
    if (!this.props.isVisible) {
      return;
    }
    this.props.focusPocket(this.props.index);
  }

  showOnlyClick() {
    this.props.showOnlyPocket(this.props.index);
  }

  toggleVisibility() {
    this.props.setPocketVisibility(
      this.props.index, !this.props.isVisible);
  }

  render() {
    const pocket = this.props.pocket;
    const color = Colors.get(this.props.index % Colors.size);
    let borderColor = colorToRgbString(color);
    if (!this.props.isVisible) {
      borderColor = "gray";
    }
    return (
      <div className="card pocket" style={{"borderColor": borderColor}}>
        <div className="card-header">
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
              "display": this.props.isVisible ? "inherit" : "none",
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
            onClick={this.toggleVisibility}>
            {this.props.isVisible ?
              <span className="fontello-icon">
                &#59430;
              </span>:
              <span className="fontello-icon">
                &#59392;
              </span>}
          </button>
        </div>
        <div className="card-body">
          <dl className="pocket-properties">
            <dt>Pocket rank:</dt>
            <dd>{pocket.rank}</dd>
            <dt>Pocket score:</dt>
            <dd>{pocket.score}</dd>
            <dt>Probability score:</dt>
            <dd>{pocket.probability || "N/A"}</dd>
            <dt>AA count:</dt>
            <dd>{pocket.residueIds.length}</dd>
            <dt>Conservation:</dt>
            <dd>{this.props.conservation  || "N/A"}</dd>
          </dl>
        </div>
      </div>
    )
  }

}

function colorToRgbString(color: any) {
  return `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
}
