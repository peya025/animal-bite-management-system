import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Alert, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { staffApi } from '../../../services/staffApi';
import { ROUTES } from '../../../shared/config/routes';
import type { StaffUser, AssignedModule } from '../../../types';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

export type StationDesk = 
  | 'station_1' 
  | 'station_2' 
  | 'dual_station' 
  | 'registration_desk' 
  | 'doctor_consultation' 
  | 'admin_all';

interface StationOption {
  value: StationDesk;
  label: string;
  badgeLabel: string;
  backendModule: AssignedModule;
  allowedRoles: string[];
  color: string;
  bg: string;
  border: string;
}

const STATION_OPTIONS: StationOption[] = [
  {
    value: 'station_1',
    label: 'Station 1 · Day 0 Intake',
    badgeLabel: 'Station 1 · Day 0',
    backendModule: 'treatment',
    allowedRoles: ['treatment'],
    color: '#0369a1',
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
  {
    value: 'station_2',
    label: 'Station 2 · Follow-up Doses',
    badgeLabel: 'Station 2 · Follow-up',
    backendModule: 'treatment',
    allowedRoles: ['treatment'],
    color: '#047857',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    value: 'dual_station',
    label: 'Dual Station · Solo Nurse',
    badgeLabel: 'Dual Station (Solo Nurse)',
    backendModule: 'treatment',
    allowedRoles: ['treatment'],
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
  },
  {
    value: 'doctor_consultation',
    label: 'Doctor Consultation',
    badgeLabel: 'Doctor Consultation',
    backendModule: 'triage',
    allowedRoles: ['triage', 'doctor'],
    color: '#6d28d9',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    value: 'registration_desk',
    label: 'Registration Desk',
    badgeLabel: 'Registration Desk',
    backendModule: 'registration',
    allowedRoles: ['registration'],
    color: '#475569',
    bg: '#f8fafc',
    border: '#cbd5e1',
  },
  {
    value: 'admin_all',
    label: 'Clinic Administrator',
    badgeLabel: 'Clinic Administrator',
    backendModule: 'all',
    allowedRoles: ['admin', 'developer'],
    color: '#334155',
    bg: '#f1f5f9',
    border: '#cbd5e1',
  },
];

// Helper to determine the professional role qualification & scope
interface RoleInfo {
  title: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  icon: React.ReactNode;
  scope: string;
  licenseLabel?: string;
}

function getProfessionalRoleInfo(user: StaffUser): RoleInfo {
  const role = user.role;
  const rolesSlugs = (user.roles || []).map((r: any) => r.slug || r);

  if (role === 'treatment' || rolesSlugs.includes('intake_nurse') || rolesSlugs.includes('follow_up_nurse')) {
    return {
      title: 'Registered Nurse',
      badgeBg: '#f0fdf4',
      badgeColor: '#166534',
      badgeBorder: '#bbf7d0',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m12 14 4-4" />
          <path d="m3.34 19 1.4-1.4" />
          <path d="m6 16.5-1.5-1.5" />
          <path d="m19 5-1.5-1.5" />
          <path d="m14 2 4 4" />
          <path d="m8.5 14 7-7" />
          <path d="m14.5 20.5 6-6" />
        </svg>
      ),
      scope: 'Authorized for vaccine administration, Rabies PEP & RIG injections',
      licenseLabel: user.professional_license_no || 'PRC Nurse License',
    };
  }

  if (role === 'triage' || rolesSlugs.includes('doctor')) {
    return {
      title: 'Physician / Doctor',
      badgeBg: '#f8fafc',
      badgeColor: '#4338ca',
      badgeBorder: '#c7d2fe',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      scope: 'Authorized for clinical evaluation, bite exposure grading & PEP prescription',
      licenseLabel: user.professional_license_no || 'MD Medical License',
    };
  }

  if (role === 'registration' || rolesSlugs.includes('receptionist')) {
    return {
      title: 'Registration Staff',
      badgeBg: '#f8fafc',
      badgeColor: '#334155',
      badgeBorder: '#e2e8f0',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      scope: 'Authorized for patient registration, queue ticketing & demographic verification',
    };
  }

  if (role === 'admin' || rolesSlugs.includes('clinic_admin')) {
    return {
      title: 'Administrator',
      badgeBg: '#f8fafc',
      badgeColor: '#1e293b',
      badgeBorder: '#cbd5e1',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      scope: 'Authorized for facility setup, user management, audit logs & clinic configuration',
    };
  }

  return {
    title: 'Lead Developer',
    badgeBg: '#f8fafc',
    badgeColor: '#475569',
    badgeBorder: '#e2e8f0',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    scope: 'Technical development & system debugging',
  };
}

// Helper to determine the initial station desk from user roles / assigned_module
function getInitialStationDesk(user: StaffUser): StationDesk {
  const role = user.role;
  const rolesSlugs = (user.roles || []).map((r: any) => r.slug || r);
  const hasIntake = rolesSlugs.includes('intake_nurse');
  const hasFollowUp = rolesSlugs.includes('follow_up_nurse');

  if (role === 'treatment') {
    if (hasIntake && hasFollowUp) return 'dual_station';
    if (hasIntake) return 'station_1';
    if (hasFollowUp) return 'station_2';
    if (user.assigned_module === 'treatment') return 'station_1';
    return 'dual_station';
  }

  if (role === 'triage' || rolesSlugs.includes('doctor')) {
    return 'doctor_consultation';
  }

  if (role === 'registration' || rolesSlugs.includes('receptionist')) {
    return 'registration_desk';
  }

  if (role === 'admin' || role === 'developer' || rolesSlugs.includes('clinic_admin')) {
    return 'admin_all';
  }

  return 'station_1';
}

function getOptionsForUser(user: StaffUser): StationOption[] {
  const role = user.role;
  if (role === 'treatment') {
    return STATION_OPTIONS.filter(o => o.allowedRoles.includes('treatment'));
  }
  if (role === 'triage') {
    return STATION_OPTIONS.filter(o => o.allowedRoles.includes('triage'));
  }
  if (role === 'registration') {
    return STATION_OPTIONS.filter(o => o.allowedRoles.includes('registration'));
  }
  if (role === 'admin' || role === 'developer') {
    return STATION_OPTIONS.filter(o => o.allowedRoles.includes('admin'));
  }
  return STATION_OPTIONS;
}

export default function StaffAssignmentPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [stationAssignments, setStationAssignments] = useState<Record<number, StationDesk>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: React.ReactNode } | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffApi.getAllStaff();
      setStaff(data);

      const initialMap: Record<number, StationDesk> = {};
      data.forEach(user => {
        initialMap[user.id] = getInitialStationDesk(user);
      });
      setStationAssignments(initialMap);
    } catch (error: any) {
      showNotification('error', error.response?.data?.message || 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleStationChange = async (userId: number, newDesk: StationDesk) => {
    try {
      setSaving(userId);
      const stationConfig = STATION_OPTIONS.find(s => s.value === newDesk);
      const backendModule = stationConfig?.backendModule || 'all';

      // Call backend API (UI is safely synced with existing backend endpoint)
      await staffApi.updateAssignedModule(userId, backendModule);

      // Update local state
      setStationAssignments(prev => ({
        ...prev,
        [userId]: newDesk,
      }));

      const member = staff.find(s => s.id === userId);
      setSuccessModal({
        open: true,
        title: 'Workstation Assignment Saved',
        message: (
          <>
            <strong>{member?.name || 'Staff member'}</strong> is now assigned to{' '}
            <strong style={{ color: '#047857' }}>
              {stationConfig?.label || newDesk}
            </strong>.
          </>
        ),
      });
    } catch (error: any) {
      showNotification('error', error.response?.data?.message || 'Failed to update station assignment');
    } finally {
      setSaving(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter staff by search
  const filteredStaff = staff.filter(s => {
    const assignedDesk = stationAssignments[s.id] || getInitialStationDesk(s);
    const deskConfig = STATION_OPTIONS.find(o => o.value === assignedDesk);
    const roleInfo = getProfessionalRoleInfo(s);

    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleInfo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deskConfig?.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate Station Coverage
  const activeStaff = staff.filter(s => s.is_active !== false);

  const station1Staff = activeStaff.filter(s => {
    const desk = stationAssignments[s.id] || getInitialStationDesk(s);
    return desk === 'station_1' || desk === 'dual_station';
  });

  const station2Staff = activeStaff.filter(s => {
    const desk = stationAssignments[s.id] || getInitialStationDesk(s);
    return desk === 'station_2' || desk === 'dual_station';
  });

  const doctorStaff = activeStaff.filter(s => {
    const desk = stationAssignments[s.id] || getInitialStationDesk(s);
    return desk === 'doctor_consultation';
  });

  // Calm summary cards
  const summaryCards = [
    {
      title: 'TOTAL ON DUTY',
      value: activeStaff.length,
      statusText: `${staff.length} registered total`,
      isAssigned: activeStaff.length > 0,
      iconSvg: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: 'STATION 1 (DAY 0)',
      value: station1Staff.length > 0 ? 'Assigned' : 'Vacant',
      statusText: station1Staff.length > 0 
        ? `${station1Staff.length} nurse${station1Staff.length > 1 ? 's' : ''} on duty` 
        : '⚠️ No nurse assigned',
      isAssigned: station1Staff.length > 0,
      iconSvg: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 14 4-4" />
          <path d="m3.34 19 1.4-1.4" />
          <path d="m6 16.5-1.5-1.5" />
          <path d="m19 5-1.5-1.5" />
          <path d="m14 2 4 4" />
          <path d="m8.5 14 7-7" />
          <path d="m14.5 20.5 6-6" />
        </svg>
      ),
    },
    {
      title: 'STATION 2 (FOLLOW-UP)',
      value: station2Staff.length > 0 ? 'Assigned' : 'Vacant',
      statusText: station2Staff.length > 0 
        ? `${station2Staff.length} nurse${station2Staff.length > 1 ? 's' : ''} on duty` 
        : '⚠️ No nurse assigned',
      isAssigned: station2Staff.length > 0,
      iconSvg: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      title: 'DOCTOR ON DUTY',
      value: doctorStaff.length > 0 ? 'Present' : 'Not present',
      statusText: doctorStaff.length > 0 
        ? `${doctorStaff.length} doctor active` 
        : '⚠️ No doctor present',
      isAssigned: doctorStaff.length > 0,
      iconSvg: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading daily station roster...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <Typography
            component="h1"
            sx={{
              fontSize: '22px',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Staff Workstation Assignments
          </Typography>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Staff Assignments</span>
          </div>
        </div>
      </div>

      {/* Coverage Alert */}
      {(station1Staff.length === 0 || station2Staff.length === 0) && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 500,
            border: '1px solid #fed7aa',
            backgroundColor: '#fff7ed',
            color: '#9a3412',
            '& .MuiAlert-icon': { color: '#ea580c' },
          }}
        >
          <strong>Station Coverage Alert:</strong>{' '}
          {station1Staff.length === 0 && station2Staff.length === 0
            ? 'Both Station 1 and Station 2 currently have no assigned nurses.'
            : station1Staff.length === 0
            ? 'Station 1 (Day 0 / New Cases) has no assigned nurse on duty.'
            : 'Station 2 (Follow-up Doses) has no assigned nurse on duty.'}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        {summaryCards.map(card => {
          const isWarning = !card.isAssigned && card.title !== 'TOTAL ON DUTY';

          return (
            <Paper
              key={card.title}
              elevation={0}
              sx={{
                p: '12px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
                minHeight: 74,
                ...(isDark
                  ? {
                      background: '#111827',
                      border: `1px solid ${isWarning ? 'rgba(234, 88, 12, 0.4)' : 'rgba(16, 185, 129, 0.2)'}`,
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                    }
                  : {
                      background: '#ffffff',
                      border: `1px solid ${isWarning ? '#fdba74' : '#e2e8f0'}`,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }),
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  bgcolor: isWarning 
                    ? 'rgba(234, 88, 12, 0.1)' 
                    : isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: isWarning ? '#ea580c' : '#047857',
                  border: `1px solid ${isWarning ? 'rgba(234, 88, 12, 0.25)' : '#d1fae5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {card.iconSvg}
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isDark ? '#9ca3af' : '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: "'Poppins', sans-serif",
                    margin: 0,
                  }}
                >
                  {card.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: typeof card.value === 'number' ? 20 : 15,
                    fontWeight: 700,
                    color: isWarning 
                      ? '#ea580c' 
                      : (isDark ? '#ffffff' : '#0f172a'),
                    margin: '1px 0',
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: 1.15,
                  }}
                >
                  {card.value}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: isWarning ? '#c2410c' : (isDark ? '#a7f3d0' : '#047857'),
                    fontFamily: "'Poppins', sans-serif",
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {card.statusText}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Search Input */}
      <div style={styles.searchContainer}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={styles.searchIcon}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search staff by name, email, professional role, or workstation..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
            ×
          </button>
        )}
      </div>

      {/* Table Container */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '22%' }}>Staff Member</th>
              <th style={{ ...styles.th, width: '20%' }}>Email</th>
              <th style={{ ...styles.th, width: '18%' }}>Professional Role</th>
              <th style={{ ...styles.th, width: '16%' }}>Assigned Workstation</th>
              <th style={{ ...styles.th, width: '7%' }}>Status</th>
              <th style={{ ...styles.th, width: '17%' }}>Assign Workstation</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyCell}>
                  {searchTerm ? 'No staff members match your search' : 'No staff members found'}
                </td>
              </tr>
            ) : (
              filteredStaff.map(member => {
                const currentDesk = stationAssignments[member.id] || getInitialStationDesk(member);
                const currentConfig = STATION_OPTIONS.find(o => o.value === currentDesk) || STATION_OPTIONS[0];
                const roleInfo = getProfessionalRoleInfo(member);
                const isUserActive = member.is_active !== false;
                const availableOptions = getOptionsForUser(member);

                return (
                  <tr key={member.id} style={styles.tr}>
                    {/* Staff Member (Avatar, Name, Phone) */}
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {member.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.name}>{member.name}</div>
                          {member.phone && (
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.2 }}>
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={styles.td}>
                      <span style={styles.email}>{member.email}</span>
                    </td>

                    {/* Professional Role */}
                    <td style={styles.td}>
                      <Tooltip title={roleInfo.scope} arrow placement="top">
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                          <span
                            style={{
                              ...styles.roleBadge,
                              backgroundColor: roleInfo.badgeBg,
                              color: roleInfo.badgeColor,
                              border: `1px solid ${roleInfo.badgeBorder}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'help',
                            }}
                          >
                            {roleInfo.icon}
                            <span>{roleInfo.title}</span>
                          </span>
                          {roleInfo.licenseLabel && (
                            <span style={{ fontSize: '10.5px', color: '#64748b', paddingLeft: '2px', fontWeight: 500 }}>
                              {roleInfo.licenseLabel}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </td>

                    {/* Assigned Workstation */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.moduleBadge,
                          backgroundColor: currentConfig.bg,
                          color: currentConfig.color,
                          border: `1px solid ${currentConfig.border}`,
                        }}
                      >
                        {currentConfig.badgeLabel}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={styles.td}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isUserActive ? '#047857' : '#94a3b8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isUserActive ? '#10b981' : '#94a3b8',
                          }}
                        />
                        {isUserActive ? 'On Duty' : 'Inactive'}
                      </span>
                    </td>

                    {/* Change Workstation Dropdown */}
                    <td style={styles.td}>
                      <select
                        value={currentDesk}
                        onChange={e => handleStationChange(member.id, e.target.value as StationDesk)}
                        disabled={saving === member.id || !isUserActive}
                        style={{
                          ...styles.select,
                          opacity: isUserActive ? 1 : 0.6,
                          cursor: isUserActive ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {availableOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Roster & Role Guide */}
      <div style={styles.infoBox}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#047857"
          strokeWidth="2"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#047857', fontSize: '12.5px' }}>
            Workstation Assignment Reference:
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', marginTop: '6px' }}>
            <div style={styles.guideCard}>
              <strong style={{ color: '#047857', fontSize: '11.5px' }}>💉 Registered Nurse:</strong>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Gives anti-rabies shots. Assign to <strong>Station 1</strong> (Day 0 shots), <strong>Station 2</strong> (Follow-up shots), or <strong>Dual</strong> (Both).
              </div>
            </div>
            <div style={styles.guideCard}>
              <strong style={{ color: '#4338ca', fontSize: '11.5px' }}>🩺 Physician / Doctor:</strong>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Assigned to <strong>Doctor Consultation</strong> to examine animal bites, assess risk, and prescribe vaccines.
              </div>
            </div>
            <div style={styles.guideCard}>
              <strong style={{ color: '#334155', fontSize: '11.5px' }}>🏢 Registration Staff:</strong>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Assigned to <strong>Registration Desk</strong> to encode patient details and issue queue numbers.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            ...styles.notification,
            backgroundColor: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
            borderLeft: `4px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={notification.type === 'success' ? '#10b981' : '#ef4444'}
            strokeWidth="2"
          >
            {notification.type === 'success' ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          <span
            style={{
              color: notification.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '12.5px',
              fontWeight: 500,
            }}
          >
            {notification.message}
          </span>
          <button onClick={() => setNotification(null)} style={styles.notificationClose}>
            ×
          </button>
        </div>
      )}

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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Poppins', sans-serif",
    padding: '0 0 20px 0',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    flexDirection: 'column',
    gap: '14px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '13px',
  },
  header: {
    marginBottom: '14px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '14px',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 32px 8px 34px',
    fontSize: '12.5px',
    fontFamily: "'Poppins', sans-serif",
    border: '1px solid var(--input-border, #e2e8f0)',
    borderRadius: '7px',
    backgroundColor: 'var(--input-bg, #ffffff)',
    color: 'var(--input-text, #0f172a)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '2px 4px',
    lineHeight: 1,
  },
  tableContainer: {
    backgroundColor: 'var(--card-bg-solid, #ffffff)',
    borderRadius: '10px',
    border: '1px solid var(--border-glow, #e2e8f0)',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    marginBottom: '16px',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'auto',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: 'var(--table-header-bg, #f8fafc)',
    borderBottom: '1px solid var(--border-glow, #e2e8f0)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-glow, #f1f5f9)',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '10px 12px',
    fontSize: '12.5px',
    color: 'var(--text-b, #334155)',
    verticalAlign: 'middle',
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#047857',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11.5px',
    fontWeight: 700,
    flexShrink: 0,
  },
  name: {
    fontWeight: 600,
    color: 'var(--text-h, #0f172a)',
    fontSize: '12.5px',
    lineHeight: 1.2,
  },
  email: {
    color: '#64748b',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  roleBadge: {
    padding: '2px 7px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  moduleBadge: {
    padding: '3px 8px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  select: {
    width: '100%',
    minHeight: '32px',
    padding: '5px 22px 5px 8px',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.3,
    fontFamily: "'Poppins', sans-serif",
    border: '1px solid var(--input-border, #cbd5e1)',
    borderRadius: '6px',
    backgroundColor: 'var(--input-bg, #ffffff)',
    color: 'var(--input-text, #1e293b)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  infoBox: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#334155',
  },
  guideCard: {
    background: '#ffffff',
    padding: '7px 9px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  notification: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 1000,
    minWidth: '260px',
  },
  notificationClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
    opacity: 0.6,
  },
};
