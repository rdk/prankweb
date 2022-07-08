import React from "react";
import { PocketData } from "../types";
import DraggableDialog from './draggable-dialog'

import { AiOutlineEye } from 'react-icons/ai';
import { IconContext } from "react-icons";
import { FiCrosshair, FiArrowDownCircle, FiArrowUpCircle } from 'react-icons/fi';
import { RiCloseFill, RiCheckFill } from 'react-icons/ri';

export default class Pocket extends React.Component
  <{
    pocket: PocketData,
    index: number,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void
  }, {
    visible: boolean,
    details: boolean
  }> {

  state = {
    "visible": true,
    "details": false
  };

  constructor(props: any) {
    super(props);
    this.onPocketMouseEnter = this.onPocketMouseEnter.bind(this);
    this.onPocketMouseLeave = this.onPocketMouseLeave.bind(this);
    this.onPocketClick = this.onPocketClick.bind(this);
    this.showOnlyClick = this.showOnlyClick.bind(this);
    this.togglePocketVisibility = this.togglePocketVisibility.bind(this);
    this.toggleCardVisibility = this.toggleCardVisibility.bind(this);
    this.showPocketDetails = this.showPocketDetails.bind(this);
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
    this.setState({ "visible": !this.state.visible });
  }

  showPocketDetails() {
    //TODO
    this.setState({ "details": true });

    console.log("click");
  }

  render() {
    const pocket = this.props.pocket;
    let borderColor = "#" + this.props.pocket.color;
    if (pocket.isReactVisible === undefined) { //for pockets that load for the first time
      pocket.isReactVisible = true;
    }
    if (!this.props.pocket.isReactVisible) {
      borderColor = "gray";
    }
    return (
      <div>
        <div className="card pocket" style={{ "borderColor": borderColor }}>
          <div className="card-header text-center" style={{ marginBottom: "0.5rem" }}>
            <div className="row">
              <div className="col-8">
                <h4 className="card-title" style={{ marginTop: "0.35rem" }}>Pocket {pocket.rank}</h4>
              </div>
              <div className="col-4">
                <button
                  type="button"
                  title="HIDE/SHOW"
                  className="btn btn-outline-secondary"
                  onClick={this.toggleCardVisibility}
                  style={{ marginTop: "0.25rem" }}
                >
                  {this.state.visible ? 
                  <IconContext.Provider value={{ size: "1.25em" }}>
                      <FiArrowUpCircle />
                  </IconContext.Provider>
                  : 
                  <IconContext.Provider value={{ size: "1.25em" }}>
                      <FiArrowDownCircle />
                  </IconContext.Provider>
                  }
                </button>
              </div>
            </div>
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
            <div className="container">
              <div className="row">
                <div className="col-6">
                  <DraggableDialog pocket={this.props.pocket} />
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    title="Show only this pocket"
                    className="btn btn-outline-secondary"
                    onClick={this.showOnlyClick}
                    style={{"float": "right"}}
                  >
                    <IconContext.Provider value={{ size: "1.25em" }}>
                      <AiOutlineEye />
                    </IconContext.Provider>
                  </button>
                </div>
              </div>
              <hr />
              <div className="row">
                <div className="col-6">
                  <button
                    type="button"
                    style={{
                      "display": this.props.pocket.isReactVisible ? "inherit" : "none",
                    }}
                    title="Focus/highlight to this pocket."
                    className="btn btn-outline-secondary"
                    onClick={this.onPocketClick}
                    onMouseEnter={this.onPocketMouseEnter}
                    onMouseLeave={this.onPocketMouseLeave}
                  >
                    <IconContext.Provider value={{ size: "1.25em" }}>
                      <FiCrosshair />
                    </IconContext.Provider>
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    title="Show / Hide pocket."
                    className="btn btn-outline-secondary"
                    style={{"float": "right"}}
                    onClick={this.togglePocketVisibility}>
                    {this.props.pocket.isReactVisible ?
                      <IconContext.Provider value={{ size: "1.25em" }}>
                        <RiCloseFill />
                      </IconContext.Provider>
                      : 
                      <IconContext.Provider value={{ size: "1.25em" }}>
                        <RiCheckFill />
                      </IconContext.Provider>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>}
        </div>
      </div>
    )
  }
}