import React from "react";
import { PocketData, ServerTaskData, ServerTaskType } from "../../custom-types";
import PocketProperty from "./pocket-property";
import { renderOnServerSampleTaskCompleted, renderOnServerSampleTaskRunning } from "../../tasks/server-sample-task";

/**
 * This component displays the list of finished or incomplete tasks for a pocket.
 */
export default class RunningTasks extends React.Component
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
        return (
            <div style={{"display": "inline"}}>
                {this.props.inDialog && this.props.serverTasks.map((e: ServerTaskData, index) => {
                    //finished task in this session
                    if(e.data.responseData && e.data.initialData.pocket === this.props.pocket.rank && e.data.status === "successful") {
                        switch(e.type) {
                            case ServerTaskType.Sample:
                                return renderOnServerSampleTaskCompleted(e, this.props.pocket, e.data.initialData.hash);
                            default:
                                return this.defaultImplementation(e, index);
                        }
                    }
                    //queued, running, incomplete task
                    else if (e.data.initialData.pocket === this.props.pocket.rank && e.data.status !== "successful") {
                        switch(e.type) {
                            case ServerTaskType.Sample:
                                return renderOnServerSampleTaskRunning(this.props.pocket, e.data.initialData.hash);
                            default:
                                return this.defaultImplementation(e, index);
                        }
                    }
                    //NOT rendering tasks that are not related to this pocket
                    //and tasks not completed in this session
                })}
           </div>
        );
    }
}