import React from "react";
import { PredictionInfo } from "../../prankweb-api";

import "bootstrap-icons/font/bootstrap-icons.css";
import { ServerTaskData } from "../../custom-types";

export default class TaskList extends React.Component<
    {
        prediction: PredictionInfo
        tasks: ServerTaskData[]
    },{}> {
  
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div className="card control-box my-2">
                <div className="card-header">
                    <h3>Tasks</h3>
                </div>
                <ul className="list-group list-group-flush">
                    {this.props.tasks.map((task: any, index: any) => {
                        if(task["status"] === "successful") {
                            return <li key={index} className="list-group-item">{`${task["id"]} ${task["data"]["hash"]} ${task["lastChange"]}`}</li>
                        }
                        else if(task["status"] === "running") {
                            return <li key={index} className="list-group-item">{`${task["id"]} ${task["data"]["hash"]} ${task["lastChange"]} running`}</li>
                        }
                    })}
                </ul>
            </div>
        )
    }
}