import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Editor, DiffEditor } from '@monaco-editor/react'

const QuestionnaireResponseJsonDialog = ({ open, onClose, questionnaireResponse, originalQuestionnaireResponse }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>QuestionnaireResponse JSON</DialogTitle>
      <DialogContent dividers>
        {
          originalQuestionnaireResponse ? (
            <DiffEditor
              height="75vh"
              language="json"
              original={JSON.stringify(originalQuestionnaireResponse, null, 2)}
              modified={JSON.stringify(questionnaireResponse, null, 2)}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          ) : (
            <Editor
              height="75vh"
              language="json"
              value={JSON.stringify(questionnaireResponse, null, 2)}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          )
        }
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionnaireResponseJsonDialog;
