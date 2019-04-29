# DTR Smart App
This subproject contains the SMART on FHIR app, which provides a standardized way to interact with FHIR servers.  

Currently it performs a very basic SMART login where it retrieves the security information from a FHIR server and uses it to login and access the resources on the FHIR server.  After authenticating, it will retrieve the specified patient resource and display their full name.

# Getting Started

## Prerequisites

Install [node.js](https://nodejs.org/en/).

## Installation

1. Clone the repository `git clone https://github.com/HL7-DaVinci/dtr.git`
2. In a terminal, navigate to the directory the project is clone into
3. Run `npm install`
4. Run `npm start`

The service will run on port 3005.  This can be changed in [/bin/www](/bin/www).

## Using the App

Once the app is up and running you can use it manually by visiting the launch page and including the two required parameters:

|Param|Description|
|----|----|
|`iss`|The base URL of the FHIR server|
|`patientId`|The ID of the patient in context|

The FHIR server most properly comply with the SMART on FHIR specification and have a conformace statement with a `security` section that contains the authorization endpoints that the app needs to request a token from.  

For example, 
http://localhost:3050/launch?iss=http://launch.smarthealthit.org/v/r2/fhir/&patientId=Patient/ab2931ba-6c2d-4110-8028-b5a95cd9f5c7 is an example of a valid launch url that will successfully open the app.  The app will display the name of the patient if it successfully authenticates and retrieves the patient resource.

## Connecting with other subprojects

The [CRD reference implementation](https://github.com/HL7-DaVinci/CRD) will return CDS Hooks cards with links to this SMART app.  If making requests with the [request generator](https://github.com/HL7-DaVinci/crd-request-generator), opening the `SMART Link` with this app running at the same time will open the app in the same page in an embedded window.  The `CRD RI` will return links with reference to its own FHIR server, so to function properly, both the [EHR FHIR server](https://github.com/HL7-DaVinci/CRD/tree/master/ehr-server) and [rules server](https://github.com/HL7-DaVinci/CRD/tree/master/server) must be running.

## Building Releases

Official releases are built automatically, but you may test the process or roll your own similar to the following:

    docker build -t hspc/davinci-dtr:latest .
    docker run -it --name davinci-dtr -p 3005:3005 --rm hspc/davinci-dtr:latest

# License

This project is licensed under the Apache License 2.0.  See [LICENSE](/LICENSE) for more details.
