import React from "react";
import { ClientTaskType, PocketData, ServerTaskType } from "../../custom-types";
import PocketProperty from "./pocket-property";
import PocketClientTask from "./pocket-client-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import PocketServerTask from "./pocket-server-task";
import { PredictionInfo } from "../../prankweb-api";

export default class PocketDetails extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
        plugin: PluginUIContext,
        prediction: PredictionInfo
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
                {this.props.inDialog && <PocketProperty inDialog={this.props.inDialog} title="Residues" data={pocket.residues.join(", ")}/>}
                {this.props.inDialog && <PocketClientTask inDialog={this.props.inDialog} title="Total atoms volume (Å^3)" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ClientTaskType.Volume} prediction={this.props.prediction}/>}
                {this.props.inDialog && <PocketServerTask inDialog={this.props.inDialog} title="Sample" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ServerTaskType.Sample} prediction={this.props.prediction}/>}
                {this.props.inDialog && <PocketClientTask inDialog={this.props.inDialog} title="Total sample tasks" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ClientTaskType.SampleTaskCount} prediction={this.props.prediction}/>}
           </div>
        );
    }
}