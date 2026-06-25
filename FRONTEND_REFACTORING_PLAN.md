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
- Deleted `frontend/src/SimpleDashboard.css`
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

### Phase 2: Consolidate Duplicate Components (Medium Risk)
**Time**: 1 hour  
**Risk**: Medium (requires testing)

#### Step 2.1: Merge StatCard Components
- [ ] Analyze both `components/StatCard.tsx` and `components/Dashboard/StatCard.tsx`
- [ ] Keep the better implementation
- [ ] Move to `components/common/StatCard/`
- [ ] Update all imports
- [ ] Test on Dashboard and Inventory pages

#### Step 2.2: Consolidate Modal Components
- [ ] Review all modal/dialog patterns
- [ ] Create base modal in `components/common/Modal/`
- [ ] Standardize confirmation dialogs
- [ ] Move form modals to appropriate locations

---

### Phase 3: Reorganize by Feature (High Risk - Requires Testing)
**Time**: 3-4 hours  
**Risk**: High (many import changes)

#### Step 3.1: Migrate Auth Feature
```
Move files:
pages/Login.tsx → features/auth/pages/LoginPage.tsx
pages/Auth/* → features/auth/pages/
styles/Login.css → features/auth/styles/ or inline with MUI
services/authService.ts → features/auth/services/
```

#### Step 3.2: Migrate Patients Feature
```
Move files:
pages/Patients/* → features/patients/pages/
components/ConfirmationModal → components/feedback/ConfirmationDialog/
Update imports
```

#### Step 3.3: Migrate Inventory Feature
```
Move files:
pages/Inventory/* → features/inventory/pages/
components/Inventory/* → features/inventory/components/
Update imports
Test all inventory functionality
```

#### Step 3.4: Migrate Remaining Features
- [ ] Bite Cases
- [ ] Vaccinations
- [ ] Queue Management
- [ ] Reports
- [ ] Users
- [ ] Clinic Setup
- [ ] Dashboard

---

### Phase 4: Standardize Styling Approach (Medium Risk)
**Time**: 2 hours  
**Risk**: Medium (visual changes)

#### Step 4.1: Decide on Styling Strategy
**Recommendation**: Use MUI's `sx` prop + theme (eliminate separate CSS files)

#### Step 4.2: Migrate CSS to MUI
- [ ] Convert `PatientList.css` to MUI styles
- [ ] Convert `DashboardLayout.css` to MUI styles
- [ ] Convert `Dashboard.css` to MUI styles
- [ ] Remove separate CSS files
- [ ] Create theme configuration in `styles/theme.ts`

#### Step 4.3: Global Styles Cleanup
- [ ] Keep only `global.css` for resets
- [ ] Move all component styles inline
- [ ] Configure MUI theme properly

---

### Phase 5: Extract Shared Code (Low Risk)
**Time**: 1 hour  
**Risk**: Low

#### Step 5.1: Create Shared Hooks
```typescript
// shared/hooks/useAuth.ts
// shared/hooks/useDebounce.ts
// shared/hooks/usePagination.ts
// shared/hooks/useFilters.ts
```

#### Step 5.2: Create Utility Functions
```typescript
// shared/utils/validation.ts
// shared/utils/formatting.ts
// shared/utils/date.ts
```

#### Step 5.3: Organize Types
```typescript
// shared/types/api.types.ts
// shared/types/common.types.ts
```

---

### Phase 6: Improve Data Display Components (Medium Risk)
**Time**: 1.5 hours  
**Risk**: Medium

#### Step 6.1: Create Reusable Table Component
- [ ] Extract common table logic from InventoryTable
- [ ] Create `components/data-display/DataTable/`
- [ ] Add pagination, filtering, sorting
- [ ] Reuse in Patient, Inventory, Queue lists

#### Step 6.2: Standardize Empty States
- [ ] Create `components/data-display/EmptyState/`
- [ ] Use consistently across all lists

---

### Phase 7: Update Routing & Navigation (Medium Risk)
**Time**: 1 hour  
**Risk**: Medium

#### Step 7.1: Centralize Route Configuration
```typescript
// shared/config/routes.ts
export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
  DASHBOARD: '/dashboard',
  PATIENTS: {
    LIST: '/patients',
    CREATE: '/patients/create',
    DETAILS: '/patients/:id',
    EDIT: '/patients/:id/edit',
  },
  // ... etc
};
```

#### Step 7.2: Update All Route References
- [ ] Replace hardcoded routes with constants
- [ ] Update `App.tsx` routing
- [ ] Update navigation links in DashboardLayout

---

### Phase 8: Documentation & Testing (Low Risk)
**Time**: 1 hour  
**Risk**: Low

#### Step 8.1: Update Documentation
- [ ] Create `frontend/ARCHITECTURE.md`
- [ ] Update component READMEs
- [ ] Document new structure

#### Step 8.2: Create Migration Guide
- [ ] Document import path changes
- [ ] Create cheat sheet for new developers

#### Step 8.3: Test Everything
- [ ] Manual testing of all features
- [ ] Check all routes work
- [ ] Verify no broken imports

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
