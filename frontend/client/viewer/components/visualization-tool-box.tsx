import { Button } from "@mui/material";
import React from "react";

import "./visualization-tool-box.css"

export class VisualizationToolBox extends React.Component<{}, {}> {

    render() {
        return (
        <div className="visualization-toolbox-container">
            <div className="visualization-toolbox-option">
                <div className="visualization-toolbox-option-title">
                    Option 1
                </div>
                <div className="visualization-toolbox-option-description">
                    <Button variant="contained" color="primary" className="visualization-toolbox-button">
                        Test Button
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