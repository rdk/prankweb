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
    }

    render() {
        return (
            <div style={{"display": "inline"}}>
                {this.props.inDialog && this.props.serverTasks.map((e: ServerTaskData, index) => {
                    //finished task in this session
                    if(e.data.responseData && e.data.initialData.pocket === this.props.pocket.rank && e.data.status === "successful") {
                        switch(e.type) {
                            case ServerTaskType.Sample:
                                return renderOnServerSampleTaskCompleted(e.data.responseData, this.props.pocket, e.data.initialData.hash);
                            default:
                                return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Backend task (" + e.type + ")" + e.data.initialData.hash} data={"completed"}/>
                        }
                    }
                    //queued, running, incomplete task
                    else if (e.data.initialData.pocket === this.props.pocket.rank && e.data.status !== "successful") {
                        switch(e.type) {
                            case ServerTaskType.Sample:
                                return renderOnServerSampleTaskRunning(this.props.pocket, e.data.initialData.hash);
                            default:
                                return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Backend task (" + e.type + ")" + e.data.initialData.hash} data={"in progress"}/>
                        }
                    }
                    //NOT rendering tasks that are not related to this pocket
                    //and tasks not completed in this session
                })}
           </div>
        );
    }
}