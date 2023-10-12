import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Button, Paper } from '@mui/material';
import { ClientTaskLocalStorageData, ClientTaskTypeDescriptors, PocketData, ServerTaskLocalStorageData, ServerTaskType, ServerTaskTypeDescriptors } from "../../custom-types";
import { downloadDockingResult } from '../../tasks/server-docking-task';
import { ClientTaskType } from "../../custom-types";

export default function DataTableRowDetails(props: { pocket: PocketData; setTab: (tab: number, initialPocket?: number) => void, structureId: string; }) {
    const pocket = props.pocket;

    let serverTasks = localStorage.getItem(`${props.structureId}_serverTasks`);
    if (!serverTasks) serverTasks = "[]";
    const serverTasksParsed: ServerTaskLocalStorageData[] = JSON.parse(serverTasks);

    let clientTasks = localStorage.getItem(`${props.structureId}_clientTasks`);
    if (!clientTasks) clientTasks = "[]";
    const clientTasksParsed: ClientTaskLocalStorageData[] = JSON.parse(clientTasks);

    const handleResultClick = (serverTask: ServerTaskLocalStorageData) => {
        switch (serverTask.type) {
            case ServerTaskType.Docking:
                downloadDockingResult(serverTask.params[0], serverTask.responseData[0].url, pocket.rank);
                break;
            default:
                break;
        }
    };

    const handleCreateTask = () => {
        //the tab index is 2
        props.setTab(2, Number(props.pocket.rank));
    };

    type shownProperty = {
        name: string;
        value: any;
    };

    const shownProperties: shownProperty[] = [
        {
            name: "Rank",
            value: pocket.rank
        },
        {
            name: "Score",
            value: pocket.score
        },
        {
            name: "Probability",
            value: pocket.probability
        },
        {
            name: "Number of residues",
            value: pocket.residues.length
        },
    ];

    if (pocket.avgAlphaFold) shownProperties.push({
        name: "Average AlphaFold score",
        value: pocket.avgAlphaFold!
    });

    if (pocket.avgConservation) shownProperties.push({
        name: "Average conservation score",
        value: pocket.avgConservation!
    });

    return (
        <div>
            <Paper>
                <Table size="small">
                    {shownProperties.map((property) =>
                        <TableRow>
                            <TableCell>{property.name}</TableCell>
                            <TableCell>{property.value}</TableCell>
                        </TableRow>
                    )}
                </Table>
            </Paper>
            &nbsp;
            <Paper>
                {/*<span style={{ padding: 10, paddingTop: 15, fontSize: "1.25rem", display: "block" }}>Tasks for pocket {pocket.rank}</span>*/}
                <Table size="small">
                    <TableHead>
                        <TableRow style={{ background: "black" }}>
                            <TableCell style={{ color: "white" }}>Task type</TableCell>
                            <TableCell style={{ color: "white" }}>Name</TableCell>
                            <TableCell style={{ color: "white" }}>Timestamp</TableCell>
                            <TableCell style={{ color: "white" }}>Status/result</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clientTasksParsed.map((row: ClientTaskLocalStorageData, i) => {
                            if (row.pocket === Number(pocket.rank)) {
                                return (
                                    <TableRow key={i + "_client"}>
                                        <TableCell>{ClientTaskTypeDescriptors[row.type]}</TableCell>
                                        <TableCell>{"-"}</TableCell>
                                        <TableCell>{row.created}</TableCell>
                                        <TableCell>
                                            {(!isNaN(row.data)) ? row.data.toFixed(1) : row.data}
                                            {row.type === ClientTaskType.Volume && " Å³"}
                                        </TableCell>
                                    </TableRow>
                                );
                            }
                        })}
                        {serverTasksParsed.map((row: ServerTaskLocalStorageData, i) => {
                            if (row.pocket === Number(pocket.rank)) {
                                return (
                                    <TableRow key={i + "_server"}>
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
                <Button variant="outlined" onClick={handleCreateTask} style={{ margin: 10 }}>Create task</Button>
            </Paper>
        </div>
    );
}