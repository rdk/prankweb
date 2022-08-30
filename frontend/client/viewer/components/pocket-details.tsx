import React from "react";
import { PocketData } from "../../custom-types";
import PocketProperty from "./pocket-property";

export default class PocketDetails extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
    }, {}> {

    constructor(props: any) {
        super(props);
    }

    render() {
        const pocket = this.props.pocket;
        return (
            <div className={this.props.inDialog ? "" : "card-body"}>
                <PocketProperty inDialog={this.props.inDialog} title="Pocket rank" data={pocket.rank}/>
                <PocketProperty inDialog={this.props.inDialog} title="Pocket score" data={pocket.score}/>
                <PocketProperty inDialog={this.props.inDialog} title="Probability score" data={pocket.probability || "N/A"}/>
                <PocketProperty inDialog={this.props.inDialog} title="AA count" data={pocket.residues.length}/>
                <PocketProperty inDialog={this.props.inDialog} title="Conservation" data={pocket.avgConservation || "N/A"}/>
                <PocketProperty inDialog={this.props.inDialog} title="AlphaFold avg" data={pocket.avgAlphaFold || "N/A"}/>
                {this.props.inDialog && <PocketProperty inDialog={this.props.inDialog} title="Residues" data={pocket.residues.join(", ")}/>}
            </div>
        );
    }
}