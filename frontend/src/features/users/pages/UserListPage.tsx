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

type Role = 'admin' | 'registration' | 'triage' | 'treatment';
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
}
interface PatientAccount {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  patients_count: number;
  last_login_at: string | null;
  created_at: string;
}
const roles: Record<Role, string> = {
  admin: 'Administrator',
  registration: 'Registration',
  triage: 'Triage / Doctor',
  treatment: 'Treatment',
};

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Tab: 'staff' | 'patients'
  const [activeTab, setActiveTab] = useState<'staff' | 'patients'>('staff');

  // Patient accounts
  const [patientAccounts, setPatientAccounts] = useState<PatientAccount[]>([]);
  const [patientAccountsLoading, setPatientAccountsLoading] = useState(false);
  const [togglePatientTarget, setTogglePatientTarget] = useState<PatientAccount | null>(null);

  // Pagination — staff tab
  const [staffPage, setStaffPage] = useState(0);
  const [staffRowsPerPage, setStaffRowsPerPage] = useState(10);

  // Pagination — patient accounts tab
  const [patientPage, setPatientPage] = useState(0);
  const [patientRowsPerPage, setPatientRowsPerPage] = useState(10);

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
      setNotice(`User ${user.is_active ? 'deactivated' : 'activated'}.`);
      load();
    } catch {
      setNotice('Unable to update user.');
    }
  };

  // Update existing user
  const save = async () => {
    if (!editing) return;
    const { id, name, email, phone, role, is_active } = editing;
    try {
      await api.put(`/users/${id}`, { name, email, phone, role, is_active });
      setEditing(null);
      setNotice('User updated successfully.');
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
    setCreating(true);
    try {
      await api.post('/users', newUser);
      setCreateModalOpen(false);
      setNewUser({ name: '', email: '', phone: '', role: 'registration', is_active: true });
      setNotice('User created successfully.');
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
      setNotice('Invitation sent successfully!');
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
      render: (u) => (
        <Chip
          size="small"
          label={roles[u.role]}
          color={u.role === 'admin' ? 'primary' : 'default'}
        />
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (u) => <Typography sx={{ fontSize: 13 }}>{u.phone || '—'}</Typography>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => (
        <Chip
          size="small"
          color={u.is_active ? 'success' : 'default'}
          label={u.is_active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (u) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <AppButton
            variant="secondary"
            style={{ minHeight: 30, padding: '5px 10px' }}
            startIcon={<Edit fontSize="small" />}
            onClick={() => setEditing({ ...u })}
          >
            Edit
          </AppButton>
          {u.id !== currentUserId && (
            <AppButton
              variant={u.is_active ? 'danger' : 'primary'}
              style={{ minHeight: 30, padding: '5px 10px' }}
              onClick={() => setToggleTarget(u)}
            >
              {u.is_active ? 'Deactivate' : 'Activate'}
            </AppButton>
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
      setNotice(`Patient account ${account.is_active ? 'deactivated' : 'activated'}.`);
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
      render: (a) => <Typography sx={{ fontSize: 13 }}>{a.phone || '—'}</Typography>,
    },
    {
      key: 'patients',
      label: 'Linked Patients',
      render: (a) => (
        <Chip
          size="small"
          icon={<PersonOutlined fontSize="small" />}
          label={`${a.patients_count} patient${a.patients_count !== 1 ? 's' : ''}`}
          variant="outlined"
          color={a.patients_count > 0 ? 'success' : 'default'}
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
      render: (a) => (
        <Chip size="small" color={a.is_active ? 'success' : 'default'} label={a.is_active ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (a) => (
        <AppButton
          variant={a.is_active ? 'danger' : 'primary'}
          style={{ minHeight: 30, padding: '5px 10px' }}
          onClick={() => setTogglePatientTarget(a)}
        >
          {a.is_active ? 'Deactivate' : 'Activate'}
        </AppButton>
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
          <Typography variant="h5" sx={{ color: '#173d29', mb: '7px' }}>
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
              rowsPerPageOptions={[5, 10, 25]}
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
              rowsPerPageOptions={[5, 10, 25]}
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
                    setEditing((u) => u && { ...u, phone: e.target.value })
                  }
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
                    setNewUser((u) => ({ ...u, phone: e.target.value }))
                  }
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
