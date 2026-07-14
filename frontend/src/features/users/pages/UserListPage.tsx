// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { Add, Edit, People } from '@mui/icons-material';
import api from '../../../services/api';
import DataTable from '../../../components/ui/DataTable';
import type { Column } from '../../../components/ui/DataTable';
import AppButton from '../../../components/button';

type Role = 'admin' | 'registration' | 'triage' | 'treatment';
interface User { id: number; name: string; email: string; phone?: string; role: Role; is_active: boolean; }
const roles: Record<Role, string> = { admin: 'Administrator', registration: 'Registration', triage: 'Triage / Doctor', treatment: 'Treatment' };

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState(''); const [editing, setEditing] = useState<User | null>(null); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setUsers((await api.get('/users')).data); } catch { setNotice('Unable to load users.'); } finally { setLoading(false); } }, []); useEffect(() => { load(); }, [load]);
  const toggle = async (user: User) => { try { await api.put(`/users/${user.id}`, { is_active: !user.is_active }); setNotice(`User ${user.is_active ? 'deactivated' : 'activated'}.`); load(); } catch { setNotice('Unable to update user.'); } };
  const save = async () => { if (!editing) return; const { id, name, email, phone, role, is_active } = editing; try { await api.put(`/users/${id}`, { name, email, phone, role, is_active }); setEditing(null); setNotice('User updated successfully.'); load(); } catch { setNotice('Unable to update user.'); } };
  const currentUserId = JSON.parse(localStorage.getItem('userData') || '{}').id;
  const columns: Column<User>[] = [
    { key: 'user', label: 'User', render: u => <Box><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{u.name}</Typography><Typography sx={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Typography></Box> },
    { key: 'role', label: 'Role', render: u => <Chip size="small" label={roles[u.role]} color={u.role === 'admin' ? 'primary' : 'default'} /> },
    { key: 'phone', label: 'Phone', render: u => <Typography sx={{ fontSize: 13 }}>{u.phone || '—'}</Typography> },
    { key: 'status', label: 'Status', render: u => <Chip size="small" color={u.is_active ? 'success' : 'default'} label={u.is_active ? 'Active' : 'Inactive'} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: u => <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}><AppButton variant="secondary" style={{ minHeight: 30, padding: '5px 10px' }} startIcon={<Edit fontSize="small" />} onClick={() => setEditing({ ...u })}>Edit</AppButton>{u.id !== currentUserId && <AppButton variant={u.is_active ? 'danger' : 'primary'} style={{ minHeight: 30, padding: '5px 10px' }} onClick={() => toggle(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</AppButton>}</Stack> },
  ];
  const shown = users.filter(u => !filter || u.role === filter);
  return <Box sx={{ px: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 700 }}>User management</Typography><Typography variant="body2" color="text.secondary">Manage clinic accounts, access roles, and availability.</Typography></Box><AppButton startIcon={<Add fontSize="small" />} onClick={() => window.location.href = '/users/create'}>Add user</AppButton></Box>
    <Box><Box sx={{ mb: 2, maxWidth: 250 }}><FormControl size="small" fullWidth><InputLabel>Role</InputLabel><Select label="Role" value={filter} onChange={e => setFilter(e.target.value)}><MenuItem value="">All roles</MenuItem>{Object.entries(roles).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Box><DataTable columns={columns} rows={shown} loading={loading} getRowKey={u => u.id} emptyIcon={<People />} emptyTitle="No users found" /></Box>
    <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth><DialogTitle>Edit user</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Full name" value={editing?.name || ''} onChange={e => setEditing(u => u && { ...u, name: e.target.value })} /><TextField label="Email" type="email" value={editing?.email || ''} onChange={e => setEditing(u => u && { ...u, email: e.target.value })} /><TextField label="Phone" value={editing?.phone || ''} onChange={e => setEditing(u => u && { ...u, phone: e.target.value })} /><FormControl><InputLabel>Role</InputLabel><Select label="Role" value={editing?.role || 'registration'} onChange={e => setEditing(u => u && { ...u, role: e.target.value as Role })}>{Object.entries(roles).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl></Stack></DialogContent><DialogActions><AppButton variant="secondary" onClick={() => setEditing(null)}>Cancel</AppButton><AppButton onClick={save}>Save changes</AppButton></DialogActions></Dialog><Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice('')}><Alert severity={notice.includes('Unable') ? 'error' : 'success'} onClose={() => setNotice('')}>{notice}</Alert></Snackbar></Box>;
}
