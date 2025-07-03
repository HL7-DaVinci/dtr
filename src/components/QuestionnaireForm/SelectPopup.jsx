import React, { Component } from "react";
import PropTypes from 'prop-types';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { ListItemButton } from "@mui/material";

function SimpleDialog(props) {
  const { onClose, selectedValue, open, title, options, finalOption } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value) => {
    onClose(value);
  };

  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
        <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
        <List>
        {options.map((option) => (
            <ListItemButton onClick={() => handleListItemClick(option)} key={option}>
              <ListItemText primary={option} />
            </ListItemButton>
        ))}

        <ListItemButton autoFocus onClick={() => handleListItemClick('New')}>
            <ListItemText primary={finalOption} />
        </ListItemButton>
        </List>
    </Dialog>
    );
}

SimpleDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  selectedValue: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  finalOption: PropTypes.string.isRequired
};


export default class SelectPopup extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedCallback: props.selectedCallback,
      open: false,
      selectedValue: ""
    }
    this.handleClickOpen = this.handleClickOpen.bind(this);
  }

  componentWillMount() { }

  componentDidMount() {
    this.props.setClick(this.handleClickOpen);
  }

  handleClickOpen() {
    this.setState( { open: true } );
    console.log(this.props.options);
  }

  handleClose(value) {
    this.setState({ open: false,
      selectedValue: value });
    this.state.selectedCallback(value);
  }

  render() {
    return (
      <div>
        <SimpleDialog
          selectedValue={this.state.selectedValue}
          open={this.state.open}
          onClose={this.handleClose.bind(this)}
          title={this.props.title}
          options={this.props.options}
          finalOption={this.props.finalOption}
        />
      </div>
    );
  }
}