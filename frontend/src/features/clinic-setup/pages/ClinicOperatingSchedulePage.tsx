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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import {
  EventBusy as ExceptionIcon,
  EventAvailable as EventAvailableIcon,
  Save as SaveIcon,
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import Loader from '../../../components/Loader';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { getPhilippineRegularHolidays } from '../../../shared/utils/philippineHolidays';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const cleanFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'var(--input-bg, #fff)',
    fontSize: '13.5px',
    '& fieldset': {
      borderColor: 'var(--input-border, #d7e3da)',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#9fc5ad',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#277a4b',
      borderWidth: '1.5px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '8px 12px',
    fontSize: '13.5px',
    color: 'var(--input-text, #374151)',
  },
};

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
  close_on_ph_holidays: boolean;
}

const normalizeSchedulesForSnapshot = (items: ScheduleItem[]) =>
  items.map((s) => ({
    day_of_week: s.day_of_week,
    is_open: Boolean(s.is_open),
    open_time: s.is_open ? (s.open_time || '08:00').substring(0, 5) : null,
    close_time: s.is_open ? (s.close_time || '17:00').substring(0, 5) : null,
  }));

export const ClinicOperatingSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
    close_on_ph_holidays: true,
  });

  const [savedWeeklySnapshot, setSavedWeeklySnapshot] = useState('');
  const [savedPoliciesSnapshot, setSavedPoliciesSnapshot] = useState('');

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
        const loadedSchedules: ScheduleItem[] = res.data.schedules || [];
        setSchedules(loadedSchedules);
        setSavedWeeklySnapshot(JSON.stringify(normalizeSchedulesForSnapshot(loadedSchedules)));
        setExceptions(res.data.exceptions || []);
        if (res.data.clinic) {
          const loadedPolicies: ClinicPolicy = {
            schedule_drift_policy: res.data.clinic.schedule_drift_policy || 'forward_only',
            backward_max_days: res.data.clinic.backward_max_days || 1,
            urgent_access_policy: res.data.clinic.urgent_access_policy || 'walk_ins_accepted_outside_hours',
            urgent_referral_facility_name: res.data.clinic.urgent_referral_facility_name || '',
            urgent_referral_facility_address: res.data.clinic.urgent_referral_facility_address || '',
            urgent_referral_facility_contact: res.data.clinic.urgent_referral_facility_contact || '',
            urgent_referral_instructions: res.data.clinic.urgent_referral_instructions || '',
            close_on_ph_holidays: res.data.clinic.close_on_ph_holidays ?? true,
          };
          setPolicies(loadedPolicies);
          setSavedPoliciesSnapshot(JSON.stringify(loadedPolicies));
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

  const hasWeeklyChanges =
    !loading &&
    savedWeeklySnapshot !== '' &&
    JSON.stringify(normalizeSchedulesForSnapshot(schedules)) !== savedWeeklySnapshot;

  const hasPolicyChanges =
    !loading &&
    savedPoliciesSnapshot !== '' &&
    JSON.stringify(policies) !== savedPoliciesSnapshot;

  const hasUnsavedChanges = hasWeeklyChanges || hasPolicyChanges;

  const handleToggleDay = (dayIndex: number) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.day_of_week === dayIndex
          ? {
              ...s,
              is_open: !s.is_open,
              open_time: !s.is_open ? s.open_time || '08:00:00' : s.open_time,
              close_time: !s.is_open ? s.close_time || '17:00:00' : s.close_time,
            }
          : s
      )
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', val: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIndex ? { ...s, [field]: val } : s))
    );
  };

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

  const handleSaveAllChanges = async () => {
    if (!hasUnsavedChanges) return;
    try {
      setSaving(true);
      if (hasWeeklyChanges) {
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
      }
      if (hasPolicyChanges) {
        await api.put('/clinics/schedule/policies', policies);
      }
      setSuccessModal({
        open: true,
        title: 'Operating Schedule Saved',
        message:
          hasWeeklyChanges && hasPolicyChanges
            ? 'Weekly operating hours and schedule policies have been updated successfully.'
            : hasWeeklyChanges
              ? 'Weekly operating schedule has been saved successfully.'
              : 'PEP drift and emergency policies have been updated successfully.',
      });
      await fetchScheduleData();
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to save schedule changes.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    fetchScheduleData();
  };

  const handleTogglePhHolidays = (checked: boolean) => {
    setPolicies((prev) => ({ ...prev, close_on_ph_holidays: checked }));
  };

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
        title: 'Override Saved',
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
        title: 'Override Removed',
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
      setSyncing(true);
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
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader label="Loading Operating Schedule..." />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: hasUnsavedChanges ? 8 : 2 }}>
      {/* Header */}
      <Box data-walkthrough="schedule-header" sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Operating Schedule
          </Typography>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            data-walkthrough="schedule-sync-btn"
            variant="outlined"
            size="small"
            startIcon={<SyncIcon sx={{ fontSize: 17 }} />}
            onClick={handleSyncRecalculate}
            disabled={syncing || saving}
            sx={{
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#059669',
              borderColor: '#10b981',
              height: 38,
              px: 1.75,
              borderRadius: 1.5,
              '&:hover': { bgcolor: '#ecfdf5', borderColor: '#059669' },
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Appointments'}
          </Button>
          <Button
            data-walkthrough={activeTab === 2 ? 'schedule-save-policies-btn' : 'schedule-save-weekly-btn'}
            variant={hasUnsavedChanges ? 'contained' : 'outlined'}
            size="small"
            startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
            onClick={handleSaveAllChanges}
            disabled={saving || !hasUnsavedChanges}
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              px: 2,
              height: 38,
              borderRadius: 1.5,
              ...(hasUnsavedChanges
                ? {
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#059669' },
                  }
                : {
                    borderColor: '#d1d5db',
                    color: '#6b7280',
                  }),
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <IconButton
            onClick={fetchScheduleData}
            disabled={loading}
            title="Reload Operating Schedule"
            sx={{
              border: '1px solid #e0eae3',
              borderRadius: 1.5,
              width: 38,
              height: 38,
              '&:hover': { bgcolor: '#f9fafb' },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Borderless Navigation Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--border-glow, #e2e8f0)', mb: 3 }}>
        <Tabs
          data-walkthrough="schedule-tabs-nav"
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 42,
            '& .MuiTabs-indicator': {
              backgroundColor: '#10b981',
              height: 2.5,
              borderRadius: '2px 2px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13.5px',
              color: '#64748b',
              minHeight: 42,
              px: 2,
              '&.Mui-selected': {
                color: '#059669',
                fontWeight: 700,
              },
            },
          }}
        >
          <Tab data-walkthrough="schedule-tab-weekly" label="Weekly Pattern" />
          <Tab data-walkthrough="schedule-tab-exceptions" label="Holidays & Overrides" />
          <Tab data-walkthrough="schedule-tab-policies" label="Drift & Emergency Policies" />
        </Tabs>
      </Box>

      {/* TAB 0: Weekly Pattern */}
      {activeTab === 0 && (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid var(--border-glow, #e0eae3)',
            borderRadius: 2,
            p: 3,
            bgcolor: 'var(--card-bg-solid, #fff)',
          }}
        >
          <Box
            data-walkthrough="schedule-presets-toolbar"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                WEEKLY OPERATING DAYS &amp; HOURS
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981' }} />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[
                { key: 'mon_fri' as const, label: 'Mon–Fri (Standard)' },
                { key: 'mon_thu' as const, label: 'Mon & Thu (ABTC)' },
                { key: 'daily' as const, label: 'Daily (7 Days)' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  size="small"
                  variant="outlined"
                  onClick={() => applyPreset(preset.key)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    borderColor: '#d7e3da',
                    borderRadius: 1.5,
                    px: 1.5,
                    '&:hover': { borderColor: '#10b981', color: '#059669', bgcolor: '#ecfdf5' },
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>
          </Box>

          <Box
            data-walkthrough="schedule-weekly-days-list"
            sx={{
              border: '1px solid var(--border-glow, #e2e8f0)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {schedules.map((item, idx) => {
              const dayName = DAY_NAMES[item.day_of_week] || `Day ${item.day_of_week}`;

              return (
                <Box
                  key={item.day_of_week}
                  sx={{
                    px: { xs: 1.5, sm: 2.25 },
                    py: 1.35,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: item.is_open ? '#ffffff' : '#f8fafc',
                    borderBottom: idx < schedules.length - 1 ? '1px solid #eef2f6' : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Switch
                      size="small"
                      checked={item.is_open}
                      disabled={saving}
                      onChange={() => handleToggleDay(item.day_of_week)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' },
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: item.is_open ? '#111827' : '#94a3b8', minWidth: 88 }}>
                      {dayName}
                    </Typography>
                    <Chip
                      size="small"
                      label={item.is_open ? 'Open' : 'Closed'}
                      sx={{
                        height: 22,
                        fontSize: 11,
                        fontWeight: 600,
                        bgcolor: item.is_open ? '#ecfdf5' : '#f1f5f9',
                        color: item.is_open ? '#059669' : '#64748b',
                      }}
                    />
                  </Box>

                  {item.is_open ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, flexWrap: 'wrap' }}>
                      <TextField
                        type="time"
                        size="small"
                        label="Opens"
                        value={item.open_time ? item.open_time.substring(0, 5) : '08:00'}
                        onChange={(e) => handleTimeChange(item.day_of_week, 'open_time', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ ...cleanFieldSx, width: { xs: 'calc(50% - 6px)', sm: 155 } }}
                      />
                      <TextField
                        type="time"
                        size="small"
                        label="Closes"
                        value={item.close_time ? item.close_time.substring(0, 5) : '17:00'}
                        onChange={(e) => handleTimeChange(item.day_of_week, 'close_time', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ ...cleanFieldSx, width: { xs: 'calc(50% - 6px)', sm: 155 } }}
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 13, color: '#94a3b8', textAlign: { xs: 'left', md: 'right' } }}>
                      Closed all day
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* TAB 1: Holidays & Overrides */}
      {activeTab === 1 && (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid var(--border-glow, #e0eae3)',
            borderRadius: 2,
            p: 3,
            bgcolor: 'var(--card-bg-solid, #fff)',
          }}
        >
          <Box
            data-walkthrough="schedule-overrides-header"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                HOLIDAYS &amp; SPECIAL DATE OVERRIDES
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981' }} />
            </Box>
          </Box>

          {/* Section 1: Philippine Regular Holidays Auto-Closure Setting */}
          <Box
            sx={{
              mb: 3,
              p: 2.25,
              borderRadius: 2,
              border: '1px solid',
              borderColor: policies.close_on_ph_holidays ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glow, #e2e8f0)',
              bgcolor: policies.close_on_ph_holidays ? 'rgba(16, 185, 129, 0.04)' : '#f8fafc',
              transition: 'all 0.2s ease',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                    Close on Philippine Regular Holidays
                  </Typography>
                  <Chip
                    size="small"
                    label={policies.close_on_ph_holidays ? 'Auto-Closed' : 'Manual Only'}
                    sx={{
                      height: 20,
                      fontSize: '11px',
                      fontWeight: 600,
                      bgcolor: policies.close_on_ph_holidays ? '#ecfdf5' : '#f1f5f9',
                      color: policies.close_on_ph_holidays ? '#047857' : '#64748b',
                      border: policies.close_on_ph_holidays ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '12.5px', color: '#64748b', mt: 0.5, lineHeight: 1.5 }}>
                  {policies.close_on_ph_holidays
                    ? 'The clinic automatically closes on official Philippine Regular Holidays (shown on the Dashboard calendar and applied to appointment scheduling). You can still add a Special Open override below to stay open on a specific holiday.'
                    : 'Philippine Regular Holidays are not automatically closed. Only the custom date overrides you add below will mark the clinic closed.'}
                </Typography>
              </Box>

              <Switch
                checked={policies.close_on_ph_holidays}
                disabled={saving}
                onChange={(_, checked) => handleTogglePhHolidays(checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' },
                }}
              />
            </Box>

            {policies.close_on_ph_holidays && (
              <Box
                sx={{
                  mt: 2,
                  pt: 1.75,
                  borderTop: '1px solid rgba(16, 185, 129, 0.15)',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, minmax(0, 1fr))' },
                  gap: 1,
                }}
              >
                {getPhilippineRegularHolidays(new Date().getFullYear()).map((h) => {
                  const dt = new Date(`${h.date}T00:00:00`);
                  const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <Box
                      key={h.date}
                      title={`${label} — ${h.name}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.85,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1.5,
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        fontSize: '11.5px',
                        minWidth: 0,
                      }}
                    >
                      <Box component="span" sx={{ fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {label}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          color: '#334155',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h.name}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Section 2: Custom Date Overrides */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                Custom Date Overrides
              </Typography>
              <Chip
                size="small"
                label={exceptions.length}
                sx={{
                  height: 20,
                  minWidth: 24,
                  fontSize: '11px',
                  fontWeight: 700,
                  bgcolor: '#f1f5f9',
                  color: '#475569',
                }}
              />
            </Box>

            <Button
              data-walkthrough="schedule-add-override-btn"
              variant="contained"
              size="small"
              disableElevation
              startIcon={<AddIcon />}
              onClick={() => handleOpenExceptionModal()}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                px: 2,
                height: 36,
                borderRadius: 1.5,
              }}
            >
              Add Date Override
            </Button>
          </Box>

          <Box data-walkthrough="schedule-overrides-list">
            {exceptions.length === 0 ? (
              <Box sx={{ py: 5, px: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <ExceptionIcon sx={{ fontSize: 36, color: '#94a3b8', mb: 1 }} />
                <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>No Custom Date Overrides Configured</Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
                  Add specific dates for local fiestas, weather emergencies, or special open vaccination sessions.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ border: '1px solid var(--border-glow, #e2e8f0)', borderRadius: 2, overflow: 'hidden' }}>
                {exceptions.map((exc, idx) => {
                  const formattedDate = (() => {
                    const dt = new Date(`${exc.exception_date.slice(0, 10)}T00:00:00`);
                    if (Number.isNaN(dt.getTime())) return exc.exception_date;
                    return dt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      weekday: 'short',
                    });
                  })();
                  return (
                    <Box
                      key={exc.id}
                      sx={{
                        px: 2.25,
                        py: 1.75,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        bgcolor: '#ffffff',
                        borderBottom: idx < exceptions.length - 1 ? '1px solid #eef2f6' : 'none',
                        '&:hover': { bgcolor: '#f8fafc' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 3.5,
                            height: 34,
                            borderRadius: 99,
                            bgcolor: exc.is_open ? '#10b981' : '#ef4444',
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                              {formattedDate}
                            </Typography>
                            <Chip
                              size="small"
                              label={exc.is_open ? 'Special Open' : 'Holiday / Closed'}
                              sx={{
                                height: 22,
                                fontSize: 11,
                                fontWeight: 600,
                                bgcolor: exc.is_open ? '#ecfdf5' : '#fef2f2',
                                color: exc.is_open ? '#059669' : '#dc2626',
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: 13, color: '#475569', mt: 0.35 }}>
                            {exc.reason}
                            {exc.is_open && exc.open_time && (
                              <Box component="span" sx={{ color: '#64748b', ml: 1 }}>
                                ({exc.open_time.substring(0, 5)} – {exc.close_time?.substring(0, 5)})
                              </Box>
                            )}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => handleOpenExceptionModal(exc)} title="Edit override" sx={{ color: '#475569' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteException(exc.id)} title="Delete override" sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* TAB 2: Drift & Emergency Policies */}
      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Card 1: Drift Policy */}
          <Paper
            data-walkthrough="schedule-drift-policy-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PEP REGIMEN DATE DRIFT POLICY
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 1.5 }} />
            <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 2.5 }}>
              Controls how scheduled PEP follow-up dates (such as Day 3 and Day 7) shift when they fall on a clinic closure.
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={policies.schedule_drift_policy}
                onChange={(e) => setPolicies({ ...policies, schedule_drift_policy: e.target.value as any })}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
              >
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: policies.schedule_drift_policy === 'forward_only' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    bgcolor: policies.schedule_drift_policy === 'forward_only' ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <FormControlLabel
                    data-walkthrough="schedule-drift-forward-only"
                    value="forward_only"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
                          Forward Only (Next Open Clinic Day) — <Box component="span" sx={{ color: '#059669', fontWeight: 700 }}>Recommended</Box>
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 12.5 }}>
                          Never moves vaccination earlier than the clinical incubation window (e.g., moves a Sunday Day-3 dose to Monday).
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: policies.schedule_drift_policy === 'nearest' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    bgcolor: policies.schedule_drift_policy === 'nearest' ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <FormControlLabel
                    data-walkthrough="schedule-drift-nearest"
                    value="nearest"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
                          Nearest Open Day (Forward or Backward)
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 12.5 }}>
                          Resolves to the closest bookable operating day.
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: policies.schedule_drift_policy === 'backward_within_N_days' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    bgcolor: policies.schedule_drift_policy === 'backward_within_N_days' ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <FormControlLabel
                    data-walkthrough="schedule-drift-backward-window"
                    value="backward_within_N_days"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>Backward within</Typography>
                        <Select
                          size="small"
                          value={policies.backward_max_days}
                          onChange={(e) => setPolicies({ ...policies, backward_max_days: Number(e.target.value) })}
                          sx={{ ...cleanFieldSx, height: 32, width: 68 }}
                        >
                          <MenuItem value={1}>1</MenuItem>
                          <MenuItem value={2}>2</MenuItem>
                          <MenuItem value={3}>3</MenuItem>
                        </Select>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>day(s), then Forward</Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Card 2: Emergency Day-0 Policy */}
          <Paper
            data-walkthrough="schedule-emergency-policy-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              URGENT DAY-0 EXPOSURE POLICY
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 1.5 }} />
            <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 2.5 }}>
              Specify how emergency Day-0 bite walk-ins or mobile bookings are guided when the clinic is closed.
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={policies.urgent_access_policy}
                onChange={(e) => setPolicies({ ...policies, urgent_access_policy: e.target.value as any })}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
              >
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: policies.urgent_access_policy === 'walk_ins_accepted_outside_hours' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    bgcolor: policies.urgent_access_policy === 'walk_ins_accepted_outside_hours' ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <FormControlLabel
                    data-walkthrough="schedule-emergency-er-walkins"
                    value="walk_ins_accepted_outside_hours"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
                          Emergency Walk-ins Accepted 24/7 (via ER Triage Counter)
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 12.5 }}>
                          Patients with fresh bite exposure can proceed directly to the Emergency Room / Triage area anytime.
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: policies.urgent_access_policy === 'refer_to_alternate_facility' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    bgcolor: policies.urgent_access_policy === 'refer_to_alternate_facility' ? '#f0fdf4' : '#ffffff',
                  }}
                >
                  <FormControlLabel
                    data-walkthrough="schedule-emergency-referral"
                    value="refer_to_alternate_facility"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
                          Refer to Alternate Emergency ABTC Facility
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 12.5 }}>
                          Mobile app and online booking will display emergency referral directions and contact numbers.
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Box>
              </RadioGroup>
            </FormControl>

            {policies.urgent_access_policy === 'refer_to_alternate_facility' && (
              <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2 }}>
                  Emergency Referral Facility Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
                      Facility Name
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={policies.urgent_referral_facility_name}
                      onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_name: e.target.value })}
                      placeholder="e.g. Northern Mindanao Medical Center ABTC"
                      sx={cleanFieldSx}
                    />
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
                      Emergency Contact Number
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={policies.urgent_referral_facility_contact}
                      onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_contact: e.target.value })}
                      placeholder="e.g. (088) 856-4147 / 911"
                      sx={cleanFieldSx}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
                      Facility Address
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={policies.urgent_referral_facility_address}
                      onChange={(e) => setPolicies({ ...policies, urgent_referral_facility_address: e.target.value })}
                      placeholder="e.g. Capitol Compound, Cagayan de Oro City"
                      sx={cleanFieldSx}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
                      Patient Instructions (Shown on Mobile App)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      value={policies.urgent_referral_instructions}
                      onChange={(e) => setPolicies({ ...policies, urgent_referral_instructions: e.target.value })}
                      placeholder="e.g. Wash wound immediately with soap and water for 15 minutes. Proceed directly to the ER."
                      sx={cleanFieldSx}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Sticky Save Bar (appears only when Weekly Pattern or Policies have unsaved changes) */}
      {hasUnsavedChanges && (
        <Paper
          elevation={4}
          sx={{
            position: 'sticky',
            bottom: 16,
            zIndex: 30,
            mt: 3,
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            border: '1px solid #a7f3d0',
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#111827' }}>
              Unsaved schedule changes
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDiscard}
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: '#475569',
                borderColor: '#cbd5e1',
                px: 2,
                py: 0.75,
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSaveAllChanges}
              disabled={saving}
              disableElevation
              sx={{
                bgcolor: '#10b981',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
                px: 2.5,
                py: 0.75,
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Exception Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17, pb: 1 }}>
          {editingException ? 'Edit Calendar Override' : 'Add Calendar Override'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
          <TextField
            type="date"
            label="Override Date"
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            size="small"
            value={exceptionForm.exception_date}
            onChange={(e) => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })}
            sx={cleanFieldSx}
          />

          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 1 }}
            >
              Select Override Type
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Paper
                variant="outlined"
                onClick={() => setExceptionForm({ ...exceptionForm, is_open: false })}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderRadius: '10px',
                  borderWidth: 2,
                  borderColor: !exceptionForm.is_open ? '#dc2626' : '#e5e7eb',
                  bgcolor: !exceptionForm.is_open ? '#fef2f2' : '#ffffff',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExceptionIcon sx={{ color: !exceptionForm.is_open ? '#dc2626' : '#9ca3af', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: !exceptionForm.is_open ? '#991b1b' : '#374151' }}>
                      Holiday / Closure
                    </Typography>
                  </Box>
                  <Radio checked={!exceptionForm.is_open} onChange={() => setExceptionForm({ ...exceptionForm, is_open: false })} size="small" sx={{ p: 0, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: !exceptionForm.is_open ? '#7f1d1d' : '#6b7280', lineHeight: 1.4 }}>
                  Clinic is closed all day and bookings are disabled.
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                onClick={() => setExceptionForm({ ...exceptionForm, is_open: true })}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderRadius: '10px',
                  borderWidth: 2,
                  borderColor: exceptionForm.is_open ? '#10b981' : '#e5e7eb',
                  bgcolor: exceptionForm.is_open ? '#ecfdf5' : '#ffffff',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventAvailableIcon sx={{ color: exceptionForm.is_open ? '#10b981' : '#9ca3af', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: exceptionForm.is_open ? '#065f46' : '#374151' }}>
                      Special Open Day
                    </Typography>
                  </Box>
                  <Radio checked={exceptionForm.is_open} onChange={() => setExceptionForm({ ...exceptionForm, is_open: true })} size="small" sx={{ p: 0, color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: exceptionForm.is_open ? '#065f46' : '#6b7280', lineHeight: 1.4 }}>
                  Overrides off-days and enables booking during special hours.
                </Typography>
              </Paper>
            </Box>
          </Box>

          {exceptionForm.is_open ? (
            <Box sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#065f46', display: 'block', mb: 1 }}>
                Special Operating Hours
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  type="time"
                  label="Open Time"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={exceptionForm.open_time}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, open_time: e.target.value })}
                  fullWidth
                  sx={cleanFieldSx}
                />
                <TextField
                  type="time"
                  label="Close Time"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={exceptionForm.close_time}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, close_time: e.target.value })}
                  fullWidth
                  sx={cleanFieldSx}
                />
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ py: 0.5, fontSize: 12.5, bgcolor: '#fef2f2', color: '#991b1b', '& .MuiAlert-icon': { color: '#dc2626' } }}>
              No operating hours required. Patients will not be able to book on this date.
            </Alert>
          )}

          <TextField
            label="Reason / Notes"
            placeholder="e.g. National Heroes Day, Holy Week, Facility Maintenance"
            fullWidth
            size="small"
            value={exceptionForm.reason}
            onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
            sx={cleanFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveException}
            disabled={saving}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 1.5 }}
          >
            {saving ? 'Saving...' : 'Save Override'}
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
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClinicOperatingSchedulePage;
