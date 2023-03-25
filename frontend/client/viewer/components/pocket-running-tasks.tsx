import React from "react";
import { PocketData, ServerTaskData } from "../../custom-types";
import PocketProperty from "./pocket-property";

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
                    if(e.data.responseData && e.data.initialData.pocket === this.props.pocket.rank) {
                        return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Sample " + e.data.initialData.hash} data={
                            e.data.responseData.find((p: any) => p.rank === this.props.pocket.rank)?.count
                        }/>
                    }
                    else if(e.data.responseData && e.data.initialData.pocket === this.props.pocket.rank && (e.data.status === "running" || e.data.status === "queued")) {
                        return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Sample " + e.data.initialData.hash} data={"running"}/>
                    }
                })}
           </div>
        );
    }
}