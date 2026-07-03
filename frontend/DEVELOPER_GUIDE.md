# Developer Guide — Import Cheat Sheet

Quick reference for new developers joining the project.

---

## Import Paths

### Shared Utilities

```ts
// Date helpers
import { formatDate, formatWaitTime, daysUntil, calcAge, getDayGreeting } from '../../shared/utils';

// Formatting helpers
import { capitalize, getInitials, formatFullName, pluralize } from '../../shared/utils';

// Validation helpers
import { required, email, phoneNumber, validate } from '../../shared/utils';
```

### Shared Hooks

```ts
import { useDebounce }     from '../../shared/hooks';
import { usePagination }   from '../../shared/hooks';
import { useFilters }      from '../../shared/hooks';
import { useSnackbar }     from '../../shared/hooks';
import { useAsync }        from '../../shared/hooks';
import { useLocalStorage } from '../../shared/hooks';
```

### Types

```ts
import type {
  User, Patient, QueueEntry, InventoryItem,
  BiteIncident, VaccinationSchedule,
} from '../../shared/types';

import type { ApiResponse, PaginatedResponse } from '../../shared/types';
```

### Routes

```ts
import { ROUTES, buildRoute } from '../../shared/config/routes';

navigate(ROUTES.PATIENTS.LIST);
navigate(buildRoute(ROUTES.PATIENTS.DETAILS, { id: 42 }));
```

### API

```ts
import api from '../../services/api';       // from a feature file
import api from '../../../services/api';    // from a feature sub-component
```

### Auth

```ts
import { useAuth } from '../../contexts/AuthContext';

const { user, clinic, logout, isAuthenticated } = useAuth();
```

---

## UI Components

### DataTable

```tsx
import { DataTable, EmptyState, TablePaginator } from '../../components/data-display';
import type { ColumnDef } from '../../components/data-display';

const columns: ColumnDef<MyType>[] = [
  {
    key: 'name',
    header: 'Name',
    render: row => <Typography>{row.name}</Typography>,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: row => <IconButton onClick={() => handleEdit(row)}>...</IconButton>,
  },
];

<DataTable
  columns={columns}
  rows={items}
  loading={loading}
  rowKey={item => item.id}
  emptyIcon={<PersonIcon />}
  emptyTitle="No records found"
  emptySubtitle="Add one to get started"
  emptyAction={{ label: 'Add', onClick: () => setOpen(true) }}
/>
```

### EmptyState (standalone)

```tsx
import { EmptyState } from '../../components/data-display';

<EmptyState
  icon={<VaccineIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
  title="No vaccine batches"
  subtitle="Add your first batch to get started"
  action={{ label: 'Add Stock', onClick: () => setOpen(true) }}
/>
```

### StatCard

```tsx
import StatCard from '../../components/common/StatCard';

<StatCard
  label="Total Patients"
  value={stats?.total ?? '-'}
  icon={<PeopleIcon />}
  color="primary"
  loading={!stats}
/>
```

### ConfirmationDialog

```tsx
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';

{showConfirm && (
  <ConfirmationDialog
    variant="danger"           // 'confirm' | 'warning' | 'danger' | 'success'
    title="Delete Record"
    message={<>Delete <strong>{item.name}</strong>? This cannot be undone.</>}
    confirmLabel="Yes, Delete"
    cancelLabel="Cancel"
    onConfirm={handleDelete}
    onCancel={() => setShowConfirm(false)}
  />
)}
```

### useSnackbar

```tsx
import { useSnackbar } from '../../shared/hooks';

const { snackbar, toast, closeSnackbar } = useSnackbar();

// Trigger
toast('Saved successfully!');
toast('Something went wrong', 'error');

// JSX
<Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
  <Alert severity={snackbar.severity} variant="filled" onClose={closeSnackbar}>
    {snackbar.message}
  </Alert>
</Snackbar>
```

---

## Role Reference

| Role constant | String value | Label |
|---|---|---|
| `ROLES.ADMIN` | `'admin'` | Administrator |
| `ROLES.REGISTRATION` | `'registration'` | Registration Staff |
| `ROLES.TRIAGE` | `'triage'` | Triage/Doctor Staff |
| `ROLES.TREATMENT` | `'treatment'` | Treatment Recording Staff |

```ts
import { ROLES, ROLE_LABELS } from '../../shared/config/constants';
```

---

## Route Reference

```
/                          Landing page (public)
/login                     Login (public)
/dashboard                 Dashboard (all roles)
/patients                  Patient list (registration, triage, treatment)
/queue                     Queue dashboard (registration, triage)
/inventory                 Vaccine inventory (admin)
/vaccinations              Vaccination schedules (admin, triage, treatment)
/bite-cases                Bite case list (admin, triage, treatment)
/users                     User management (admin)
/setup                     Setup wizard (admin)
/setup/clinic-info         Clinic information (admin)
/setup/templates           Predefined templates (admin)
/setup/vaccination-schedules  Vaccination schedule config (admin)
```
