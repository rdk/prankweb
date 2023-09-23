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

import "./tasks-tab.css";
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
    specificType: ServerTaskType | ClientTaskType;
    type: TaskType,
    name: string,
    compute: (params: string[], customName: string, pocketIndex: number) => void;
    parameterDescriptions: string[];
};

export default function TasksTab(props: { pockets: PocketData[], predictionInfo: PredictionInfo, plugin: PluginUIContext, initialPocket: number; }) {
    const tasks: TaskTypeMenuItem[] = [
        {
            id: 1,
            specificType: ClientTaskType.Volume,
            type: TaskType.Client,
            name: "Volume",
            compute: (params, customName, pocketIndex) => {
                const promise = computePocketVolume(props.plugin, props.pockets[pocketIndex]);

                promise.then((task: ClientTask) => {
                    let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                    if (!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.Volume,
                        "data": task.data
                    });

                    localStorage.setItem(`${props.predictionInfo.id}_clientTasks`, JSON.stringify(tasks));
                });
            },
            parameterDescriptions: []
        },
        {
            id: 2,
            specificType: ClientTaskType.DockingTaskCount,
            type: TaskType.Client,
            name: "DockingTaskCount",
            compute: (params, customName, pocketIndex) => {
                const promise = getDockingTaskCount(props.predictionInfo, props.pockets[pocketIndex]);
                promise.then((task: ClientTask) => {
                    let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                    if (!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.DockingTaskCount,
                        "data": task.data
                    });

                    localStorage.setItem(`${props.predictionInfo.id}_clientTasks`, JSON.stringify(tasks));
                });
            },
            parameterDescriptions: []
        },
        {
            id: 3,
            specificType: ServerTaskType.Docking,
            type: TaskType.Server,
            name: "Docking",
            compute: (params, customName, pocketIndex) => {
                let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_serverTasks`);
                if (!savedTasks) savedTasks = "[]";
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
                localStorage.setItem(`${props.predictionInfo.id}_serverTasks`, JSON.stringify(tasks));
                computeDockingTaskOnBackend(props.predictionInfo, props.pockets[pocketIndex], params[0], [], props.plugin);
            },
            parameterDescriptions: [
                "Enter the molecule in SMILES format",
            ]
        }
    ];

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketNumber, setPocketNumber] = React.useState<number>(props.initialPocket);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string[]>([]);
    const [forceUpdate, setForceUpdate] = React.useState<number>(0);

    const handleTaskTypeChange = (event: SelectChangeEvent) => {
        const newTask = tasks.find(task => task.id == Number(event.target.value))!;
        setTask(newTask);
        setParameters(Array(newTask.parameterDescriptions.length).fill(""));
    };

    const handlePocketNumberChange = (event: SelectChangeEvent) => {
        setPocketNumber(Number(event.target.value));
    };

    const handleSubmitButton = async () => {
        task.compute(parameters, name, pocketNumber - 1);
        setTimeout(forceComponentUpdate, 250);
    };

    const forceComponentUpdate = () => {
        setForceUpdate(prevState => prevState + 1);
    };

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch (serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params[0], serverTask.responseData.url);
                break;
            default:
                break;
        }
    };

    let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_serverTasks`);
    if (!savedTasks) savedTasks = "[]";
    const tasksFromLocalStorage: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);

    let savedClientTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
    if (!savedClientTasks) savedClientTasks = "[]";
    const finishedClientTasks: ClientTaskLocalStorageData[] = JSON.parse(savedClientTasks);

    return (
        <div>
            <h3>Tasks</h3>
            <div>
                <h4>Create task</h4>
                <table className="create-task-table">
                    <tbody>
                        <tr>
                            <td>
                                <FormControl sx={{ width: "100%" }}>
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
                                <FormControl sx={{ width: "100%" }}>
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
                        {// allow to name only server tasks
                            task?.type === TaskType.Server &&
                            <tr>
                                <td colSpan={2}>
                                    <FormControl sx={{ width: "100%" }}>
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
                            </tr>
                        }

                        {// render parameter input fields
                            task?.parameterDescriptions.map((description: string, i: number) =>
                                <tr key={i}>
                                    <td colSpan={2}>
                                        <FormControl sx={{ width: "100%" }}>
                                            <TextField
                                                label={description}
                                                multiline
                                                maxRows={8}
                                                variant="standard"
                                                value={parameters[i]}
                                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                    const newParameters = [...parameters];
                                                    newParameters[i] = event.target.value;
                                                    setParameters(newParameters);
                                                }}
                                            />
                                        </FormControl>
                                    </td>
                                </tr>
                            )
                        }
                        <tr>
                            <td>
                                <Button variant="contained" onClick={handleSubmitButton}>Create task</Button>
                            </td>
                            <td></td>
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
                                );
                            })}
                            {tasksFromLocalStorage.map((task: ServerTaskLocalStorageData, i: number) => {
                                return (
                                    <TableRow key={i}>
                                        <TableCell>{ServerTaskTypeDescriptors[task.type]}</TableCell>
                                        <TableCell>{task.name}</TableCell>
                                        <TableCell>{task.created}</TableCell>
                                        <TableCell>{task.pocket}</TableCell>
                                        <TableCell>{task.status === "successful" ? <span onClick={() => handleResultClick(task)} style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}>successful</span> : task.status}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}