import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Snackbar,
  Typography, Chip, IconButton, Tooltip, Select, MenuItem, FormControl, GlobalStyles,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MedicalServices as ConsultationIcon,
} from '@mui/icons-material';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { DataTable, TablePager } from '../../../components/data-display';
import type { ColumnDef } from '../../../components/data-display';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import PatientDetailsModal from '../components/PatientDetailsModal';
import api from '../../../shared/services/api';

interface Patient {
  patient_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age: number;
  gender: string;
  contact_number?: string;
  address?: string;
  treatment_records?: any[];
  latest_consultation_record?: any;
}

export default function DoctorPatientListPage() {
  const [tab, setTab] = useState<'today' | 'this_week' | 'all'>('today');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm2, setShowForm2] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const toast = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/patients', {
        params: {
          tab,
          search: search || undefined,
          page: page + 1,
          per_page: rowsPerPage,
        },
      });
      setPatients(response.data.data || []);
      setTotalCount(response.data.total || 0);
    } catch (error: any) {
      toast(error.response?.data?.message || 'Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [tab, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) {
        loadPatients();
      } else {
        setPage(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getLastConsultation = (patient: Patient) => {
    const record = patient.latest_consultation_record || patient.treatment_records?.[0];
    if (!record) return null;
    return record;
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const columns: ColumnDef<Patient>[] = [
    {
      key: 'patient_id',
      header: 'PATIENT #',
      width: '100px',
      render: (patient) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25, bgcolor: 'var(--bg-secondary)', borderRadius: 1, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          #{patient.patient_id}
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'PATIENT NAME',
      render: (patient) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)', lineHeight: 1.3 }}>
            {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mt: 0.25 }}>
            {patient.age}y · {patient.gender}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'last_consultation',
      header: 'LAST CONSULTATION',
      render: (patient) => {
        const record = getLastConsultation(patient);
        if (!record) {
          return <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>No consultations</Typography>;
        }

        const date = record.consultation_date || record.treatment_date;
        return (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {date ? new Date(date).toLocaleDateString() : 'N/A'}
            </Typography>
            {record.nature_of_visit && (
              <Chip
                label={record.nature_of_visit.replace('_', ' ')}
                size="small"
                sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 600, mt: 0.5, height: 18 }}
              />
            )}
          </Box>
        );
      },
    },
    {
      key: 'chief_complaint',
      header: 'CHIEF COMPLAINT',
      render: (patient) => {
        const record = getLastConsultation(patient);
        if (!record || !record.chief_complaints) {
          return <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</Typography>;
        }

        const complaint = record.chief_complaints;
        const truncated = complaint.length > 50 ? complaint.substring(0, 50) + '...' : complaint;
        
        return (
          <Typography sx={{ fontSize: 13, color: 'var(--text)' }}>
            {truncated}
          </Typography>
        );
      },
    },
    {
      key: 'diagnosis',
      header: 'DIAGNOSIS',
      render: (patient) => {
        const record = getLastConsultation(patient);
        if (!record || !record.diagnosis) {
          return <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</Typography>;
        }

        const diagnosis = record.diagnosis;
        const truncated = diagnosis.length > 50 ? diagnosis.substring(0, 50) + '...' : diagnosis;
        
        return (
          <Typography sx={{ fontSize: 13, color: 'var(--text)' }}>
            {truncated}
          </Typography>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (patient) => {
        const activeQueue = (patient as any).queues?.[0];
        if (activeQueue) {
          if (activeQueue.status === 'waiting') {
            return <Chip label="In Queue (Waiting)" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600 }} />;
          }
          if (activeQueue.status === 'in_consultation') {
            return <Chip label="In Consultation" size="small" sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600 }} />;
          }
        }

        const record = getLastConsultation(patient);
        if (!record) {
          return <Chip label="Registered" size="small" sx={{ bgcolor: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />;
        }

        const status = record.status || 'completed';
        const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
          completed: { label: 'Completed', bg: '#d1fae5', color: '#065f46' },
          active: { label: 'Active', bg: '#eff6ff', color: '#2563eb' },
          follow_up: { label: 'Follow-up', bg: '#fef3c7', color: '#92400e' },
        };

        const cfg = statusConfig[status] || statusConfig.completed;
        return <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }} />;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right',
      render: (patient) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="View Patient Details & Forms">
            <button
              onClick={() => {
                setSelectedPatient(patient);
                setShowViewModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 13px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                color: '#059669',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.05)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = '#d1fae5';
                el.style.borderColor = '#6ee7b7';
                el.style.color = '#047857';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = '#ecfdf5';
                el.style.borderColor = '#a7f3d0';
                el.style.color = '#059669';
              }}
            >
              View
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2.2} />
            </button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ px: 3 }}>
      <GlobalStyles styles={{
        '#doctor-filter-select, #doctor-filter-select ~ *': { fontFamily: "'Poppins', sans-serif !important" },
        '.doctor-filter-menu .MuiMenuItem-root': { fontFamily: "'Poppins', sans-serif !important", fontSize: '14px !important' },
      }} />
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: 'var(--text-h)',
              margin: '0 0 7px 0',
            }}
          >
            Doctor's Patient List
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
            {today} · Track consultations and patient history
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>Doctor Patients</span>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Tooltip title="Refresh">
            <IconButton onClick={loadPatients} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Patient List */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', background: 'background.paper', p: 3 }}>
        {/* Search + Filter Row */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <input
            type="text"
            placeholder="Search by name or patient number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid var(--input-border)',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              background: 'var(--input-bg)',
              color: 'var(--input-text)',
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={tab}
              onChange={(e) => { setTab(e.target.value as 'today' | 'this_week' | 'all'); setPage(0); }}
              inputProps={{ id: 'doctor-filter-select' }}
              renderValue={(val) => (
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>
                  {val === 'today' ? "Today's Consultations" : val === 'this_week' ? 'This Week' : 'All Patients'}
                </span>
              )}

              sx={{
                borderRadius: '8px',
                bgcolor: 'var(--input-bg)',
                color: 'var(--input-text)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--input-border)' },
              }}
            >
              <MenuItem value="today" sx={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>Today's Consultations</MenuItem>
              <MenuItem value="this_week" sx={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>This Week</MenuItem>
              <MenuItem value="all" sx={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>All Patients</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <DataTable
          columns={columns}
          rows={patients}
          loading={loading}
          skeletonRows={rowsPerPage}
          rowKey={(p) => p.patient_id}
          emptyIcon={<ConsultationIcon sx={{ fontSize: 36, color: 'var(--text-secondary)' }} />}
          emptyTitle="No patients found"
          emptySubtitle={tab === 'today' ? 'No consultations today' : 'Try adjusting your filters'}
        />

        <TablePager
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {/* Form 2 Modal */}
      {showForm2 && selectedPatient && (
        <GeneralTreatmentForm
          open={showForm2}
          entry={{
            patient: {
              patient_id: selectedPatient.patient_id,
              name: `${selectedPatient.last_name}, ${selectedPatient.first_name}`,
              last_name: selectedPatient.last_name,
              first_name: selectedPatient.first_name,
              middle_name: selectedPatient.middle_name,
              age: selectedPatient.age,
              gender: selectedPatient.gender,
              address: selectedPatient.address,
            },
            queue_id: null,
          }}
          onClose={() => {
            setShowForm2(false);
            setSelectedPatient(null);
          }}
          onSave={() => {
            toast('Treatment record saved successfully');
            loadPatients();
            setShowForm2(false);
            setSelectedPatient(null);
          }}
        />
      )}

      {/* Patient Details / Forms 1-3 View Modal */}
      {showViewModal && selectedPatient && (
        <PatientDetailsModal
          open={showViewModal}
          patient={selectedPatient as any}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPatient(null);
          }}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
