import React from "react";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import EnhancedTable from "./data-table";

import { PocketData, PredictionData } from "../../custom-types";
import { PredictionInfo } from "../../prankweb-api";
import PredictionInfoTab from "./prediction-info-tab";
import TasksTab from "./tasks-tab";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

export default function BasicTabs(props: {
    pockets: PocketData[],
    predictionInfo: PredictionInfo,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    toggleAllPockets: (visible: boolean) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void,
    plugin: PluginUIContext,
    tab: number,
    setTab: (tab: number, initialPocket?: number) => void,
    initialPocket: number;
    predictionData: PredictionData;
}) {

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        props.setTab(newValue);
    };

    const tabNames = ["Pockets", "Info", "Tasks"];

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={props.tab} onChange={handleChange} aria-label="Pocket tools tabs">
                    {tabNames.map((name, index) => {
                        return <Tab key={index} {...tabProperties(index, name)} />;
                    })}
                </Tabs>
            </Box>
            <CustomTabPanel value={props.tab} index={0}>
                <EnhancedTable pockets={props.pockets} setPocketVisibility={props.setPocketVisibility} showOnlyPocket={props.showOnlyPocket}
                    focusPocket={props.focusPocket} highlightPocket={props.highlightPocket} setTab={props.setTab}
                    toggleAllPockets={props.toggleAllPockets} predictionInfo={props.predictionInfo} />
            </CustomTabPanel>
            <CustomTabPanel value={props.tab} index={1}>
                <PredictionInfoTab predictionInfo={props.predictionInfo} predictionData={props.predictionData} />
            </CustomTabPanel>
            <CustomTabPanel value={props.tab} index={2}>
                <TasksTab pockets={props.pockets} predictionInfo={props.predictionInfo} plugin={props.plugin} initialPocket={props.initialPocket} />
            </CustomTabPanel>
        </Box>
    );
}

function tabProperties(index: number, label: string) {
    return {
        id: `simple-tab-${index}`,
        label: label
    };
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
}