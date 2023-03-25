import React from "react";
import { PocketData, ServerTaskData } from "../../custom-types";
import PocketProperty from "./pocket-property";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";
import PocketDialogDetails from "./pocket-dialog-details";

export default class PocketDetails extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
        plugin: PluginUIContext,
        prediction: PredictionInfo
        serverTasks: ServerTaskData[]
    }, {}> {

    constructor(props: any) {
        super(props);
        this.checkValidValue = this.checkValidValue.bind(this);
    }

    checkValidValue(data: number | undefined) {
        //here double equal sign is used intentionally
        if(data == undefined || data == 0) return false;
        return true;
    }

    render() {
        const pocket = this.props.pocket;
        return (
            <div className={this.props.inDialog ? "" : "card-body"}>
                <PocketProperty inDialog={this.props.inDialog} title="Pocket rank" data={pocket.rank}/>
                <PocketProperty inDialog={this.props.inDialog} title="Pocket score" data={pocket.score}/>
                <PocketProperty inDialog={this.props.inDialog} title="Probability score" data={pocket.probability || "N/A"}/>
                <PocketProperty inDialog={this.props.inDialog} title="AA count" data={pocket.residues.length}/>
                {this.checkValidValue(pocket.avgConservation) && <PocketProperty inDialog={this.props.inDialog} title="Conservation" data={pocket.avgConservation!}/>}
                {this.checkValidValue(pocket.avgAlphaFold) && <PocketProperty inDialog={this.props.inDialog} title="AlphaFold avg" data={pocket.avgAlphaFold!}/>}
                {this.props.inDialog && <PocketDialogDetails pocket={pocket} inDialog={this.props.inDialog} plugin={this.props.plugin} prediction={this.props.prediction} serverTasks={this.props.serverTasks}/>}
           </div>
        );
    }
}