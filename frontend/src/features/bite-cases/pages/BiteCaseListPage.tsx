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
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [intakes, setIntakes] = useState<BiteIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
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
        <Box sx={{
          display: 'inline-flex',
          px: 1.25,
          py: 0.3,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
          borderRadius: 1.5,
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          color: isDark ? '#ffffff' : '#1e293b'
        }}>
          {r.case_number || `INT-${r.intake_id}`}
        </Box>
      ),
    },
    {
      key: 'patient',
      label: 'Registered Patient',
      render: (r: BiteIntake) => (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: isDark ? '#ffffff' : '#0f172a' }}>
            {r.patient?.name || 'Registered Patient'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
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
          <AnimalIcon sx={{ fontSize: 16, color: '#10b981' }} />
          <Typography sx={{ fontSize: 13, textTransform: 'capitalize', color: isDark ? '#e2e8f0' : '#334155' }}>
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
          <LocationIcon sx={{ fontSize: 15, color: isDark ? '#a7f3d0' : '#64748b' }} />
          <Typography sx={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>
            {r.bite_place || 'Tagoloan, Misamis Oriental'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'status',
      label: 'Intake Status',
      align: 'center',
      render: (r: BiteIntake) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Chip
            size="small"
            label={r.status || 'pending'}
            color={r.status === 'completed' ? 'success' : r.status === 'reviewed' ? 'info' : 'warning'}
            sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }}
          />
        </Box>
      ),
    },
    {
      key: 'actions',
      label: 'Actions per Patient',
      align: 'center',
      render: (r: BiteIntake) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
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

  const summaryStats = {
    total: total || intakes.length,
    completed: intakes.filter((i) => i.status === 'completed').length,
    reviewed: intakes.filter((i) => i.status === 'reviewed').length,
    pending: intakes.filter((i) => !i.status || i.status === 'pending').length,
  };

  const cards = [
    {
      id: 'total',
      label: 'TOTAL INTAKES',
      value: summaryStats.total,
      sub: 'All Recorded Exposures',
      color: '#10b981',
      badge: null,
      icon: <DescriptionIcon sx={{ fontSize: 15 }} />,
    },
    {
      id: 'pending',
      label: 'PENDING ASSESSMENT',
      value: summaryStats.pending,
      sub: 'Awaiting Doctor Assessment',
      color: '#f59e0b',
      badge: 'Action Due',
      icon: null,
    },
    {
      id: 'reviewed',
      label: 'REVIEWED',
      value: summaryStats.reviewed,
      sub: 'Doctor Assessment Given',
      color: '#38bdf8',
      badge: 'In Protocol',
      icon: null,
    },
    {
      id: 'completed',
      label: 'COMPLETED',
      value: summaryStats.completed,
      sub: 'Full Card & PEP Form 3',
      color: '#10b981',
      badge: 'Card Issued',
      icon: null,
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

      {/* ── Summary KPI Cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {cards.map((c) => {
          const hoverShadow = isDark
            ? c.color === '#f59e0b'
              ? '0 8px 24px rgba(245, 158, 11, 0.35), 0 0 16px rgba(245, 158, 11, 0.25)'
              : c.color === '#38bdf8'
              ? '0 8px 24px rgba(56, 189, 248, 0.35), 0 0 16px rgba(56, 189, 248, 0.25)'
              : c.color === '#ef4444'
              ? '0 8px 24px rgba(239, 68, 68, 0.35), 0 0 16px rgba(239, 68, 68, 0.25)'
              : '0 8px 24px rgba(16, 185, 129, 0.35), 0 0 16px rgba(16, 185, 129, 0.25)'
            : c.color === '#f59e0b'
            ? '0 8px 22px rgba(245, 158, 11, 0.28), 0 2px 8px rgba(245, 158, 11, 0.16)'
            : c.color === '#38bdf8'
            ? '0 8px 22px rgba(56, 189, 248, 0.30), 0 2px 8px rgba(56, 189, 248, 0.16)'
            : c.color === '#ef4444'
            ? '0 8px 22px rgba(239, 68, 68, 0.28), 0 2px 8px rgba(239, 68, 68, 0.16)'
            : '0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16)';

          return (
            <Paper
              key={c.id}
              elevation={0}
              sx={{
                p: '16px 18px',
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: 118,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'default',
                ...(isDark
                  ? {
                      background: '#111827',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      '&:hover': {
                        boxShadow: hoverShadow,
                      },
                    }
                  : {
                      background: '#ffffff',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      '&:hover': {
                        boxShadow: hoverShadow,
                      },
                    }),
              }}
            >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a7f3d0' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {c.label}
              </Typography>
              {c.badge ? (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: `${c.color}22`,
                    border: `1px solid ${c.color}50`,
                    color: c.color,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {c.badge}
                </Box>
              ) : c.icon ? (
                <Box sx={{ p: 0.6, bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', border: isDark ? '1px solid rgba(163, 230, 53, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#10b981', display: 'flex' }}>
                  {c.icon}
                </Box>
              ) : null}
            </Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: isDark ? '#ffffff' : '#064e3b', lineHeight: 1.1, my: 0.5, letterSpacing: '-0.5px' }}>
              {c.value}
            </Typography>
            <Typography sx={{ fontSize: 11, color: isDark ? '#a7f3d0' : '#4b5563', fontWeight: 500 }}>
              {c.sub}
            </Typography>
          </Paper>
          );
        })}
      </Box>

      {/* Filter / Search Row */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(163, 230, 53, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
          bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(16,185,129,0.06)',
        }}
      >
        <TextField
          size="small"
          placeholder="Search by case number, patient name, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 420, width: '100%' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: isDark ? '#a7f3d0' : '#94a3b8' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '8px', fontSize: 13 },
          }}
        />
      </Paper>

      {/* Main Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
          bgcolor: isDark ? 'rgba(14, 24, 18, 0.85)' : '#ffffff',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(16,185,129,0.08)',
        }}
      >
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
