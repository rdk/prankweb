import React from "react";
import { LoadingButton } from '@mui/lab';

import { ClientTaskData, ClientTaskType, PocketData } from '../../custom-types';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

/**
 * This component represents a task that is computed on the client side.
 * We do not expect any parameters to be passed to the task.
 * On completion, the task returns a promise with a JSON object
 * that is rendered by the renderOnComplete function.
 */
export default class PocketClientTask extends React.Component
    <{
        title: string,
        inDialog: boolean, // not needed now. but in other cases the implementation could be potentially different.
        pocket: PocketData,
        plugin: PluginUIContext,
        taskType: ClientTaskType,
        prediction: PredictionInfo,
        compute: () => Promise<ClientTaskData>,                 //the computation that returns a promise with the data to be rendered
        renderOnComplete: (data: ClientTaskData) => JSX.Element //called when the computation is complete
    }, {
        taskData: ClientTaskData | undefined,
        computed: boolean,
        loading: boolean
    }> {

    constructor(props: any) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.clickCompute = this.clickCompute.bind(this);
        this.state = {loading: false, computed: false, taskData: undefined};
    }


    async clickCompute() {
        const json = await this.props.compute();
        this.setState({loading: false, computed: true, taskData: json});
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
                    this.state.computed && this.props.renderOnComplete(this.state.taskData!)
                }
            </div>
        );
    }
}
