import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Switch,
  TextField,
  MenuItem,
  Select,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  CalendarMonth as CalendarIcon,
  EventBusy as ExceptionIcon,
  Policy as PolicyIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
  Refresh as SyncIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import Loader from '../../../components/Loader';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface ScheduleItem {
  id?: number;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  slot_interval_minutes: number;
  max_patients_per_slot: number;
}

interface ScheduleException {
  id: number;
  exception_date: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string;
}

interface ClinicPolicy {
  schedule_drift_policy: 'forward_only' | 'nearest' | 'backward_within_N_days';
  backward_max_days: number;
  urgent_access_policy: 'walk_ins_accepted_outside_hours' | 'refer_to_alternate_facility';
  urgent_referral_facility_name: string;
  urgent_referral_facility_address: string;
  urgent_referral_facility_contact: string;
  urgent_referral_instructions: string;
}

export const ClinicOperatingSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [policies, setPolicies] = useState<ClinicPolicy>({
    schedule_drift_policy: 'forward_only',
    backward_max_days: 1,
    urgent_access_policy: 'walk_ins_accepted_outside_hours',
    urgent_referral_facility_name: '',
    urgent_referral_facility_address: '',
    urgent_referral_facility_contact: '',
    urgent_referral_instructions: '',
  });

  // Toast / Alerts
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [successModal, setSuccessModal] = useState<{
    open?: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Modal State for Exception Add/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<ScheduleException | null>(null);
  const [exceptionForm, setExceptionForm] = useState({
    exception_date: '',
    is_open: false,
    open_time: '08:00',
    close_time: '17:00',
    reason: '',
  });

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinics/schedule');
      if (res.data) {
        setSchedules(res.data.schedules || []);
        setExceptions(res.data.exceptions || []);
        if (res.data.clinic) {
          setPolicies({
            schedule_drift_policy: res.data.clinic.schedule_drift_policy || 'forward_only',
            backward_max_days: res.data.clinic.backward_max_days || 1,
            urgent_access_policy: res.data.clinic.urgent_access_policy || 'walk_ins_accepted_outside_hours',
            urgent_referral_facility_name: res.data.clinic.urgent_referral_facility_name || '',
            urgent_referral_facility_address: res.data.clinic.urgent_referral_facility_address || '',
            urgent_referral_facility_contact: res.data.clinic.urgent_referral_facility_contact || '',
            urgent_referral_instructions: res.data.clinic.urgent_referral_instructions || '',
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load clinic schedule:', err);
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to load clinic operating schedule.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Schedule Row Handlers
  const handleToggleDay = (dayIndex: number) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, is_open: !s.is_open } : s))
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', val: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, [field]: val } : s))
    );
  };

  // Presets
  const applyPreset = (preset: 'mon_fri' | 'mon_thu' | 'daily') => {
    setSchedules((prev) =>
      prev.map((s) => {
        let isOpen = false;
        if (preset === 'mon_fri') isOpen = s.day_of_week >= 1 && s.day_of_week <= 5;
        if (preset === 'mon_thu') isOpen = s.day_of_week === 1 || s.day_of_week === 4;
        if (preset === 'daily') isOpen = true;

        return {
          ...s,
          is_open: isOpen,
          open_time: isOpen ? s.open_time || '08:00:00' : null,
          close_time: isOpen ? s.close_time || '17:00:00' : null,
        };
      })
    );
  };

  // Save Weekly Schedule
  const handleSaveWeeklySchedule = async () => {
    try {
      setSaving(true);
      const payload = {
        schedules: schedules.map((s) => ({
          day_of_week: s.day_of_week,
          is_open: s.is_open,
          open_time: s.is_open ? s.open_time || '08:00:00' : null,
          close_time: s.is_open ? s.close_time || '17:00:00' : null,
          slot_interval_minutes: s.slot_interval_minutes || 30,
          max_patients_per_slot: s.max_patients_per_slot || 10,
        })),
      };
      await api.put('/clinics/schedule/weekly', payload);
      setSuccessModal({
        open: true,
        title: 'Schedule Saved',
        message: 'Weekly operating schedule has been saved successfully.',
      });
      fetchScheduleData();
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to save weekly schedule.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Policies
  const handleSavePolicies = async () => {
    try {
      setSaving(true);
      await api.put('/clinics/schedule/policies', policies);
      setSuccessModal({
        open: true,
        title: 'Policies Updated',
        message: 'PEP drift and emergency policies have been updated successfully.',
      });
      fetchScheduleData();
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to update policies.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Exception Handlers
  const handleOpenExceptionModal = (exc?: ScheduleException) => {
    if (exc) {
      setEditingException(exc);
      setExceptionForm({
        exception_date: exc.exception_date,
        is_open: exc.is_open,
        open_time: exc.open_time || '08:00',
        close_time: exc.close_time || '17:00',
        reason: exc.reason,
      });
    } else {
      setEditingException(null);
      setExceptionForm({
        exception_date: '',
        is_open: false,
        open_time: '08:00',
        close_time: '17:00',
        reason: '',
      });
    }
    setModalOpen(true);
  };

  const handleSaveException = async () => {
    if (!exceptionForm.exception_date || !exceptionForm.reason) {
      setToast({
        open: true,
        message: 'Please provide both an override date and a reason.',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        exception_date: exceptionForm.exception_date,
        is_open: exceptionForm.is_open,
        open_time: exceptionForm.is_open ? exceptionForm.open_time : null,
        close_time: exceptionForm.is_open ? exceptionForm.close_time : null,
        reason: exceptionForm.reason,
      };
      if (editingException) {
        payload.id = editingException.id;
      }

      await api.post('/clinics/schedule/exceptions', payload);
      setModalOpen(false);
      setSuccessModal({
        open: true,
        title: 'Exception Saved',
        message: 'Calendar exception override has been saved successfully.',
      });
      fetchScheduleData();
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to save calendar exception.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this calendar exception override?')) return;
    try {
      await api.delete(`/clinics/schedule/exceptions/${id}`);
      setSuccessModal({
        open: true,
        title: 'Exception Removed',
        message: 'Calendar exception override has been removed.',
      });
      fetchScheduleData();
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to delete exception.',
        severity: 'error',
      });
    }
  };

  const handleSyncRecalculate = async () => {
    try {
      setSaving(true);
      const res = await api.post('/clinics/schedule/recalculate');
      setToast({
        open: true,
        message: res.data?.message || 'Appointments synchronized successfully.',
        severity: 'success',
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to synchronize appointments.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <CalendarIcon sx={{ color: '#277a4b', fontSize: 28 }} />
            Clinic Operating Schedule & PEP Regimen Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
            Configure recurring weekly operating days, special holiday overrides, and PEP vaccination date resolution rules.
          </Typography>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Operating Schedule</span>
          </div>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SyncIcon />}
          onClick={handleSyncRecalculate}
          disabled={saving}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: '#277a4b',
            borderColor: '#277a4b',
            '&:hover': { bgcolor: '#f0fdf4', borderColor: '#1e633d' },
          }}
        >
          {saving ? 'Syncing...' : 'Sync & Shift Existing Appointments'}
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            px: 2,
            borderBottom: '1px solid #e5e7eb',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              py: 2,
            },
          }}
        >
          <Tab icon={<CalendarIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Weekly Operating Pattern" />
          <Tab
            icon={<ExceptionIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Calendar Exceptions & Holidays (${exceptions.length})`}
          />
          <Tab icon={<PolicyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Regimen Drift & Emergency Policies" />
        </Tabs>

        {/* TAB 0: Weekly Operating Pattern */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Presets Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151' }}>
                Weekly Operating Days & Hours
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => applyPreset('mon_fri')} sx={{ textTransform: 'none', fontSize: 12 }}>
                  Mon–Fri (Standard)
                </Button>
                <Button size="small" variant="outlined" onClick={() => applyPreset('mon_thu')} sx={{ textTransform: 'none', fontSize: 12 }}>
                  Mon & Thu Only (ABTC Session)
                </Button>
                <Button size="small" variant="outlined" onClick={() => applyPreset('daily')} sx={{ textTransform: 'none', fontSize: 12 }}>
                  Daily (7 Days)
                </Button>
              </Box>
            </Box>

            {/* Schedule List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {schedules.map((item) => {
                const dayName = DAY_NAMES[item.day_of_week] || `Day ${item.day_of_week}`;

                return (
                  <Paper
                    key={item.day_of_week}
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      borderColor: item.is_open ? '#c8e6c9' : '#e5e7eb',
                      bgcolor: item.is_open ? '#fcfdfd' : '#f9fafb',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 160 }}>
                      <Switch
                        checked={item.is_open}
                        onChange={() => handleToggleDay(item.day_of_week)}
                        color="success"
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: item.is_open ? '#111827' : '#9ca3af' }}>
                          {dayName}
                        </Typography>
                        <Chip
                          size="small"
                          label={item.is_open ? 'OPEN' : 'CLOSED'}
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: item.is_open ? '#e8f5e9' : '#f3f4f6',
                            color: item.is_open ? '#2e7d32' : '#6b7280',
                            mt: 0.25,
                          }}
                        />
                      </Box>
                    </Box>

                    {item.is_open ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimeIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                          <TextField
                            type="time"
                            size="small"
                            value={item.open_time ? item.open_time.substring(0, 5) : '08:00'}
                            onChange={(e) => handleTimeChange(item.day_of_week, 'open_time', e.target.value)}
                            sx={{ width: 115 }}
                          />
                          <Typography sx={{ color: '#6b7280', px: 0.5 }}>to</Typography>
                          <TextField
                            type="time"
                            size="small"
                            value={item.close_time ? item.close_time.substring(0, 5) : '17:00'}
                            onChange={(e) => handleTimeChange(item.day_of_week, 'close_time', e.target.value)}
                            sx={{ width: 115 }}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                        Clinic closed all day
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={handleSaveWeeklySchedule}
                sx={{
                  bgcolor: '#277a4b',
                  '&:hover': { bgcolor: '#1e633d' },
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                {saving ? 'Saving...' : 'Save Weekly Schedule'}
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 1: Calendar Exceptions & Holidays */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151' }}>
                Holidays & Special Date Overrides
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleOpenExceptionModal()}
                sx={{ bgcolor: '#277a4b', '&:hover': { bgcolor: '#1e633d' }, textTransform: 'none' }}
              >
                Add Date Override
              </Button>
            </Box>

            {exceptions.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f9fafb', borderRadius: '10px' }}>
                <ExceptionIcon sx={{ fontSize: 40, color: '#9ca3af', mb: 1 }} />
                <Typography sx={{ fontWeight: 600, color: '#374151' }}>No Calendar Overrides Configured</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                  Add specific dates for national holidays, weather emergencies, or special weekend vaccination sessions.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {exceptions.map((exc) => (
                  <Paper
                    key={exc.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      borderColor: exc.is_open ? '#c8e6c9' : '#ffcdd2',
                      bgcolor: exc.is_open ? '#fbfdfb' : '#fffbfa',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                          {exc.exception_date}
                        </Typography>
                        <Chip
                          size="small"
                          label={exc.is_open ? 'SPECIAL OPEN' : 'CLOSED / HOLIDAY'}
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: exc.is_open ? '#e8f5e9' : '#ffebee',
                            color: exc.is_open ? '#2e7d32' : '#c62828',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#4b5563', mt: 0.5 }}>
                        {exc.reason}
                        {exc.is_open && exc.open_time && (
                          <Box component="span" sx={{ color: '#6b7280', ml: 1 }}>
                            ({exc.open_time.substring(0, 5)} - {exc.close_time?.substring(0, 5)})
                          </Box>
                        )}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleOpenExceptionModal(exc)} sx={{ color: '#4b5563' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteException(exc.id)} sx={{ color: '#dc2626' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* TAB 2: Regimen Drift & Emergency Policies */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            {/* Drift Policy Section */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PolicyIcon sx={{ color: '#277a4b', fontSize: 20 }} />
              PEP Regimen Date Drift Policy (When Ideal Date Falls on Closed Day)
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Post-Exposure Prophylaxis (Day 3, 7, 28, Boosters) ideal calendar dates falling on clinic closures will automatically resolve based on this policy.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', mb: 3 }}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={policies.schedule_drift_policy}
                  onChange={(e) => setPolicies({ ...policies, schedule_drift_policy: e.target.value as any })}
                >
                  <FormControlLabel
                    value="forward_only"
                    control={<Radio color="success" />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          Forward Only (Next Open Clinic Day) — <Box component="span" sx={{ color: '#277a4b', fontWeight: 700 }}>Recommended for Rabies PEP</Box>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 12 }}>
                          Never moves vaccination earlier than the clinical incubation window. Moves Sunday Day-3 to Monday.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1.5 }}
                  />
                  <FormControlLabel
                    value="nearest"
                    control={<Radio color="success" />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Nearest Open Day (Forward or Backward)</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 12 }}>
                          Resolves to the closest bookable operating day.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1.5 }}
                  />
                  <FormControlLabel
                    value="backward_within_N_days"
                    control={<Radio color="success" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Backward within</Typography>
                        <Select
                          size="small"
                          value={policies.backward_max_days}
                          onChange={(e) => setPolicies({ ...policies, backward_max_days: Number(e.target.value) })}
                          sx={{ height: 32, width: 70 }}
                        >
                          <MenuItem value={1}>1</MenuItem>
                          <MenuItem value={2}>2</MenuItem>
                          <MenuItem value={3}>3</MenuItem>
                        </Select>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>day(s), then Forward</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Paper>

            {/* Emergency Day-0 Exposure Policy */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: '#d97706', fontSize: 20 }} />
              Urgent Day-0 Exposure Policy (Initial Bite Treatment on Closed Days)
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Day 0 rabies exposure is an emergency. Specify how walk-ins or mobile bookings are handled when the clinic is closed.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', mb: 3 }}>
              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={policies.urgent_access_policy}
                  onChange={(e) => setPolicies({ ...policies, urgent_access_policy: e.target.value as any })}
                >
                  <FormControlLabel
                    value="walk_ins_accepted_outside_hours"
                    control={<Radio color="success" />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          Emergency Walk-ins Accepted 24/7 (via ER Triage Counter)
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 12 }}>
                          Patients with fresh bite exposure can proceed directly to the Emergency Room / Triage area anytime.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1.5 }}
                  />
                  <FormControlLabel
                    value="refer_to_alternate_facility"
                    control={<Radio color="success" />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          Refer to Alternate Emergency ABTC Facility
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 12 }}>
                          Mobile app and online booking will display emergency referral directions and contact numbers.
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {policies.urgent_access_policy === 'refer_to_alternate_facility' && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                    Emergency Referral Facility Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Facility Name"
                        value={policies.urgent_referral_facility_name}
                        onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_name: e.target.value })}
                        placeholder="e.g. Northern Mindanao Medical Center ABTC"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Emergency Contact Number"
                        value={policies.urgent_referral_facility_contact}
                        onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_contact: e.target.value })}
                        placeholder="e.g. (088) 856-4147 / 911"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Facility Address"
                        value={policies.urgent_referral_facility_address}
                        onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_address: e.target.value })}
                        placeholder="e.g. Capitol Compound, Cagayan de Oro City"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Patient Instructions (Shown on Mobile App)"
                        value={policies.urgent_referral_instructions}
                        onChange={(e) => setPolicies({ ...policies, urgent_referral_instructions: e.target.value })}
                        placeholder="e.g. Wash wound immediately with soap and water for 15 minutes. Proceed directly to the ER."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={handleSavePolicies}
                sx={{
                  bgcolor: '#277a4b',
                  '&:hover': { bgcolor: '#1e633d' },
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                {saving ? 'Saving...' : 'Save Policies'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Exception Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editingException ? 'Edit Calendar Override' : 'Add Calendar Override'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            type="date"
            label="Override Date"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            size="small"
            value={exceptionForm.exception_date}
            onChange={(e) => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })}
          />

          <FormControlLabel
            control={
              <Switch
                checked={exceptionForm.is_open}
                onChange={(e) => setExceptionForm({ ...exceptionForm, is_open: e.target.checked })}
                color="success"
              />
            }
            label={exceptionForm.is_open ? 'Special Extra Open Day' : 'Closure / Public Holiday'}
          />

          {exceptionForm.is_open && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                type="time"
                label="Open"
                size="small"
                value={exceptionForm.open_time}
                onChange={(e) => setExceptionForm({ ...exceptionForm, open_time: e.target.value })}
                fullWidth
              />
              <TextField
                type="time"
                label="Close"
                size="small"
                value={exceptionForm.close_time}
                onChange={(e) => setExceptionForm({ ...exceptionForm, close_time: e.target.value })}
                fullWidth
              />
            </Box>
          )}

          <TextField
            label="Reason / Notes"
            placeholder="e.g. National Heroes Day, Typhoon Warning"
            fullWidth
            size="small"
            value={exceptionForm.reason}
            onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveException}
            disabled={saving}
            sx={{ bgcolor: '#277a4b', '&:hover': { bgcolor: '#1e633d' }, textTransform: 'none' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      {successModal && (
        <ConfirmationDialog
          variant="success"
          title={successModal.title}
          message={successModal.message}
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setSuccessModal(null)}
        />
      )}

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


export default ClinicOperatingSchedulePage;
