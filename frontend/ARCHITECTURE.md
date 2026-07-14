# Frontend Architecture

> Animal Bite Treatment Center (ABTC) Management System  
> Last updated: July 3, 2026 — post Phase 1–8 refactor

---

## Table of Contents

1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [Features](#features)
4. [Shared Layer](#shared-layer)
5. [Component Library](#component-library)
6. [Routing](#routing)
7. [Styling](#styling)
8. [State Management](#state-management)
9. [API Layer](#api-layer)
10. [Adding New Features](#adding-new-features)

---

## Overview

The frontend is a **React 18 + TypeScript + Vite** application using **Material UI (MUI v6)** for
components and styling. It follows a **feature-based architecture** — all code related to a domain
(patients, queue, inventory, etc.) lives together in `src/features/<name>/`.

Cross-feature utilities, types, hooks, services, and configuration live in `src/shared/`.
Reusable UI components that are domain-agnostic live in `src/components/`.

---

## Folder Structure

```
frontend/src/
│
├── App.tsx                   # Root component — router + route definitions
├── main.tsx                  # Vite entry point
│
├── assets/                   # Static images and icons
│
├── components/               # Domain-agnostic reusable UI
│   ├── common/
│   │   └── StatCard/         # Metric card with optional donut chart
│   ├── data-display/
│   │   ├── DataTable.tsx     # Generic paginated table with skeletons
│   │   ├── EmptyState.tsx    # Empty/zero-data placeholder
│   │   ├── TablePager.tsx    # MUI TablePagination footer
│   │   └── TablePaginator.tsx# Custom page-pill paginator
│   ├── feedback/
│   │   └── ConfirmationDialog/ # Reusable confirm/warn/danger modal
│   ├── forms/
│   │   └── FormModal/        # Reusable form modal wrapper
│   ├── Layout/
│   │   └── DashboardLayout.tsx # Sidebar + topbar shell for authed pages
│   └── Loader/               # Full-page loading spinner
│
├── features/                 # Feature modules (10 total)
│   ├── auth/
│   ├── patients/
│   ├── queue/
│   ├── inventory/
│   ├── vaccinations/
│   ├── bite-cases/
│   ├── dashboard/
│   ├── clinic-setup/
│   ├── users/
│   └── reports/
│
├── pages/                    # Public / error pages (no auth required)
│   ├── LandingPage.tsx
│   ├── NotFound.tsx
│   └── Unauthorized.tsx
│
├── shared/                   # Cross-feature utilities
│   ├── config/
│   │   ├── routes.ts         # ROUTES constants + buildRoute()
│   │   └── constants.ts      # Re-exports from src/constants
│   ├── contexts/
│   │   └── AuthContext.tsx   # AuthProvider + useAuth hook
│   ├── hooks/                # 6 custom hooks (see Shared Layer)
│   ├── services/
│   │   ├── api.ts            # Axios instance (auth token + 401 redirect)
│   │   └── auth.service.ts   # Login / logout / register
│   ├── types/
│   │   ├── api.types.ts      # ApiResponse, PaginatedResponse, ApiError
│   │   └── common.types.ts   # All domain model interfaces
│   └── utils/
│       ├── date.ts           # formatDate, formatWaitTime, daysUntil, …
│       ├── formatting.ts     # capitalize, getInitials, formatPhone, …
│       └── validation.ts     # required, email, phoneNumber, …
│
└── styles/
    ├── theme.ts              # MUI ThemeProvider configuration
    ├── global.css            # Global resets and base styles
    └── *.styles.ts           # MUI `styled` component files per feature
```

---

## Features

Each feature lives at `src/features/<name>/` with a consistent internal structure:

```
features/<name>/
├── components/   # UI components specific to this feature
├── hooks/        # Custom hooks specific to this feature
├── pages/        # Route-level page components
│   └── index.ts  # Barrel export
├── services/     # API calls specific to this feature
├── styles/       # MUI styled components for this feature
├── types/        # Feature-local type extensions (or re-exports from shared)
└── index.ts      # Top-level barrel export
```

### Feature Map

| Feature | Route | Roles |
|---|---|---|
| `auth` | `/login` | Public |
| `dashboard` | `/dashboard` | All |
| `patients` | `/patients` | Registration, Triage, Treatment |
| `queue` | `/queue` | Registration, Triage |
| `inventory` | `/inventory` | Admin |
| `vaccinations` | `/vaccinations` | Admin, Triage, Treatment |
| `bite-cases` | `/bite-cases` | Admin, Triage, Treatment |
| `clinic-setup` | `/setup/*` | Admin |
| `users` | `/users` | Admin |
| `reports` | `/reports` | Admin |

---

## Shared Layer

### Hooks (`shared/hooks/`)

| Hook | Purpose |
|---|---|
| `useDebounce(value, delay?)` | Delays a value update — use for search inputs |
| `usePagination(initialRows?)` | MUI 0-indexed page + rowsPerPage state |
| `useFilters(initial)` | Generic key/value filter record with `activeFilters` |
| `useSnackbar()` | MUI Snackbar state + `toast(msg, severity?)` helper |
| `useAsync(fn)` | loading / error / data state + `execute()` |
| `useLocalStorage(key, initial)` | useState persisted to localStorage |

### Utils (`shared/utils/`)

**date.ts** — `formatDate`, `formatDateLong`, `formatDateFull`, `formatTime`,
`formatDateTime`, `formatWaitTime`, `daysUntil`, `calcAge`, `getDayGreeting`, `isExpiringSoon`

**formatting.ts** — `capitalize`, `toTitleCase`, `formatFullName`, `formatPhone`,
`pluralize`, `formatNumber`, `truncate`, `getInitials`

**validation.ts** — `required`, `minLength`, `maxLength`, `email`, `phoneNumber`,
`passwordStrength`, `passwordMatch`, `notFutureDate`, `notPastDate`, `positiveInt`,
`nonNegative`, `validate`

### Types (`shared/types/`)

All domain interfaces are in `common.types.ts` — import from there instead of defining them inline:

```ts
import type { Patient, QueueEntry, InventoryItem, User } from '../../shared/types';
```

---

## Routing

All routes are defined in `shared/config/routes.ts` as the `ROUTES` constant.
**Never use hardcoded strings** — always reference `ROUTES.*`.

```ts
import { ROUTES, buildRoute } from '../../shared/config/routes';

// Navigate
navigate(ROUTES.PATIENTS.LIST);

// Dynamic param
navigate(buildRoute(ROUTES.PATIENTS.DETAILS, { id: patient.id }));
```

Route definitions in `App.tsx` use `<Route path={ROUTES.X}>` — changing a URL
requires editing one line in `routes.ts`.

---

## Styling

- **MUI Theme** — configured in `styles/theme.ts`, applied via `<ThemeProvider>` in `main.tsx`
- **`sx` prop** — for short, one-off styles inline on MUI components
- **MUI `styled()`** — for reusable or complex responsive styles; saved as `*.styles.ts` files
- **CSS files** — only `styles/global.css` remains; all component CSS was migrated to MUI

---

## State Management

No global state library. State is managed at the closest relevant level:

- **Local component state** — `useState` for UI state (modals, filters, form fields)
- **Auth state** — `AuthContext` / `useAuth()` hook (token, user, clinic)
- **Server state** — direct `api.*` calls inside `useCallback` + `useEffect`
- **Persistence** — `useLocalStorage` for user preferences

---

## API Layer

The Axios instance at `shared/services/api.ts` handles:
- Base URL from `VITE_API_BASE_URL` env var (default `http://localhost:8000/api`)
- Automatic `Authorization: Bearer <token>` header injection
- 401 → clears storage and redirects to `/login`

Usage:
```ts
import api from '../../services/api'; // shim → shared/services/api

const res = await api.get('/patients', { params: { page: 1, per_page: 10 } });
const res = await api.post('/queue/1/call');
```

---

## Adding New Features

1. Create `src/features/<name>/` with the standard subdirectory structure
2. Add domain types to `shared/types/common.types.ts`
3. Add routes to `shared/config/routes.ts`
4. Add the `<Route>` to `App.tsx` using `ROUTES.<NAME>`
5. Add the nav item to `DashboardLayout.tsx` `NAV_ITEMS` array
6. Use `DataTable` + `EmptyState` + `TablePaginator` for list pages
7. Use `useSnackbar` for notifications, `useDebounce` for search inputs
8. Import `ConfirmationDialog` for destructive action confirmations
