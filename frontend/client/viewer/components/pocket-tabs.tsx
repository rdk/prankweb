import React from "react";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import EnhancedTable from "./data-table";

import { PocketData } from "../../custom-types";
import { PredictionInfo } from "../../prankweb-api";
import PredictionInfoTab from "./prediction-info-tab";
import TasksTab from "./tasks-tab";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export default class BasicTabs extends React.Component<
  {
    pockets: PocketData[],
    predictionInfo: PredictionInfo,
    setPocketVisibility: (index: number, isVisible: boolean) => void,
    showOnlyPocket: (index: number) => void,
    focusPocket: (index: number) => void,
    highlightPocket: (index: number, isHighlighted: boolean) => void,
    plugin: PluginUIContext
  }, {
    value: number
  }> {

  constructor(props: any) {
    super(props);

    this.state = {
      value: 0
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange = (event: React.SyntheticEvent, newValue: number) => {
    this.setState({value: newValue});
  };

  render() {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={this.state.value} onChange={this.handleChange} aria-label="Pocket tools tabs">
            <Tab {...tabProperties(0, "Pockets")} />
            <Tab {...tabProperties(1, "Info")} />
            <Tab {...tabProperties(2, "Tasks")} />
          </Tabs>
        </Box>
        <CustomTabPanel value={this.state.value} index={0}>
          <EnhancedTable pockets={this.props.pockets} setPocketVisibility={this.props.setPocketVisibility} showOnlyPocket={this.props.showOnlyPocket} 
          focusPocket={this.props.focusPocket} highlightPocket={this.props.highlightPocket}/>
        </CustomTabPanel>
        <CustomTabPanel value={this.state.value} index={1}>
          <PredictionInfoTab predictionInfo={this.props.predictionInfo} />
        </CustomTabPanel>
        <CustomTabPanel value={this.state.value} index={2}>
          <TasksTab pockets={this.props.pockets} predictionInfo={this.props.predictionInfo} plugin={this.props.plugin} />
        </CustomTabPanel>
      </Box>
    );
  }
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