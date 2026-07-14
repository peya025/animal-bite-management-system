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
import { Add, Edit, People, Person, Email, Phone, Shield, CheckCircle } from '@mui/icons-material';
import api from '../../../services/api';
import DataTable from '../../../components/ui/DataTable';
import type { Column } from '../../../components/ui/DataTable';
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

  return (
    <Box sx={{ px: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
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
        </Box>
        <AppButton
          startIcon={<Add fontSize="small" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Add user
        </AppButton>
      </Box>

      {/* Filter and Table */}
      <Box>
        <Box sx={{ mb: 2, maxWidth: 250 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="">All roles</MenuItem>
              {Object.entries(roles).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <DataTable
          columns={columns}
          rows={shown}
          loading={loading}
          getRowKey={(u) => u.id}
          emptyIcon={<People />}
          emptyTitle="No users found"
        />
      </Box>

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
