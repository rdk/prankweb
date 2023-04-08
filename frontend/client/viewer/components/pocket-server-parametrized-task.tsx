import React from "react";
import { LoadingButton } from '@mui/lab';
import { Modal, Box, Typography, TextField } from "@mui/material";
import { PocketData, ServerTaskData, ServerTaskType } from '../../custom-types';
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionInfo } from "../../prankweb-api";

/**
 * This component displays and handles a task that is meant to be run on the server-side.
 * It is parametrized by a hash (string) that is used to identify the task which is computed
 * after an user input.
 * It is expected that the compute and renderOnComplete functions are provided by an additional
 * file that contains the logic for the specific task.
 */
export default class PocketServerParametrizedTask extends React.Component
    <{
        title: string,
        inDialog: boolean,
        pocket: PocketData,
        plugin: PluginUIContext,
        taskType: ServerTaskType,
        prediction: PredictionInfo,
        serverTasks: ServerTaskData[],
        modalDescription: string,
        compute: (hash: string) => Promise<any>
        renderOnComplete: (responseData: ServerTaskData, hash: string) => JSX.Element
    }, {
        taskData: ServerTaskData | undefined,
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
        this.state = {loading: false, computed: false, taskData: undefined, modalOpen: false, formData: "", hash: ""};
    }

    async clickCompute() {
        if(this.state.hash === "") {
            const hash = this.state.formData;
            this.setState({hash: hash});
        }

        const data = await this.props.compute(this.state.hash);
        if(!data) {
            setTimeout(() => this.clickCompute(), 1000);
        }
        if(data) {
            this.setState({loading: false, computed: true, taskData: data});
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

    // currently after clicking the compute button, a modal is shown for the user to input the task parameters
    render() {
        return (
            <div>
                {
                    !this.state.computed &&
                    <div style={{margin: "0.5rem"}}>
                        <strong>{
                            this.props.title + ((this.state.hash === "") ? "" : " (" + this.state.hash + ")")
                        }:</strong>
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
                                    {this.props.modalDescription}
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
                    </div>
                }
                {
                    this.state.computed &&
                    this.props.renderOnComplete(this.state.taskData!, this.state.hash)
                }
            </div>
        );
    }
}
