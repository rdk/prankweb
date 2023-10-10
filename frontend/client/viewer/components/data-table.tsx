import * as React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { visuallyHidden } from '@mui/utils';

import "./data-table.css";
import DataTableRow from './data-table-row';

import { getComparator, Order } from './tools';
import { PocketData } from '../../custom-types';

interface HeadCell {
    id: keyof PocketData;
    label: string;
}

const headCells: HeadCell[] = [
    {
        id: 'rank',     // sort by rank even though there are buttons
        label: 'Tools',
    },
    {
        id: 'rank',
        label: 'Rank',
    },
    {
        id: 'score',
        label: 'Score',
    },
    {
        id: 'probability',
        label: 'Probability',
    },
    {
        id: 'residues',
        label: '# of residues'
    },
    //more are added dynamically based on available conservation/AlphaFold score in the EnhancedTable
];

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof PocketData) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const { order, orderBy, rowCount, onRequestSort } =
        props;
    const createSortHandler =
        (property: keyof PocketData) => (event: React.MouseEvent<unknown>) => {
            onRequestSort(event, property);
        };

    return (
        <TableHead>
            <TableRow>
                <TableCell padding="checkbox"></TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={'center'}
                        padding={'none'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

function TableHeading(props: { toggleAllPockets: (visible: boolean) => void; }) {

    const [visible, setVisible] = React.useState(true);

    const onToggleAllPockets = () => {
        props.toggleAllPockets(!visible);
        setVisible(!visible);
    };

    return (
        <div>
            <Typography
                sx={{ flex: '1 1 100%', pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, pt: 2 }}
                variant="h6"
                id="tableTitle"
            >
                Pockets
                <button
                    style={{ marginLeft: "0.5rem" }}
                    type="button"
                    title="Show / hide all pockets."
                    className="btn btn-outline-secondary btnIcon"
                    onClick={onToggleAllPockets}>
                    {visible ?
                        <i className="bi bi-x-circle" style={{ "width": "1em" }}></i>
                        :
                        <i className="bi bi-check-circle" style={{ "width": "1em" }}></i>
                    }
                </button>
            </Typography>
        </div>

    );
}

export default function EnhancedTable(props: {
    pockets: PocketData[],
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void,
    setTab: (tab: number, initialPocket?: number) => void,
    toggleAllPockets: (visible: boolean) => void,
    structureId: string;
}) {
    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof PocketData>('rank');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof PocketData,
    ) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - props.pockets.length) : 0;

    const visibleRows = React.useMemo(
        () =>
            props.pockets.slice().sort(getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [order, orderBy, page, rowsPerPage],
    );

    const hasConservation = props.pockets.filter((e: PocketData) => e.avgConservation !== 0).length !== 0;
    if (hasConservation && !headCells.find((e: HeadCell) => e.id === 'avgConservation')) {
        headCells.push({
            id: 'avgConservation',
            label: 'Avg conservation',
        });
    }

    const hasAlphaFold = props.pockets.filter((e: PocketData) => e.avgAlphaFold !== 0).length !== 0;
    if (hasAlphaFold && !headCells.find((e: HeadCell) => e.id === 'avgAlphaFold')) {
        headCells.push({
            id: 'avgAlphaFold',
            label: 'Avg AlphaFold score',
        });
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%' }}>
                <TableHeading toggleAllPockets={props.toggleAllPockets} />
                <TableContainer>
                    <Table
                        className='pocket-table'
                        size={'small'}
                    >
                        <EnhancedTableHead
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                            rowCount={props.pockets.length}
                        />
                        <TableBody className='pocket-table-body'>
                            {visibleRows.map((row, index) => (
                                <DataTableRow key={row.name} pocket={row} emptyRows={emptyRows} hasConservation={hasConservation} hasAlphaFold={hasAlphaFold}
                                    setPocketVisibility={props.setPocketVisibility} showOnlyPocket={props.showOnlyPocket} focusPocket={props.focusPocket}
                                    highlightPocket={props.highlightPocket} setTab={props.setTab} structureId={props.structureId} />
                            ))}
                            {emptyRows > 0 && (
                                <TableRow
                                    style={{
                                        height: (35) * emptyRows,
                                    }}
                                >
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={props.pockets.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    );
}
