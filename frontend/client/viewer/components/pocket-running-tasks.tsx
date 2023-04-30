import React from "react";
import { PocketData, ServerTaskData, ServerTaskType } from "../../custom-types";
import PocketProperty from "./pocket-property";
import { renderOnServerDockingTaskCompleted, renderOnServerDockingTaskFailed, renderOnServerDockingTaskRunning } from "../../tasks/server-docking-task";

/**
 * This component displays the list of finished or incomplete tasks for a pocket.
 */
export default class PocketRunningTasks extends React.Component
    <{
        pocket: PocketData,
        inDialog: boolean,
        serverTasks: ServerTaskData[]
    }, {}> {

    constructor(props: any) {
        super(props);
        this.defaultImplementation = this.defaultImplementation.bind(this);
    }

    defaultImplementation(serverTask: ServerTaskData, index: number) {
        return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Backend task (" + serverTask.type + ")"} data={"completed"}/>
    }

    render() {
        type MethodMap = {
            [key in ServerTaskType]: (e: ServerTaskData) => JSX.Element;
        }

        const completedMethods: MethodMap = {
            [ServerTaskType.Docking]: (e: ServerTaskData) => renderOnServerDockingTaskCompleted(e, this.props.pocket, e.data.initialData.hash)
        }

        const runningMethods: MethodMap = {
            [ServerTaskType.Docking]: (e: ServerTaskData) => renderOnServerDockingTaskRunning(this.props.pocket, e.data.initialData.hash)
        }

        const failedMethods: MethodMap = {
            [ServerTaskType.Docking]: (e: ServerTaskData) => renderOnServerDockingTaskFailed(this.props.pocket, e.data.initialData.hash)
        }

        return (
            <div style={{"display": "inline"}}>
                {this.props.inDialog && this.props.serverTasks.map((e: ServerTaskData, index) => {
                    //finished task in this session
                    if(e.data.responseData && e.data.initialData.pocket === this.props.pocket.rank && e.data.status === "successful") {
                        return completedMethods[e.type](e);
                    }
                    //queued, running, incomplete task
                    else if (e.data.initialData.pocket === this.props.pocket.rank && e.data.status === "queued" || e.data.status === "running") {
                        return runningMethods[e.type](e);
                    }
                    //failed task
                    else if (e.data.initialData.pocket === this.props.pocket.rank && e.data.status === "failed") {
                        const date = Date.parse(e.data.lastChange);
                        const now = Date.now();
                        //if the task failed in the last 60 minutes, we display it, otherwise we ignore it
                        if(now - date < 60 * 60 * 1000) {
                            return failedMethods[e.type](e);
                        }
                    }
                    //NOT rendering tasks that are not related to this pocket
                    //and tasks not completed in this session (apart from failed/running tasks)
                })}
           </div>
        );
    }
}