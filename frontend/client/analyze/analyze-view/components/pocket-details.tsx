import React from "react";
import { PocketData } from "../types";

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
        if (!this.props.inDialog) {
            return (
                <div className="card-body">
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
                    Not in dialog.<br />
                </div>
            );
        }

        return (
            <div>
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
                    <dt>Residues:</dt>
                    <dd>{pocket.residues.join(", ")}</dd>
                </dl>
                In dialog.<br />
                By the way, this is a place where more details can be added.
            </div>
        );
    }
}