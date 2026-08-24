// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle,
  EventBusy,
  Schedule,
  Vaccines,
  EventNote,
  Person,
  CalendarToday,
} from '@mui/icons-material';
import api from '../../../services/api';
import StatCard from '../../../components/common/StatCard';
import DataTable from '../../../components/ui/DataTable';
import type { Column } from '../../../components/ui/DataTable';
import TablePager from '../../../components/data-display/TablePager';
import AppButton from '../../../components/button';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import TagoloanTreatmentCardModal from '../components/TagoloanTreatmentCardModal';

type Status = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
interface Vaccination {
  treatment_id: number;
  dose_number: number;
  scheduled_date: string;
  status: Status;
  vaccine_brand?: string;
  patient: { name: string; patient_number?: string };
  bite_incident?: { case_number?: string };
}
interface Stats {
  completed: number;
  pending: number;
  today_count: number;
  overdue_count: number;
}
const statusColor = {
  scheduled: 'info',
  completed: 'success',
  missed: 'error',
  rescheduled: 'warning',
  cancelled: 'default',
} as const;

interface Patient {
  id: number;
  name: string;
  patient_number: string;
}

export default function VaccinationSchedulePage() {
  const [records, setRecords] = useState<Vaccination[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(15);

  // Administer modal
  const [selected, setSelected] = useState<Vaccination | null>(null);
  const [brand, setBrand] = useState('');
  const [batch, setBatch] = useState('');
  const [site, setSite] = useState('');
  const [confirmAdministration, setConfirmAdministration] = useState(false);

  // Missed modal
  const [missTarget, setMissTarget] = useState<Vaccination | null>(null);

  // Tagoloan Card modal
  const [cardPatientId, setCardPatientId] = useState<number | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardExposureCategory, setCardExposureCategory] = useState<'I' | 'II' | 'III' | ''>('');

  // Record new vaccination modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [newVaccine, setNewVaccine] = useState({
    patientId: '',
    doseNumber: 1,
    scheduledDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [notice, setNotice] = useState('');

  const role = JSON.parse(localStorage.getItem('userData') || '{}').role;
  const canAdminister = role === 'admin' || role === 'treatment';

  // Load data
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get('/vaccinations', { params: status ? { status } : {} });
      setRecords(list.data.data ?? []);
    } catch {
      setNotice('Unable to load vaccination records.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadPatients = useCallback(async () => {
    try {
      const res = await api.get('/patients', { params: { limit: 100 } });
      setPatients(res.data.data ?? []);
    } catch {
      setNotice('Unable to load patient list.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/vaccinations/statistics')
      .then(response => setStats(response.data))
      .catch(() => setNotice('Unable to load vaccination statistics.'));
  }, []);

  const refreshStats = useCallback(() => {
    api.get('/vaccinations/statistics')
      .then(response => setStats(response.data))
      .catch(() => setNotice('Unable to load vaccination statistics.'));
  }, []);

  // Handlers
  const administer = async () => {
    if (!selected || !brand || !batch || !site) return;
    try {
      await api.post(`/vaccinations/${selected.treatment_id}/administer`, {
        vaccine_brand: brand,
        vaccine_batch_number: batch,
        injection_site: site,
      });
      setSelected(null);
      setBrand('');
      setBatch('');
      setSite('');
      setNotice('Vaccination recorded successfully.');
      load();
      refreshStats();
    } catch {
      setNotice('Unable to record vaccination.');
    }
  };

  const markMissed = async (record: Vaccination) => {
    try {
      await api.post(`/vaccinations/${record.treatment_id}/missed`);
      setNotice('Vaccination marked as missed.');
      load();
      refreshStats();
    } catch {
      setNotice('Unable to update vaccination status.');
    }
  };

  const createVaccination = async () => {
    if (!newVaccine.patientId || !newVaccine.scheduledDate) {
      setNotice('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/vaccinations', {
        patient_id: parseInt(newVaccine.patientId, 10),
        dose_number: newVaccine.doseNumber,
        scheduled_date: newVaccine.scheduledDate,
      });
      setRecordModalOpen(false);
      setNewVaccine({ patientId: '', doseNumber: 1, scheduledDate: '' });
      setNotice('New vaccination scheduled successfully.');
      load();
      refreshStats();
    } catch {
      setNotice('Unable to create vaccination.');
    } finally {
      setSubmitting(false);
    }
  };

  // Table columns
  const columns: Column<Vaccination>[] = [
    {
      key: 'patient',
      label: 'Patient',
      render: (r) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{r.patient.name}</Typography>
          <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
            {r.patient.patient_number || r.bite_incident?.case_number || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'dose',
      label: 'Dose',
      render: (r) => <Typography sx={{ fontSize: 13 }}>Day {r.dose_number}</Typography>,
    },
    {
      key: 'date',
      label: 'Scheduled date',
      render: (r) => (
        <Typography sx={{ fontSize: 13 }}>
          {new Date(`${r.scheduled_date}T00:00:00`).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          size="small"
          label={r.status}
          color={statusColor[r.status]}
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            style={{
              background: '#e8f5ed',
              color: 'var(--primary)',
              border: '1px solid #d7ebdf',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => {
              setCardPatientId(r.patient?.patient_id || r.patient_id);
              setCardExposureCategory(r.bite_incident?.exposure_category || r.exposure_category || '');
              setCardModalOpen(true);
            }}
          >
            📋 Tagoloan Card
          </button>
          {r.status === 'scheduled' && canAdminister && (
            <>
              <AppButton
                style={{ minHeight: 30, padding: '5px 10px' }}
                onClick={() => setSelected(r)}
              >
                Administer
              </AppButton>
              <AppButton
                variant="danger"
                style={{ minHeight: 30, padding: '5px 10px' }}
                onClick={() => setMissTarget(r)}
              >
                Missed
              </AppButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const visible = records.slice(page * rows, page * rows + rows);

  return (
    <Box sx={{ px: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ color: 'var(--text-h)', mb: '7px' }}>
            Vaccinations
          </Typography>
          <Typography variant="body2" sx={{ color: '#77877d' }}>
            Track scheduled doses and record vaccine administration.
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '8px', fontSize: '13px', color: '#9ca3af' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Vaccinations</span>
          </Box>
        </Box>
        {canAdminister && (
          <AppButton
            onClick={() => {
              setRecordModalOpen(true);
              loadPatients();
            }}
          >
            Record vaccination
          </AppButton>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(
          [
            { label: 'Scheduled', value: stats?.pending,  color: 'info' },
            { label: 'Completed', value: stats?.completed,color: 'success' },
            { label: 'Due Today', value: stats?.today_count, color: 'warning' },
            { label: 'Overdue', value: stats?.overdue_count,color: 'error' },
          ] as const
        ).map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <StatCard {...s} value={s.value ?? '—'} loading={!stats} />
          </Grid>
        ))}
      </Grid>

      {/* Table */}
      <Box>
        <Box sx={{ mb: 2, maxWidth: 250 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All statuses</MenuItem>
              {['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <DataTable
          columns={columns}
          rows={visible}
          loading={loading}
          rowsPerPage={rows}
          getRowKey={(r) => r.treatment_id}
          emptyTitle="No vaccination records"
          emptySubtitle="Vaccination schedules from bite cases will appear here."
        />
        <TablePager
          count={records.length}
          page={page}
          rowsPerPage={rows}
          onPageChange={setPage}
          onRowsPerPageChange={setRows}
        />
      </Box>

      {/* Administer Modal */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Record vaccination</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selected?.patient.name} · Day {selected?.dose_number}
          </Typography>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              required
              label="Vaccine brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <TextField
              required
              label="Batch number"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
            <TextField
              required
              label="Injection site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <AppButton
            variant="secondary"
            style={{ minWidth: 120 }}
            onClick={() => setSelected(null)}
          >
            Cancel
          </AppButton>
          <AppButton
            style={{ minWidth: 120 }}
            disabled={!brand || !batch || !site}
            onClick={() => setConfirmAdministration(true)}
          >
            Save record
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Confirmation for Administer */}
      {confirmAdministration && selected && (
        <ConfirmationDialog
          variant="success"
          title="Record vaccination"
          message={
            <>
              Record Day {selected.dose_number} for <strong>{selected.patient.name}</strong>?
            </>
          }
          confirmLabel="Yes, save record"
          cancelLabel="Go back"
          onConfirm={() => {
            setConfirmAdministration(false);
            administer();
          }}
          onCancel={() => setConfirmAdministration(false)}
        />
      )}

      {/* Missed Confirmation */}
      {missTarget && (
        <ConfirmationDialog
          variant="warning"
          title="Mark vaccination missed"
          message={
            <>
              Mark Day {missTarget.dose_number} for <strong>{missTarget.patient.name}</strong> as
              missed?
            </>
          }
          confirmLabel="Yes, mark missed"
          cancelLabel="Cancel"
          onConfirm={() => {
            markMissed(missTarget);
            setMissTarget(null);
          }}
          onCancel={() => setMissTarget(null)}
        />
      )}

      {/* ========== ENHANCED "Record new vaccination" MODAL ========== */}
      <Dialog
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventNote color="primary" />
          Schedule new vaccination
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Patient selection */}
            <FormControl fullWidth required>
              <InputLabel id="patient-select-label">Patient</InputLabel>
              <Select
                labelId="patient-select-label"
                label="Patient"
                value={newVaccine.patientId}
                onChange={(e) =>
                  setNewVaccine((prev) => ({ ...prev, patientId: e.target.value }))
                }
                startAdornment={
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                }
              >
                <MenuItem value="">Select a patient</MenuItem>
                {patients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.patient_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Dose and Date side by side */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Dose number"
                  value={newVaccine.doseNumber}
                  onChange={(e) =>
                    setNewVaccine((prev) => ({
                      ...prev,
                      doseNumber: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  helperText="e.g., 1, 2, 3…"
                  slotProps={{
                    htmlInput: { min: 1 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Schedule color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  type="date"
                  label="Scheduled date"
                  value={newVaccine.scheduledDate}
                  onChange={(e) =>
                    setNewVaccine((prev) => ({ ...prev, scheduledDate: e.target.value }))
                  }
                  helperText="Choose the date for this dose"
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <AppButton
            variant="secondary"
            style={{ minWidth: 120 }}
            onClick={() => setRecordModalOpen(false)}
            disabled={submitting}
          >
            Cancel
          </AppButton>
          <AppButton
            style={{ minWidth: 120 }}
            onClick={createVaccination}
            disabled={
              !newVaccine.patientId ||
              !newVaccine.scheduledDate ||
              newVaccine.doseNumber < 1 ||
              submitting
            }
          >
            {submitting ? 'Saving…' : 'Schedule'}
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!notice}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
      >
        <Alert
          severity={notice.includes('Unable') ? 'error' : 'success'}
          onClose={() => setNotice('')}
        >
          {notice}
        </Alert>
      </Snackbar>
      {/* Tagoloan Official Treatment Card Modal */}
      <TagoloanTreatmentCardModal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        patientId={cardPatientId}
        initialExposureCategory={cardExposureCategory}
      />
    </Box>
  );
}
