# Phase 3: Reorganize by Feature - Execution Plan

**Status**: Ready to Execute  
**Estimated Time**: 3-4 hours  
**Risk**: High (many import changes)  
**Approach**: Feature-by-feature migration with testing after each feature

---

## 🎯 Phase 3 Overview

Phase 3 reorganizes the codebase from page-centric to feature-centric architecture. This improves:
- Code discovery (all patient-related code in one place)
- Scalability (easy to add new features)
- Team collaboration (features can be owned by teams)
- Maintenance (changes isolated to feature folders)

---

## 📋 Migration Strategy

### Approach: One Feature at a Time
We'll migrate features in this order (low-risk to high-risk):

1. **Clinic Setup** (simplest, few dependencies)
2. **Reports** (isolated feature)
3. **Users** (moderate complexity)
4. **Queue** (depends on patients)
5. **Vaccinations** (depends on patients, inventory)
6. **Inventory** (medium complexity, well-defined)
7. **Bite Cases** (depends on patients)
8. **Patients** (core feature, many dependencies)
9. **Auth** (critical, touches everything)
10. **Dashboard** (last, depends on all features)

### Testing After Each Feature:
- ✅ TypeScript compilation passes
- ✅ Feature functionality works
- ✅ No broken imports
- ✅ Related features still work

---

## 📁 Feature Structure Template

Each feature will follow this structure:

```
features/{feature-name}/
├── components/           # Feature-specific components
│   ├── ComponentName/
│   │   ├── ComponentName.tsx
│   │   ├── ComponentName.css (if needed)
│   │   └── index.ts
│   └── index.ts         # Barrel export
├── pages/               # Feature pages
│   ├── PageName.tsx
│   └── index.ts
├── hooks/               # Feature-specific hooks
│   └── index.ts
├── services/            # Feature API calls
│   └── index.ts
├── types/               # Feature types
│   └── index.ts
└── index.ts            # Feature barrel export
```

---

## 🚀 Feature 1: Clinic Setup

### Current Files:
```
pages/Setup/
├── SetupWizard.tsx
└── WorkingHoursModal.tsx

components/
├── WorkingHoursModal/ (if exists)
```

### Target Structure:
```
features/clinic-setup/
├── components/
│   ├── WorkingHoursModal/
│   │   ├── WorkingHoursModal.tsx
│   │   └── index.ts
│   └── index.ts
├── pages/
│   ├── SetupWizardPage.tsx
│   └── index.ts
└── index.ts
```

### Migration Steps:
1. Create `features/clinic-setup/` structure
2. Move `pages/Setup/SetupWizard.tsx` → `features/clinic-setup/pages/SetupWizardPage.tsx`
3. Move `pages/Setup/WorkingHoursModal.tsx` → `features/clinic-setup/components/WorkingHoursModal/`
4. Update imports in SetupWizardPage
5. Update route in App.tsx
6. Create barrel exports
7. Test setup wizard functionality
8. Delete old `pages/Setup/` folder

**Affected Routes**:
- `/setup` → Update in App.tsx

**Files to Update**:
- App.tsx (route import)

---

## 🚀 Feature 2: Reports

### Current Files:
```
pages/Reports/
├── BiteReportsPage.tsx
└── (other report pages)
```

### Target Structure:
```
features/reports/
├── pages/
│   ├── BiteReportsPage.tsx
│   └── index.ts
├── components/ (if needed)
└── index.ts
```

### Migration Steps:
1. Create `features/reports/` structure
2. Move all files from `pages/Reports/` → `features/reports/pages/`
3. Update route imports in App.tsx
4. Create barrel exports
5. Test reports functionality
6. Delete old `pages/Reports/` folder

**Affected Routes**:
- `/reports/bite-reports` → Update in App.tsx

---

## 🚀 Feature 3: Users

### Current Files:
```
pages/Users/
└── (user management pages)

components/UserManagement/ (if exists)
```

### Target Structure:
```
features/users/
├── components/
├── pages/
│   └── index.ts
└── index.ts
```

### Migration Steps:
1. Create `features/users/` structure
2. Move pages from `pages/Users/` → `features/users/pages/`
3. Move components if they exist
4. Update route imports
5. Test user management
6. Delete old folders

---

## 🚀 Feature 4: Queue

### Current Files:
```
pages/Queue/
└── QueueDashboard.tsx

components/Queue/ (if exists)
```

### Target Structure:
```
features/queue/
├── components/
├── pages/
│   ├── QueueDashboardPage.tsx
│   └── index.ts
└── index.ts
```

### Migration Steps:
1. Create `features/queue/` structure
2. Move `QueueDashboard.tsx` → `features/queue/pages/QueueDashboardPage.tsx`
3. Update imports (DataTable, StatCard)
4. Update route in App.tsx
5. Test queue functionality
6. Delete old `pages/Queue/` folder

**Dependencies**:
- Uses `components/data-display/DataTable`
- Uses `components/common/StatCard`
- May depend on Patient data

---

## 🚀 Feature 5: Vaccinations

### Current Files:
```
pages/Vaccination/
└── (vaccination pages)

components/Vaccination/ (if exists)
```

### Target Structure:
```
features/vaccinations/
├── components/
├── pages/
└── index.ts
```

### Migration Steps:
1. Create structure
2. Move pages
3. Move components
4. Update imports
5. Test vaccination management

**Dependencies**:
- Patient data
- Vaccine inventory

---

## 🚀 Feature 6: Inventory

### Current Files:
```
pages/Inventory/
└── VaccineInventory.tsx

components/Inventory/
├── InventoryTable.tsx
├── AddEditInventoryDialog.tsx
├── AdjustStockDialog.tsx
├── TransactionHistoryDialog.tsx
└── DeleteDialog.tsx
```

### Target Structure:
```
features/inventory/
├── components/
│   ├── InventoryTable/
│   ├── AddEditInventoryDialog/
│   ├── AdjustStockDialog/
│   ├── TransactionHistoryDialog/
│   └── DeleteDialog/
├── pages/
│   ├── VaccineInventoryPage.tsx
│   └── index.ts
└── index.ts
```

### Migration Steps:
1. Create `features/inventory/` structure
2. Move `VaccineInventory.tsx` → `features/inventory/pages/VaccineInventoryPage.tsx`
3. Move all components from `components/Inventory/` → `features/inventory/components/`
4. Update internal imports within components
5. Update StatCard import
6. Update ConfirmationDialog imports
7. Update route in App.tsx
8. Test all inventory operations (add, edit, delete, adjust, history)
9. Delete old folders

**Critical Testing**:
- Add inventory item
- Edit inventory item
- Delete inventory item
- Adjust stock
- View transaction history
- Filter and pagination

---

## 🚀 Feature 7: Bite Cases

### Current Files:
```
pages/BiteCases/ (if exists)
components/BiteCase/ (if exists)
```

### Target Structure:
```
features/bite-cases/
├── components/
├── pages/
└── index.ts
```

### Migration Steps:
1. Identify all bite case files
2. Create structure
3. Move files
4. Update imports
5. Test bite case management

**Dependencies**:
- Patient data
- Vaccination records

---

## 🚀 Feature 8: Patients

### Current Files:
```
pages/Patients/
├── PatientList.tsx
├── PatientList.css
├── PatientDetails.tsx
├── CreatePatient.tsx
├── EditPatient.tsx
├── AddPatientModal.tsx
└── AddPatientModal.css

components/Patient/ (if exists)
```

### Target Structure:
```
features/patients/
├── components/
│   ├── PatientTable/
│   ├── AddPatientModal/
│   └── PatientForm/
├── pages/
│   ├── PatientListPage.tsx
│   ├── PatientDetailsPage.tsx
│   ├── CreatePatientPage.tsx
│   └── EditPatientPage.tsx
├── styles/
│   └── (CSS files if not converted to MUI)
└── index.ts
```

### Migration Steps:
1. Create structure
2. Move all patient pages
3. Move AddPatientModal to components
4. Update imports (FormModal)
5. Update routes in App.tsx
6. Test all patient CRUD operations
7. Delete old folders

**Critical Testing**:
- List patients
- View patient details
- Create patient
- Edit patient
- Add patient modal
- Patient search/filter

---

## 🚀 Feature 9: Auth

### Current Files:
```
pages/
├── Login.tsx
├── Register.tsx (if exists)
├── ForgotPassword.tsx (if exists)
└── ResetPassword.tsx (if exists)

styles/
└── Login.css

contexts/
└── AuthContext.tsx (if exists)

services/
└── authService.ts (if exists)
```

### Target Structure:
```
features/auth/
├── components/
│   ├── LoginForm/
│   └── (other auth components)
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   └── ResetPasswordPage.tsx
├── services/
│   └── authService.ts
├── contexts/
│   └── AuthContext.tsx
├── styles/
│   └── Login.css (if not converted)
└── index.ts
```

### Migration Steps:
1. Create structure
2. Move Login.tsx → features/auth/pages/LoginPage.tsx
3. Move Login.css → features/auth/styles/ or convert to MUI
4. Move other auth pages if they exist
5. Move authService if it exists
6. Update imports across entire app (auth is used everywhere)
7. Update routes in App.tsx
8. **Critical**: Test login, logout, authentication flow
9. Delete old files

**High Risk**: Auth touches many files. Test thoroughly!

---

## 🚀 Feature 10: Dashboard

### Current Files:
```
pages/Dashboard.tsx
pages/Dashboard.css

App.tsx (contains SimpleDashboard, SdCard, charts)
SimpleDashboard.css
```

### Target Structure:
```
features/dashboard/
├── components/
│   ├── UniversalDashboard/    # From App.tsx
│   ├── RoleDashboard/         # From pages/Dashboard.tsx
│   ├── SdCard/                # Replace with StatCard
│   ├── LineChart/
│   └── DonutChart/
├── pages/
│   ├── DashboardPage.tsx
│   └── index.ts
├── styles/
│   └── (CSS if not converted)
└── index.ts
```

### Migration Steps:
1. Create structure
2. Extract SimpleDashboard from App.tsx → UniversalDashboard component
3. Move Dashboard.tsx → features/dashboard/pages/DashboardPage.tsx
4. Extract chart components from App.tsx
5. Replace SdCard with unified StatCard
6. Update App.tsx to use new components
7. Update imports
8. Test all dashboard views
9. Clean up App.tsx

**TODO Integration**:
- Addresses TODO #1: Unify SdCard with StatCard
- Addresses TODO #2: Extract dashboard from App.tsx
- Addresses TODO #4: Create reusable chart components

---

## 📊 Progress Tracking

```
✅ Phase 1: Cleanup & Preparation - COMPLETE
✅ Phase 2: Consolidate Duplicate Components - COMPLETE
⏳ Phase 3: Reorganize by Feature - IN PROGRESS

Feature Migration:
[ ] 1. Clinic Setup
[ ] 2. Reports
[ ] 3. Users
[ ] 4. Queue
[ ] 5. Vaccinations
[ ] 6. Inventory
[ ] 7. Bite Cases
[ ] 8. Patients
[ ] 9. Auth
[ ] 10. Dashboard
```

---

## ⚠️ Important Considerations

### Before Each Feature:
1. Commit current state
2. Create backup if nervous
3. Review files to move

### During Each Feature:
1. Create folder structure first
2. Move files one by one
3. Update imports immediately
4. Check TypeScript errors
5. Fix errors before moving on

### After Each Feature:
1. Run TypeScript check
2. Test feature functionality
3. Test related features
4. Commit with clear message
5. Document any issues

### Git Workflow:
```bash
# After each feature
git add .
git commit -m "refactor(frontend): migrate {feature-name} to features folder"

# Example
git commit -m "refactor(frontend): migrate clinic-setup to features folder"
```

---

## 🧪 Testing Strategy

### After Each Feature:
- [ ] TypeScript compiles with no errors
- [ ] Feature pages load
- [ ] Feature CRUD operations work
- [ ] Navigation to/from feature works
- [ ] Related features still work
- [ ] No console errors

### After All Features:
- [ ] Full app walkthrough
- [ ] Login/logout
- [ ] All navigation links
- [ ] All CRUD operations
- [ ] All modals/dialogs
- [ ] All forms submit
- [ ] Dashboard displays
- [ ] No console errors

---

## 🎯 Success Criteria

Phase 3 is complete when:
- ✅ All features moved to `features/` folder
- ✅ All imports updated
- ✅ Zero TypeScript errors
- ✅ All routes work
- ✅ All features functional
- ✅ Old page folders deleted
- ✅ Clean codebase structure

---

## 📝 Next Steps After Phase 3

After completing Phase 3:
1. **Manual Testing**: Comprehensive feature testing
2. **Documentation**: Update architecture docs
3. **Phase 4**: Standardize styling approach
4. **Phase 5**: Extract shared code
5. **Phase 6**: Improve data display components

---

## 🚀 Ready to Start?

Let's begin with **Feature 1: Clinic Setup** (lowest risk, good warm-up)

**Command**:
```bash
# First, let's see what we're working with
ls pages/Setup
```

Would you like to proceed with Feature 1: Clinic Setup?
