import React from "react";

import PocketProperty from "./pocket-property";
import PocketClientTask from "./pocket-client-task";
import PocketServerParametrizedTask from "./pocket-server-parametrized-task";
import PocketRunningTasks from "./pocket-running-tasks";

import { computePocketVolume, renderOnTaskVolumeCompleted } from "../../tasks/client-atoms-volume";
import { getDockingTaskCount, renderOnTaskDockingTasksCountCompleted } from "../../tasks/client-get-docking-tasks";

import { PocketData, ServerTask, ClientTaskType, ServerTaskType } from "../../custom-types";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend, dockingHash, renderOnServerDockingTaskCompleted } from "../../tasks/server-docking-task";

/**
 * This component displays further details of a pocket
 * when the pocket is displayed in a dialog.
 * It includes tasks that can be run on the pocket.
 */
export default class PocketDialogDetails extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
        plugin: PluginUIContext,
        prediction: PredictionInfo
        serverTasks: ServerTask[]
    }, {
        serverTasks: ServerTask[]
    }> {

    constructor(props: any) {
        super(props);
        this.state = {serverTasks: this.props.serverTasks};
    }

    /**
     * Forces the component to update when the serverTasks prop changes.
     * This is needed because the serverTasks prop is updated by a parent component
     * (Application component).
     * @param prevProps Previous props
     */
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
                <PocketClientTask inDialog={this.props.inDialog} title="Total docking tasks" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ClientTaskType.DockingTaskCount} prediction={this.props.prediction} compute={() => getDockingTaskCount(this.props.prediction, this.props.pocket)} renderOnComplete={renderOnTaskDockingTasksCountCompleted}/>
                <PocketServerParametrizedTask inDialog={this.props.inDialog} title="Docking task" pocket={this.props.pocket} plugin={this.props.plugin} taskType={ServerTaskType.Docking} prediction={this.props.prediction} serverTasks={this.props.serverTasks}
                    modalDescription={"Enter the molecule for docking in pocket " + this.props.pocket.rank + " (in SMILES format)"} compute={(hash) => computeDockingTaskOnBackend(this.props.prediction, this.props.pocket, hash, this.props.serverTasks, this.props.plugin)} 
                    renderOnComplete={(data, hash) => renderOnServerDockingTaskCompleted(data, this.props.pocket, hash)} hashMethod={(prediction, pocket, formData) => dockingHash(prediction, pocket, formData)}/>
                <PocketRunningTasks inDialog={this.props.inDialog} serverTasks={this.state.serverTasks} pocket={this.props.pocket}/>
            </div>
        );
    }
}