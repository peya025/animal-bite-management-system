// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Pets as AnimalIcon,
  LocationOn as LocationIcon,
  MedicalServices as MedicalServicesIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import AppButton from '../../../components/button';
import DataTable from '../../../components/ui/DataTable';
import TablePager from '../../../components/data-display/TablePager';
import AddPatientModal from '../../patients/components/AddPatientModal/AddPatientModal';
import TagoloanTreatmentCardModal from '../../vaccinations/components/TagoloanTreatmentCardModal';

interface BiteIntake {
  intake_id: number;
  case_number?: string;
  patient?: { patient_id: number; name: string; age: number; gender: string; phone?: string };
  bite_date?: string;
  bite_place?: string;
  exposure_type?: string;
  animal_type?: string;
  status: 'pending' | 'reviewed' | 'completed';
  created_at: string;
}

export default function BiteCaseListPage() {
  const [intakes, setIntakes] = useState<BiteIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Modals
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [cardPatientId, setCardPatientId] = useState<number | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);

  const loadIntakes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bite-intakes', {
        params: { page: page + 1, per_page: rowsPerPage, search },
      });
      setIntakes(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      console.error('Failed to load bite intakes', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes]);

  const columns = [
    {
      key: 'case_number',
      label: 'Case / Registry No',
      render: (r: BiteIntake) => (
        <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.3, bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 1.5, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
          {r.case_number || `INT-${r.intake_id}`}
        </Box>
      ),
    },
    {
      key: 'patient',
      label: 'Registered Patient',
      render: (r: BiteIntake) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
            {r.patient?.name || 'Registered Patient'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#64748b' }}>
            {r.patient?.age ? `${r.patient.age}y · ${r.patient.gender}` : r.patient?.phone || 'Demographics on file'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'exposure',
      label: 'Exposure & Animal',
      render: (r: BiteIntake) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <AnimalIcon sx={{ fontSize: 16, color: 'var(--primary)' }} />
          <Typography sx={{ fontSize: 13, textTransform: 'capitalize', color: '#334155' }}>
            {r.animal_type || 'Dog'} ({r.exposure_type || 'Bite'})
          </Typography>
        </Box>
      ),
    },
    {
      key: 'location',
      label: 'Incident Place',
      render: (r: BiteIntake) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocationIcon sx={{ fontSize: 15, color: '#64748b' }} />
          <Typography sx={{ fontSize: 13, color: '#475569' }}>
            {r.bite_place || 'Tagoloan, Misamis Oriental'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'status',
      label: 'Intake Status',
      render: (r: BiteIntake) => (
        <Chip
          size="small"
          label={r.status || 'pending'}
          color={r.status === 'completed' ? 'success' : r.status === 'reviewed' ? 'info' : 'warning'}
          sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions per Patient',
      align: 'right',
      render: (r: BiteIntake) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setPatientModalOpen(true)}
            startIcon={<MedicalServicesIcon />}
            sx={{ fontSize: 11, py: 0.3, px: 1, textTransform: 'none', fontWeight: 600, borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            Form 2 (Doctor Treatment)
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setCardPatientId(r.patient?.patient_id || r.patient_id);
              setCardModalOpen(true);
            }}
            startIcon={<DescriptionIcon />}
            sx={{ fontSize: 11, py: 0.3, px: 1, textTransform: 'none', fontWeight: 600, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' } }}
          >
            Form 3 (Tagoloan Card)
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ px: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'var(--text-h)', fontWeight: 600, mb: '7px' }}>
            Bite Incident Intake Assessment List
          </Typography>
          <Typography variant="body2" sx={{ color: '#77877d' }}>
            List of registered patients with reported bite incidents ready for Doctor consultation (Form 2) & Treatment Card (Form 3).
          </Typography>
        </Box>
        <AppButton
          onClick={() => setPatientModalOpen(true)}
        >
          + New Bite Incident Intake
        </AppButton>
      </Box>

      {/* Filter / Search Row */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <TextField
          size="small"
          placeholder="Search by case number, patient name, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 420, width: '100%' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Main Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <DataTable
          columns={columns}
          data={intakes}
          loading={loading}
          emptyText="No bite incident intakes found. Click '+ New Bite Incident Intake' to create one."
        />
        <TablePager
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
        />
      </Paper>

      {/* Patient Record Modal (Form 1, Form 2, Form 3 Tabs) */}
      {patientModalOpen && (
        <AddPatientModal
          onClose={() => setPatientModalOpen(false)}
          onSuccess={() => {
            setPatientModalOpen(false);
            loadIntakes();
          }}
          role="triage"
        />
      )}

      {/* Tagoloan Treatment Card Modal (Form 3) */}
      <TagoloanTreatmentCardModal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        patientId={cardPatientId}
        onSaved={loadIntakes}
      />
    </Box>
  );
}
