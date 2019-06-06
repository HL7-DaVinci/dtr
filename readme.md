# DTR SMART on FHIR App
This subproject contains a SMART on FHIR app, which provides a standardized way to interact with FHIR servers. This Reference Impementation (RI) supports the **[Documents Templates and Rules (DTR) IG](http://build.fhir.org/ig/HL7/davinci-dtr/)** which specifies how payer rules can be executed in a provider context to ensure that documentation requirements are met. This RI and IG are companions to the **[Coverage Requirements Discovery (CRD) IG](http://build.fhir.org/ig/HL7/davinci-dtr/)** and **[Coverage Requirements Discovery (CRD) RI](https://github.com/HL7-DaVinci/CRD)**.

# Getting Started

## Prerequisites

Install [node.js](https://nodejs.org/en/).

## Installation

1. Clone the repository `git clone https://github.com/HL7-DaVinci/dtr.git`
2. In a terminal, navigate to the directory the project was cloned into
3. Run `npm install`
4. To Run:
	* dev: `npm start`
	* production: `npm run startProd`

The service will run on port 3005. This can be changed in `package.json` and the configuration file for the desired version. The dev version is configured with `webpack.dev.config.js` and does not use `https` by default.  The production version is configured through `webpack.prod.config.js` and does use `https` by default.  This can also be changed in desired config by changing the `https` boolean.  There is currently no redirection between `https` and `http`, so using the wrong scheme in the url will result in an empty response.

## Using the App

Once the app is up and running you can use it manually by visiting the launch page and including the two required parameters:

|Param|Description|
|----|----|
|`iss`|The base URL of the FHIR server|
|`patientId`|The ID of the patient in context|

The FHIR server must properly comply with the SMART on FHIR specification and have a conformace statement with a `security` section that contains the authorization endpoints that the app needs to request a token from.  

For example, 
http://localhost:3005/launch?iss=http://launch.smarthealthit.org/v/r2/fhir/&patientId=Patient/ab2931ba-6c2d-4110-8028-b5a95cd9f5c7 is an example of a valid launch url that will successfully open the app.  The app will display the name of the patient if it successfully authenticates and retrieves the patient resource.

## Connecting with other subprojects:

Make sure you have all five applications running (**[Request Generator](https://github.com/HL7-DaVinci/crd-request-generator), [EHR (FHIR) Server](https://github.com/HL7-DaVinci/CRD/tree/master/ehr-server), [CRD Server](https://github.com/HL7-DaVinci/CRD), [DTR Server](https://github.com/HL7-DaVinci/dtr),** and **[KeyCloak  Server](https://github.com/HL7-DaVinci/CRD#setting-up-a-keycloak-instance)**) to test the full SMART on FHIR App launch sequence. 

_Note: If you have your own EHR the you should not need to run the EHR (FHIR) Server, KeyCloak and the Request Generator._ 

1. Remove the **target** folder (if it exists) in the **EHR** server folder.
   
2. Start the **EHR** server.

3. Make sure the **EHR** server has the data it needs by running `gradle loadData` to populate it.

4. Then, run the **KeyCloak** server. Follow the guide in the KeyCloak readme if you have never set it up before, make the appropriate **realm/client/user**. _Note: You might need to modify the **frame-ancesters** setting in the KeyCloak admin: e.g. Realm | Security Defences | Content-Security-Policy = frame-src 'self'; **frame-ancesters http://localhost:***; object-src 'none';_     

5. Then run the **CRD** server, **DTR** server, and **Request Generator**.
 
You should be able to send a request from the Request Generator's master branch for the SMART app launch by clicking the `Dara` button to pre-populate the inputs.  Check `include prefetch` and send the request, you should get a CDS Hooks Card back. Click the SMART link and you should see a login screen.  Login with whatever user you've registered, and the SMART App should proceed to launch.

## Building Releases

Official releases are built automatically, but you may test the process or roll your own similar to the following:

    docker build -t hspc/davinci-dtr:latest .

To run dev (https=false, port=3005, proxy=http://localhost:8090):

	docker run -it --name davinci-dtr -p 3005:3005 --rm hspc/davinci-dtr:latest
	
To run production (https=true, port=3005, proxy=https://davinci-crd.logicahealth.org):

	docker run -e VERSION='Prod' -it --name davinci-dtr -p 3005:3005 --rm hspc/davinci-dtr:latest
	
To run configurable template:

	docker run -e VERSION='Template' -e PROXY_TARGET='http:\/\/localhost:8090' -e SERVER_PORT='3005' -e SERVER_HTTPS='false' -it --name davinci-dtr -p 3005:3005 --rm hspc/davinci-dtr:latest

The configurable template will use the environment variables passed to the docker run command to replace the `PROXY_TARGET`, `SERVER_PORT`, and `SERVER_HTTPS` values in the webpack configuration file.

# License

This project is licensed under the Apache License 2.0.  See [LICENSE](/LICENSE) for more details.
