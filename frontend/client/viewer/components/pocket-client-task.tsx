import React from "react";
import { LoadingButton } from '@mui/lab';
import { sendRandomJSONData } from '../client-example-task';
import { SampleJSONData } from '../../custom-types';

export default class PocketClientTask extends React.Component
    <{
        title: string,
        inDialog: boolean // not needed now. but in other cases the implementation could be potentially different.
    }, {
        data: SampleJSONData | undefined, //this may be changed to any type (the best way is to define some interface)
        computed: boolean,
        loading: boolean
    }> {

    constructor(props: any) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.sampleClick = this.sampleClick.bind(this);
        this.state = {loading: false, computed: false, data: undefined};
    }

    async sampleClick() {
        const json : SampleJSONData = await sendRandomJSONData();
        
        this.setState({loading: false, computed: true, data: json});
    }

    async handleClick() {
        //this.state.loading ? this.setState({loading: false}) : this.setState({loading: true});
        if(this.state.computed) {
            return;
        }
        this.setState({loading: true});
        await this.sampleClick();
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
                        {!this.state.computed && "Fetch data"}
                        {this.state.computed && "Computed"}
                    </LoadingButton>
                }
                {
                    this.state.computed &&
                    <span style={{float: "right", marginLeft: "1rem"}}>{this.state.data!.value}</span>
                    // here the data should be properly formatted and again, we may change this to a new component
                }
            </div>
        );
    }
}
