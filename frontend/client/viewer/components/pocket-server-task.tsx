import React from "react";
import { LoadingButton } from '@mui/lab';
import { ClientTaskType, PocketData, ServerTaskType } from '../../custom-types';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

export default class PocketServerTask extends React.Component
    <{
        title: string,
        inDialog: boolean, // not needed now. but in other cases the implementation could be potentially different.
        pocket: PocketData,
        plugin: PluginUIContext,
        taskType: ServerTaskType,
        prediction: PredictionInfo
    }, {
        data: any, //this may be changed to any type (the best way is to define some interface)
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
        switch(this.props.taskType) {
            case ServerTaskType.Sample:
                const json = await fetch(`./api/v2/sample/${this.props.prediction.database}/${this.props.prediction.id}/post`).then(res => res.json()).catch(err => console.log(err));
                //TODO: handle error in a better way
                if(json["status"] !== "successful") {
                    setTimeout(() => this.clickCompute(), 1000);
                    return;
                }
                const data = await fetch(`./api/v2/sample/${this.props.prediction.database}/${this.props.prediction.id}/public/result.json`).then(res => res.json()).catch(err => console.log(err));
                /*
                let data = {
                    "type": ServerTaskType.Sample,
                    "pockets": [
                    {
                        "rank": "1",
                        "count": 37
                    },
                    {
                        "rank": "2",
                        "count": 14
                    },
                    {
                        "rank": "3",
                        "count": 12
                    },
                    {
                        "rank": "4",
                        "count": 11
                    },
                    {
                        "rank": "5",
                        "count": 11
                    },
                    {
                        "rank": "6",
                        "count": 13
                    },
                    {
                        "rank": "7",
                        "count": 8
                    }
                    ]
                }
                */
                const dataWrapper = {
                    "type": ServerTaskType.Sample,
                    "pockets": data
                }
                this.setState({loading: false, computed: true, data: dataWrapper});
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
                    this.state.data!["type"] === ServerTaskType.Sample &&
                    <span style={{float: "right", marginLeft: "1rem"}}>
                        {this.state.data!["pockets"].filter((e: any) => e["rank"] == this.props.pocket.rank)[0]["count"]}
                    </span>
                    // here the data should be properly formatted based on the returned type
                    // i.e for number arrays we could potentially add a diagram instead of just showing a number
                }
            </div>
        );
    }
}
