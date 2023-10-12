import React from "react";
import { PredictionInfo } from "../../prankweb-api";
import { Button, Paper, Table, TableRow, TableCell } from "@mui/material";
import { getApiDownloadUrl } from "../../prankweb-api";

export default function PredictionInfoTab(props: { predictionInfo: PredictionInfo; }) {
    const pInfo = props.predictionInfo;
    const isUserProvided = pInfo.database.includes("user-upload");
    const isPredicted = pInfo.metadata.predictedStructure === true;

    let url = "";

    if (isPredicted) {
        url = `https://alphafold.ebi.ac.uk/entry/${pInfo.metadata.predictionName}`;
    }
    else if (!isUserProvided) { //this means that the structure is experimental
        url = `https://www.rcsb.org/structure/${pInfo.metadata.predictionName}`;
    }

    const downloadAs = `prankweb-${props.predictionInfo.metadata.predictionName}.zip`;
    const downloadUrl = getApiDownloadUrl(props.predictionInfo);

    type shownProperty = {
        name: string;
        value: any;
    };

    const shownProperties: shownProperty[] = [
        {
            name: "Structure ID",
            value: pInfo.id.toUpperCase(),
        },
        {
            name: "Prediction name",
            value: isUserProvided ? <span>{pInfo.metadata.predictionName}</span> : <a href={url} target="_blank" rel="nofollow noopener noreferrer">{pInfo.metadata.predictionName}</a>
        },
        {
            name: "Database",
            value: pInfo.database
        },
        {
            name: "Created at",
            value: pInfo.created
        },
        {
            name: "Structure provided by the user",
            value: isUserProvided ? "yes" : "no"
        },
        {
            name: "Structure is predicted (AlphaFold)",
            value: isPredicted ? "yes" : "no"
        },
        {
            name: "",
            value: (
                <Button variant="outlined" color="primary" className="visualization-toolbox-button">
                    <a href={downloadUrl} download={downloadAs} className="visualization-toolbox-option-link">
                        Download prediction data
                    </a>
                </Button>
            )
        },
        {
            name: "Prediction model",
            value: "TODO"
        }
    ];

    return (
        <Paper>
            <Table>
                {shownProperties.map((p, i) =>
                    <TableRow key={i}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.value}</TableCell>
                    </TableRow>
                )}
            </Table>
        </Paper>
    );
}