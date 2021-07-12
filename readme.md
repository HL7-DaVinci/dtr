# DTR SMART on FHIR App
This subproject contains a SMART on FHIR app, which provides a standardized way to interact with FHIR servers. This Reference Impementation (RI) supports the **[Documents Templates and Rules (DTR) IG](http://build.fhir.org/ig/HL7/davinci-dtr/)** which specifies how payer rules can be executed in a provider context to ensure that documentation requirements are met. This RI and IG are companions to the **[Coverage Requirements Discovery (CRD) IG](https://build.fhir.org/ig/HL7/davinci-crd/)** and **[Coverage Requirements Discovery (CRD) RI](https://github.com/HL7-DaVinci/CRD)**.

## Running DTR

You can find a complete end-to-end set up guide for DRLS, including DTR, [here](https://github.com/HL7-DaVinci/CRD/blob/master/SetupGuideForMacOS.md).

# Getting Started

If you are running DRLS for the first time, we highly recommend you refer to our comprehensive [setup guide](https://github.com/HL7-DaVinci/CRD/blob/master/SetupGuideForMacOS.md) for instructions on how to install DTR. Once you have DRLS up and running, you can return here to find more detailed information about how DTR works.

## Prerequisites

Install [node.js](https://nodejs.org/en/).

## Installation

1. Clone the repository `git clone https://github.com/HL7-DaVinci/dtr.git`
2. In a terminal, navigate to the directory the project was cloned into
3. Run `npm install`
4. To Run:
	* dev: `npm start`
	* production: `npm run startProd`

The service will run on port 3005. This can be changed in `package.json` and the configuration file for the desired version. The dev version is configured with `webpack.config.js` and does not use `https` by default.  The production version is configured through `webpack.config.prod.js` and does use `https` by default.  This can also be changed in the desired config by changing the `https` boolean.  There is currently no redirection between `https` and `http`, so using the wrong scheme in the url will result in an empty response.

## Using the App

Once the app is up and running you can launch it manually by visiting the launch page and including the two required parameters:

|Param|Description|
|----|----|
|`iss`|The base URL of the FHIR server|
|`launch`|The unique ID for this launch|

The FHIR server must properly comply with the SMART on FHIR specification and have a conformance statement with a `security` section that contains the authorization endpoints that the app needs to request a token from.

For example, 
http://localhost:3005/launch?iss=http://launch.smarthealthit.org/v/r2/fhir/&launch=1234 is an example of a valid launch url that will successfully launch the app.  However, note that the actual app requires an `appContext` parameter that is only available through an EHR launch.  The app is not able to work with a standalone launch.  If you wish to test the actual DTR app, and not the SMART launch sequence, you will need to either use the EHR/CRD servers provided below or use an actual EHR that supports SMART launch with an `appContext`.
## Connecting with other subprojects:

It is recommmended when first starting out you have all five applications running (**[CRD Request Generator](https://github.com/HL7-DaVinci/crd-request-generator), [Test EHR (FHIR) Server](https://github.com/HL7-DaVinci/test-ehr/tree/master), [CRD Server](https://github.com/HL7-DaVinci/CRD), [DTR Server](https://github.com/HL7-DaVinci/dtr),** and **[KeyCloak  Server](https://github.com/HL7-DaVinci/CRD#setting-up-a-keycloak-instance)**) to test the full SMART on FHIR App launch sequence. After getting these applications up and running you can swap in your appliaction if desired.  

_Note: If you have your own EHR then you should not need to run the EHR (FHIR) Server, KeyCloak and the Request Generator. Otherwise please follow the below steps._

Steps to prepare local EHR server, Keycloak server, and Request Generator:

1. Remove the **target** folder (if it exists) in the **Test EHR** server folder.
   
2. Start the **Test EHR** server, by running `gradle appRun`.

3. Make sure the **Test EHR** server has the data it needs, by running `gradle loadData` to populate it.

4. Then, run the **KeyCloak** server. Follow the guide in the CRD readme if you have never set it up before, make the appropriate **realm/client/user**.      

5. Then run the **CRD** server, **DTR** server, and **CRD Request Generator**.

   Note: The DTR app's authorization against the EHR server requires a `client_id` that is registered with the auth server of that EHR to work. The DTR app has a `/register` endpoint that allows user entry of which `client_id` to use for a specific EHR server. If following the KeyCloak guide provided in the CRD readme, the client would be called `app-login`.


>Test it!

>Assuming you have completed the above. You should be able to send a request from the CRD Request Generator in order for the SMART app to launch by clicking the `Patient Select:` button to pre-populate the inputs. Choose a `Device, Service, or Medication Request` from the drop-down for one of the patients, then click anywhere in the row corresponding to the patient for whom you selected a `Device, Service, or Medication Request`. The data will be prefetched and you can send the request by pressing the `Submit` button. You should get a CDS Hooks Card back. Click the SMART link button for `Order Form` and you should see a login screen. Login with whatever user you've registered, and the SMART App should proceed to launch.

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

# Other Documentation

[Using ValueSets in DTR Rules](./using-valuesets-in-rules.md)

# License

This project is licensed under the Apache License 2.0. See [LICENSE](/LICENSE) for more details.

