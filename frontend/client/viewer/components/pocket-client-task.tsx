import React from "react";
import { LoadingButton } from '@mui/lab';
import { computePocketVolume } from '../../tasks/client-atoms-volume';
import { getSampleTaskCount } from "../../tasks/client-get-sample-tasks";
import { ClientTaskData, ClientTaskType, PocketData } from '../../custom-types';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

export default class PocketClientTask extends React.Component
    <{
        title: string,
        inDialog: boolean, // not needed now. but in other cases the implementation could be potentially different.
        pocket: PocketData,
        plugin: PluginUIContext,
        taskType: ClientTaskType,
        prediction: PredictionInfo
    }, {
        data: ClientTaskData | undefined, //this may be changed to any type (the best way is to define some interface)
        computed: boolean,
        loading: boolean
    }> {

    constructor(props: any) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.clickCompute = this.clickCompute.bind(this);
        this.state = {loading: false, computed: false, data: undefined};
    }

    async clickCompute() {
        let json: ClientTaskData | null = null;
        switch(this.props.taskType) {
            case ClientTaskType.Volume:
                json = await computePocketVolume(this.props.plugin, this.props.pocket);
                this.setState({loading: false, computed: true, data: json});
                break;
            case ClientTaskType.SampleTaskCount:
                json = await getSampleTaskCount(this.props.prediction);
                this.setState({loading: false, computed: true, data: json});
                break;
            default:
                //will not happen
                break;
        }
    }

    async handleClick() {
        if(this.state.computed) {
            return;
        }
        this.setState({loading: true});
        await this.clickCompute();
    }

    render() {
        return (
            <div style={{margin: "0.5rem"}}>
                <strong>{this.props.title}:</strong>
                {
                    !this.state.computed &&
                    <LoadingButton
                        size="small"
                        onClick={this.handleClick}
                        loading={this.state.loading}
                        variant="contained"
                        style={{float: "right", marginLeft: "1rem"}}
                    >
                        {!this.state.computed && "Compute"}
                        {this.state.computed && "Computed"}
                    </LoadingButton>
                }
                {
                    this.state.computed &&
                    this.state.data!.type === ClientTaskType.Volume &&
                    <span style={{float: "right", marginLeft: "1rem"}}>{this.state.data!.numericValue}</span>
                    // here the data should be properly formatted based on the returned type
                    // i.e for number arrays we could potentially add a diagram instead of just showing a number
                }
                {
                    this.state.computed &&
                    this.state.data!.type === ClientTaskType.SampleTaskCount &&
                    <span style={{float: "right", marginLeft: "1rem"}}>{this.state.data!.numericValue}</span>
                }
            </div>
        );
    }
}
