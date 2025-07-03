import React from 'react';
import { createRoot } from 'react-dom/client';
import { oauth2 } from "fhirclient";
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';

import CdexLaunchPage from './CdexLaunchPage.jsx';
import CdexQuestionnaire from './CdexQuestionnaire.jsx';
import UserMessage from './components/UserMessage/UserMessage.jsx';
import urlUtils from './util/url';

const container = document.getElementById("cdex");
const root = createRoot(container);

const state = urlUtils.getUrlParameter("state");

// no state parameter means this isn't the result of a successful launch so we'll show the launch helper page
if (!state) {
  console.log('no state parameter found so rendering launch help page');
  root.render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CdexLaunchPage/>
    </ThemeProvider>
  );
} 

// otherwise, we've launched and can fetch everything to render the questionnaire (hopefully)
else {
  oauth2.ready().then((client) => {
    showQuestionnaire(client);
  });
}



async function showQuestionnaire(client) {
  let params = {};

  // check that we have a valid state and the expected fhirContext property in the tokenResponse with a task to fetch
  
  if (!sessionStorage[state]) {
    const message = `No session storage found for state: ${state}`;
    console.error(message);
    root.render( <UserMessage message={message} variant="danger" /> );
    return;
  }

  try {
    params = JSON.parse(sessionStorage[state]);
  } catch (error) {
    const message = `Failed to parse session storage: ${error}`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  if (!params.tokenResponse?.fhirContext) {
    const message = `No fhirContext property found in tokenResponse`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  let fhirContext = {};
  try {
    fhirContext = JSON.parse(params.tokenResponse.fhirContext);
  } catch (error) {
    const message = `Failed to parse fhirContext: ${error}`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  if (!fhirContext.task) {
    const message = `No task found in fhirContext in the token response`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  // fetch Task from FHIR server
  let task = {};
  try {
    task = await client.request(fhirContext.task); 
  } catch (error) {
    const message = `Failed to fetch task: ${error}`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }


  // verify Task has "data-request-questionnaire" code
  if (!task.code || (task.code.coding || []).findIndex((c) => c.code === "data-request-questionnaire") < 0){
    const message = `Task does not have the expected "data-request-questionnaire" code`;
    console.error(message);
    root.render( <UserMessage message={message} variant="danger" /> );
    return;
  }


  // parse the Questionnaire from the task
  let questionnaireIndex = (task.input || []).findIndex((i) => (i.type.coding || []).findIndex((c) => c.code === "questionnaire") >= 0);
  
  if (questionnaireIndex < 0) {
    const message = `Task does not have a Questionnaire input`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  let input = task.input[questionnaireIndex];
  if (!input.valueCanonical) {
    const message = `Questionnaire input does not have a valueCanonical property`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }


  // fetch Questionnaire from FHIR server
  let questionnaire = {};
  try {
    questionnaire = await client.request(input.valueCanonical);
  } catch (error) {
    const message = `Failed to fetch questionnaire: ${error}`;
    console.error(message);
    root.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserMessage message={message} variant="danger" />
      </ThemeProvider>
    );
    return;
  }

  root.render( 
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CdexQuestionnaire
        client={client}
        fhirContext={fhirContext}
        questionnaireUrl={input.valueCanonical}
        questionnaire={questionnaire}
        task={task}
      />
    </ThemeProvider>
  );

}