import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Button } from '@mui/material';
import { ClientTaskLocalStorageData, ClientTaskTypeDescriptors, PocketData, ServerTaskLocalStorageData, ServerTaskType, ServerTaskTypeDescriptors } from "../../custom-types";
import { downloadDockingResult } from '../../tasks/server-docking-task';

export default function DataTableRowDetails(props: { pocket: PocketData; setTab: (tab: number, initialPocket?: number) => void; }) {
    const pocket = props.pocket;

    let serverTasks = localStorage.getItem("serverTasks");
    if (!serverTasks) serverTasks = "[]";
    const serverTasksParsed: ServerTaskLocalStorageData[] = JSON.parse(serverTasks);

    let clientTasks = localStorage.getItem("clientTasks");
    if (!clientTasks) clientTasks = "[]";
    const clientTasksParsed: ClientTaskLocalStorageData[] = JSON.parse(clientTasks);

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch (serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params, serverTask.responseData.url);
                break;
            default:
                break;
        }
    };

    const handleCreateTask = () => {
        //the tab index is 2
        props.setTab(2, Number(props.pocket.rank));
    };

    return (
        <div>
            TODO: maybe we could add some more information here (out of the table)?
            <h4>Tasks</h4>
            <Button variant="outlined" onClick={handleCreateTask}>Create task</Button>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Status/result</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {clientTasksParsed.map((row: ClientTaskLocalStorageData) => {
                        if (row.pocket === Number(pocket.rank)) {
                            return (
                                <TableRow key={row.pocket}>
                                    <TableCell>{ClientTaskTypeDescriptors[row.type]}</TableCell>
                                    <TableCell>{"-"}</TableCell>
                                    <TableCell>{"-"}</TableCell>
                                    <TableCell>{row.data}</TableCell>
                                </TableRow>
                            );
                        }
                    })}
                    {serverTasksParsed.map((row: ServerTaskLocalStorageData) => {
                        if (row.pocket === Number(pocket.rank)) {
                            return (
                                <TableRow key={row.pocket}>
                                    <TableCell>{ServerTaskTypeDescriptors[row.type]}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.created}</TableCell>
                                    <TableCell>{row.status === "successful" ? <span onClick={() => handleResultClick(row)} style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}>successful</span> : row.status}</TableCell>
                                </TableRow>
                            );
                        }
                    })}
                </TableBody>
            </Table>
        </div>
    );
}