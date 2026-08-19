import { Box, Chip, Paper, Typography } from '@mui/material';
import { PersonOutlined } from '@mui/icons-material';
import DataTable from '../../../../components/ui/DataTable';
import type { Column } from '../../../../components/ui/DataTable';
import { TablePaginator } from '../../../../components/data-display';
import AppButton from '../../../../components/button';

export interface PatientAccount {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  patients_count: number;
  last_login_at: string | null;
  created_at: string;
}

interface Props {
  accounts: PatientAccount[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  onToggle: (account: PatientAccount) => void;
}

export default function PatientAccountsTab({
  accounts, loading,
  page, rowsPerPage, onPageChange, onRowsPerPageChange,
  onToggle,
}: Props) {
  const paginated = accounts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columns: Column<PatientAccount>[] = [
    {
      key: 'account', label: 'Account',
      render: a => (
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{a.name}</Typography>
          <Typography sx={{ color: '#6b7280', fontSize: 12 }}>{a.email}</Typography>
        </Box>
      ),
    },
    {
      key: 'phone', label: 'Phone',
      render: a => <Typography sx={{ fontSize: 13 }}>{a.phone || '—'}</Typography>,
    },
    {
      key: 'patients', label: 'Linked Patients',
      render: a => (
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
      key: 'last_login', label: 'Last Login',
      render: a => (
        <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
          {a.last_login_at
            ? new Date(a.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Never'}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: a => (
        <Chip size="small" color={a.is_active ? 'success' : 'default'} label={a.is_active ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: a => (
        <AppButton
          variant={a.is_active ? 'danger' : 'primary'}
          style={{ minHeight: 30, padding: '5px 10px' }}
          onClick={() => onToggle(a)}
        >{a.is_active ? 'Deactivate' : 'Activate'}</AppButton>
      ),
    },
  ];

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
      <DataTable
        columns={columns}
        rows={paginated}
        loading={loading}
        getRowKey={a => a.id}
        emptyIcon={<PersonOutlined />}
        emptyTitle="No patient accounts found"
        emptySubtitle="Patient accounts are created via the mobile app"
      />
      <TablePaginator
        count={accounts.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={n => { onRowsPerPageChange(n); onPageChange(0); }}
        rowsPerPageOptions={[15, 25, 50]}
      />
    </Paper>
  );
}
