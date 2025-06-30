import express from "express";

const router = express.Router();

router.get('/smart-configuration', (req, res) => {

  const smartConfiguration = {
    scopes_supported: ["launch","launch/patient","user/Observation.read","user/Patient.read","patient/Observation.read","patient/Patient.read","patient/Coverage.read", "patient/Condition.read", "user/Practitioner.read" ],
    capabilities: ["launch-ehr","launch-standalone","client-confidential-symmetric","context-ehr-patient"]
  };

  res.send(smartConfiguration);
});

export default router;
