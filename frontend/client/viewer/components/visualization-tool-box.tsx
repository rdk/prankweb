import { Button } from "@mui/material";
import React from "react";

import "./visualization-tool-box.css"

export class VisualizationToolBox extends React.Component<{}, {}> {

    constructor(props: any) {
        super(props);
        this.toggle1DViewer = this.toggle1DViewer.bind(this);
        this.vh = this.vh.bind(this);
    }

    vh(percent: number) {
        const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        return (percent * h) / 100;
    }

    toggle1DViewer() {
        const viewer1D = document.getElementById("application-rcsb");
        if(!viewer1D) return;
        viewer1D.style.display = viewer1D.style.display === "none" ? "block" : "none";

        const viewer3D = document.getElementById("application-molstar");
        if(!viewer3D) return;
        //be aware that the heights should correspond to the original viewer heights defined in CSS
        //55vh is the default height of the 3D viewer
        viewer3D.style.height = viewer3D.style.height === "85%" ? "55vh" : "85%";
    }

    render() {
        return (
        <div className="visualization-toolbox-container">
            <div className="visualization-toolbox-option">
                <div className="visualization-toolbox-option-title">
                    Toggle 1D viewer
                </div>
                <div className="visualization-toolbox-option-description">
                    <Button variant="contained" color="primary" className="visualization-toolbox-button" onClick={this.toggle1DViewer}>
                        Toggle
                    </Button>
                </div>
            </div>

            <div className="visualization-toolbox-option">
                <div className="visualization-toolbox-option-title">
                    Option 2
                </div>
                <div className="visualization-toolbox-option-description">
                    <Button variant="contained" color="primary" className="visualization-toolbox-button">
                        Test Button 2
                    </Button>
                </div>
            </div>
        </div>
        );
    }
}