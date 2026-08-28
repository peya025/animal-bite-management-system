import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Divider,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  BugReport as BugIcon,
  Refresh as RefreshIcon,
  Build as RepairIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as CriticalIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  HowToReg as RegistrationIcon,
  MedicalServices as DoctorIcon,
  Vaccines as NurseIcon,
  CalendarMonth as ScheduleIcon,
  Terminal as ConsoleIcon,
  PlayArrow as RunIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import Loader from '../../../components/Loader';

interface Anomaly {
  id: string;
  appointment_id?: number | null;
  patient_id?: number | null;
  patient_name: string;
  role_stage: 'registration' | 'doctor' | 'treatment' | 'schedule_engine';
  rule_code: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  clinical_impact: string;
  current_value: string;
  recommended_value: string;
  can_auto_fix: boolean;
  auto_fix_action?: string;
}

interface DiagnosticResults {
  clinic_id: number;
  scanned_at: string;
  health_score: number;
  summary: {
    total_appointments: number;
    total_anomalies: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    fixable_count: number;
  };
  role_breakdown: Record<string, { total: number; label: string; status: string }>;
  anomalies: Anomaly[];
}

export const AppointmentDiagnosticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [data, setData] = useState<DiagnosticResults | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  // Logs console
  const [logs, setLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 100)]);
  };

  const runScan = async () => {
    try {
      setScanning(true);
      addLog('Starting full appointment & scheduling diagnostic scan...');
      const res = await api.get('/developer/diagnostics/appointments');
      setData(res.data);
      addLog(`Scan completed: Health Score ${res.data?.health_score}/100 with ${res.data?.summary?.total_anomalies} anomaly/anomalies detected.`);
    } catch (err: any) {
      console.error('Scan failed:', err);
      addLog(`Scan ERROR: ${err?.response?.data?.message || err.message}`);
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to complete diagnostic scan.',
        severity: 'error',
      });
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const handleRepairAll = async () => {
    if (!window.confirm('Execute automated repair for all fixable scheduling and status desync issues?')) return;
    try {
      setRepairing(true);
      addLog('Initiating automated system remediation...');
      const res = await api.post('/developer/diagnostics/appointments/repair-all');
      addLog(res.data?.message || 'Repairs completed.');
      setToast({
        open: true,
        message: res.data?.message || 'Repairs executed successfully.',
        severity: 'success',
      });
      await runScan();
    } catch (err: any) {
      addLog(`Repair ERROR: ${err?.response?.data?.message || err.message}`);
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to execute automated repairs.',
        severity: 'error',
      });
    } finally {
      setRepairing(false);
    }
  };

  const handleRepairSingle = async (anomaly: Anomaly) => {
    try {
      addLog(`Repairing issue '${anomaly.id}' (${anomaly.rule_code})...`);
      const res = await api.post('/developer/diagnostics/appointments/repair-single', {
        id: anomaly.id,
        appointment_id: anomaly.appointment_id,
        patient_id: anomaly.patient_id,
        auto_fix_action: anomaly.auto_fix_action,
        rule_code: anomaly.rule_code,
      });
      addLog(res.data?.message || `Repaired ${anomaly.id}.`);
      setToast({
        open: true,
        message: res.data?.message || 'Issue repaired successfully.',
        severity: 'success',
      });
      await runScan();
    } catch (err: any) {
      addLog(`Single Repair ERROR: ${err?.response?.data?.message || err.message}`);
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to repair issue.',
        severity: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );
  }

  const filteredAnomalies = (data?.anomalies || []).filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rule_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchStage = stageFilter === 'all' || a.role_stage === stageFilter;

    return matchSearch && matchSeverity && matchStage;
  });

  const healthScore = data?.health_score ?? 100;
  const scoreColor = healthScore >= 90 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <BugIcon sx={{ color: '#2563eb', fontSize: 30 }} />
            Appointment Bug Catcher & Workflow Diagnostic Suite
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
            Automated integrity auditor detecting schedule violations, PEP sequence conflicts, and role status desync across Registration, Doctor, and Treatment desks.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ConsoleIcon />}
            onClick={() => setShowConsole(!showConsole)}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#4b5563', borderColor: '#d1d5db' }}
          >
            {showConsole ? 'Hide Console' : 'Show Console'} ({logs.length})
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={scanning ? 'animate-spin' : ''} />}
            onClick={runScan}
            disabled={scanning || repairing}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#2563eb', borderColor: '#2563eb' }}
          >
            {scanning ? 'Scanning...' : 'Run Diagnostic Scan'}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<RepairIcon />}
            onClick={handleRepairAll}
            disabled={scanning || repairing || (data?.summary?.fixable_count ?? 0) === 0}
            sx={{
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {repairing ? 'Repairing...' : `Auto-Repair All (${data?.summary?.fixable_count ?? 0})`}
          </Button>
        </Box>
      </Box>

      {scanning && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} color="primary" />}

      {/* KPI Overview Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        {/* Health Score Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: '#ffffff',
            borderColor: '#e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
              System Health
            </Typography>
            {healthScore >= 90 ? (
              <HealthyIcon sx={{ color: scoreColor, fontSize: 22 }} />
            ) : healthScore >= 60 ? (
              <WarningIcon sx={{ color: scoreColor, fontSize: 22 }} />
            ) : (
              <CriticalIcon sx={{ color: scoreColor, fontSize: 22 }} />
            )}
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: scoreColor }}>
              {healthScore}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {healthScore === 100 ? 'Zero Anomalies Detected' : `${data?.summary?.total_anomalies} Issues Found`}
            </Typography>
          </Box>
        </Paper>

        {/* Total Appointments */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', bgcolor: '#ffffff', borderColor: '#e5e7eb' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
            Audited Appointments
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 1 }}>
            {data?.summary?.total_appointments ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Live in Database
          </Typography>
        </Paper>

        {/* Critical Violations */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: (data?.summary?.critical_count ?? 0) > 0 ? '#fff5f5' : '#ffffff',
            borderColor: (data?.summary?.critical_count ?? 0) > 0 ? '#fecaca' : '#e5e7eb',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
            Critical Violations
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626', mt: 1 }}>
            {data?.summary?.critical_count ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Closed Days & Inversions
          </Typography>
        </Paper>

        {/* Workflow Warnings */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: (data?.summary?.warning_count ?? 0) > 0 ? '#fffbeb' : '#ffffff',
            borderColor: (data?.summary?.warning_count ?? 0) > 0 ? '#fde68a' : '#e5e7eb',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
            Workflow Warnings
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#d97706', mt: 1 }}>
            {data?.summary?.warning_count ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Status & Regimen Desync
          </Typography>
        </Paper>

        {/* Auto-Fixable */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: (data?.summary?.fixable_count ?? 0) > 0 ? '#f0fdf4' : '#ffffff',
            borderColor: (data?.summary?.fixable_count ?? 0) > 0 ? '#bbf7d0' : '#e5e7eb',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
            Auto-Fixable Issues
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mt: 1 }}>
            {data?.summary?.fixable_count ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            1-Click Resolution Ready
          </Typography>
        </Paper>
      </Box>

      {/* Role Lifecycle Pipeline Status Cards */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151', mb: 1.5, textTransform: 'uppercase', fontSize: 12 }}>
        Workflow Stage & Role Status Synchronization
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {/* Registration Desk */}
        <Paper
          variant="outlined"
          onClick={() => setStageFilter(stageFilter === 'registration' ? 'all' : 'registration')}
          sx={{
            p: 2,
            borderRadius: '10px',
            cursor: 'pointer',
            borderColor: stageFilter === 'registration' ? '#2563eb' : '#e5e7eb',
            bgcolor: stageFilter === 'registration' ? '#eff6ff' : '#ffffff',
            transition: 'all 0.15s ease',
            '&:hover': { borderColor: '#93c5fd' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RegistrationIcon sx={{ color: '#2563eb', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Registration Desk</Typography>
            </Box>
            <Chip
              size="small"
              label={data?.role_breakdown?.registration?.total === 0 ? 'HEALTHY' : `${data?.role_breakdown?.registration?.total} ISSUES`}
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: data?.role_breakdown?.registration?.total === 0 ? '#e8f5e9' : '#fff3e0',
                color: data?.role_breakdown?.registration?.total === 0 ? '#2e7d32' : '#e65100',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
            Online bookings, patient intake triage, and check-in status sync.
          </Typography>
        </Paper>

        {/* Doctor / Triage */}
        <Paper
          variant="outlined"
          onClick={() => setStageFilter(stageFilter === 'doctor' ? 'all' : 'doctor')}
          sx={{
            p: 2,
            borderRadius: '10px',
            cursor: 'pointer',
            borderColor: stageFilter === 'doctor' ? '#2563eb' : '#e5e7eb',
            bgcolor: stageFilter === 'doctor' ? '#eff6ff' : '#ffffff',
            transition: 'all 0.15s ease',
            '&:hover': { borderColor: '#93c5fd' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DoctorIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Doctor / Triage</Typography>
            </Box>
            <Chip
              size="small"
              label={data?.role_breakdown?.doctor?.total === 0 ? 'HEALTHY' : `${data?.role_breakdown?.doctor?.total} ISSUES`}
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: data?.role_breakdown?.doctor?.total === 0 ? '#e8f5e9' : '#fff3e0',
                color: data?.role_breakdown?.doctor?.total === 0 ? '#2e7d32' : '#e65100',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
            Consultation completion, exposure risk rating, and regimen initiation.
          </Typography>
        </Paper>

        {/* Treatment / Nurse */}
        <Paper
          variant="outlined"
          onClick={() => setStageFilter(stageFilter === 'treatment' ? 'all' : 'treatment')}
          sx={{
            p: 2,
            borderRadius: '10px',
            cursor: 'pointer',
            borderColor: stageFilter === 'treatment' ? '#2563eb' : '#e5e7eb',
            bgcolor: stageFilter === 'treatment' ? '#eff6ff' : '#ffffff',
            transition: 'all 0.15s ease',
            '&:hover': { borderColor: '#93c5fd' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NurseIcon sx={{ color: '#059669', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Treatment / Nurse</Typography>
            </Box>
            <Chip
              size="small"
              label={data?.role_breakdown?.treatment?.total === 0 ? 'HEALTHY' : `${data?.role_breakdown?.treatment?.total} ISSUES`}
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: data?.role_breakdown?.treatment?.total === 0 ? '#e8f5e9' : '#fff3e0',
                color: data?.role_breakdown?.treatment?.total === 0 ? '#2e7d32' : '#e65100',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
            Form 3 vaccine administration vs appointment status synchronization.
          </Typography>
        </Paper>

        {/* Operating Schedule Engine */}
        <Paper
          variant="outlined"
          onClick={() => setStageFilter(stageFilter === 'schedule_engine' ? 'all' : 'schedule_engine')}
          sx={{
            p: 2,
            borderRadius: '10px',
            cursor: 'pointer',
            borderColor: stageFilter === 'schedule_engine' ? '#2563eb' : '#e5e7eb',
            bgcolor: stageFilter === 'schedule_engine' ? '#eff6ff' : '#ffffff',
            transition: 'all 0.15s ease',
            '&:hover': { borderColor: '#93c5fd' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon sx={{ color: '#d97706', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Schedule Engine</Typography>
            </Box>
            <Chip
              size="small"
              label={data?.role_breakdown?.schedule_engine?.total === 0 ? 'HEALTHY' : `${data?.role_breakdown?.schedule_engine?.total} ISSUES`}
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: data?.role_breakdown?.schedule_engine?.total === 0 ? '#e8f5e9' : '#fff3e0',
                color: data?.role_breakdown?.schedule_engine?.total === 0 ? '#2e7d32' : '#e65100',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
            Weekly operating hours, holiday closures, and PEP chronology drift.
          </Typography>
        </Paper>
      </Box>

      {/* Log Console Drawer */}
      {showConsole && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#1e293b',
            color: '#f8fafc',
            borderRadius: '10px',
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid #334155', pb: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>DIAGNOSTIC EXECUTION CONSOLE</Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }} onClick={() => setLogs([])}>
              Clear Log
            </Typography>
          </Box>
          {logs.length === 0 ? (
            <Typography sx={{ color: '#64748b', fontStyle: 'italic', fontSize: 11 }}>No console output yet.</Typography>
          ) : (
            logs.map((log, i) => (
              <Box key={i} sx={{ py: 0.25, color: log.includes('ERROR') ? '#f87171' : log.includes('Repaired') ? '#4ade80' : '#e2e8f0' }}>
                {log}
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Anomaly Filter Bar & List */}
      <Paper sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 260 }}>
            <TextField
              size="small"
              placeholder="Search by patient, rule, or issue description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9ca3af', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={severityFilter} label="Severity" onChange={(e) => setSeverityFilter(e.target.value)}>
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 170 }}>
              <InputLabel>Role / Stage</InputLabel>
              <Select value={stageFilter} label="Role / Stage" onChange={(e) => setStageFilter(e.target.value)}>
                <MenuItem value="all">All Stages</MenuItem>
                <MenuItem value="registration">Registration Desk</MenuItem>
                <MenuItem value="doctor">Doctor / Triage</MenuItem>
                <MenuItem value="treatment">Treatment / Nurse</MenuItem>
                <MenuItem value="schedule_engine">Schedule Engine</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Anomaly Items */}
        {filteredAnomalies.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center', bgcolor: '#fbfcfc', borderRadius: '10px', border: '1px dashed #d1d5db' }}>
            <HealthyIcon sx={{ fontSize: 44, color: '#10b981', mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>
              All Appointment & Scheduling Workflows Healthy
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
              No operational, clinical sequence, or role status desynchronization issues detected.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredAnomalies.map((item) => {
              const sevColor =
                item.severity === 'critical'
                  ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }
                  : item.severity === 'warning'
                  ? { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }
                  : { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };

              const stageBadge =
                item.role_stage === 'registration'
                  ? { label: 'REGISTRATION', icon: <RegistrationIcon sx={{ fontSize: 13 }} /> }
                  : item.role_stage === 'doctor'
                  ? { label: 'DOCTOR / TRIAGE', icon: <DoctorIcon sx={{ fontSize: 13 }} /> }
                  : item.role_stage === 'treatment'
                  ? { label: 'TREATMENT / NURSE', icon: <NurseIcon sx={{ fontSize: 13 }} /> }
                  : { label: 'SCHEDULE ENGINE', icon: <ScheduleIcon sx={{ fontSize: 13 }} /> };

              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    borderColor: sevColor.border,
                    bgcolor: sevColor.bg,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Chip
                        size="small"
                        label={item.severity.toUpperCase()}
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 800,
                          bgcolor: sevColor.text,
                          color: '#ffffff',
                        }}
                      />
                      <Chip
                        size="small"
                        icon={stageBadge.icon}
                        label={stageBadge.label}
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: '#ffffff',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                        }}
                      />
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {item.title}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#374151', fontSize: 13, mb: 0.5 }}>
                      {item.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', fontSize: 12 }}>
                      <Box component="span" sx={{ color: '#4b5563' }}>
                        <strong>Patient:</strong> {item.patient_name}
                      </Box>
                      <Box component="span" sx={{ color: '#dc2626' }}>
                        <strong>Current:</strong> {item.current_value}
                      </Box>
                      <Box component="span" sx={{ color: '#059669' }}>
                        <strong>Recommended:</strong> {item.recommended_value}
                      </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                      Clinical Impact: {item.clinical_impact}
                    </Typography>
                  </Box>

                  {item.can_auto_fix && (
                    <Box sx={{ minWidth: 120, textAlign: 'right' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<RepairIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleRepairSingle(item)}
                        sx={{
                          bgcolor: '#059669',
                          '&:hover': { bgcolor: '#047857' },
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 12,
                          px: 2,
                        }}
                      >
                        Auto-Fix
                      </Button>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AppointmentDiagnosticsPage;
