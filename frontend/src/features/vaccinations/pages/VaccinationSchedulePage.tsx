import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
} from '@mui/material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Medicine01Icon,
  Calendar03Icon,
  SmartPhone01Icon,
  AlertCircleIcon,
  FlashIcon,
  Megaphone01Icon,
  Mail01Icon,
  Notification01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Search01Icon,
  RefreshIcon,
  UserMultiple02Icon,
  MailSend01Icon,
} from '@hugeicons/core-free-icons';
import api from '../../../services/api';
import { TablePager } from '../../../components/data-display';
import TagoloanTreatmentCardModal from '../components/TagoloanTreatmentCardModal';

interface PepDose {
  dose_number: number;
  label: string;
  status: 'completed' | 'due_today' | 'scheduled' | 'missed' | 'pending' | 'cancelled';
  administered_date?: string | null;
  vaccine_brand?: string;
  route?: string;
  site?: string;
  administered_by?: string;
  scheduled_date?: string;
  appointment_id?: number;
  reminder_sent_count?: number;
  last_reminded_at?: string;
}

interface PatientJourney {
  patient_id: number;
  patient_number: string;
  full_name: string;
  age?: number;
  gender?: string;
  contact_number?: string;
  email?: string;
  channel: 'walk_in' | 'online';
  compliance_status: 'on_track' | 'due_today' | 'overdue_missed' | 'completed' | 'awaiting_triage';
  max_dose_done: number;
  bite_incident?: {
    bite_id: number;
    bite_date: string;
    category: string;
    animal_type: string;
    body_part: string;
  } | null;
  doses: PepDose[];
  next_appointment?: {
    appointment_id: number;
    dose_number: number;
    label: string;
    scheduled_date: string;
    scheduled_date_formatted: string;
    time_slot: string;
    is_today: boolean;
    is_missed: boolean;
    late_days: number;
    reminder_sent_count: number;
    last_reminded_at?: string | null;
  } | null;
}

interface JourneyKPI {
  total_patients: number;
  on_track: number;
  due_today: number;
  overdue_missed: number;
  completed: number;
  awaiting_triage: number;
  walk_in_count: number;
  online_count: number;
}

export default function VaccinationSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientJourney[]>([]);
  const [kpi, setKpi] = useState<JourneyKPI>({
    total_patients: 0,
    on_track: 0,
    due_today: 0,
    overdue_missed: 0,
    completed: 0,
    awaiting_triage: 0,
    walk_in_count: 0,
    online_count: 0,
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'matrix' | 'today' | 'online' | 'missed'>('matrix');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'walk_in' | 'online'>('all');

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Treatment Card Modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Single Recall Dialog
  const [recallTarget, setRecallTarget] = useState<PatientJourney | null>(null);
  const [recallChannel, setRecallChannel] = useState<'all' | 'sms' | 'email' | 'in_app'>('all');
  const [recallMessage, setRecallMessage] = useState('');
  const [sendingRecall, setSendingRecall] = useState(false);

  // Bulk Recall Dialog
  const [bulkRecallOpen, setBulkRecallOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<'all' | 'sms' | 'email' | 'in_app'>('all');
  const [sendingBulk, setSendingBulk] = useState(false);

  // Auto-Recall sweep trigger
  const [triggeringAuto, setTriggeringAuto] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const fetchJourneyData = useCallback(async () => {
    setLoading(true);
    try {
      const channelParam = activeTab === 'online' ? 'online' : channelFilter !== 'all' ? channelFilter : undefined;
      const statusParam = activeTab === 'today' ? 'due_today' : activeTab === 'missed' ? 'overdue_missed' : 'all';

      const res = await api.get('/vaccinations/journey-matrix', {
        params: {
          search: debouncedSearch.trim() || undefined,
          channel: channelParam,
          status: statusParam,
          page: page + 1,
          per_page: rowsPerPage,
        },
      });

      setPatients(res.data.patients || []);
      if (res.data.pagination) {
        setTotalCount(res.data.pagination.total);
      }
      if (res.data.kpi) {
        setKpi(res.data.kpi);
      }
    } catch (err: any) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to fetch vaccination journey matrix.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, channelFilter, activeTab, page, rowsPerPage]);

  useEffect(() => {
    fetchJourneyData();
  }, [fetchJourneyData]);

  // Tab switch handler
  const handleTabChange = (newTab: 'matrix' | 'today' | 'online' | 'missed') => {
    setActiveTab(newTab);
    setPage(0);
  };

  // Open single recall modal
  const handleOpenRecall = (patient: PatientJourney) => {
    setRecallTarget(patient);
    setRecallChannel('all');
    const doseLabel = patient.next_appointment?.label || 'Next Dose';
    const clinicName = 'Tagoloan Animal Bite Treatment Center';
    setRecallMessage(
      `CRITICAL REMINDER: ${patient.full_name}, you missed your scheduled Rabies ${doseLabel}. Rabies is 100% fatal without complete PEP. Please return to ${clinicName} immediately for your catch-up dose.`
    );
  };

  // Submit single recall
  const handleSendSingleRecall = async () => {
    if (!recallTarget?.next_appointment?.appointment_id) return;
    setSendingRecall(true);
    try {
      const res = await api.post(`/appointments/${recallTarget.next_appointment.appointment_id}/recall`, {
        channel: recallChannel,
        message: recallMessage,
      });
      setFeedback({
        message: res.data.message || 'Recall alert dispatched successfully.',
        severity: 'success',
      });
      setRecallTarget(null);
      fetchJourneyData();
    } catch (err: any) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to dispatch recall alert.',
        severity: 'error',
      });
    } finally {
      setSendingRecall(false);
    }
  };

  // Submit bulk recall
  const handleSendBulkRecall = async () => {
    const overdueApptIds = patients
      .filter((p) => p.compliance_status === 'overdue_missed' && p.next_appointment?.appointment_id)
      .map((p) => p.next_appointment!.appointment_id);

    if (overdueApptIds.length === 0) {
      setFeedback({ message: 'No overdue appointments to recall.', severity: 'info' });
      setBulkRecallOpen(false);
      return;
    }

    setSendingBulk(true);
    try {
      const res = await api.post('/appointments/bulk-recall', {
        appointment_ids: overdueApptIds,
        channel: bulkChannel,
      });
      setFeedback({
        message: res.data.message || `Dispatched recall alerts to ${overdueApptIds.length} patients.`,
        severity: 'success',
      });
      setBulkRecallOpen(false);
      fetchJourneyData();
    } catch (err: any) {
      setFeedback({
        message: err.response?.data?.message || 'Bulk recall dispatch encountered an error.',
        severity: 'error',
      });
    } finally {
      setSendingBulk(false);
    }
  };

  // Run automated background sweep
  const handleTriggerAutoRecall = async () => {
    setTriggeringAuto(true);
    try {
      const res = await api.post('/appointments/trigger-auto-recall', { channel: 'all' });
      setFeedback({
        message: res.data.message || 'Automated recall sweep executed successfully.',
        severity: 'success',
      });
      fetchJourneyData();
    } catch (err: any) {
      setFeedback({
        message: err.response?.data?.message || 'Failed to execute automated recall sweep.',
        severity: 'error',
      });
    } finally {
      setTriggeringAuto(false);
    }
  };

  const getDoseBadgeStyle = (status: PepDose['status']) => {
    switch (status) {
      case 'completed':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: CheckmarkCircle02Icon, label: 'Completed' };
      case 'due_today':
        return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: Clock01Icon, label: 'Due Today' };
      case 'missed':
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: AlertCircleIcon, label: 'Missed' };
      case 'scheduled':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Calendar03Icon, label: 'Scheduled' };
      default:
        return { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', icon: Clock01Icon, label: 'Pending' };
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              bgcolor: '#047857',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.2)',
            }}
          >
            <HugeiconsIcon icon={Medicine01Icon} size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Vaccination & Regimen Center
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px' }}>
              Post-Exposure Prophylaxis (PEP) journey tracking, channel filtration, and multi-channel recall alerts
            </Typography>
          </Box>
        </Box>

        {/* Header Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title="Scheduled engine runs daily at 8:00 AM (SMS, Email, In-App)">
            <Button
              variant="outlined"
              size="small"
              onClick={handleTriggerAutoRecall}
              disabled={triggeringAuto}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '8px',
                px: 1.5,
                py: 0.75,
                bgcolor: '#f0fdf4',
                borderColor: '#bbf7d0',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' },
              }}
            >
              <HugeiconsIcon icon={FlashIcon} size={16} />
              {triggeringAuto ? 'Running Auto-Sweep...' : 'Run Auto-Recall Sweep'}
            </Button>
          </Tooltip>

          {kpi.overdue_missed > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={() => setBulkRecallOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '8px',
                px: 1.5,
                py: 0.75,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <HugeiconsIcon icon={Megaphone01Icon} size={16} />
              Recall All Missed ({kpi.overdue_missed})
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={fetchJourneyData}
            disabled={loading}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              bgcolor: '#fff',
              borderColor: '#e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
            }}
          >
            <HugeiconsIcon icon={RefreshIcon} size={16} />
            Refresh
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Total Patients */}
        <Paper
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              bgcolor: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={UserMultiple02Icon} size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
              Total PEP Cases
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {kpi.total_patients}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
              {kpi.walk_in_count} Walk-in • {kpi.online_count} Online
            </Typography>
          </Box>
        </Paper>

        {/* On Track */}
        <Paper
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid #bbf7d0',
            bgcolor: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              bgcolor: '#dcfce7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
              On Track
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#166534', lineHeight: 1.2 }}>
              {kpi.on_track}
            </Typography>
            <Typography variant="caption" sx={{ color: '#15803d', fontSize: '11px' }}>
              Adherent to schedule
            </Typography>
          </Box>
        </Paper>

        {/* Due Today */}
        <Paper
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid #fde68a',
            bgcolor: '#fefce8',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              bgcolor: '#fef3c7',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={Clock01Icon} size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#854d0e', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
              Due Today
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#854d0e', lineHeight: 1.2 }}>
              {kpi.due_today}
            </Typography>
            <Typography variant="caption" sx={{ color: '#a16207', fontSize: '11px' }}>
              Expected injection today
            </Typography>
          </Box>
        </Paper>

        {/* Overdue / Missed */}
        <Paper
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid #fecaca',
            bgcolor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              bgcolor: '#fee2e2',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
              Overdue / Missed
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#991b1b', lineHeight: 1.2 }}>
              {kpi.overdue_missed}
            </Typography>
            <Typography variant="caption" sx={{ color: '#b91c1c', fontSize: '11px' }}>
              Defaulters requiring recall
            </Typography>
          </Box>
        </Paper>

        {/* Completed */}
        <Paper
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              bgcolor: '#ecfdf5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HugeiconsIcon icon={Medicine01Icon} size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
              Completed PEP
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#047857', lineHeight: 1.2 }}>
              {kpi.completed}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '11px' }}>
              Full regimen completed
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Tabs & Filter Bar */}
      <Paper sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#fff', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* Segmented Tabs */}
          <Box sx={{ display: 'flex', gap: 1, bgcolor: '#f1f5f9', p: 0.5, borderRadius: '10px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={() => handleTabChange('matrix')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                borderRadius: '8px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 'matrix' ? '#047857' : 'transparent',
                color: activeTab === 'matrix' ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '&:hover': { bgcolor: activeTab === 'matrix' ? '#047857' : '#e2e8f0' },
              }}
            >
              <HugeiconsIcon icon={Medicine01Icon} size={16} />
              PEP Journey Stepper ({kpi.total_patients})
            </Button>

            <Button
              size="small"
              onClick={() => handleTabChange('today')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                borderRadius: '8px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 'today' ? '#047857' : 'transparent',
                color: activeTab === 'today' ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '&:hover': { bgcolor: activeTab === 'today' ? '#047857' : '#e2e8f0' },
              }}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={16} />
              Today's Injections ({kpi.due_today})
            </Button>

            <Button
              size="small"
              onClick={() => handleTabChange('online')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                borderRadius: '8px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 'online' ? '#047857' : 'transparent',
                color: activeTab === 'online' ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '&:hover': { bgcolor: activeTab === 'online' ? '#047857' : '#e2e8f0' },
              }}
            >
              <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
              Online Bookings ({kpi.online_count})
            </Button>

            <Button
              size="small"
              onClick={() => handleTabChange('missed')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                borderRadius: '8px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 'missed' ? '#dc2626' : 'transparent',
                color: activeTab === 'missed' ? '#fff' : '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                '&:hover': { bgcolor: activeTab === 'missed' ? '#dc2626' : '#fee2e2' },
              }}
            >
              <HugeiconsIcon icon={AlertCircleIcon} size={16} />
              Missed / Defaulter Recall ({kpi.overdue_missed})
            </Button>
          </Box>

          {/* Search and Channel Controls */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as any);
                  setPage(0);
                }}
                sx={{ borderRadius: '8px', fontSize: '13px', bgcolor: '#fff' }}
              >
                <MenuItem value="all">All Channels</MenuItem>
                <MenuItem value="walk_in">Walk-in Only</MenuItem>
                <MenuItem value="online">Online Mobile Only</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search patient name, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <HugeiconsIcon icon={Search01Icon} size={18} color="#94a3b8" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 220, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Patient Stepper Matrix List */}
      {loading ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            Loading PEP Journey Stepper Matrix...
          </Typography>
        </Paper>
      ) : patients.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Box sx={{ color: '#cbd5e1', mb: 1, display: 'flex', justifyContent: 'center' }}>
            <HugeiconsIcon icon={Medicine01Icon} size={48} />
          </Box>
          <Typography variant="h6" sx={{ color: '#475569', fontWeight: 600 }}>
            No patients match this filter
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Try adjusting your search criteria or switching tabs.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Stack spacing={2}>
            {patients.map((patient) => {
              const isMissed = patient.compliance_status === 'overdue_missed';
              const isDueToday = patient.compliance_status === 'due_today';

              return (
                <Paper
                  key={`journey-p-${patient.patient_id}`}
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: isMissed ? '#fca5a5' : isDueToday ? '#fde047' : '#e2e8f0',
                    bgcolor: isMissed ? '#fffdfd' : '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '3.5fr 5fr 3fr' },
                      gap: 2,
                      alignItems: 'center',
                    }}
                  >
                    {/* Left Column: Patient Profile & Incident Summary */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          bgcolor: patient.channel === 'online' ? '#eff6ff' : '#f0fdf4',
                          color: patient.channel === 'online' ? '#2563eb' : '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${patient.channel === 'online' ? '#bfdbfe' : '#bbf7d0'}`,
                          flexShrink: 0,
                        }}
                      >
                        <HugeiconsIcon icon={patient.channel === 'online' ? SmartPhone01Icon : UserMultiple02Icon} size={20} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {patient.full_name}
                          </Typography>
                          <Chip
                            label={patient.channel === 'online' ? 'Online Booking' : 'Walk-In'}
                            size="small"
                            sx={{
                              fontSize: '10px',
                              height: '20px',
                              fontWeight: 600,
                              bgcolor: patient.channel === 'online' ? '#eff6ff' : '#f1f5f9',
                              color: patient.channel === 'online' ? '#1d4ed8' : '#475569',
                              border: `1px solid ${patient.channel === 'online' ? '#dbeafe' : '#e2e8f0'}`,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {patient.patient_number} • {patient.age ? `${patient.age}y` : ''} {patient.gender} • {patient.contact_number || 'No Phone'}
                        </Typography>
                        {patient.bite_incident ? (
                          <Box sx={{ mt: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${patient.bite_incident.category} • ${patient.bite_incident.animal_type} (${patient.bite_incident.body_part})`}
                              size="small"
                              sx={{
                                fontSize: '10px',
                                height: '18px',
                                bgcolor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label="Awaiting Doctor Triage (Form 2)"
                              size="small"
                              sx={{ fontSize: '10px', height: '18px', bgcolor: '#f1f5f9', color: '#64748b' }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Middle Column: PEP Dose Stepper Matrix */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 1,
                        bgcolor: '#f8fafc',
                        p: 1.25,
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {patient.doses.map((dose) => {
                        const style = getDoseBadgeStyle(dose.status);
                        const IconComponent = style.icon;

                        return (
                          <Box
                            key={`p-${patient.patient_id}-dose-${dose.dose_number}`}
                            sx={{
                              p: 1,
                              borderRadius: '8px',
                              bgcolor: style.bg,
                              border: `1px solid ${style.border}`,
                              textAlign: 'center',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                              <Box sx={{ color: style.color, display: 'flex', alignItems: 'center' }}>
                                <HugeiconsIcon icon={IconComponent} size={13} />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: style.color, fontSize: '11px' }}>
                                {dose.label}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontSize: '10px',
                                color: style.color,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {dose.status === 'completed'
                                ? dose.administered_date || 'Done'
                                : dose.status === 'due_today'
                                ? 'Due Today'
                                : dose.status === 'missed'
                                ? 'Missed'
                                : dose.scheduled_date || 'Pending'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Right Column: Actions & Recall Trigger */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                      {patient.next_appointment && (
                        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                            Next:{' '}
                            <strong style={{ color: isMissed ? '#dc2626' : isDueToday ? '#d97706' : '#047857' }}>
                              {patient.next_appointment.label} on {patient.next_appointment.scheduled_date_formatted}
                            </strong>
                          </Typography>
                          {isMissed && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#dc2626' }}>
                              <HugeiconsIcon icon={AlertCircleIcon} size={13} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {patient.next_appointment.late_days} days overdue
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {isMissed && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleOpenRecall(patient)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              py: 0.5,
                              px: 1.25,
                              borderRadius: '6px',
                              boxShadow: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <HugeiconsIcon icon={MailSend01Icon} size={14} />
                            Send Recall
                          </Button>
                        )}

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedPatientId(patient.patient_id);
                            setCardModalOpen(true);
                          }}
                          sx={{
                            textTransform: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            py: 0.5,
                            px: 1.25,
                            borderRadius: '6px',
                            borderColor: '#bbf7d0',
                            color: '#166534',
                            bgcolor: '#f0fdf4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' },
                          }}
                        >
                          <HugeiconsIcon icon={Medicine01Icon} size={14} />
                          Record Dose (Form 3)
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>

          {/* Server-side Pagination Controls */}
          <TablePager
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Paper>
      )}

      {/* Tagoloan Official Treatment Card Modal */}
      {cardModalOpen && selectedPatientId && (
        <TagoloanTreatmentCardModal
          open={cardModalOpen}
          patientId={selectedPatientId}
          onClose={() => {
            setCardModalOpen(false);
            setSelectedPatientId(null);
            fetchJourneyData();
          }}
          onSaved={() => {
            fetchJourneyData();
          }}
        />
      )}

      {/* 1-Click Multi-Channel Recall Dialog */}
      <Dialog open={Boolean(recallTarget)} onClose={() => setRecallTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
            <HugeiconsIcon icon={AlertCircleIcon} size={22} />
          </Box>
          Dispatch Multi-Channel Missed Recall Alert
        </DialogTitle>
        <DialogContent dividers>
          {recallTarget && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                <strong>{recallTarget.full_name}</strong> missed their scheduled{' '}
                <strong>{recallTarget.next_appointment?.label}</strong> (was due on{' '}
                {recallTarget.next_appointment?.scheduled_date_formatted} •{' '}
                {recallTarget.next_appointment?.late_days}d late).
              </Alert>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Select Alert Delivery Channel:
                </Typography>
                <RadioGroup
                  row
                  value={recallChannel}
                  onChange={(e) => setRecallChannel(e.target.value as any)}
                >
                  <FormControlLabel value="all" control={<Radio size="small" />} label="All Available (SMS + Email + In-App)" />
                  <FormControlLabel value="sms" control={<Radio size="small" />} label="SMS Only" />
                  <FormControlLabel value="email" control={<Radio size="small" />} label="Email Only" />
                  <FormControlLabel value="in_app" control={<Radio size="small" />} label="In-App Push Only" />
                </RadioGroup>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Recipient Contact Details on File:
                </Typography>
                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '13px' }}>
                    <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
                    <strong>Phone (SMS):</strong> {recallTarget.contact_number || 'None'}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '13px' }}>
                    <HugeiconsIcon icon={Mail01Icon} size={16} />
                    <strong>Email:</strong> {recallTarget.email || 'None'}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '13px' }}>
                    <HugeiconsIcon icon={Notification01Icon} size={16} />
                    <strong>Mobile App Account:</strong> {recallTarget.channel === 'online' ? 'Active Linked Account' : 'Unlinked Walk-in'}
                  </Box>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Recall Message Preview:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={recallMessage}
                  onChange={(e) => setRecallMessage(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRecallTarget(null)} disabled={sendingRecall} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSendSingleRecall}
            disabled={sendingRecall}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <HugeiconsIcon icon={MailSend01Icon} size={16} />
            {sendingRecall ? 'Dispatching...' : 'Dispatch Alert Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Recall Dialog */}
      <Dialog open={bulkRecallOpen} onClose={() => setBulkRecallOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
            <HugeiconsIcon icon={Megaphone01Icon} size={22} />
          </Box>
          Bulk Missed Dose Recall
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            You are about to dispatch urgent multi-channel recall alerts to <strong>{kpi.overdue_missed} overdue patients</strong>.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Delivery Channel</InputLabel>
            <Select
              value={bulkChannel}
              label="Delivery Channel"
              onChange={(e) => setBulkChannel(e.target.value as any)}
            >
              <MenuItem value="all">All Channels (SMS, Email, In-App)</MenuItem>
              <MenuItem value="sms">SMS Only</MenuItem>
              <MenuItem value="email">Email Only</MenuItem>
              <MenuItem value="in_app">In-App Push Only</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkRecallOpen(false)} disabled={sendingBulk} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSendBulkRecall}
            disabled={sendingBulk}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <HugeiconsIcon icon={MailSend01Icon} size={16} />
            {sendingBulk ? 'Dispatching...' : `Send to ${kpi.overdue_missed} Patients`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      {feedback && (
        <Snackbar
          open={Boolean(feedback)}
          autoHideDuration={5000}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ borderRadius: '8px' }}>
            {feedback.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
