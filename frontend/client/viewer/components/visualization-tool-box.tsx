import { Box, Button, FormControl, FormHelperText, InputLabel, MenuItem, Select } from "@mui/material";
import React from "react";

import "./visualization-tool-box.css";
import { PocketsViewType, PolymerColorType, PolymerViewType, PredictionData } from "../../custom-types";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { RcsbFv } from "@rcsb/rcsb-saguaro";

export class VisualizationToolBox extends React.Component<{
    downloadUrl: string,
    downloadAs: string,
    molstarPlugin: PluginUIContext,
    pluginRcsb: RcsbFv,
    predictionData: PredictionData,
    isPredicted: boolean,
    polymerView: PolymerViewType,
    pocketsView: PocketsViewType,
    polymerColor: PolymerColorType,
    onPolymerViewChange: (polymerView: PolymerViewType) => void,
    onPocketsViewChange: (pocketsView: PocketsViewType) => void,
    onPolymerColorChange: (polymerColor: PolymerColorType) => void,
    onShowConfidentChange: () => void,
}, {
    polymerView: PolymerViewType,
    pocketsView: PocketsViewType,
    polymerColor: PolymerColorType,
    isShowOnlyPredicted: boolean;
}> {

    constructor(props: any) {
        super(props);
        this.toggle1DViewer = this.toggle1DViewer.bind(this);
        this.vh = this.vh.bind(this);
        this.scoresDataAvailable = this.scoresDataAvailable.bind(this);
        this.changePolymerView = this.changePolymerView.bind(this);
        this.changePocketsView = this.changePocketsView.bind(this);
        this.changePolymerColor = this.changePolymerColor.bind(this);
        this.changeShowConfident = this.changeShowConfident.bind(this);

        this.state = {
            polymerView: this.props.polymerView,
            pocketsView: this.props.pocketsView,
            polymerColor: this.props.polymerColor,
            isShowOnlyPredicted: false
        };
    }

    vh(percent: number) {
        const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        return (percent * h) / 100;
    }

    toggle1DViewer() {
        const viewer1D = document.getElementById("application-rcsb");
        if (!viewer1D) return;
        viewer1D.style.display = viewer1D.style.display === "none" ? "block" : "none";

        const viewer3D = document.getElementById("application-molstar");
        if (!viewer3D) return;
        //be aware that the heights should correspond to the original viewer heights defined in CSS
        //55vh is the default height of the 3D viewer
        viewer3D.style.height = viewer3D.style.height === "85%" ? "55vh" : "85%";
    }

    scoresDataAvailable(data: number[] | undefined) {
        if (data === undefined) return false;
        return !data.every((value) => value === 0); //if every value is 0, then we consider that data is not available
    }

    //We need to track changes both in the parent and in the child component.
    changePolymerView(polymerView: PolymerViewType) {
        this.setState({ polymerView: polymerView });
        this.props.onPolymerViewChange(polymerView);
    }

    changePocketsView(pocketsView: PocketsViewType) {
        this.setState({ pocketsView: pocketsView });
        this.props.onPocketsViewChange(pocketsView);
    }

    changePolymerColor(polymerColor: PolymerColorType) {
        this.setState({ polymerColor: polymerColor });
        this.props.onPolymerColorChange(polymerColor);
    }

    changeShowConfident() {
        this.setState({ isShowOnlyPredicted: !this.state.isShowOnlyPredicted });
        this.props.onShowConfidentChange();
    }

    render() {
        return (
            <div className="visualization-toolbox-container">
                <div className="visualization-toolbox-row">
                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <Button variant="outlined" color="primary" className="visualization-toolbox-button" onClick={this.toggle1DViewer}>
                                Toggle
                            </Button>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <Button variant="outlined" color="primary" className="visualization-toolbox-button">
                                <a href={this.props.downloadUrl} download={this.props.downloadAs} className="visualization-toolbox-option-link">
                                    Download
                                </a>
                            </Button>
                        </div>
                    </div>

                    {this.props.isPredicted && (
                        <div className="visualization-toolbox-option">
                            <div className="visualization-toolbox-option-description">
                                <Button variant="outlined" color="primary" className="visualization-toolbox-button" onClick={this.changeShowConfident}>
                                    {this.state.isShowOnlyPredicted ? "Show all regions" : "Show confident regions"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="visualization-toolbox-row">
                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Select
                                    labelId="protein-select-label"
                                    id="protein-select"
                                    value={this.state.polymerView}
                                    onChange={(event) => this.changePolymerView(event.target.value as PolymerViewType)}
                                    className="visualization-toolbox-select"
                                >
                                    <MenuItem value={PolymerViewType.Atoms}>Balls and Sticks</MenuItem>
                                    <MenuItem value={PolymerViewType.Gaussian_Surface}>Surface</MenuItem>
                                    <MenuItem value={PolymerViewType.Cartoon}>Cartoon</MenuItem>
                                </Select>
                                <FormHelperText sx={{ textAlign: "center" }}>Protein visualization</FormHelperText>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Select
                                    labelId="pockets-color-select-label"
                                    id="pockets-color-select"
                                    value={this.state.pocketsView}
                                    onChange={(event) => this.changePocketsView(event.target.value as PocketsViewType)}
                                    className="visualization-toolbox-select"
                                >
                                    <MenuItem value={PocketsViewType.Ball_Stick_Atoms_Color}>Balls and Sticks (atoms)</MenuItem>
                                    <MenuItem value={PocketsViewType.Ball_Stick_Residues_Color}>Balls and Sticks (residues)</MenuItem>
                                    <MenuItem value={PocketsViewType.Surface_Atoms_Color}>Surface (atoms)</MenuItem>
                                    <MenuItem value={PocketsViewType.Surface_Residues_Color}>Surface (residues)</MenuItem>
                                </Select>
                                <FormHelperText sx={{ textAlign: "center" }}>Pockets visualization (color by)</FormHelperText>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Select
                                    labelId="pockets-color-select-label"
                                    id="pockets-color-select"
                                    value={this.state.polymerColor}
                                    onChange={(event) => this.changePolymerColor(event.target.value as PolymerColorType)}
                                    className="visualization-toolbox-select"
                                >
                                    <MenuItem value={PolymerColorType.White}>White</MenuItem>
                                    {this.scoresDataAvailable(this.props.predictionData.structure.scores.conservation) &&
                                        <MenuItem value={PolymerColorType.Conservation}>Conservation</MenuItem>}
                                    {this.scoresDataAvailable(this.props.predictionData.structure.scores.plddt) &&
                                        <MenuItem value={PolymerColorType.AlphaFold}>AlphaFold confidence</MenuItem>}
                                </Select>
                                <FormHelperText sx={{ textAlign: "center" }}>Polymer coloring</FormHelperText>
                            </FormControl>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}