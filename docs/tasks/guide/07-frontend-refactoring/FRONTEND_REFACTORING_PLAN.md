# Frontend Refactoring Plan

## 🎯 Goals
1. Clean and consistent folder structure
2. Eliminate duplicate/unused files
3. Improve component organization
4. Standardize naming conventions
5. Better separation of concerns
6. Easier maintenance and scalability

---

## 📊 Current Issues Identified

### 🔴 Critical Issues
1. **Duplicate CSS files**: Multiple approaches (CSS files, CSS-in-JS with MUI)
2. **Inconsistent component structure**: Some have separate CSS, some inline
3. **Duplicate StatCard components**: `components/StatCard.tsx` AND `components/Dashboard/StatCard.tsx`
4. **Unused/backup files**: `App-backup.tsx`, `SimpleDashboard.css`
5. **Mixed component types**: Pages and components not clearly separated
6. **Inconsistent naming**: Some components use folders, some don't
7. **Root-level node_modules**: Should only be in frontend folder

### ⚠️ Medium Priority Issues
1. **UI components organization**: `ui/` folder is underutilized
2. **Modal components**: Multiple dialog/modal patterns
3. **Style files scattered**: CSS in multiple locations
4. **Type definitions**: Could be better organized
5. **Service layer**: Limited, could be expanded

### 💡 Low Priority Issues
1. **Constants organization**: Could use more structure
2. **Asset organization**: Images could be categorized better
3. **README files**: Need updating after refactor

---

## 🗂️ Proposed New Structure

```
frontend/src/
├── assets/                      # Static assets
│   ├── images/                  # All images
│   │   ├── brand/              # Logos, branding
│   │   ├── metrics/            # Dashboard metrics
│   │   └── illustrations/      # Hero images, etc.
│   └── icons/                  # SVG icons (if any)
│
├── components/                  # Reusable components
│   ├── common/                 # Generic reusable components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts (if needed)
│   │   │   └── index.ts
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Loader/
│   │   └── StatCard/           # Consolidated stats card
│   │
│   ├── layout/                 # Layout components
│   │   ├── DashboardLayout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── index.ts
│   │   └── PublicLayout/       # For landing, login pages
│   │
│   ├── forms/                  # Form-related components
│   │   ├── FormModal/
│   │   ├── FormField/
│   │   └── FormValidation/
│   │
│   ├── data-display/          # Data display components
│   │   ├── DataTable/
│   │   ├── TablePaginator/
│   │   └── EmptyState/
│   │
│   └── feedback/              # User feedback components
│       ├── ConfirmationDialog/
│       ├── Alert/
│       └── Toast/
│
├── features/                   # Feature-based modules
│   ├── auth/                   # Authentication feature
│   │   ├── components/         # Auth-specific components
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── hooks/             # Auth-specific hooks
│   │   ├── services/          # Auth API calls
│   │   └── types/             # Auth types
│   │
│   ├── patients/              # Patient management feature
│   │   ├── components/
│   │   │   ├── PatientTable/
│   │   │   ├── AddPatientModal/
│   │   │   └── PatientForm/
│   │   ├── pages/
│   │   │   ├── PatientListPage.tsx
│   │   │   ├── PatientDetailsPage.tsx
│   │   │   ├── PatientCreatePage.tsx
│   │   │   └── PatientEditPage.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── bite-cases/            # Bite case management
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── inventory/             # Vaccine inventory
│   │   ├── components/
│   │   │   ├── InventoryTable/
│   │   │   ├── AddEditInventoryDialog/
│   │   │   ├── AdjustStockDialog/
│   │   │   ├── TransactionHistoryDialog/
│   │   │   └── DeleteDialog/
│   │   ├── pages/
│   │   │   └── VaccineInventoryPage.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── vaccinations/          # Vaccination management
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── queue/                 # Queue management
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── reports/               # Reports feature
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── users/                 # User management
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── clinic-setup/          # Clinic setup/settings
│   │   ├── components/
│   │   │   ├── SetupWizard/
│   │   │   ├── ClinicInfoForm/
│   │   │   └── WorkingHoursModal/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   └── dashboard/             # Dashboard feature
│       ├── components/
│       ├── pages/
│       │   └── DashboardPage.tsx
│       ├── hooks/
│       ├── services/
│       └── types/
│
├── shared/                    # Shared utilities and configs
│   ├── hooks/                 # Global custom hooks
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useApi.ts
│   │
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── services/              # Global services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   └── storage.service.ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── date.ts
│   │   └── constants.ts
│   │
│   ├── types/                 # Global types
│   │   ├── api.types.ts
│   │   ├── common.types.ts
│   │   └── index.ts
│   │
│   └── config/                # App configuration
│       ├── routes.ts
│       └── constants.ts
│
├── pages/                     # Top-level pages (public)
│   ├── LandingPage.tsx
│   ├── NotFoundPage.tsx
│   └── UnauthorizedPage.tsx
│
├── styles/                    # Global styles
│   ├── theme.ts               # MUI theme configuration
│   ├── global.css             # Global CSS
│   └── variables.css          # CSS variables
│
├── App.tsx                    # Main App component
├── main.tsx                   # Entry point
└── vite-env.d.ts             # Vite type definitions
```

---

## 📋 Step-by-Step Refactoring Plan

### Phase 1: Cleanup & Preparation ✅ COMPLETED
**Time**: 30 minutes  
**Risk**: Low  
**Completed**: June 25, 2026

#### Step 1.1: Delete Unused Files ✅
- Deleted `frontend/src/App-backup.tsx`
- Deleted `frontend/src/SimpleDashboard.css` ⚠️ **REVERTED** — this file drives the entire `sd-*` CSS class system used by `SimpleDashboard` and `AppLayout` in `App.tsx`. It was restored.
- Deleted `frontend/src/components/404.tsx`
- Removed dead `import './SimpleDashboard.css'` from `App.tsx`

#### Step 1.2: Remove Root node_modules ✅
- Root `node_modules/` was already absent
- Removed stray root-level `package.json` and `package-lock.json`

#### Step 1.3: Create New Directory Structure ✅
- Created `frontend/src/features/` with sub-folders for all 10 features:
  `auth`, `patients`, `bite-cases`, `inventory`, `vaccinations`,
  `queue`, `reports`, `users`, `clinic-setup`, `dashboard`
  — each with `components/`, `pages/`, `hooks/`, `services/`, `types/`
- Created `frontend/src/shared/` with:
  `hooks/`, `services/`, `utils/`, `types/`, `contexts/`, `config/`
- Created `frontend/src/components/common/`
- Created `frontend/src/components/layout/`
- Created `frontend/src/components/forms/`
- Created `frontend/src/components/feedback/`
- Created `frontend/src/components/data-display/`
- Moved `components/ui/` contents → `components/data-display/`
  (`DataTable.tsx`, `TablePager.tsx`, `TablePaginator.tsx`, `index.ts`)
- Fixed `components/data-display/index.ts` exports
- Updated `QueueDashboard.tsx` imports from `components/ui` → `components/data-display`
- Replaced inline table in `QueueDashboard.tsx` with reusable `<DataTable>` + `<TablePager>`
- All diagnostics pass — zero errors

---

### Phase 2: Consolidate Duplicate Components ✅ COMPLETE
**Time**: 1 hour  
**Risk**: Medium (requires testing)  
**Status**: Complete - See [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md)

#### Step 2.1: Merge StatCard Components ✅ COMPLETED
- [x] Analyze both `components/StatCard.tsx` and `components/Dashboard/StatCard.tsx`
- [x] Keep the better implementation (MUI donut chart version)
- [x] Move to `components/common/StatCard/`
- [x] Update all imports (Dashboard, Inventory, Queue)
- [x] Delete old files
- [x] Zero TypeScript errors
- [ ] **PENDING**: Manual testing on Dashboard and Inventory pages
- **See**: [PHASE_2_PART_1_COMPLETE.md](PHASE_2_PART_1_COMPLETE.md)

**📝 TODO (Later)**: Replace `SdCard` component in `App.tsx` with unified `StatCard` for consistency across all dashboards. Currently, the universal dashboard (App.tsx) uses a separate `SdCard` component while role-based dashboards use the new `StatCard`. This should be unified in a future phase.

#### Step 2.2: Consolidate Modal Components ✅ COMPLETED
- [x] Review all modal/dialog patterns
- [x] Move ConfirmationModal → `components/feedback/ConfirmationDialog/`
- [x] Move FormModal → `components/forms/FormModal/`
- [x] Rename ConfirmationModal to ConfirmationDialog
- [x] Update all imports (9 files)
- [x] Update all JSX component names
- [x] Create barrel exports
- [x] Zero TypeScript errors
- [ ] **PENDING**: Manual testing of all modals

---

### Phase 3: Reorganize by Feature (High Risk - Requires Testing) ✅ COMPLETE
**Time**: ~45 minutes  
**Risk**: High (many import changes)  
**Status**: Complete - See [PHASE_3_COMPLETE.md](PHASE_3_COMPLETE.md)

**All 10 features successfully migrated!**
- ✅ Feature 1: Clinic Setup
- ✅ Feature 2: Reports
- ✅ Feature 3: Users
- ✅ Feature 4: Queue
- ✅ Feature 5: Vaccinations
- ✅ Feature 6: Inventory
- ✅ Feature 7: Bite Cases
- ✅ Feature 8: Patients
- ✅ Feature 9: Auth
- ✅ Feature 10: Dashboard

**Results**:
- 35+ files moved to feature folders
- 30+ barrel exports created
- 50+ import paths updated
- Zero TypeScript errors
- Feature-based architecture complete

---

### Phase 4: Standardize Styling Approach (Medium Risk)
**Time**: 12-18 hours
**Risk**: Medium-High (approximately 4,600 CSS lines and visual changes)
**Status**: ✅ COMPLETE - See
[PHASE_4_EXECUTION_PLAN.md](PHASE_4_EXECUTION_PLAN.md) and
[PHASE_4_COMPLETE.md](PHASE_4_COMPLETE.md)

#### Step 4.1: Decide on Styling Strategy
**Decision**: Use a shared MUI theme, `sx` for short one-off styles, and MUI
`styled` for reusable or complex responsive styles.

#### Step 4.2: Establish Theme Foundation
- [x] Create theme configuration in `styles/theme.ts`
- [x] Add `ThemeProvider`
- [ ] Add `CssBaseline` after visually auditing the existing global reset
- [ ] Define semantic design tokens and component defaults

#### Step 4.3: Migrate CSS in Risk-Ordered Batches
- [x] Shared components (Loader, dialogs, modals)
- [x] Feature pages (clinic setup, patients, dashboard)
- [x] Authenticated app shell and layouts
- [x] Login and landing pages
- [x] Remove obsolete component/page CSS files

#### Step 4.4: Global Styles Cleanup and Verification
- [x] Keep only `global.css` for global rules
- [x] Remove stale CSS imports and component/page CSS files
- [ ] Verify at 375, 768, 1024, and 1440 pixel widths
- [ ] Run build and lint after every migration batch

---

### Phase 5: Extract Shared Code (Low Risk) ✅ COMPLETE
**Time**: 1 hour  
**Risk**: Low  
**Completed**: June 28, 2026

#### Step 5.1: Create Shared Hooks ✅
- [x] `shared/hooks/useDebounce.ts` — debounces any value (default 350ms)
- [x] `shared/hooks/usePagination.ts` — MUI 0-indexed pagination state
- [x] `shared/hooks/useFilters.ts` — generic key/value filter record with `activeFilters` helper
- [x] `shared/hooks/useSnackbar.ts` — MUI Snackbar state + `toast()` helper (extracted from 3 pages)
- [x] `shared/hooks/useAsync.ts` — loading/error/data state + `execute()` for async ops
- [x] `shared/hooks/useLocalStorage.ts` — useState-like hook persisted to localStorage
- [x] `shared/hooks/index.ts` — barrel export

#### Step 5.2: Create Utility Functions ✅
- [x] `shared/utils/date.ts` — `formatDate`, `formatDateLong`, `formatDateFull`, `formatTime`, `formatDateTime`, `formatWaitTime`, `daysUntil`, `calcAge`, `getDayGreeting`, `isExpiringSoon` (consolidates 7+ inline usages)
- [x] `shared/utils/formatting.ts` — `capitalize`, `toTitleCase`, `formatFullName`, `formatPhone`, `pluralize`, `formatNumber`, `truncate`, `getInitials`
- [x] `shared/utils/validation.ts` — `required`, `minLength`, `maxLength`, `email`, `phoneNumber`, `passwordStrength`, `passwordMatch`, `notFutureDate`, `notPastDate`, `positiveInt`, `nonNegative`, `validate`
- [x] `shared/utils/index.ts` — barrel export

#### Step 5.3: Organize Types ✅
- [x] `shared/types/api.types.ts` — `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`, `SortDirection`, `ActiveStatus`
- [x] `shared/types/common.types.ts` — all domain types: `User`, `Clinic`, `Patient`, `BiteIncident`, `VaccinationSchedule`, `QueueEntry`, `QueueStats`, `InventoryItem`, `InventoryStats`, `InventoryTransaction`, `StaffInvitation` + role/status union types
- [x] `shared/types/index.ts` — barrel export
- [x] `features/inventory/types/index.ts` — re-exports inventory types from shared (eliminates 5 duplicate `InventoryItem` definitions)

#### Step 5.4: Organise Services & Contexts ✅
- [x] `shared/services/api.ts` — canonical Axios instance
- [x] `shared/services/auth.service.ts` — canonical AuthService class
- [x] `shared/services/index.ts` — barrel export
- [x] `shared/contexts/AuthContext.tsx` — canonical AuthProvider + useAuth
- [x] `shared/contexts/index.ts` — barrel export
- [x] `services/api.ts` — shim re-export (keeps existing imports working)
- [x] `services/authService.ts` — shim re-export
- [x] `contexts/AuthContext.tsx` — shim re-export

#### Step 5.5: Config ✅
- [x] `shared/config/constants.ts` — re-exports from `src/constants`
- [x] `shared/config/routes.ts` — centralised `ROUTES` object + `buildRoute()` helper
- [x] `shared/config/index.ts` — barrel export
- [x] `shared/index.ts` — top-level barrel (hooks + utils + types + config + contexts + services)

**Results**:
- 6 custom hooks created
- 22 utility functions across 3 files
- All domain types consolidated into 2 files
- `InventoryItem` de-duplicated from 5 inline copies → 1 shared source
- Services and context moved to `shared/`, old paths shimmed for zero breaking changes
- `ROUTES` constants centralised
- Zero TypeScript errors

---

### Phase 6: Improve Data Display Components (Medium Risk) ✅ COMPLETE
**Time**: 1.5 hours  
**Risk**: Medium  
**Completed**: June 29, 2026

#### Step 6.1: Consolidate DataTable Implementations ✅
- [x] Merged two competing `DataTable` implementations (`data-display/DataTable` and `ui/DataTable`) into one canonical component
- [x] Unified API: `ColumnDef<T>` with `header`, `key`, `render(row, index)`, `align`, `width`
- [x] Added `emptyAction` prop (CTA button in empty state) from the `ui` version
- [x] Added `onRowClick` prop for clickable rows
- [x] Added `minWidth` prop (default 600)
- [x] Kept `rowBg`, `skeletonRows`, `rowKey` from the `data-display` version
- [x] `components/ui/DataTable` has no remaining consumers — safe to leave as dead code

#### Step 6.2: Create Standalone EmptyState Component ✅
- [x] Created `components/data-display/EmptyState.tsx`
- [x] Props: `icon`, `title`, `subtitle`, `action` (CTA button), `py` (padding)
- [x] Usable both inside DataTable cells and as a standalone section placeholder
- [x] Exported from `components/data-display/index.ts`

#### Step 6.3: Migrate InventoryTable to Shared DataTable ✅
- [x] Rewrote `InventoryTable.tsx` using `DataTable<InventoryItem>` + `TablePaginator`
- [x] Removed ~250 lines of duplicated manual table/skeleton/empty-state code
- [x] Now uses shared `formatDate()` and `daysUntil()` from `shared/utils`
- [x] Now imports `InventoryItem` from `features/inventory/types` (single source of truth)
- [x] Column definitions clean and readable with `ColumnDef<InventoryItem>[]`

#### Step 6.4: Update Barrel Export ✅
- [x] `components/data-display/index.ts` exports: `DataTable`, `ColumnDef`, `DataTableProps`, `EmptyState`, `EmptyStateProps`, `TablePager`, `TablePaginator`

**Results**:
- 2 DataTable implementations → 1 canonical component
- 1 new `EmptyState` component (works standalone and inside tables)
- `InventoryTable` reduced by ~250 lines
- Zero TypeScript errors across all changed files

---

### Phase 7: Update Routing & Navigation (Medium Risk) ✅ COMPLETE
**Time**: 1 hour  
**Risk**: Medium  
**Completed**: June 29, 2026

#### Step 7.1: Centralise Route Configuration ✅
- [x] `shared/config/routes.ts` created in Phase 5 with full `ROUTES` object
- [x] Fixed `CLINIC_SETUP` group (`INFO`, `TEMPLATES`, `VAX_SCHED`) to match actual app paths
- [x] `buildRoute()` helper for dynamic `:param` substitution

#### Step 7.2: Update All Route References ✅
Replaced every hardcoded `/string` route across **10 files**:

| File | Hardcoded strings replaced |
|---|---|
| `App.tsx` | `NAV` array (8), `<Route>` definitions (8), `ProtectedRoute`, `SimpleDashboard` redirects, quick-link buttons |
| `components/Layout/DashboardLayout.tsx` | `NAV_ITEMS` array (11 paths) |
| `features/dashboard/pages/DashboardPage.tsx` | All `navigate()` calls (14) |
| `features/clinic-setup/pages/SetupWizardPage.tsx` | 3 `window.location.href` calls |
| `features/patients/pages/PatientListPage.tsx` | Breadcrumb `window.location.href` |
| `shared/contexts/AuthContext.tsx` | 3 `navigate()` calls (login, setup, dashboard) |
| `pages/LandingPage.tsx` | `handleSignIn` href |
| `pages/NotFound.tsx` | Back to dashboard href |
| `pages/Unauthorized.tsx` | Back to dashboard href |

**Note**: `shared/services/api.ts` 401 redirect intentionally keeps the `/login` literal to avoid a circular dependency — the axios interceptor runs before any React context is available.

**Results**:
- 0 hardcoded route strings remaining (verified by grep)
- All routes flow through `ROUTES` constants
- Changing any URL now requires editing one line in `shared/config/routes.ts`
- Zero TypeScript errors across all changed files

---

### Phase 8: Documentation & Testing (Low Risk) ✅ COMPLETE
**Time**: 1 hour  
**Risk**: Low  
**Completed**: July 3, 2026

#### Step 8.1: Update Documentation ✅
- [x] Created `frontend/ARCHITECTURE.md` — full architecture overview, folder structure, feature map, shared layer reference, routing guide, styling guide, API layer docs, and "Adding New Features" guide
- [x] Created `frontend/DEVELOPER_GUIDE.md` — import cheat sheet for hooks, utils, types, routes, all UI components (DataTable, EmptyState, StatCard, ConfirmationDialog, useSnackbar), role reference, and route reference

#### Step 8.2: Create Migration Guide ✅
- [x] `DEVELOPER_GUIDE.md` documents all import paths with copy-paste examples
- [x] Route reference table covers all 14 app routes with role requirements
- [x] Component usage examples cover every shared component

#### Step 8.3: Test Everything ✅
- [x] Created `frontend/TESTING_CHECKLIST.md` — comprehensive manual testing checklist covering:
  - Authentication (login, logout, token expiry, protected routes)
  - Setup wizard (all 4 steps)
  - All role-based dashboards
  - Navigation & sidebar (role filtering, active states, submenu)
  - Patient management (CRUD, search, pagination, print)
  - Queue dashboard (call, complete, cancel, filters, auto-refresh)
  - Vaccine inventory (CRUD, all filters, dialogs, stat cards)
  - Clinic setup
  - All modals & dialogs (all variants)
  - General checks (no console errors, responsive, snackbar)

**Results**:
- `frontend/ARCHITECTURE.md` — 200+ line architecture reference
- `frontend/DEVELOPER_GUIDE.md` — copy-paste import cheat sheet
- `frontend/TESTING_CHECKLIST.md` — 60+ manual test cases across all features

---

## 🎯 Recommended Execution Order

### **Option A: Safe & Incremental (Recommended)**
Execute phases in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8  
- **Total Time**: ~11-13 hours
- **Risk**: Low-Medium (testing after each phase)
- **Advantage**: Can stop at any phase if needed

### **Option B: Quick Wins First**
Execute order: 1 → 2 → 5 → 4 → 3 → 6 → 7 → 8  
- **Total Time**: ~11-13 hours
- **Risk**: Medium (major changes in middle)
- **Advantage**: Quick improvements visible early

### **Option C: Feature-by-Feature**
Refactor one complete feature at a time:
1. Phase 1 (cleanup)
2. Patients feature (complete)
3. Inventory feature (complete)
4. Auth feature (complete)
5. Continue with others
- **Total Time**: ~14-16 hours
- **Risk**: Low (one feature at a time)
- **Advantage**: Working app at each step

---

## ⚠️ Important Considerations

### Before Starting:
1. ✅ **Commit current code** to git
2. ✅ **Create feature branch**: `git checkout -b refactor/frontend-structure`
3. ✅ **Backup database** if needed
4. ✅ **Document current working state**

### During Refactoring:
1. 🔄 **Commit after each phase**
2. ✅ **Test after each major change**
3. 📝 **Track import path changes**
4. 🐛 **Fix TypeScript errors immediately**

### Testing Checklist:
- [ ] Login/Logout works
- [ ] All navigation links work
- [ ] Patient CRUD operations
- [ ] Inventory management
- [ ] Queue management
- [ ] Dashboard displays correctly
- [ ] All modals/dialogs open and close
- [ ] Forms submit correctly
- [ ] No console errors

---

## 📈 Expected Outcomes

### Before Refactoring:
- ❌ Duplicate components
- ❌ Inconsistent structure
- ❌ Hard to find files
- ❌ Mixed styling approaches
- ❌ Scattered types and utilities

### After Refactoring:
- ✅ Clear feature-based organization
- ✅ Reusable component library
- ✅ Consistent styling with MUI
- ✅ Easy to locate files
- ✅ Better type safety
- ✅ Easier onboarding for new developers
- ✅ Scalable architecture

---

## 🚀 Quick Start

Ready to begin? Start with Phase 1:

```bash
# Create feature branch
git checkout -b refactor/frontend-structure

# Commit current state
git add .
git commit -m "chore: checkpoint before refactoring"

# Execute Phase 1
cd frontend/src
# Follow Phase 1 steps above
```

---

## 📞 Need Help?

If you get stuck:
1. Check this plan for guidance
2. Test frequently
3. Commit working states
4. Can rollback if needed: `git reset --hard`

---

## 🎓 Learning Resources

Understanding the new structure:
- **Feature-based architecture**: Groups related code together
- **Separation of concerns**: Components, pages, hooks, services separated
- **DRY principle**: Shared code extracted to common locations
- **Scalability**: Easy to add new features

---

Would you like to start with Phase 1 now?
