import React from "react";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { ClientTaskData, ClientTaskType, PocketData, ServerTaskType } from "../../custom-types";
import { Button } from "@mui/material";

import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend } from "../../tasks/server-docking-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { getDockingTaskCount } from "../../tasks/client-get-docking-tasks";
import { computePocketVolume } from "../../tasks/client-atoms-volume";

enum TaskType {
    Client,
    Server
}

type TaskTypeMenuItem = {
    id: number,
    specificType: ServerTaskType | ClientTaskType
    type: TaskType,
    name: string,
    compute: (params: string, customName: string, pocketIndex: number) => void
}

export default function TasksTab(props: {pockets: PocketData[], predictionInfo: PredictionInfo, plugin: PluginUIContext}) {
    const tasks: TaskTypeMenuItem[] = [
        {
            id: 1,
            specificType: ClientTaskType.Volume,
            type: TaskType.Client,
            name: "Volume",
            compute: (params, customName, pocketIndex) => {
                const promise = computePocketVolume(props.plugin, props.pockets[pocketIndex]);
                promise.then((task: ClientTaskData) => {
                    handleFinishedClientTask(task);
                });
            }
        },
        {
            id: 2,
            specificType: ClientTaskType.DockingTaskCount,
            type: TaskType.Client,
            name: "DockingTaskCount",
            compute: (params, customName, pocketIndex) => {
                const promise = getDockingTaskCount(props.predictionInfo, props.pockets[pocketIndex]);
                promise.then((task: ClientTaskData) => {
                    handleFinishedClientTask(task);
                });
            }
        },
        {
            id: 3,
            specificType: ServerTaskType.Docking,
            type: TaskType.Server,
            name: "Docking",
            compute: (params, customName, pocketIndex) => {
                computeDockingTaskOnBackend(props.predictionInfo, props.pockets[pocketIndex], params, [], props.plugin);
            }
        }
    ];

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketNumber, setPocketNumber] = React.useState<number>(1);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string>("");

    const [finishedClientTasks, setFinishedClientTasks] = React.useState<ClientTaskData[]>([]);

    const handleTaskTypeChange = (event: SelectChangeEvent) => {
        setTask(tasks.find(task => task.id == Number(event.target.value))!);
    };

    const handlePocketNumberChange = (event: SelectChangeEvent) => {
        setPocketNumber(Number(event.target.value));
    };

    const handleSubmitButton = () => {
        task.compute(parameters, name, pocketNumber - 1);
    }

    const handleFinishedClientTask = (task: ClientTaskData) => {
        setFinishedClientTasks([...finishedClientTasks, task]);
    }

    return (
        <div>
            <h3>Tasks</h3>
            <div>
                <h4>Create task</h4>
                <FormControl sx={{minWidth: 250}}>
                    <InputLabel>Task type</InputLabel>
                    <Select
                        labelId="task"
                        id="select-task-create-type"
                        value={task?.id.toString() || ""}
                        label="Task type"
                        onChange={handleTaskTypeChange}
                    >
                        {tasks.map((task: TaskTypeMenuItem) => <MenuItem value={task.id} key={task.id}>{task.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl sx={{minWidth: 250}}>
                    <InputLabel>Pocket number</InputLabel>
                    <Select
                        labelId="pocket-number"
                        id="select-pocket-number"
                        value={pocketNumber.toString()}
                        label="Pocket number"
                        onChange={handlePocketNumberChange}
                    >
                        {props.pockets.map((pocket: PocketData) => <MenuItem value={pocket.rank} key={pocket.rank}>{pocket.rank}</MenuItem>)}
                    </Select>
                </FormControl>

                {task?.type === TaskType.Server &&
                <div>
                    <FormControl sx={{minWidth: 250}}>
                        <TextField
                            label="Enter task parameters"
                            multiline
                            maxRows={8}
                            variant="standard"
                            sx={{border: "1px solid #000000"}}
                            value={parameters}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setParameters(event.target.value);
                                console.log(event.target.value);
                            }}
                        />
                    </FormControl>

                    <FormControl sx={{minWidth: 250}}>
                        <TextField
                            label="Enter task name"
                            variant="standard"
                            sx={{border: "1px solid #000000"}}
                            value={name}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setName(event.target.value);
                            }}
                        />
                    </FormControl>
                </div>}

                <Button variant="contained" sx={{marginTop: "1rem"}} onClick={handleSubmitButton}>Create task</Button>
            </div>
            <div>
                <h4>Finished tasks</h4>
                <div>
                    {finishedClientTasks.map((task: ClientTaskData, i: number) => <div key={i}>{task.pocket}, {task.data}</div>)}
                </div>
            </div>
        </div>
    )
}