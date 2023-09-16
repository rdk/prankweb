import React from "react";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { ClientTask, ClientTaskLocalStorageData, ClientTaskType, ClientTaskTypeDescriptors, PocketData, ServerTaskLocalStorageData, ServerTaskType, ServerTaskTypeDescriptors } from "../../custom-types";
import { Button } from "@mui/material";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend, downloadDockingResult } from "../../tasks/server-docking-task";
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

export default function TasksTab(props: {pockets: PocketData[], predictionInfo: PredictionInfo, plugin: PluginUIContext, initialPocket: number}) {
    const tasks: TaskTypeMenuItem[] = [
        {
            id: 1,
            specificType: ClientTaskType.Volume,
            type: TaskType.Client,
            name: "Volume",
            compute: (params, customName, pocketIndex) => {
                const promise = computePocketVolume(props.plugin, props.pockets[pocketIndex]);

                promise.then((task: ClientTask) => {
                    let savedTasks = localStorage.getItem("clientTasks");
                    if(!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.Volume,
                        "data": task.data
                    });

                    localStorage.setItem("clientTasks", JSON.stringify(tasks));
                    console.log(tasks);
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
                promise.then((task: ClientTask) => {
                    let savedTasks = localStorage.getItem("clientTasks");
                    if(!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.DockingTaskCount,
                        "data": task.data
                    });

                    localStorage.setItem("clientTasks", JSON.stringify(tasks));
                    console.log(tasks);
                });
            }
        },
        {
            id: 3,
            specificType: ServerTaskType.Docking,
            type: TaskType.Server,
            name: "Docking",
            compute: (params, customName, pocketIndex) => {
                let savedTasks = localStorage.getItem("serverTasks");
                if(!savedTasks) savedTasks = "[]";
                const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
                tasks.push({
                    "name": customName,
                    "params": params,
                    "pocket": pocketIndex + 1,
                    "created": new Date().toISOString(),
                    "status": "queued",
                    "type": ServerTaskType.Docking,
                    "responseData": null
                });
                localStorage.setItem("serverTasks", JSON.stringify(tasks));
                console.log(tasks);
                computeDockingTaskOnBackend(props.predictionInfo, props.pockets[pocketIndex], params, [], props.plugin);
            }
        }
    ];

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketNumber, setPocketNumber] = React.useState<number>(props.initialPocket);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string>("");
    const [forceUpdate, setForceUpdate] = React.useState<number>(0);

    const handleTaskTypeChange = (event: SelectChangeEvent) => {
        setTask(tasks.find(task => task.id == Number(event.target.value))!);
    };

    const handlePocketNumberChange = (event: SelectChangeEvent) => {
        setPocketNumber(Number(event.target.value));
    };

    const handleSubmitButton = async () => {
        task.compute(parameters, name, pocketNumber - 1);
        setTimeout(forceComponentUpdate, 250);
    }

    const forceComponentUpdate = () => {
        setForceUpdate(prevState => prevState + 1);
    }

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch(serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params, serverTask.responseData.url);
                break;
            default:
                break;
        }
    }

    let savedTasks = localStorage.getItem("serverTasks");
    if(!savedTasks) savedTasks = "[]";
    const tasksFromLocalStorage: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);

    let savedClientTasks = localStorage.getItem("clientTasks");
    if(!savedClientTasks) savedClientTasks = "[]";
    const finishedClientTasks: ClientTaskLocalStorageData[] = JSON.parse(savedClientTasks);

    return (
        <div>
            <h3>Tasks</h3>
            <div>
                <h4>Create task</h4>
                <table>
                    <tbody>
                        <tr>
                            <td>
                            <FormControl sx={{minWidth: "15rem", margin: "0.5rem"}}>
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
                            </td>
                            <td>
                            <FormControl sx={{minWidth: "15rem", margin: "0.5rem"}}>
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
                            </td>
                        </tr>

                        {task?.type === TaskType.Server &&
                        <tr>
                            <td>
                                <FormControl sx={{minWidth: "15rem", margin: "0.5rem"}}>
                                    <TextField
                                        label="Enter task parameters"
                                        multiline
                                        maxRows={8}
                                        variant="standard"
                                        value={parameters}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                            setParameters(event.target.value);
                                        }}
                                    />
                                </FormControl>
                            </td>
                            <td>
                                <FormControl sx={{minWidth: "15rem", margin: "0.5rem"}}>
                                    <TextField
                                        label="Enter task name"
                                        variant="standard"
                                        value={name}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                            setName(event.target.value);
                                        }}
                                    />
                                </FormControl>
                            </td>
                        </tr>}

                        <tr>
                            <td></td>
                            <td>
                                <Button variant="contained" sx={{marginTop: "1rem", margin: "0.5rem"}} onClick={handleSubmitButton}>Create task</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h4>Finished tasks</h4>
                <div>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Pocket</TableCell>
                            <TableCell>Status/result</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {finishedClientTasks.map((task: ClientTask, i: number) => {
                                return (
                                    <TableRow key={i}>
                                        <TableCell>{ClientTaskTypeDescriptors[task.type]}</TableCell>
                                        <TableCell>{"-"}</TableCell>
                                        <TableCell>{"-"}</TableCell>
                                        <TableCell>{task.pocket}</TableCell>
                                        <TableCell>{task.data}</TableCell>
                                    </TableRow>
                                )
                            })}
                            {tasksFromLocalStorage.map((task: ServerTaskLocalStorageData, i: number) => {
                                return (
                                    <TableRow key={i}>
                                        <TableCell>{ServerTaskTypeDescriptors[task.type]}</TableCell>
                                        <TableCell>{task.name}</TableCell>
                                        <TableCell>{task.created}</TableCell>
                                        <TableCell>{task.pocket}</TableCell>
                                        <TableCell>{task.status === "successful" ? <span onClick={() => handleResultClick(task)} style={{color: "blue", textDecoration: "underline", cursor: "pointer"}}>successful</span> : task.status}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}