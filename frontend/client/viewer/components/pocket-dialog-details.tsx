import React from "react";

import PocketProperty from "./pocket-property";
import PocketClientTask from "./pocket-client-task";
import PocketServerParametrizedTask from "./pocket-server-parametrized-task";
import RunningTasks from "./pocket-running-tasks";

import { computePocketVolume, renderOnTaskVolumeCompleted } from "../../tasks/client-atoms-volume";
import { getSampleTaskCount, renderOnTaskSampleTasksCountCompleted } from "../../tasks/client-get-sample-tasks";

import { PocketData, ServerTaskData, ClientTaskType, ServerTaskType } from "../../custom-types";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";
import { computeSampleTaskOnBackend, renderOnServerSampleTaskCompleted } from "../../tasks/server-sample-task";

export default class PocketDialogDetails extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
        plugin: PluginUIContext,
        prediction: PredictionInfo
        serverTasks: ServerTaskData[]
    }, {
        serverTasks: ServerTaskData[]
    }> {

    constructor(props: any) {
        super(props);
        this.state = {serverTasks: this.props.serverTasks};
    }

    componentDidUpdate(prevProps: any) {
        if(prevProps.serverTasks !== this.props.serverTasks){
            this.setState({
                serverTasks: this.props.serverTasks
            });
        }
    }

    render() {
        return (
            <div>
                <PocketProperty inDialog={this.props.inDialog} title="Residues" data={this.props.pocket.residues.join(", ")}/>
                <PocketClientTask inDialog={this.props.inDialog} title="Total atoms volume (Å^3)" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ClientTaskType.Volume} prediction={this.props.prediction} compute={() => computePocketVolume(this.props.plugin, this.props.pocket)} renderOnComplete={renderOnTaskVolumeCompleted} />
                <PocketClientTask inDialog={this.props.inDialog} title="Total sample tasks" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ClientTaskType.SampleTaskCount} prediction={this.props.prediction} compute={() => getSampleTaskCount(this.props.prediction)} renderOnComplete={renderOnTaskSampleTasksCountCompleted}/>
                <PocketServerParametrizedTask inDialog={this.props.inDialog} title="Sample" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ServerTaskType.Sample} prediction={this.props.prediction} serverTasks={this.props.serverTasks}
                    modalDescription={"Enter the molecule for docking in pocket " + this.props.pocket.rank + " (SMILES or PDB)"} compute={(hash) => computeSampleTaskOnBackend(true, this.props.prediction, this.props.pocket, hash, this.props.serverTasks)} 
                    renderOnComplete={(data, pocket) => renderOnServerSampleTaskCompleted(data, pocket)} />
                <RunningTasks inDialog={this.props.inDialog} serverTasks={this.state.serverTasks} pocket={this.props.pocket}/>
            </div>
        );
    }
}