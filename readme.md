# DTR SMART on FHIR App
This subproject contains the SMART on FHIR app, which provides a standardized way to interact with FHIR servers.  

# Getting Started

## Prerequisites

Install [node.js](https://nodejs.org/en/).

## Installation

1. Clone the repository `git clone https://github.com/HL7-DaVinci/dtr.git`
2. In a terminal, navigate to the directory the project was cloned into
3. Run `npm install`
4. Run `npm start`

The service will run on port 3005. This can be changed in `package.json` and `webpack.dev.config.js`.

## Using the App

Once the app is up and running you can use it manually by visiting the launch page and including the two required parameters:

|Param|Description|
|----|----|
|`iss`|The base URL of the FHIR server|
|`patientId`|The ID of the patient in context|

The FHIR server must properly comply with the SMART on FHIR specification and have a conformace statement with a `security` section that contains the authorization endpoints that the app needs to request a token from.  

For example, 
http://localhost:3050/launch?iss=http://launch.smarthealthit.org/v/r2/fhir/&patientId=Patient/ab2931ba-6c2d-4110-8028-b5a95cd9f5c7 is an example of a valid launch url that will successfully open the app.  The app will display the name of the patient if it successfully authenticates and retrieves the patient resource.

## Steps to Run:

Make sure you have all five applications are running (**[Request Generator](https://github.com/HL7-DaVinci/crd-request-generator), [EHR (FHIR) Server](https://github.com/HL7-DaVinci/CRD/tree/master/ehr-server), [CRD Server](https://github.com/HL7-DaVinci/CRD), [DTR Server](https://github.com/HL7-DaVinci/dtr),** and **[KeyCloak  Server](https://github.com/HL7-DaVinci/CRD#setting-up-a-keycloak-instance)**) to test the full SMART on FHIR App launch sequence. 
 
1. First, make sure the **EHR** server runs and has the data it needs by running `gradle loadData` to populate it. Note: The EHR server needs to be running if running `gradle loadData`. 

2. Then, run the **KeyCloak** server and, follow the guide in the readme if you have never set it up before, make the appropriate realm/client/user. 

3. Then run the **CRD** server and the **DTR** server and the **Request Generator**.
 
You should be able to send a request from the Request Generator's sister branch for the SMART app launch by clicking the `Dara` button to pre-populate the inputs.  Check `include prefetch` and send the request, you should get a CDS Hooks Card back. Click the SMART link and you should see a login screen.  Login with whatever user you've registered, and the SMART App should proceed to launch.

Note: If you have your own EHR the you should not need to run the EHR (FHIR) Server, KeyCloak and the Request Generator. 

## Building Releases

Official releases are built automatically, but you may test the process or roll your own similar to the following:

    docker build -t hspc/davinci-dtr:latest .
    docker run -it --name davinci-dtr -p 3005:3005 --rm hspc/davinci-dtr:latest

# License

This project is licensed under the Apache License 2.0.  See [LICENSE](/LICENSE) for more details.
