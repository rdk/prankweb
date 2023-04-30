import React from "react";
import { PredictionInfo } from "../../prankweb-api";

import "bootstrap-icons/font/bootstrap-icons.css";
import { ServerTaskData } from "../../custom-types";

/**
 * This component lists the tasks associated with a prediction.
 * Currently represented in the Bootstrap style.
 */
export default class TaskList extends React.Component<
    {
        prediction: PredictionInfo
        tasks: ServerTaskData[]
    },{
        expanded: boolean
    }> {
  
    constructor(props: any) {
        super(props);
        this.toggleExpanded = this.toggleExpanded.bind(this);
        this.state = {expanded: false};
    }

    toggleExpanded() {
        this.setState({expanded: !this.state.expanded});
    }

    render() {
        return (
          <div className="card my-2">
            <div className="card-header">
              <h3 style={{"margin": "0"}}>
                Tasks
                <button
                  type="button"
                  className="btn btn-default btn-icon-right"
                  title="Show/Hide tools."
                  onClick={this.toggleExpanded}
                >
                {this.state.expanded ? 
                <i className="bi bi-caret-up" style={{"width": "1em"}}></i>
                :
                <i className="bi bi-caret-down" style={{"width": "1em"}}></i>
                }
                </button>
              </h3>
            </div>
            {this.state.expanded && <div className="card-body">
              <TaskListContent
                prediction={this.props.prediction}
                tasks={this.props.tasks}
              />
            </div>
            }
          </div>
        );
      }
}

/**
 * This component provides the content of the task list.
 */
class TaskListContent extends React.Component<{
    prediction: PredictionInfo
    tasks: ServerTaskData[]
  }, {}> {

    constructor(props: any) {
      super(props);
    }

    render() {
        return (
            <ul className="list-group list-group-flush">
                {this.props.tasks.map((task: ServerTaskData, index: number) => {
                    if(task.data["status"] === "successful") {
                        return <li key={index} className="list-group-item">{`${task.type} ${task.data.id} ${task.data.initialData["hash"]} ${task.data.lastChange}`}</li>
                    }
                    else if(task.data["status"] === "running") {
                        return <li key={index} className="list-group-item">{`${task.type} ${task.data.id} ${task.data.initialData["hash"]} ${task.data.lastChange} running`}</li>
                    }
                    else if(task.data["status"] === "failed") {
                      return <li key={index} className="list-group-item">{`${task.type} ${task.data.id} ${task.data.initialData["hash"]} ${task.data.lastChange} failed`}</li>
                    }
                    else if(task.data["status"] === "queued") {
                      return <li key={index} className="list-group-item">{`${task.type} ${task.data.id} ${task.data.initialData["hash"]} ${task.data.lastChange} queued`}</li>
                    }
                })}
            </ul>
        )
    }
}