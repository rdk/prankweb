import React from "react";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { PocketData } from "../../custom-types";
import { ClientTaskLocalStorageData, ServerTaskLocalStorageData, ServerTaskTypeDescriptors, ClientTaskTypeDescriptors, ClientTaskType, ServerTaskType } from "../../custom-types";
import { downloadDockingResult } from "../../tasks/server-docking-task";

export function TasksTable(props: { pocket: PocketData | null, structureId: string; }) {

    let serverTasks = localStorage.getItem(`${props.structureId}_serverTasks`);
    if (!serverTasks) serverTasks = "[]";
    let serverTasksParsed: ServerTaskLocalStorageData[] = JSON.parse(serverTasks);
    if (props.pocket !== null) serverTasksParsed = serverTasksParsed.filter((task: ServerTaskLocalStorageData) => task.pocket === Number(props.pocket!.rank));

    let clientTasks = localStorage.getItem(`${props.structureId}_clientTasks`);
    if (!clientTasks) clientTasks = "[]";
    let clientTasksParsed: ClientTaskLocalStorageData[] = JSON.parse(clientTasks);
    if (props.pocket !== null) clientTasksParsed = clientTasksParsed.filter((task: ClientTaskLocalStorageData) => task.pocket === Number(props.pocket!.rank));

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch (serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params[0], serverTask.responseData[0].url, serverTask.pocket.toString());
                break;
            default:
                break;
        }
    };


    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Timestamp</TableCell>
                    {props.pocket === null && <TableCell>Pocket</TableCell>}
                    <TableCell>Status/result</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {clientTasksParsed.map((task: ClientTaskLocalStorageData, i: number) =>
                    <TableRow key={i + "_client"}>
                        <TableCell>{ClientTaskTypeDescriptors[task.type]}</TableCell>
                        <TableCell>{"-"}</TableCell>
                        <TableCell>{task.created}</TableCell>
                        {props.pocket === null && <TableCell>{task.pocket}</TableCell>}
                        <TableCell>
                            {(!isNaN(task.data)) ? task.data.toFixed(1) : task.data}
                            {task.type === ClientTaskType.Volume && " Å³"}
                        </TableCell>
                    </TableRow>
                )}
                {serverTasksParsed.map((task: ServerTaskLocalStorageData, i: number) =>
                    <TableRow key={i + "_server"}>
                        <TableCell>{ServerTaskTypeDescriptors[task.type]}</TableCell>
                        <TableCell>{task.name}</TableCell>
                        <TableCell>{task.created}</TableCell>
                        {props.pocket === null && <TableCell>{task.pocket}</TableCell>}
                        <TableCell>{task.status === "successful" ? <span onClick={() => handleResultClick(task)} style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}>successful</span> : task.status}</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}