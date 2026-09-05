import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { Add, Edit, People, Person, Email, Phone, Shield, CheckCircle, PersonOutlined } from '@mui/icons-material';
import api from '../../../services/api';
import DataTable from '../../../components/ui/DataTable';
import type { Column } from '../../../components/ui/DataTable';
import { TablePaginator } from '../../../components/data-display';
import AppButton from '../../../components/button';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import PatientDetailsModal from '../../patients/components/PatientDetailsModal';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserMultiple02Icon,
  Medicine01Icon,
  SmartPhone01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  ViewIcon,
  Stethoscope02Icon,
} from '@hugeicons/core-free-icons';

type Role = 'admin' | 'registration' | 'triage' | 'treatment';
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
}
interface LinkedPatientProfile {
  id: number;
  patient_id?: number;
  patient_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  relationship: string;
  gender: string;
  age?: number;
  date_of_birth: string;
  address?: string;
  contact_number?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  status?: string;
  has_active_case: boolean;
  case_summary?: { case_number: string; category: string; animal: string } | null;
  next_appointment?: { date: string; label: string } | null;
}
interface PatientAccount {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  patients_count: number;
  patients?: LinkedPatientProfile[];
  last_login_at: string | null;
  created_at: string;
}
const roles: Record<Role, string> = {
  admin: 'Administrator',
  registration: 'Registration',
  triage: 'Triage / Doctor',
  treatment: 'Treatment',
};

const ROLE_SOFT_STYLES: Record<Role, { bg: string; color: string; border: string }> = {
  admin:        { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' }, // Soft Lavender Indigo
  registration: { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' }, // Soft Violet
  triage:       { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }, // Soft Sky Blue
  treatment:    { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' }, // Soft Mint Green
};

function SoftRoleChip({ role }: { role: Role }) {
  const style = ROLE_SOFT_STYLES[role] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  return (
    <Chip
      size="small"
      label={roles[role] || role}
      sx={{
        bgcolor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 600,
        fontSize: '11.5px',
        height: '24px',
      }}
    />
  );
}

function SoftStatusChip({ active }: { active: boolean }) {
  return (
    <Chip
      size="small"
      label={active ? 'Active' : 'Inactive'}
      sx={{
        bgcolor: active ? '#ecfdf5' : '#f3f4f6',
        color: active ? '#047857' : '#4b5563',
        border: `1px solid ${active ? '#a7f3d0' : '#e5e7eb'}`,
        fontWeight: 600,
        fontSize: '11.5px',
        height: '24px',
      }}
    />
  );
}

function SoftActionButton({ label, variant, onClick }: { label: string; variant: 'edit' | 'activate' | 'deactivate'; onClick: () => void }) {
  const styles = {
    edit:       { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', hoverBg: '#dcfce7' },
    activate:   { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', hoverBg: '#dbeafe' },
    deactivate: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', hoverBg: '#fee2e2' },
  }[variant];

  return (
    <button
      onClick={onClick}
      style={{
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        borderRadius: '6px',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = styles.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = styles.bg)}
    >
      {label}
    </button>
  );
}

export default function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Tab: 'staff' | 'patients'
  const [activeTab, setActiveTab] = useState<'staff' | 'patients'>('staff');

  // Patient accounts
  const [patientAccounts, setPatientAccounts] = useState<PatientAccount[]>([]);
  const [patientAccountsLoading, setPatientAccountsLoading] = useState(false);
  const [togglePatientTarget, setTogglePatientTarget] = useState<PatientAccount | null>(null);
  const [viewingProfilesAccount, setViewingProfilesAccount] = useState<PatientAccount | null>(null);
  const [selectedViewPatient, setSelectedViewPatient] = useState<any>(null);
  const [showViewPatientModal, setShowViewPatientModal] = useState(false);

  const handleViewPatientDetails = async (patientId: number) => {
    try {
      const res = await api.get(`/patients/${patientId}`);
      if (res.data) {
        setSelectedViewPatient(res.data.patient || res.data);
        setShowViewPatientModal(true);
      }
    } catch {
      navigate(`/patients?openId=${patientId}`);
    }
  };

  // Pagination — staff tab
  const [staffPage, setStaffPage] = useState(0);
  const [staffRowsPerPage, setStaffRowsPerPage] = useState(15);

  // Pagination — patient accounts tab
  const [patientPage, setPatientPage] = useState(0);
  const [patientRowsPerPage, setPatientRowsPerPage] = useState(15);

  // Edit state
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  // Create state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    phone: '',
    role: 'registration',
    is_active: true,
  });
  const [creating, setCreating] = useState(false);

  // Invite state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'registration' as Role,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  // Toggle (activate/deactivate) state
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const [notice, setNotice] = useState('');
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: React.ReactNode } | null>(null);

  const currentUserId = JSON.parse(localStorage.getItem('userData') || '{}').id;

  // Load users
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers((await api.get('/users')).data);
    } catch {
      setNotice('Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const loadPatientAccounts = useCallback(async () => {
    setPatientAccountsLoading(true);
    try {
      setPatientAccounts((await api.get('/patient-accounts')).data);
    } catch {
      setNotice('Unable to load patient accounts.');
    } finally {
      setPatientAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'patients') loadPatientAccounts();
  }, [activeTab, loadPatientAccounts]);

  // Toggle active status
  const toggle = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      setSuccessModal({
        open: true,
        title: user.is_active ? 'User Deactivated' : 'User Activated',
        message: <>User <strong>{user.name}</strong> has been {user.is_active ? 'deactivated' : 'activated'} successfully.</>,
      });
      load();
    } catch {
      setNotice('Unable to update user.');
    }
  };

  // Update existing user
  const save = async () => {
    if (!editing) return;
    const { id, name, email, phone, role, is_active } = editing;
    if (phone && phone.length !== 11) {
      setNotice('Phone number must be exactly 11 digits.');
      return;
    }
    try {
      await api.put(`/users/${id}`, { name, email, phone, role, is_active });
      const updatedName = name;
      setEditing(null);
      setSuccessModal({
        open: true,
        title: 'User Updated',
        message: <>Account details for <strong>{updatedName}</strong> have been updated successfully.</>,
      });
      load();
    } catch {
      setNotice('Unable to update user.');
    }
  };

  // Create new user
  const createUser = async () => {
    if (!newUser.name || !newUser.email) {
      setNotice('Name and email are required.');
      return;
    }
    if (newUser.phone && newUser.phone.length !== 11) {
      setNotice('Phone number must be exactly 11 digits.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/users', newUser);
      const createdName = newUser.name;
      setCreateModalOpen(false);
      setNewUser({ name: '', email: '', phone: '', role: 'registration', is_active: true });
      setSuccessModal({
        open: true,
        title: 'User Created',
        message: <>Staff account for <strong>{createdName}</strong> has been created successfully.</>,
      });
      load();
    } catch {
      setNotice('Unable to create user.');
    } finally {
      setCreating(false);
    }
  };

  // Send invitation
  const sendInvitation = async () => {
    if (!inviteData.email) {
      setNotice('Email is required.');
      return;
    }
    setInviting(true);
    try {
      const response = await api.post('/staff-invitations', inviteData);
      setInviteLink(response.data.invitation_link);
      setSuccessModal({
        open: true,
        title: 'Invitation Sent',
        message: <>Staff invitation email has been dispatched to <strong>{inviteData.email}</strong>.</>,
      });
      load();
    } catch (error: any) {
      setNotice(error.response?.data?.message || 'Unable to send invitation.');
    } finally {
      setInviting(false);
    }
  };


  // Table columns
  const columns: Column<User>[] = [
    {
      key: 'user',
      label: 'User',
      render: (u) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{u.name}</Typography>
          <Typography sx={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Typography>
        </Box>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => <SoftRoleChip role={u.role} />,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (u) => <Typography sx={{ fontSize: 13, color: '#4b5563' }}>{u.phone || '—'}</Typography>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <SoftStatusChip active={u.is_active} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (u) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <SoftActionButton label="Edit" variant="edit" onClick={() => setEditing({ ...u })} />
          {u.id !== currentUserId && (
            <SoftActionButton
              label={u.is_active ? 'Deactivate' : 'Activate'}
              variant={u.is_active ? 'deactivate' : 'activate'}
              onClick={() => setToggleTarget(u)}
            />
          )}
        </Stack>
      ),
    },
  ];

  const shown = users.filter((u) => !filter || u.role === filter);

  // Toggle patient account active status
  const togglePatientAccount = async (account: PatientAccount) => {
    try {
      await api.put(`/patient-accounts/${account.id}/toggle`, {});
      setSuccessModal({
        open: true,
        title: account.is_active ? 'Patient Account Deactivated' : 'Patient Account Activated',
        message: <>Account for <strong>{account.name}</strong> has been {account.is_active ? 'deactivated' : 'activated'} successfully.</>,
      });
      loadPatientAccounts();
    } catch {
      setNotice('Unable to update patient account.');
    }
  };


  // Patient account columns
  const patientColumns: Column<PatientAccount>[] = [
    {
      key: 'account',
      label: 'Account',
      render: (a) => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{a.name}</Typography>
          <Typography sx={{ color: '#6b7280', fontSize: 12 }}>{a.email}</Typography>
        </Box>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (a) => <Typography sx={{ fontSize: 13, color: '#4b5563' }}>{a.phone || '—'}</Typography>,
    },
    {
      key: 'patients',
      label: 'Linked Patients',
      render: (a) => (
        <Chip
          size="small"
          icon={<PersonOutlined fontSize="small" style={{ color: a.patients_count > 0 ? '#047857' : '#6b7280' }} />}
          label={`${a.patients_count} profile${a.patients_count !== 1 ? 's' : ''}`}
          onClick={() => setViewingProfilesAccount(a)}
          title="Click to view linked pre-registered profiles"
          sx={{
            bgcolor: a.patients_count > 0 ? '#ecfdf5' : '#f3f4f6',
            color: a.patients_count > 0 ? '#047857' : '#4b5563',
            border: `1px solid ${a.patients_count > 0 ? '#a7f3d0' : '#e5e7eb'}`,
            fontWeight: 600,
            fontSize: '11.5px',
            height: '24px',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#dcfce7' },
          }}
        />
      ),
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (a) => (
        <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
          {a.last_login_at
            ? new Date(a.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Never'}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => <SoftStatusChip active={a.is_active} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (a) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <SoftActionButton
            label="Profiles"
            variant="edit"
            onClick={() => setViewingProfilesAccount(a)}
          />
          <SoftActionButton
            label={a.is_active ? 'Deactivate' : 'Activate'}
            variant={a.is_active ? 'deactivate' : 'activate'}
            onClick={() => setTogglePatientTarget(a)}
          />
        </Stack>
      ),
    },
  ];

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
            User management
          </Typography>
          <Typography variant="body2" sx={{ color: '#77877d' }}>
            Manage clinic accounts, access roles, and availability.
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Users</span>
          </Box>
        </Box>
        <Stack direction="row" spacing={2}>
          <AppButton
            variant="secondary"
            startIcon={<Email fontSize="small" />}
            onClick={() => setInviteModalOpen(true)}
          >
            Invite Staff
          </AppButton>
          <AppButton
            startIcon={<Add fontSize="small" />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add user
          </AppButton>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 0, mb: 3, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'staff',    label: 'Staff Users',      count: users.length },
          { key: 'patients', label: 'Patient Accounts', count: patientAccounts.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'staff' | 'patients')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit',
              color: activeTab === tab.key ? '#10b981' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {tab.label}
            <span style={{
              background: activeTab === tab.key ? '#ecfdf5' : '#f3f4f6',
              color: activeTab === tab.key ? '#059669' : '#9ca3af',
              borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </Box>

      {/* Staff Users Tab */}
      {activeTab === 'staff' && (
        <Box>
          <Box sx={{ mb: 2, maxWidth: 250 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={filter} onChange={(e) => { setFilter(e.target.value); setStaffPage(0); }}>
                <MenuItem value="">All roles</MenuItem>
                {Object.entries(roles).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <DataTable
              columns={columns}
              rows={shown.slice(staffPage * staffRowsPerPage, staffPage * staffRowsPerPage + staffRowsPerPage)}
              loading={loading}
              getRowKey={(u) => u.id}
              emptyIcon={<People />}
              emptyTitle="No staff users found"
            />
            <TablePaginator
              count={shown.length}
              page={staffPage}
              rowsPerPage={staffRowsPerPage}
              onPageChange={setStaffPage}
              onRowsPerPageChange={(n) => { setStaffRowsPerPage(n); setStaffPage(0); }}
              rowsPerPageOptions={[15, 25, 50]}
            />
          </Box>
        </Box>
      )}

      {/* Patient Accounts Tab */}
      {activeTab === 'patients' && (
        <Box>
          <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <DataTable
              columns={patientColumns}
              rows={patientAccounts.slice(patientPage * patientRowsPerPage, patientPage * patientRowsPerPage + patientRowsPerPage)}
              loading={patientAccountsLoading}
              getRowKey={(a) => a.id}
              emptyIcon={<PersonOutlined />}
              emptyTitle="No patient accounts found"
              emptySubtitle="Patient accounts are created via the mobile app"
            />
            <TablePaginator
              count={patientAccounts.length}
              page={patientPage}
              rowsPerPage={patientRowsPerPage}
              onPageChange={setPatientPage}
              onRowsPerPageChange={(n) => { setPatientRowsPerPage(n); setPatientPage(0); }}
              rowsPerPageOptions={[15, 25, 50]}
            />
          </Box>
        </Box>
      )}

      {/* ========== EDIT USER MODAL ========== */}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit color="primary" />
          Edit user
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Full name"
                  value={editing?.name || ''}
                  onChange={(e) =>
                    setEditing((u) => u && { ...u, name: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editing?.email || ''}
                  onChange={(e) =>
                    setEditing((u) => u && { ...u, email: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editing?.phone || ''}
                  onChange={(e) =>
                    setEditing((u) => u && { ...u, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })
                  }
                  inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={editing?.role || 'registration'}
                    onChange={(e) =>
                      setEditing((u) => u && { ...u, role: e.target.value as Role })
                    }
                    startAdornment={
                      <InputAdornment position="start">
                        <Shield color="action" />
                      </InputAdornment>
                    }
                  >
                    {Object.entries(roles).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={editing?.is_active ?? true}
                  onChange={(e) =>
                    setEditing((u) => u && { ...u, is_active: e.target.checked })
                  }
                  color="primary"
                />
              }
              label={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  {editing?.is_active ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <CheckCircle fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2">
                    {editing?.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <AppButton variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </AppButton>
          <AppButton onClick={() => setConfirmSave(true)}>Save changes</AppButton>
        </DialogActions>
      </Dialog>

      {/* Confirmation for edit save */}
      {confirmSave && editing && (
        <ConfirmationDialog
          variant="confirm"
          title="Save user changes"
          message={
            <>
              Save changes for <strong>{editing.name}</strong>?
            </>
          }
          confirmLabel="Yes, save changes"
          cancelLabel="Go back"
          onConfirm={() => {
            setConfirmSave(false);
            save();
          }}
          onCancel={() => setConfirmSave(false)}
        />
      )}

      {/* ========== CREATE USER MODAL ========== */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add color="primary" />
          Add new user
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Full name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, name: e.target.value }))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, email: e.target.value }))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={newUser.phone}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))
                  }
                  inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((u) => ({ ...u, role: e.target.value as Role }))
                    }
                    startAdornment={
                      <InputAdornment position="start">
                        <Shield color="action" />
                      </InputAdornment>
                    }
                  >
                    {Object.entries(roles).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={newUser.is_active}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, is_active: e.target.checked }))
                  }
                  color="primary"
                />
              }
              label={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  {newUser.is_active ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <CheckCircle fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2">
                    {newUser.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <AppButton
            variant="secondary"
            onClick={() => setCreateModalOpen(false)}
            disabled={creating}
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={createUser}
            disabled={!newUser.name || !newUser.email || creating}
          >
            {creating ? 'Creating…' : 'Create user'}
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Toggle (activate/deactivate) confirmation */}
      {toggleTarget && (
        <ConfirmationDialog
          variant={toggleTarget.is_active ? 'danger' : 'success'}
          title={`${toggleTarget.is_active ? 'Deactivate' : 'Activate'} user`}
          message={
            <>
              Are you sure you want to {toggleTarget.is_active ? 'deactivate' : 'activate'}{' '}
              <strong>{toggleTarget.name}</strong>?
            </>
          }
          confirmLabel={`Yes, ${toggleTarget.is_active ? 'deactivate' : 'activate'}`}
          cancelLabel="Cancel"
          onConfirm={() => {
            toggle(toggleTarget);
            setToggleTarget(null);
          }}
          onCancel={() => setToggleTarget(null)}
        />
      )}

      {/* ========== INVITE STAFF MODAL ========== */}
      <Dialog
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteLink('');
          setInviteData({ email: '', role: 'registration' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email color="primary" />
          Invite Staff via Email
        </DialogTitle>
        <DialogContent dividers>
          {!inviteLink ? (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ fontSize: '13px' }}>
                An invitation email will be sent with a secure link. The staff member can create their own account and set their password.
              </Alert>
              <TextField
                fullWidth
                required
                label="Email Address"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData((d) => ({ ...d, email: e.target.value }))}
                placeholder="staff@example.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData((d) => ({ ...d, role: e.target.value as Role }))}
                  startAdornment={
                    <InputAdornment position="start">
                      <Shield color="action" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="registration">Registration Staff</MenuItem>
                  <MenuItem value="triage">Triage / Doctor</MenuItem>
                  <MenuItem value="treatment">Treatment Staff</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success">
                Invitation sent successfully! The staff member will receive an email with a secure link.
              </Alert>
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                  Invitation Link (for reference):
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-all', 
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#059669'
                  }}
                >
                  {inviteLink}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!inviteLink ? (
            <>
              <AppButton
                variant="secondary"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviting}
              >
                Cancel
              </AppButton>
              <AppButton
                onClick={sendInvitation}
                disabled={!inviteData.email || inviting}
                startIcon={<Email fontSize="small" />}
              >
                {inviting ? 'Sending…' : 'Send Invitation'}
              </AppButton>
            </>
          ) : (
            <AppButton
              onClick={() => {
                setInviteModalOpen(false);
                setInviteLink('');
                setInviteData({ email: '', role: 'registration' });
              }}
            >
              Close
            </AppButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Toggle patient account confirmation */}
      {togglePatientTarget && (
        <ConfirmationDialog
          variant={togglePatientTarget.is_active ? 'danger' : 'success'}
          title={`${togglePatientTarget.is_active ? 'Deactivate' : 'Activate'} patient account`}
          message={
            <>
              Are you sure you want to {togglePatientTarget.is_active ? 'deactivate' : 'activate'}{' '}
              <strong>{togglePatientTarget.name}</strong>'s patient account?
            </>
          }
          confirmLabel={`Yes, ${togglePatientTarget.is_active ? 'deactivate' : 'activate'}`}
          cancelLabel="Cancel"
          onConfirm={() => {
            togglePatientAccount(togglePatientTarget);
            setTogglePatientTarget(null);
          }}
          onCancel={() => setTogglePatientTarget(null)}
        />
      )}

      {/* ========== PRE-REGISTERED PROFILES MODAL ========== */}
      <Dialog
        open={!!viewingProfilesAccount}
        onClose={() => setViewingProfilesAccount(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: '#f0fdf4', color: '#047857', display: 'flex' }}>
              <HugeiconsIcon icon={UserMultiple02Icon} size={22} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
                Pre-Registered Profiles & Household
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Account Owner: <strong>{viewingProfilesAccount?.name}</strong> ({viewingProfilesAccount?.email})
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          {(!viewingProfilesAccount?.patients || viewingProfilesAccount.patients.length === 0) ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
              <HugeiconsIcon icon={SmartPhone01Icon} size={36} />
              <Typography sx={{ fontSize: 14, mt: 1 }}>No patient profiles registered under this mobile account yet.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {viewingProfilesAccount.patients.map((p) => {
                const targetPatientId = p.patient_id || p.id;
                const relationshipUpper = (p.relationship || 'SELF').toUpperCase();
                const relationshipBg =
                  relationshipUpper === 'SELF' ? '#e0e7ff' :
                  relationshipUpper === 'CHILD' ? '#fce7f3' :
                  relationshipUpper === 'SPOUSE' ? '#fef3c7' : '#f1f5f9';
                const relationshipColor =
                  relationshipUpper === 'SELF' ? '#3730a3' :
                  relationshipUpper === 'CHILD' ? '#9d174d' :
                  relationshipUpper === 'SPOUSE' ? '#92400e' : '#475569';

                return (
                  <Box
                    key={`linked-patient-${targetPatientId}`}
                    sx={{
                      p: 2.25,
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', md: 'center' },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                          {[p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')}
                        </Typography>
                        <Chip
                          size="small"
                          label={relationshipUpper}
                          sx={{ fontSize: '10.5px', height: '22px', fontWeight: 700, bgcolor: relationshipBg, color: relationshipColor }}
                        />
                        {p.has_active_case ? (
                          <Chip
                            size="small"
                            icon={<HugeiconsIcon icon={Medicine01Icon} size={13} />}
                            label={p.case_summary ? `In Treatment · ${p.case_summary.category} (${p.case_summary.animal})` : 'In Treatment'}
                            sx={{ fontSize: '11px', height: '22px', fontWeight: 700, bgcolor: '#dcfce7', color: '#166534' }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={<HugeiconsIcon icon={SmartPhone01Icon} size={13} />}
                            label="Pre-Registered (Awaiting Intake)"
                            sx={{ fontSize: '11px', height: '22px', fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }}
                          />
                        )}
                      </Box>

                      <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                          <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                            Patient No: <strong style={{ color: '#0f172a' }}>{p.patient_number || 'Pending Assignment'}</strong>
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                            Gender & Age: <strong style={{ color: '#0f172a' }}>{p.gender} {p.age ? `(${p.age}y)` : ''}</strong> · DOB: {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </Typography>
                          {p.contact_number && (
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                              Contact: <strong style={{ color: '#0f172a' }}>{p.contact_number}</strong>
                            </Typography>
                          )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          {p.address && (
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                              Address: <strong style={{ color: '#0f172a' }}>{p.address}</strong>
                            </Typography>
                          )}
                          {p.emergency_contact_name && (
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                              Emergency: <strong style={{ color: '#0f172a' }}>{p.emergency_contact_name}</strong> {p.emergency_contact_number ? `(${p.emergency_contact_number})` : ''}
                            </Typography>
                          )}
                          {p.next_appointment && (
                            <Typography sx={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>
                              Next Appointment: {p.next_appointment.label} on {p.next_appointment.date}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', alignSelf: { xs: 'stretch', md: 'center' }, justifyContent: { xs: 'flex-end', md: 'flex-start' } }}>
                      <AppButton
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewPatientDetails(targetPatientId)}
                        startIcon={<HugeiconsIcon icon={ViewIcon} size={14} />}
                      >
                        View Profile
                      </AppButton>
                      {!p.has_active_case && (
                        <AppButton
                          size="small"
                          variant="primary"
                          onClick={() => {
                            setViewingProfilesAccount(null);
                            navigate(`/patients?openId=${targetPatientId}&tab=pre_registered`);
                          }}
                          startIcon={<HugeiconsIcon icon={Stethoscope02Icon} size={14} />}
                        >
                          Start Bite Intake
                        </AppButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
          <AppButton variant="secondary" onClick={() => setViewingProfilesAccount(null)}>
            Close
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Patient Details Modal */}
      <PatientDetailsModal
        open={showViewPatientModal}
        patient={selectedViewPatient}
        onClose={() => {
          setShowViewPatientModal(false);
          setSelectedViewPatient(null);
        }}
        onEdit={(patient) => {
          setShowViewPatientModal(false);
          navigate(`/patients?openId=${patient.patient_id || patient.id}`);
        }}
      />

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
    </Box>
  );
}
