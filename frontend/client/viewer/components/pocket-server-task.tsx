import React from "react";
import { LoadingButton } from '@mui/lab';
import { Modal, Box, Typography, TextField } from "@mui/material";
import { PocketData, ServerTaskData, ServerTaskType } from '../../custom-types';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

export default class PocketServerTask extends React.Component
    <{
        title: string,
        inDialog: boolean, // not needed now. but in other cases the implementation could be potentially different.
        pocket: PocketData,
        plugin: PluginUIContext,
        taskType: ServerTaskType,
        prediction: PredictionInfo,
        serverTasks: ServerTaskData[]
    }, {
        responseData: any, //this may be changed to any type (the best way is to define some interface)
        computed: boolean,
        loading: boolean,
        modalOpen: boolean,
        formData: string,
        hash: string
    }> {

    constructor(props: any) {
        super(props);
        this.handleFormClick = this.handleFormClick.bind(this);
        this.clickCompute = this.clickCompute.bind(this);
        this.handleModalClick = this.handleModalClick.bind(this);
        this.state = {loading: false, computed: false, responseData: undefined, modalOpen: false, formData: "", hash: ""};
    }

    async clickCompute(firstFetch: boolean = true) {
        switch(this.props.taskType) {
            case ServerTaskType.Sample:
                if(firstFetch) {
                    // compute a hash
                    const hash = this.state.formData;
                    this.setState({hash: hash});

                    //then look if the task already exists
                    //TODO: should we check this here or in the backend?
                    if(this.props.serverTasks && (this.props.serverTasks.filter((e: any) => e["data"]["hash"] === this.state.hash && e["data"]["pocket"] === this.props.pocket.rank)).length > 0) {
                        this.clickCompute(false);
                        return;
                    }

                    //if not, create a new task
                    await fetch(`./api/v2/sample/${this.props.prediction.database}/${this.props.prediction.id}/post`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            "hash": hash,
                            "pocket": this.props.pocket.rank,
                        }),
                    }).then(res => res.json()).catch(err => {
                        console.log(err);
                        this.clickCompute(true); //repeat the request
                    });
                }

                //check if the task is finished
                let matchingTasks = (this.props.serverTasks.filter((e: any) => e["data"]["hash"] === this.state.hash && e["data"]["pocket"] === this.props.pocket.rank));

                if(matchingTasks.length === 0) {
                    setTimeout(() => this.clickCompute(false), 1000);
                    return;
                }

                if(matchingTasks[0]["status"] !== "successful") {
                    setTimeout(() => this.clickCompute(false), 1000);
                    return;
                }

                const data = await fetch(`./api/v2/sample/${this.props.prediction.database}/${this.props.prediction.id}/public/result.json`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "hash": this.state.hash,
                    }
                )}).then(res => res.json()).catch(err => console.log(err));
                if(!data) {
                    setTimeout(() => this.clickCompute(false), 3000);
                    return;
                }
                //TODO: handle error in a better way
                const dataWrapper = {
                    "type": ServerTaskType.Sample,
                    "pockets": data
                }
                matchingTasks[0]["responseData"] = dataWrapper;
                this.setState({loading: false, computed: true, responseData: dataWrapper});
                break;
            default:
                //will not happen
                break;
        }
    }

    async handleFormClick() {
        if(this.state.computed) {
            return;
        }
        this.setState({loading: true});
        await this.clickCompute();
    }

    handleModalClick() {
        this.setState({modalOpen: !this.state.modalOpen});
    }

    render() {
        return (
            <div style={{margin: "0.5rem"}}>
                <strong>{this.props.title}:</strong>
                {
                    !this.state.computed &&
                    <div style={{display: 'inline'}}>
                        <LoadingButton
                            size="small"
                            onClick={this.handleModalClick}
                            loading={this.state.loading}
                            variant="contained"
                            style={{float: "right", marginLeft: "1rem"}}
                        >
                            {!this.state.computed && "Compute"}
                            {this.state.computed && "Computed"}
                        </LoadingButton>
                        <Modal
                            open={this.state.modalOpen}
                            onClose={this.handleModalClick}
                            aria-labelledby="modal-modal-title"
                            aria-describedby="modal-modal-description"
                        >
                        <Box sx={{position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '50%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,}}>
                            <Typography id="modal-modal-title" variant="h6" component="h2">
                                Enter the molecule for docking in pocket {this.props.pocket.rank} (SMILES or PDB)
                            </Typography>
                            <TextField id="filled-basic" variant="outlined"
                                sx={{position: 'relative', width: '100%'}}
                                multiline={true} rows={12} onChange={(e) => {this.setState({formData: e.target.value})}}
                            />
                            <LoadingButton
                                size="small"
                                onClick={this.handleFormClick}
                                loading={this.state.loading}
                                variant="contained"
                                style={{float: "right", marginLeft: "1rem", marginTop: "1rem"}}
                            >
                                {!this.state.computed && "Compute"}
                                {this.state.computed && "Computed"}
                            </LoadingButton>
                        </Box>
                        </Modal>
                    </div>
                }
                {
                    this.state.computed &&
                    this.state.responseData!["type"] === ServerTaskType.Sample &&
                    <span style={{float: "right", marginLeft: "1rem"}}>
                        {this.state.responseData!["pockets"].filter((e: any) => e["rank"] == this.props.pocket.rank)[0]["count"]}
                    </span>
                    // here the data should be properly formatted based on the returned type
                    // i.e for number arrays we could potentially add a diagram instead of just showing a number
                }
            </div>
        );
    }
}
