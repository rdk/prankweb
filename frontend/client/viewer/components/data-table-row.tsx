import * as React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';

import "./data-table.css"
import { PocketData } from '../../custom-types';
import { calculateColorWithAlpha } from './tools';

export default class DataTableRow extends React.Component<{ 
    row: PocketData, 
    dense: boolean, 
    emptyRows: number,
    hasConservation: boolean,
    hasAlphaFold: boolean
}, {
    open: boolean
}> {

    constructor(props: any) {
        super(props);

        this.state = {
            open: false
        };

        this.setOpen = this.setOpen.bind(this);
    }

    setOpen() {
        this.setState({open: !this.state.open});
    }

    render() {
        const row = this.props.row;

        return(
            <React.Fragment>
                <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                    aria-label="expand row"
                    size="small"
                    onClick={() => this.setOpen()}
                    >
                    {this.state.open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row" style={{backgroundColor: calculateColorWithAlpha(0.75, row.color!)}}>
                    {row.rank}
                </TableCell>
                <TableCell align="right">{row.score}</TableCell>
                <TableCell align="right">{row.probability}</TableCell>
                {
                //<TableCell align="right" style={{backgroundColor: "#" + row.color}}>{row.color}</TableCell>
                }
                <TableCell align="right">{row.residues.length}</TableCell>
                {this.props.hasConservation && <TableCell align="right">{row.avgConservation}</TableCell>}
                {this.props.hasAlphaFold && <TableCell align="right">{row.avgAlphaFold}</TableCell>}
                </TableRow>
                <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={this.state.open} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                        <Typography variant="h6" gutterBottom component="div">
                        Pocket {row.rank}
                        </Typography>
                        <Table size="small" aria-label="purchases">
                        <TableHead>
                            <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Total price ($)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell component="th" scope="row">1.1.1990</TableCell>
                                <TableCell>1</TableCell>
                                <TableCell align="right">10</TableCell>
                                <TableCell align="right">50</TableCell>
                            </TableRow>
                        </TableBody>
                        </Table>
                    </Box>
                    </Collapse>
                </TableCell>
                </TableRow>
            </React.Fragment>
        );
    }
}
