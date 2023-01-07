import React from "react";
import { LoadingButton } from '@mui/lab';

export default class PocketClientTask extends React.Component
    <{
        title: string,
        inDialog: boolean // not needed now. but in other cases the implementation could be potentially different.
    }, {
        computed: boolean,
        loading: boolean
    }> {

    constructor(props: any) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.sampleClick = this.sampleClick.bind(this);
        this.state = {loading: false, computed: false};
    }

    async sampleClick() {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.setState({loading: false, computed: true});
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
            </div>
        );
    }
}