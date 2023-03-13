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
                    if(e.responseData && e.data.pocket === this.props.pocket.rank) {
                        return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Sample " + e.data.hash} data={
                            e.responseData.pockets.find((p: any) => p.rank === this.props.pocket.rank)?.count
                        }/>
                    }
                    else if(e.status === "running" || e.status === "queued") {
                        return <PocketProperty key={index} inDialog={this.props.inDialog} title={"Sample " + e.data.hash} data={"running"}/>
                    }
                })}
           </div>
        );
    }
}