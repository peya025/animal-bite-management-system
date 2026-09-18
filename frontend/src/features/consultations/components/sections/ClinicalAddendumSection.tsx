import React from 'react';
import { Box, Button, Typography, Chip, Alert, TextField } from '@mui/material';

interface ClinicalAddendumSectionProps {
  hasExistingRecord: boolean;
  hasAdministeredVaccine: boolean;
  readOnly: boolean;
  existingRecord: any;
  addendumNote: string;
  savingAddendum: boolean;
  addendumSuccess: string;
  onAddendumNoteChange: (val: string) => void;
  onSaveAddendum: () => void;
}

export default function ClinicalAddendumSection({
  hasExistingRecord,
  hasAdministeredVaccine,
  readOnly,
  existingRecord,
  addendumNote,
  savingAddendum,
  addendumSuccess,
  onAddendumNoteChange,
  onSaveAddendum,
}: ClinicalAddendumSectionProps) {
  if (!hasExistingRecord) return null;

  return (
    <Box sx={{ mt: 4, mb: 3, pt: 3, borderTop: '2px dashed #e5e7eb' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Clinical Addendum & Progress Notes
        </Typography>
        {hasAdministeredVaccine && (
          <Chip
            label="Post-Treatment Addenda Active"
            size="small"
            sx={{ bgcolor: '#ecfdf5', color: '#065f46', fontSize: 11, fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Display existing notes if present */}
      {existingRecord?.administration_notes ? (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'var(--card-bg-solid, #f9fafb)',
            border: '1px solid var(--border-glow, #e5e7eb)',
            borderRadius: 2,
            fontSize: 13,
            color: 'var(--text-b, #374151)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
          }}
        >
          {existingRecord.administration_notes}
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: 12.5,
            color: 'var(--text-m, #9ca3af)',
            fontStyle: 'italic',
            mb: 2,
          }}
        >
          No clinical addenda recorded yet.
        </Typography>
      )}

      {/* Addendum Entry Form */}
      {hasAdministeredVaccine && !readOnly && (
        <Box
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            p: 2,
            borderRadius: 2,
            border: '1px solid var(--border-glow, #bbf7d0)',
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-h, #166534)', mb: 1 }}>
            ✍️ Append Clinical Addendum Note (Physician / Clinical Staff)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder="Enter clinical progress note or diagnostic update here..."
            value={addendumNote}
            onChange={(e) => onAddendumNoteChange(e.target.value)}
            sx={{
              bgcolor: 'var(--input-bg, #ffffff)',
              borderRadius: 1.5,
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                color: 'var(--input-text, #111827)',
                '& fieldset': { borderColor: 'var(--input-border, #e5e7eb)' },
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={onSaveAddendum}
              disabled={savingAddendum || !addendumNote.trim()}
              sx={{
                bgcolor: '#10b981',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {savingAddendum ? 'Saving Addendum...' : 'Append Addendum'}
            </Button>
          </Box>
          {addendumSuccess && (
            <Alert severity="success" sx={{ mt: 1, py: 0.25, fontSize: 12 }}>
              {addendumSuccess}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}
