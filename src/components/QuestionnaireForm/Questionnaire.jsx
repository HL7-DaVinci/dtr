import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Modern Questionnaire component using LForms and FHIR
 * Props:
 *   - questionnaire: FHIR Questionnaire resource
 *   - cqlResults: CQL execution results (object)
 *   - prefetchData: Prefetched FHIR resources (object)
 *   - fhirVersion: FHIR version string (e.g., 'R4')
 *   - patientId: Patient ID string
 *   - smart: FHIR client instance
 *   - ...other context as needed
 */
const Questionnaire = ({ questionnaire, cqlResults, prefetchData, fhirVersion, patientId, smart }) => {
  const [questionnaireResponse, setQuestionnaireResponse] = useState(null);
  const [originalResponse, setOriginalResponse] = useState(null);
  const [formValidationErrors, setFormValidationErrors] = useState([]);
  const lformsRef = useRef(null);

  // Utility: Deep clone
  const deepClone = obj => JSON.parse(JSON.stringify(obj));

  // Prepopulate QuestionnaireResponse using CQL and prefetch
  const prepopulateResponse = (q, cql, prefetch) => {
    console.log('Prepopulating response for Questionnaire:', cql, prefetch);
    // This is a simplified version. You may want to adapt the logic from the old QuestionnaireForm's prepopulate method.
    const response = {
      resourceType: 'QuestionnaireResponse',
      status: 'draft',
      questionnaire: q.url || q.id,
      subject: { reference: `Patient/${patientId}` },
      item: []
    };
    // TODO: Add logic to walk q.item and fill response.item using cql/prefetch
    // For now, just structure the shell
    return response;
  };

  // Load and render LForms on mount
  useEffect(() => {
    if (!questionnaire || !fhirVersion) return;
    // Convert Questionnaire to LForms
    const lform = window.LForms.Util.convertFHIRQuestionnaireToLForms(questionnaire, fhirVersion);
    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeaders: false,
      showQuestionCode: false,
      hideFormControls: true,
      showFormOptionPanelButton: true
    };
    // Prepopulate response
    const prepopulated = prepopulateResponse(questionnaire, cqlResults, prefetchData);
    setQuestionnaireResponse(deepClone(prepopulated));
    setOriginalResponse(deepClone(prepopulated));
    // Merge into LForms
    const merged = window.LForms.Util.mergeFHIRDataIntoLForms('QuestionnaireResponse', prepopulated, lform, fhirVersion);
    // Render
    window.LForms.Util.addFormToPage(merged, 'formContainer');
    // Listen for changes
    lformsRef.current = merged;
    // Validate
    const errors = window.LForms.Util.checkValidity();
    setFormValidationErrors(errors || []);
  }, [questionnaire, cqlResults, prefetchData, fhirVersion, patientId]);

  // Handle form changes (if needed)
  const handleLFormsChange = () => {
    if (!lformsRef.current) return;
    const qr = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', fhirVersion, '#formContainer');
    setQuestionnaireResponse(qr);
    const errors = window.LForms.Util.checkValidity();
    setFormValidationErrors(errors || []);
  };

  // Save QuestionnaireResponse to EHR
  const handleSave = async () => {
    if (!questionnaireResponse) return;
    const url = `${sessionStorage['serviceUri']}/QuestionnaireResponse`;
    const method = questionnaireResponse.id ? 'PUT' : 'POST';
    const saveUrl = questionnaireResponse.id ? `${url}/${questionnaireResponse.id}` : url;
    try {
      await smart.request({
        url: saveUrl,
        method,
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(questionnaireResponse)
      });
      alert('QuestionnaireResponse saved to EHR.');
    } catch (e) {
      alert('Failed to save QuestionnaireResponse.');
      console.error(e);
    }
  };

  // Compare current vs. original response
  const hasChanged = () => {
    return JSON.stringify(questionnaireResponse) !== JSON.stringify(originalResponse);
  };

  return (
    <div>
      <div id="formContainer" />
      <div style={{ marginTop: 16 }}>
        <button onClick={handleSave} disabled={!hasChanged()}>
          Save to EHR
        </button>
        {formValidationErrors.length > 0 && (
          <div style={{ color: 'red' }}>
            <strong>Validation Errors:</strong>
            <ul>
              {formValidationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

Questionnaire.propTypes = {
  questionnaire: PropTypes.object.isRequired,
  cqlResults: PropTypes.object,
  prefetchData: PropTypes.object,
  fhirVersion: PropTypes.string.isRequired,
  patientId: PropTypes.string.isRequired,
  smart: PropTypes.object.isRequired
};

export default Questionnaire;
