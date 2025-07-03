import React, { Component } from "react";
import "./RegisterPage.css";
import {postToClients, deleteClient} from "./util/util";
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Checkbox, 
  FormControlLabel,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import { Delete } from '@mui/icons-material';

class RegisterPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clientId: "",
      fhirUrl: "",
      toggle: false,
      json: {},
      clients: []
    }

    this.submit = this.submit.bind(this);
    this.update = this.update.bind(this);
  }

  componentDidMount(){
    this.update();
  }

  update(e) {
    const clientRequest = new XMLHttpRequest();
    clientRequest.open("GET", "../clients");
    clientRequest.setRequestHeader("Content-Type", "application/json");
    clientRequest.onload = (e) => {
        this.setState({clients: JSON.parse(clientRequest.responseText)});
    };
    clientRequest.send();
  }

  submit(){
    if(this.state.toggle) {
        postToClients({name: "default", client: this.state.clientId}, this.update)
    }else{
        postToClients({name: this.state.fhirUrl, client: this.state.clientId}, this.update);
    }
  }

  delete(log) {
        deleteClient(log.id, this.update);
  }

  render() {
    return(
        <Grid container spacing={4}>
            <Grid size={6}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Client Registration
                    </Typography>
                    
                    <TextField
                        fullWidth
                        label="Client Id"
                        value={this.state.clientId}
                        onChange={(e) => {this.setState({clientId: e.target.value})}}
                        margin="normal"
                    />

                    <TextField
                        fullWidth
                        label="Fhir Server (iss)"
                        value={this.state.fhirUrl}
                        onChange={(e) => {this.setState({fhirUrl: e.target.value})}}
                        disabled={this.state.toggle}
                        margin="normal"
                    />

                    <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                        Last Accessed Fhir Server:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {localStorage.getItem("lastAccessedServiceUri") || "None"}
                    </Typography>
                    
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={this.state.toggle}
                                onChange={() => {this.setState({toggle: !this.state.toggle})}}
                            />
                        }
                        label="Use this client ID by default for all FHIR Servers"
                        sx={{ mt: 2, mb: 3 }}
                    />
                    
                    <Button 
                        variant="contained" 
                        onClick={this.submit}
                        fullWidth
                    >
                        Submit
                    </Button>
                </Paper>
            </Grid>

            <Grid size={6}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Current Client Ids
                    </Typography>
                    {this.state.clients.map((e) => {
                        return (
                            <Box key={e.id} sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                p: 1,
                                border: 1,
                                borderColor: 'grey.300',
                                borderRadius: 1,
                                mb: 1
                            }}>
                                <Typography variant="body2">
                                    <strong>{e.name}</strong>: {e.client}
                                </Typography>
                                <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => {this.delete(e)}}
                                >
                                    <Delete />
                                </IconButton>
                            </Box>
                        )
                    })}
                </Paper>
            </Grid>
        </Grid>
    )
  }
}
export default RegisterPage;