import { Box, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { Edit, People } from '@mui/icons-material';
import DataTable from '../../../../components/ui/DataTable';
import type { Column } from '../../../../components/ui/DataTable';
import { TablePaginator } from '../../../../components/data-display';
import AppButton from '../../../../components/button';

type Role = 'admin' | 'registration' | 'triage' | 'treatment';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  admin:        'Administrator',
  registration: 'Registration',
  triage:       'Triage / Doctor',
  treatment:    'Treatment',
};

interface Props {
  users: StaffUser[];
  loading: boolean;
  currentUserId: number;
  filter: string;
  onFilterChange: (value: string) => void;
  page: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  onEdit: (user: StaffUser) => void;
  onToggle: (user: StaffUser) => void;
}

export default function StaffUsersTab({
  users, loading, currentUserId,
  filter, onFilterChange,
  page, rowsPerPage, onPageChange, onRowsPerPageChange,
  onEdit, onToggle,
}: Props) {
  const filtered  = users.filter(u => !filter || u.role === filter);
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columns: Column<StaffUser>[] = [
    {
      key: 'user', label: 'User',
      render: u => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{u.name}</Typography>
          <Typography sx={{ color: '#6b7280', fontSize: 12 }}>{u.email}</Typography>
        </Box>
      ),
    },
    {
      key: 'role', label: 'Role',
      render: u => (
        <Chip size="small" label={ROLE_LABELS[u.role]} color={u.role === 'admin' ? 'primary' : 'default'} />
      ),
    },
    {
      key: 'phone', label: 'Phone',
      render: u => <Typography sx={{ fontSize: 13 }}>{u.phone || '—'}</Typography>,
    },
    {
      key: 'status', label: 'Status',
      render: u => (
        <Chip size="small" color={u.is_active ? 'success' : 'default'} label={u.is_active ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: u => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <AppButton
            variant="secondary"
            style={{ minHeight: 30, padding: '5px 10px' }}
            startIcon={<Edit fontSize="small" />}
            onClick={() => onEdit(u)}
          >Edit</AppButton>
          {u.id !== currentUserId && (
            <AppButton
              variant={u.is_active ? 'danger' : 'primary'}
              style={{ minHeight: 30, padding: '5px 10px' }}
              onClick={() => onToggle(u)}
            >{u.is_active ? 'Deactivate' : 'Activate'}</AppButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 2, maxWidth: 250 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Role</InputLabel>
          <Select label="Role" value={filter} onChange={e => { onFilterChange(e.target.value); onPageChange(0); }}>
            <MenuItem value="">All roles</MenuItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          rows={paginated}
          loading={loading}
          getRowKey={u => u.id}
          emptyIcon={<People />}
          emptyTitle="No staff users found"
        />
        <TablePaginator
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={n => { onRowsPerPageChange(n); onPageChange(0); }}
          rowsPerPageOptions={[15, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
