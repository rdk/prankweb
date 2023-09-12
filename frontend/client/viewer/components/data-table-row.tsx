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

import "bootstrap-icons/font/bootstrap-icons.css";
import "./data-table.css"
import { PocketData } from '../../custom-types';
import { calculateColorWithAlpha } from './tools';

export default class DataTableRow extends React.Component<{ 
    pocket: PocketData, 
    dense: boolean, 
    emptyRows: number,
    hasConservation: boolean,
    hasAlphaFold: boolean,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void,
}, {
    open: boolean,
    index: number,
}> {

    constructor(props: any) {
        super(props);

        this.state = {
            open: false,
            index: Number(this.props.pocket.rank) - 1,
        };

        this.setOpen = this.setOpen.bind(this);
        this.onPocketMouseEnter = this.onPocketMouseEnter.bind(this);
        this.onPocketMouseLeave = this.onPocketMouseLeave.bind(this);
        this.onPocketClick = this.onPocketClick.bind(this);
        this.showOnlyClick = this.showOnlyClick.bind(this);
        this.togglePocketVisibility = this.togglePocketVisibility.bind(this);
    }

    setOpen() {
        this.setState({open: !this.state.open});
    }

    onPocketMouseEnter() {
        if (!this.props.pocket.isVisible) {
            return;
        }
        this.props.highlightPocket(this.state.index, true);
    }

    onPocketMouseLeave() {
        if (!this.props.pocket.isVisible) {
            return;
        }
        this.props.highlightPocket(this.state.index, false);
    }

    onPocketClick() {
        // Cannot focus on hidden pocket.
        if (!this.props.pocket.isVisible) {
            return;
        }
        this.props.focusPocket(this.state.index);
    }

    showOnlyClick() {
        this.props.showOnlyPocket(this.state.index);
    }

    togglePocketVisibility() {
        this.props.setPocketVisibility(this.state.index, !this.props.pocket.isVisible);
        //this changes the pocket visibility, so we have to render again
        this.forceUpdate();
    }

    render() {
        const pocket = this.props.pocket;

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
                <TableCell component="th" scope="row" style={{
                    "backgroundColor": (pocket.isVisible || pocket.isVisible === undefined) ? calculateColorWithAlpha(0.75, this.props.pocket.color!) : "#ffffff"
                }}>
                    {pocket.rank}
                </TableCell>
                <TableCell align="right">{pocket.score}</TableCell>
                <TableCell align="right">{pocket.probability}</TableCell>
                {
                //<TableCell align="right" style={{backgroundColor: "#" + row.color}}>{row.color}</TableCell>
                }
                <TableCell align="right">{pocket.residues.length}</TableCell>
                {this.props.hasConservation && <TableCell align="right">{pocket.avgConservation}</TableCell>}
                {this.props.hasAlphaFold && <TableCell align="right">{pocket.avgAlphaFold}</TableCell>}
                </TableRow>
                <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={this.state.open} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                        <Typography variant="h6" gutterBottom component="div">
                        Pocket {pocket.rank}
                        </Typography>
                        <div>
                            <button
                                type="button"
                                title="Show only this pocket"
                                className="btn btn-outline-secondary btnIcon"
                                onClick={this.showOnlyClick}
                            >
                                <i className="bi bi-eye" style={{"width": "1em"}}></i>
                            </button>
                            <button
                                type="button"
                                style={{
                                    "display": pocket.isVisible ? "inline" : "none",
                                }}
                                title="Focus/highlight to this pocket."
                                className="btn btn-outline-secondary btnIcon"
                                onClick={this.onPocketClick}
                                onMouseEnter={this.onPocketMouseEnter}
                                onMouseLeave={this.onPocketMouseLeave}
                                >
                                <i className="bi bi-search" style={{"width": "1em"}}></i>
                            </button>
                            <button
                                type="button"
                                title="Show / Hide pocket."
                                className="btn btn-outline-secondary btnIcon"
                                onClick={this.togglePocketVisibility}>
                                {pocket.isVisible ?
                                <i className="bi bi-x-circle" style={{"width": "1em"}}></i>
                                : 
                                <i className="bi bi-check-circle" style={{"width": "1em"}}></i>
                                }
                            </button>
                        </div>
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
