import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tab, Tabs, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import api from '../../../../shared/services/api';
import { Form1InlineView } from '../../../queue/components/QueuePatientDetailModal';
import type { QueueEntry } from '../../../queue/types';

type SavedRecord = Record<string, unknown>;
interface Details {
  treatment_card: SavedRecord | null; incident: SavedRecord; patient: SavedRecord; assessments: SavedRecord[];
  nurse_records: SavedRecord[]; schedules: SavedRecord[]; plan: SavedRecord | null; intake: SavedRecord | null;
}
const labels: Record<string, string> = {
  bite_place: 'Place of Exposure', bite_date: 'Date of Exposure', exposure_category: 'WHO Exposure Category',
  chief_complaints: 'Chief Complaints', medication_treatment: 'Medication / Treatment',
  prophylaxis_orders: 'Prophylaxis Orders', tt_status: 'Tetanus Status', dosage_ml: 'Dosage (mL)',
  dose_iu: 'Dose (IU)', batch_no: 'Batch / Lot Number', dose_number: 'Dose / Day Number',
  blood_pressure: 'Blood Pressure', temperature: 'Temperature (°C)', weight: 'Weight (kg)', height: 'Height (cm)',
  referred_to: 'Referred To', referred_from: 'Referred From', diagnosis: "Doctor’s Diagnosis",
  tetanus_category: 'Tetanus Prophylaxis', tetanus_vaccine: 'Tetanus Vaccine', tetanus_passive: 'Tetanus Passive Immunization',
};
const label = (key: string) => labels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
// Metadata and storage paths are not clinical form fields.
const hidden = /(^id$|_id$|_by$|_path$|^signature$|^created_at$|^updated_at$|^deleted_at$|^schema_version$)/;
function display(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(display).join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([k, v]) => `${label(k)}: ${display(v)}`).join('\n');
  return String(value ?? '—');
}
function SavedFields({ title, record }: { title: string; record: SavedRecord | null }) {
  const fields = Object.entries(record ?? {}).filter(([key, value]) => (!hidden.test(key) || (key === 'administered_by' && typeof value === 'object')) && value !== null && value !== '' && value !== undefined);
  if (!fields.length) return null;
  return <Box sx={{ bgcolor: 'var(--card-bg-solid, #fff)', border: '1px solid var(--border-glow, #e5e7eb)', borderRadius: 2, p: 2.5, mb: 2 }}>
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', mb: 2 }}>{title}</Typography>
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
      {fields.map(([key, value]) => <Box key={key}>
        <Typography component="dt" sx={{ fontSize: 10, fontWeight: 600, color: 'var(--text-m, #6b7280)', textTransform: 'uppercase', mb: 0.5 }}>{label(key)}</Typography>
        <Typography component="dd" sx={{ m: 0, fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text-h, #111827)' }}>{display(value)}</Typography>
      </Box>)}
    </Box>
  </Box>;
}

export default function BiteCaseDetailsModal({ biteId, caseNumber, onClose }: { biteId: number; caseNumber: string; onClose: () => void }) {
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get<Details>(`/cases/${biteId}/map-details`, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) {
        if (Number(response.data.incident.bite_id) !== biteId) throw new Error('Case mismatch');
        setData(response.data);
      }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [biteId]);
  return <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="bite-details-title" slotProps={{ paper: { sx: { borderRadius: 3, height: '90dvh', maxHeight: '90dvh' } } }}>
    <DialogTitle id="bite-details-title" sx={{ pr: 7, bgcolor: 'var(--card-bg-solid, #fff)' }}>
      <Typography component="span" sx={{ fontWeight: 700 }}>{caseNumber} · {data ? display(data.patient.name) : 'Patient Details'}</Typography>
      <Typography sx={{ fontSize: 12, color: '#059669' }}>Read-only patient information</Typography>
      <IconButton aria-label="Close patient details" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton>
    </DialogTitle>
    <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid #e5e7eb', '& .Mui-selected': { color: '#059669' }, '& .MuiTabs-indicator': { bgcolor: '#059669' } }}>
      {['Form 1 – Registration', 'Form 2 – Doctor Assessment', 'Form 3 – Nurse Treatment'].map((title, i) => <Tab key={title} label={title} id={`bite-tab-${i}`} aria-controls={`bite-panel-${i}`} sx={{ textTransform: 'none' }} />)}
    </Tabs>
    <DialogContent sx={{ bgcolor: 'var(--bg-secondary, #f9fafb)', p: { xs: 1.5, sm: 3 }, overflowY: 'auto' }}>
      {error ? <Alert severity="error">Patient details could not be loaded. The record may be unavailable or you may not have permission to view it. Close and try again.</Alert> : !data ? <Box role="status" sx={{ textAlign: 'center', p: 5 }}><CircularProgress /><Typography>Loading patient details…</Typography></Box> :
        <Box role="tabpanel" id={`bite-panel-${tab}`} aria-labelledby={`bite-tab-${tab}`}>
          {tab === 0 && <>
            <Form1InlineView entry={{ patient: data.patient } as unknown as QueueEntry} readOnly />
            <SavedFields title="Registration and Contact Information" record={Object.fromEntries(Object.entries(data.patient).filter(([k]) => !['details', 'memberships'].includes(k)))} />
            <SavedFields title="Other Registration Information" record={data.patient.details as SavedRecord} />
          </>}
          {tab === 1 && <>
            <SavedFields title="Bite and Wound Assessment" record={data.incident} />
            {data.assessments.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No doctor assessment record available. Only currently saved exposure information is shown.</Alert>}
            {data.assessments.map((record, i) => <SavedFields key={i} title={`Doctor Assessment ${i + 1}`} record={record} />)}
            <SavedFields title="Prescribed Treatment" record={data.plan} />
            <SavedFields title="Recorded Intake and Referral Information" record={data.intake} />
          </>}
          {tab === 2 && <>
            {data.nurse_records.length === 0 && !data.treatment_card && <Alert severity="info" sx={{ mb: 2 }}>No nurse treatment record available.</Alert>}
            <SavedFields title="Nurse Treatment Card" record={data.treatment_card} />
            {data.nurse_records.map((record, i) => <SavedFields key={i} title={`Nurse Treatment ${i + 1}`} record={record} />)}
            {data.schedules.map((record, i) => <SavedFields key={i} title={`Vaccination Schedule ${i + 1}`} record={Object.fromEntries(Object.entries(record).filter(([k]) => ['dose_number', 'scheduled_date', 'treatment_date', 'status', 'protocol_type'].includes(k)))} />)}
          </>}
        </Box>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.5 }}><Button onClick={onClose} variant="outlined" sx={{ color: '#047857', borderColor: '#059669', textTransform: 'none' }}>Close</Button></DialogActions>
  </Dialog>;
}
