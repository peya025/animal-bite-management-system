# Frontend Refactoring - TODO List

Items to complete in future phases or maintenance.

---

## 🔴 High Priority

### 1. Unify SdCard with StatCard Component
**Location**: `frontend/src/App.tsx` (lines 461-470)  
**Issue**: Universal dashboard uses separate `SdCard` component instead of unified `StatCard`  
**Impact**: Inconsistent design across dashboards, duplicate stat card logic  
**When**: Phase 3 or 4 (during Dashboard feature organization)

**Current State**:
- `App.tsx` → Uses `SdCard` (simple rectangular cards)
- `pages/Dashboard.tsx` → Uses `StatCard` (donut chart cards)
- `pages/Inventory/VaccineInventory.tsx` → Uses `StatCard`
- `pages/Queue/QueueDashboard.tsx` → Uses `StatCard`

**Desired State**:
- ALL dashboards use unified `StatCard` from `components/common/StatCard/`
- Consistent visual design across entire application
- Single source of truth for stat card component

**Action Items**:
- [ ] Replace `SdCard` calls in App.tsx with `StatCard`
- [ ] Update color mappings if needed
- [ ] Remove `SdCard` function from App.tsx
- [ ] Test universal dashboard display
- [ ] Verify no visual regressions

**Estimated Effort**: 15-20 minutes  
**Risk**: Medium (affects main dashboard, needs thorough testing)

**Code Change Preview**:
```tsx
// OLD (App.tsx line ~360)
<SdCard color="purple" label="Total Patients" value="0" sub="Registered" />

// NEW
import StatCard from './components/common/StatCard';
<StatCard color="primary" label="Total Patients" value={stats?.total_patients || 0} />
```

---

## ⚠️ Medium Priority

### 2. Extract Dashboard Components from App.tsx
**Location**: `frontend/src/App.tsx`  
**Issue**: App.tsx contains layout logic, chart components, and dashboard UI  
**Impact**: File is too large (800+ lines), hard to maintain  
**When**: Phase 3 (feature-based reorganization)

**Action Items**:
- [ ] Extract `SimpleDashboard` → `features/dashboard/pages/UniversalDashboard.tsx`
- [ ] Extract `SdCard` → Replace with unified StatCard
- [ ] Extract `SdLineChart` → `features/dashboard/components/LineChart.tsx`
- [ ] Extract `SdDonutChart` → `features/dashboard/components/DonutChart.tsx`
- [ ] Move `SimpleDashboard.css` → features/dashboard/styles/ or convert to MUI
- [ ] Update App.tsx to use layout wrapper only

**Estimated Effort**: 45-60 minutes  
**Risk**: High (affects routing and main layout)

---

### 3. Consolidate CSS Styling Approach
**Issue**: Mixed CSS files and MUI inline styles  
**Impact**: Inconsistent styling, harder maintenance  
**When**: Phase 4 (styling standardization)

**Files with Separate CSS**:
- [ ] `SimpleDashboard.css` (App.tsx)
- [ ] `Dashboard.css` (pages/Dashboard.tsx)
- [ ] `DashboardLayout.css` (components/Layout/)
- [ ] `PatientList.css` (pages/Patients/)
- [ ] `LandingPage.css` (styles/)
- [ ] `Login.css` (styles/)

**Decision Needed**:
- Option A: Convert all to MUI `sx` prop (recommended)
- Option B: Keep CSS for complex layouts, MUI for components
- Option C: Use styled-components or emotion

---

### 4. Create Reusable Chart Components
**Location**: Currently inline in App.tsx  
**Issue**: Chart components not reusable, hardcoded in App.tsx  
**When**: Phase 6 (data display components)

**Action Items**:
- [ ] Extract SdLineChart → `components/data-display/LineChart/`
- [ ] Extract SdDonutChart → `components/data-display/DonutChart/`
- [ ] Add props for customization (data, colors, size)
- [ ] Add TypeScript interfaces
- [ ] Document usage

---

## 💡 Low Priority / Nice to Have

### 5. Barrel Export Optimization
**Issue**: Some imports could be shorter with barrel exports  
**When**: Ongoing maintenance

**Example**:
```tsx
// Current
import StatCard from '../../components/common/StatCard';
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';

// Could be
import { StatCard } from '../../components/common';
import { ConfirmationDialog } from '../../components/feedback';
```

**Action Items**:
- [ ] Review if shorter imports improve readability
- [ ] Consider tree-shaking implications
- [ ] Update if beneficial

---

### 6. Move SimpleDashboard CSS to Theme
**Location**: `frontend/src/SimpleDashboard.css`  
**Issue**: Global CSS file for component-specific styles  
**When**: Phase 4 (styling standardization)

**Action Items**:
- [ ] Extract CSS variables to MUI theme
- [ ] Convert component styles to MUI
- [ ] Remove SimpleDashboard.css
- [ ] Update import in App.tsx

---

### 7. Create Dashboard Layout Variants
**Issue**: App.tsx has hardcoded dashboard layout  
**When**: After dashboard components are extracted

**Action Items**:
- [ ] Create DashboardLayout variants (simple, detailed, tabbed)
- [ ] Move layout logic to dedicated components
- [ ] Support responsive layouts
- [ ] Add layout configuration

---

### 8. Add Loading States for Dashboard Stats
**Issue**: SdCard doesn't support loading state like StatCard does  
**When**: When unifying SdCard with StatCard

**Action Items**:
- [ ] Add loading prop to unified StatCard
- [ ] Show skeleton while data loads
- [ ] Update universal dashboard to use loading state

---

## 📊 Progress Tracking

### Stat Card Components:
- ✅ Phase 2 Part 1: Consolidated StatCard for role dashboards
- ⏳ **TODO**: Replace SdCard in universal dashboard
- ⏳ **TODO**: Single StatCard across entire app

### Dashboard Organization:
- ✅ Role-based dashboards in pages/Dashboard.tsx
- ⏳ **TODO**: Extract universal dashboard from App.tsx
- ⏳ **TODO**: Move to features/dashboard/

### Styling:
- ⏳ Mixed approach (CSS + MUI)
- ⏳ **TODO**: Standardize styling strategy
- ⏳ **TODO**: Remove separate CSS files

---

## 🎯 Recommended Completion Order

When tackling these TODOs:

1. **Phase 3** (Feature Organization):
   - Extract dashboard from App.tsx
   - Move SdCard replacement here
   - Organize dashboard feature

2. **Phase 4** (Styling):
   - Standardize CSS approach
   - Convert or remove CSS files
   - Create theme configuration

3. **Phase 6** (Data Display):
   - Extract chart components
   - Make reusable
   - Add to data-display folder

4. **Ongoing**:
   - Barrel exports optimization
   - Loading states
   - Layout variants

---

## 📝 Notes

- Keep this document updated as TODOs are completed
- Mark items with ✅ when done
- Add new TODOs as they're discovered
- Reference this in phase planning

---

## 🔗 Related Documents

- [FRONTEND_REFACTORING_PLAN.md](FRONTEND_REFACTORING_PLAN.md) - Main refactoring plan
- [PHASE_2_PART_1_COMPLETE.md](PHASE_2_PART_1_COMPLETE.md) - StatCard consolidation
- [PHASE_2_EXECUTION_PLAN.md](PHASE_2_EXECUTION_PLAN.md) - Detailed Phase 2 steps

---

**Last Updated**: June 25, 2026  
**Status**: Active - 8 TODO items identified
