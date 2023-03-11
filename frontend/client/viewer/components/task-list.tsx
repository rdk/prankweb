import React from "react";
import { PredictionInfo } from "../../prankweb-api";

import "bootstrap-icons/font/bootstrap-icons.css";

export default class TaskList extends React.Component<
    {
        prediction: PredictionInfo
    },
    {
        tasks: any
    }> {
  
    constructor(props: any) {
        super(props);
        this.getTaskList = this.getTaskList.bind(this);
        this.state = {tasks: []};
    }

    componentDidMount() {
        this.getTaskList();
    }

    async getTaskList() {
        let json = await fetch(`./api/v2/sample/${this.props.prediction.database}/${this.props.prediction.id}/tasks`, {cache: "no-store"}).then(res => res.json()).catch(err => console.log(err));
        //let json = {"tasks": [{"id": 0, "created": "2023-03-10T18:04:23", "lastChange": "2023-03-10T18:04:23", "status": "successful", "data": {"hash": "SOME_HASH", "pocket": "1"}}], "identifier": "2SRC"};
        //TODO: handle error in a better way
        if(json) this.setState({tasks: json["tasks"]});
        setTimeout(() => this.getTaskList(), 7000);
    }

    render() {
        return (
            <div className="card control-box my-2">
                <div className="card-header">
                    <h3>Tasks</h3>
                </div>
                <ul className="list-group list-group-flush">
                    {this.state.tasks.map((task: any, index: any) => {
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