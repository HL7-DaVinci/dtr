import React, { Component, useState } from "react";
import './UserMessage.css';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
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
 *      variant - one of https://react-bootstrap.github.io/components/alerts/#examples
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
            <Button onClick={() => this.toggleDetails()} variant="secondary" size="sm">
              Hide Details
            </Button>
          </div>
        )
      }
      else {
        return (
          <div>
            <Button onClick={() =>this.toggleDetails()} variant="secondary" size="sm">
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
      <Alert variant={this.state.props.variant} className="usermessage">
        <Alert.Heading>{this.state.props.title}</Alert.Heading>
        <p className="message">{this.state.props.message}</p>
        { this.renderDetails() }
      </Alert>
    )
  }
}

