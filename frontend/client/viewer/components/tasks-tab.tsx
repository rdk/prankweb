import React from "react";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { ClientTaskLocalStorageData, ClientTaskType, ClientTaskTypeDescriptors, PocketData, ServerTaskLocalStorageData, ServerTaskType, ServerTaskTypeDescriptors } from "../../custom-types";
import { Button, Paper, Typography } from "@mui/material";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import "./tasks-tab.css";
import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend, downloadDockingResult } from "../../tasks/server-docking-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
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
                let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                if (savedTasks) {
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);
                    const task = tasks.find(task => task.pocket === (pocketIndex + 1) && task.type === ClientTaskType.Volume);
                    if (task) {
                        // do not compute the same task twice
                        return;
                    }
                }

                const promise = computePocketVolume(props.plugin, props.pockets[pocketIndex]);
                promise.then((volume: number) => {
                    savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                    if (!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.Volume,
                        "created": new Date().toISOString(),
                        "data": volume
                    });

                    localStorage.setItem(`${props.predictionInfo.id}_clientTasks`, JSON.stringify(tasks));
                });
            },
            parameterDescriptions: []
        },
        {
            id: 2,
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
                computeDockingTaskOnBackend(props.predictionInfo, props.pockets[pocketIndex], params[0], props.plugin);
            },
            parameterDescriptions: [
                "Enter the molecule in SMILES format (e.g. c1ccccc1)",
            ]
        }
    ];

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketRank, setPocketRank] = React.useState<number>(props.initialPocket);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string[]>([]);
    const [forceUpdate, setForceUpdate] = React.useState<number>(0);

    const handleTaskTypeChange = (event: SelectChangeEvent) => {
        const newTask = tasks.find(task => task.id == Number(event.target.value))!;
        setTask(newTask);
        setParameters(Array(newTask.parameterDescriptions.length).fill(""));
    };

    const handlePocketRankChange = (event: SelectChangeEvent) => {
        setPocketRank(Number(event.target.value));
    };

    const handleSubmitButton = async () => {
        task.compute(parameters, name, pocketRank - 1);
        setTimeout(forceComponentUpdate, 250);
    };

    const forceComponentUpdate = () => {
        setForceUpdate(prevState => prevState + 1);
    };

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch (serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params[0], serverTask.responseData[0].url, serverTask.pocket.toString());
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
            <Paper>
                <Typography variant="h6" style={{ padding: 10 }}>Create task</Typography>
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
                                    <InputLabel>Pocket rank</InputLabel>
                                    <Select
                                        labelId="pocket-rank"
                                        id="select-pocket-rank"
                                        value={pocketRank.toString()}
                                        label="Pocket rank"
                                        onChange={handlePocketRankChange}
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
                            <td>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </Paper>
            &nbsp;
            <Paper>
                <Typography variant="h6" style={{ padding: 10 }}>Finished tasks</Typography>
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
                        {finishedClientTasks.map((task: ClientTaskLocalStorageData, i: number) =>
                            <TableRow key={i + "_client"}>
                                <TableCell>{ClientTaskTypeDescriptors[task.type]}</TableCell>
                                <TableCell>{"-"}</TableCell>
                                <TableCell>{task.created}</TableCell>
                                <TableCell>{task.pocket}</TableCell>
                                <TableCell>
                                    {(!isNaN(task.data)) ? task.data.toFixed(1) : task.data}
                                    {task.type === ClientTaskType.Volume && " Å³"}
                                </TableCell>
                            </TableRow>
                        )}
                        {tasksFromLocalStorage.map((task: ServerTaskLocalStorageData, i: number) =>
                            <TableRow key={i + "_server"}>
                                <TableCell>{ServerTaskTypeDescriptors[task.type]}</TableCell>
                                <TableCell>{task.name}</TableCell>
                                <TableCell>{task.created}</TableCell>
                                <TableCell>{task.pocket}</TableCell>
                                <TableCell>{task.status === "successful" ? <span onClick={() => handleResultClick(task)} style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}>successful</span> : task.status}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </div>
    );
}