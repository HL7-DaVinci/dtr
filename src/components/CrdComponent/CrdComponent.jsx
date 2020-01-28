import React, { Component } from 'react';
import FHIR from "fhirclient"

export default class CrdComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount(){
        this.getDeviceRequest(this.props.client)
    }

    getDeviceRequest(client) {
        console.log(client);
        client.request(`DeviceRequest?subject=Patient/${client.state.patientId}`,
                        {resolveReferences:["subject","performer"], 
                        graph: false,
                        flat: true})
                        .then((result)=>{
                            console.log(result);
                        });
    }

    render() {
        return (
            <div>
                <div>Henlo</div>
            </div>

        )
    }
}