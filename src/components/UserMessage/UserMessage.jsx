import { Component } from "react";
import './UserMessage.css';
import { Alert, Button, Typography } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import _ from "lodash"

/** a general purpose mechanism to display messages (e.g., errors, warnings)
 *  to the user
 *  Usage:
 *
 *    <UserMessage variant={'danger'}
                    title={'Error!'}
                    message={'An error occurred while processing the CQL.'}
                    details={this.state.errors[0]['details']} />
 *
 *    Parameters:
 *      variant - one of 'error', 'warning', 'info', 'success' (MUI Alert severities)
 *                (e.g., success, info, warning, danger )
 *      title - optional title for message
 *      message - a paragraph of messages
 *      details - an optional object containing details
 *
 */
export default class UserMessage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDetails: false,
      props
    }
    this.toggleDetails = this.toggleDetails.bind(this);
  };

  toggleDetails() {
    this.setState({ showDetails: !this.state.showDetails });
  }

  renderDetails() {
    if ( this.state.props.details ) {
      if ( this.state.showDetails ) {
        let detailStr = null;
        if (_.isString(this.state.props.details)) {
          detailStr = this.state.props.details
        }
        else {
          detailStr = JSON.stringify(this.state.props.details, null, 2 )
        }
        return (
          <div className="details">
            <pre className="detail">{detailStr}</pre>
            <hr className="detail-line"/>
            <Button 
              onClick={() => this.toggleDetails()} 
              variant="outlined" 
              size="small"
              startIcon={<ExpandLess />}
              sx={{ mt: 1 }}
            >
              Hide Details
            </Button>
          </div>
        )
      }
      else {
        return (
          <div>
            <Button 
              onClick={() =>this.toggleDetails()} 
              variant="outlined" 
              size="small"
              startIcon={<ExpandMore />}
              sx={{ mt: 1 }}
            >
              Show Details
            </Button>
          </div>
        )
      }
    }
    else {
      return null;
    }
  }

  render() {
    return (
      <Alert severity={this.state.props.variant} className="usermessage" sx={{ mb: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {this.state.props.title}
        </Typography>
        <Typography variant="body1" className="message" sx={{ mb: 1 }}>
          {this.state.props.message}
        </Typography>
        { this.renderDetails() }
      </Alert>
    )
  }
}

