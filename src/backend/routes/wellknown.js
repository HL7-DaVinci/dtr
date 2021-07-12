const express = require('express');
const router = express.Router();

router.get('/smart-configuration', (req, res) => {
  var dtrRegisterURL = "http://localhost:3005/register";
  if (process.env.DTR_REGISTER_URL) {
    dtrRegisterURL = process.env.DTR_REGISTER_URL;
  }

  const smartConfiguration = {
    registration_endpoint: dtrRegisterURL,
    scopes_supported: ["launch","launch/patient","user/Observation.read","user/Patient.read","patient/Observation.read","patient/Patient.read","patient/Coverage.read", "patient/Condition.read", "user/Practitioner.read" ],
    capabilities: ["launch-ehr","launch-standalone","client-confidential-symmetric","context-ehr-patient"]
  };

  res.send(smartConfiguration);
});

module.exports = router;
