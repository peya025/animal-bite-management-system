# Phase 2: Consolidate Duplicate Components - Detailed Execution Plan

**Status**: Ready to Execute  
**Estimated Time**: 1 hour  
**Risk Level**: Medium (requires testing after changes)  
**Prerequisites**: Phase 1 completed ✅

---

## 📋 Overview

Phase 2 focuses on eliminating duplicate components and standardizing modal/dialog patterns. We'll consolidate two different StatCard implementations and organize all modal components into a consistent structure.

---

## 🎯 Goals

1. ✅ Merge duplicate StatCard components into single implementation
2. ✅ Move modals to appropriate locations (feedback vs forms)
3. ✅ Update all import references
4. ✅ Test affected pages (Dashboard, Inventory, Queue)
5. ✅ Zero visual regressions

---

## 📊 Current State Analysis

### StatCard Components (DUPLICATE)

#### Implementation A: `components/StatCard.tsx` ✅ **RECOMMENDED**
**Used by**: VaccineInventory, QueueDashboard  
**Style**: MUI-based, donut chart visual, modern design  
**Props**:
```typescript
{
  label: string;
  value: number | string;
  icon: React.ReactNode;  // Not used in rendering
  color: 'success' | 'info' | 'warning' | 'error' | 'primary';
  loading?: boolean;
}
```

**Features**:
- ✅ Circular progress donut chart
- ✅ Loading state with Skeleton
- ✅ Clean MUI design system
- ✅ Consistent color palette
- ✅ No external CSS file needed
- ✅ Responsive layout

**Visual**: 
```
   ┌─────────────┐
   │   ╭───╮     │
   │  ╱     ╲    │
   │ │   42  │   │
   │  ╲     ╱    │
   │   ╰───╯     │
   │             │
   │  Active     │
   │  Batches    │
   └─────────────┘
```

#### Implementation B: `components/Dashboard/StatCard.tsx` ❌ **LEGACY**
**Used by**: Dashboard.tsx only  
**Style**: CSS-based with separate CSS file  
**Props**:
```typescript
{
  title: string;
  value: number | string;
  icon: string;  // String emoji/character
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
```

**Features**:
- ⚠️ Uses separate CSS file (`StatCard.css`)
- ⚠️ String-based icons (emoji/characters)
- ⚠️ Trend indicator (not used elsewhere)
- ⚠️ Different color system
- ⚠️ Older design pattern

**Visual**:
```
   ┌─────────────────┐
   │ 📊  Title       │
   │     Value       │
   │     ↑ 5%       │
   └─────────────────┘
```

**Decision**: Keep Implementation A, migrate Dashboard to use it.

---

### Modal Components (MULTIPLE PATTERNS)

#### Pattern A: ConfirmationModal
- **Location**: `components/ConfirmationModal/`
- **Purpose**: Confirmation dialogs (confirm, success, warning, danger)
- **Style**: Custom CSS with overlay
- **Usage**: QueueDashboard, BiteCaseList
- **Target**: `components/feedback/ConfirmationDialog/`

#### Pattern B: FormModal
- **Location**: `components/FormModal/`
- **Purpose**: Form containers with header/body/footer
- **Style**: Custom CSS with overlay
- **Usage**: AddPatientModal, various forms
- **Target**: `components/forms/FormModal/` (keep as-is)

#### Pattern C: MUI Dialogs
- **Location**: `components/Inventory/*Dialog.tsx`
- **Purpose**: Inventory-specific dialogs
- **Style**: MUI Dialog component
- **Usage**: Inventory management
- **Target**: Keep in feature folder (`features/inventory/components/`)

**Decision**: Organize by purpose (feedback vs forms), standardize naming.

---

## 🗂️ Step-by-Step Execution Plan

### Step 2.1: Consolidate StatCard Component

#### 2.1.1: Analyze Dashboard Usage
- [ ] Open `pages/Dashboard.tsx`
- [ ] Identify all StatCard usages
- [ ] Document required color mappings
- [ ] Check if trend feature is actually used

#### 2.1.2: Create Common StatCard
- [ ] Copy `components/StatCard.tsx` → `components/common/StatCard/StatCard.tsx`
- [ ] Create `components/common/StatCard/index.ts` barrel export
- [ ] Add support for Dashboard's color names (map to existing colors)
- [ ] Optional: Add trend prop (if needed)

```typescript
// components/common/StatCard/StatCard.tsx
import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color: 'success' | 'info' | 'warning' | 'error' | 'primary' | 
         'blue' | 'green' | 'yellow' | 'red' | 'purple';  // Support both
  loading?: boolean;
  trend?: {           // Optional trend support
    value: number;
    isPositive: boolean;
  };
}

// Color mapping for backwards compatibility
const COLOR_MAP: Record<string, keyof typeof COLORS> = {
  blue: 'info',
  green: 'success',
  yellow: 'warning',
  red: 'error',
  purple: 'primary',
};

const COLORS: Record<string, { stroke: string; track: string }> = {
  success: { stroke: '#1D9E75', track: '#d1fae5' },
  info:    { stroke: '#378ADD', track: '#dbeafe' },
  warning: { stroke: '#EF9F27', track: '#fef3c7' },
  error:   { stroke: '#E24B4A', track: '#fee2e2' },
  primary: { stroke: '#7F77DD', track: '#ede9fe' },
};

export default function StatCard({ 
  label, 
  value, 
  color, 
  loading,
  trend 
}: StatCardProps) {
  const mappedColor = COLOR_MAP[color] || color;
  const c = COLORS[mappedColor] ?? COLORS.info;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '0.5px solid #e5e7eb',
        borderRadius: 3,
        p: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        bgcolor: '#fff',
      }}
    >
      {/* Donut chart */}
      <Box sx={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r={26} stroke={c.track} strokeWidth="6" />
          {!loading && (
            <circle
              cx="32" cy="32" r={26}
              stroke={c.stroke}
              strokeWidth="6"
              strokeDasharray={`${163.36 * 0.72} ${163.36 * 0.28}`}
              strokeDashoffset="41"
              strokeLinecap="round"
            />
          )}
        </svg>
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading
            ? <Skeleton width={24} height={20} />
            : <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#111827', lineHeight: 1 }}>
                {value}
              </Typography>
          }
        </Box>
      </Box>

      {/* Label */}
      <Typography sx={{ fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </Typography>

      {/* Optional trend indicator */}
      {trend && !loading && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5, 
          fontSize: 11,
          color: trend.isPositive ? '#10b981' : '#ef4444'
        }}>
          <Box sx={{ transform: trend.isPositive ? 'none' : 'rotate(180deg)' }}>
            ↑
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 500 }}>
            {Math.abs(trend.value)}%
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
```

```typescript
// components/common/StatCard/index.ts
export { default } from './StatCard';
export { default as StatCard } from './StatCard';
```

#### 2.1.3: Update Import Paths
- [ ] Update `pages/Dashboard.tsx`:
  ```typescript
  // OLD
  import StatCard from '../components/Dashboard/StatCard';
  
  // NEW
  import StatCard from '../components/common/StatCard';
  ```

- [ ] Update `pages/Inventory/VaccineInventory.tsx`:
  ```typescript
  // OLD
  import StatCard from '../../components/StatCard';
  
  // NEW
  import StatCard from '../../components/common/StatCard';
  ```

- [ ] Update `pages/Queue/QueueDashboard.tsx`:
  ```typescript
  // OLD
  import StatCard from '../../components/StatCard';
  
  // NEW
  import StatCard from '../../components/common/StatCard';
  ```

#### 2.1.4: Remove Old Files
- [ ] Delete `components/StatCard.tsx`
- [ ] Delete `components/Dashboard/StatCard.tsx`
- [ ] Delete `components/Dashboard/StatCard.css`
- [ ] Delete `components/Dashboard/` folder (if empty)

#### 2.1.5: Test StatCard Changes
- [ ] Run dev server: `npm run dev`
- [ ] Navigate to Dashboard → Verify stats display correctly
- [ ] Navigate to Inventory → Verify stats display correctly
- [ ] Navigate to Queue → Verify stats display correctly
- [ ] Check browser console for errors
- [ ] Verify no visual regressions

---

### Step 2.2: Organize Modal Components

#### 2.2.1: Move ConfirmationModal to Feedback
- [ ] Move `components/ConfirmationModal/` → `components/feedback/ConfirmationDialog/`
- [ ] Rename:
  - `ConfirmationModal.tsx` → `ConfirmationDialog.tsx`
  - `ConfirmationModal.css` → `ConfirmationDialog.css`
  - Update CSS class prefix: `cm-*` → `cd-*` (optional)
- [ ] Update `index.ts`:
  ```typescript
  // components/feedback/ConfirmationDialog/index.ts
  export { default } from './ConfirmationDialog';
  export { default as ConfirmationDialog } from './ConfirmationDialog';
  ```

#### 2.2.2: Keep FormModal in Forms
- [ ] Move `components/FormModal/` → `components/forms/FormModal/`
- [ ] No renaming needed (already good name)
- [ ] Update `index.ts`:
  ```typescript
  // components/forms/FormModal/index.ts
  export { default } from './FormModal';
  export { default as FormModal } from './FormModal';
  ```

#### 2.2.3: Update Modal Import Paths

**ConfirmationModal/Dialog imports:**
- [ ] Update `pages/Queue/QueueDashboard.tsx`:
  ```typescript
  // OLD
  import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';
  
  // NEW
  import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';
  ```

- [ ] Update `pages/BiteCases/BiteCaseList.tsx` (if exists):
  ```typescript
  // OLD
  import ConfirmationModal from '../../components/ConfirmationModal';
  
  // NEW
  import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';
  ```

- [ ] Search for all `ConfirmationModal` imports and update

**FormModal imports:**
- [ ] Update `pages/Patients/AddPatientModal.tsx`:
  ```typescript
  // OLD
  import FormModal from '../../components/FormModal';
  
  // NEW
  import FormModal from '../../components/forms/FormModal';
  ```

- [ ] Search for all `FormModal` imports and update

#### 2.2.4: Update Modal Component Names in JSX
- [ ] Replace `<ConfirmationModal` with `<ConfirmationDialog` in all files
- [ ] Keep `<FormModal` as-is (name is already good)

#### 2.2.5: Remove Old Folders
- [ ] Delete `components/ConfirmationModal/` (now empty)
- [ ] Delete `components/FormModal/` (now empty)

#### 2.2.6: Test Modal Changes
- [ ] Test confirmation dialogs in Queue
- [ ] Test form modals in Patient management
- [ ] Verify all modals open/close correctly
- [ ] Check styling is intact
- [ ] Verify overlay clicks work

---

### Step 2.3: Create Barrel Exports

#### 2.3.1: Common Components Index
```typescript
// components/common/index.ts
export { default as StatCard } from './StatCard';
export { default as Button } from './Button';  // If exists
export { default as Loader } from './Loader';  // If exists
```

#### 2.3.2: Feedback Components Index
```typescript
// components/feedback/index.ts
export { default as ConfirmationDialog } from './ConfirmationDialog';
// Add more as we create them:
// export { default as Alert } from './Alert';
// export { default as Toast } from './Toast';
```

#### 2.3.3: Forms Components Index
```typescript
// components/forms/index.ts
export { default as FormModal } from './FormModal';
// Add more as we create them:
// export { default as FormField } from './FormField';
```

#### 2.3.4: Update Import Statements (Optional Optimization)
If we want shorter imports:
```typescript
// Before
import StatCard from '../../components/common/StatCard';
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';

// After
import { StatCard } from '../../components/common';
import { ConfirmationDialog } from '../../components/feedback';
```

---

## ✅ Verification Checklist

### Before Starting:
- [ ] Phase 1 completed successfully
- [ ] Git working directory is clean
- [ ] Create commit: `git commit -m "checkpoint: before Phase 2"`
- [ ] Create branch (if not exists): `git checkout -b refactor/frontend-structure`

### During Execution:
- [ ] No TypeScript errors: `npm run build` or check editor
- [ ] No broken imports
- [ ] All affected files updated
- [ ] Old files deleted

### After Completion:
- [ ] Dashboard page loads without errors
- [ ] Inventory page loads without errors  
- [ ] Queue page loads without errors
- [ ] Patient forms work correctly
- [ ] All stat cards display correctly
- [ ] All modals open and close
- [ ] No console errors
- [ ] Visual appearance unchanged
- [ ] Create commit: `git commit -m "refactor: consolidate StatCard and organize modals (Phase 2)"`

---

## 📝 Files to Modify

### Create:
- [ ] `components/common/StatCard/StatCard.tsx`
- [ ] `components/common/StatCard/index.ts`
- [ ] `components/common/index.ts`
- [ ] `components/feedback/index.ts`
- [ ] `components/forms/index.ts`

### Move/Rename:
- [ ] `components/ConfirmationModal/` → `components/feedback/ConfirmationDialog/`
- [ ] `components/FormModal/` → `components/forms/FormModal/`

### Update Imports In:
- [ ] `pages/Dashboard.tsx`
- [ ] `pages/Inventory/VaccineInventory.tsx`
- [ ] `pages/Queue/QueueDashboard.tsx`
- [ ] `pages/Patients/AddPatientModal.tsx`
- [ ] `pages/BiteCases/BiteCaseList.tsx` (if exists)
- [ ] Any other files importing these components

### Delete:
- [ ] `components/StatCard.tsx`
- [ ] `components/Dashboard/StatCard.tsx`
- [ ] `components/Dashboard/StatCard.css`
- [ ] `components/Dashboard/` (if empty)
- [ ] `components/ConfirmationModal/` (after move)
- [ ] `components/FormModal/` (after move)

---

## 🎯 Success Criteria

Phase 2 is complete when:
- ✅ Single StatCard implementation in `components/common/StatCard/`
- ✅ Works on Dashboard, Inventory, and Queue pages
- ✅ ConfirmationDialog in `components/feedback/`
- ✅ FormModal in `components/forms/`
- ✅ All imports updated correctly
- ✅ Old duplicate files deleted
- ✅ Zero TypeScript errors
- ✅ Zero runtime errors
- ✅ Zero visual regressions
- ✅ All pages tested manually

---

## ⚠️ Potential Issues & Solutions

### Issue 1: Different Color Systems
**Problem**: Dashboard uses `blue`, Inventory uses `info`  
**Solution**: Color mapping in unified StatCard (already in plan)

### Issue 2: Missing Trend Feature
**Problem**: Dashboard may use trend, others don't  
**Solution**: Make trend optional prop

### Issue 3: Import Path Confusion
**Problem**: Relative paths can be confusing after moves  
**Solution**: Use consistent relative paths, test thoroughly

### Issue 4: CSS File Not Loading
**Problem**: After move, CSS might not load  
**Solution**: Verify CSS import paths, rename if needed

---

## 🚀 Execution Commands

```bash
# Navigate to frontend
cd frontend

# Start dev server (keep running in separate terminal)
npm run dev

# Open in browser
# http://localhost:5173

# After changes, check TypeScript
npx tsc --noEmit

# Or let your IDE show errors
```

---

## 📊 Estimated Timeline

| Step | Task | Time | Cumulative |
|------|------|------|------------|
| 2.1.1 | Analyze Dashboard | 5 min | 5 min |
| 2.1.2 | Create Common StatCard | 10 min | 15 min |
| 2.1.3 | Update StatCard Imports | 5 min | 20 min |
| 2.1.4 | Remove Old StatCard Files | 2 min | 22 min |
| 2.1.5 | Test StatCard Changes | 8 min | 30 min |
| 2.2.1 | Move ConfirmationModal | 5 min | 35 min |
| 2.2.2 | Move FormModal | 5 min | 40 min |
| 2.2.3 | Update Modal Imports | 8 min | 48 min |
| 2.2.4 | Update JSX Names | 3 min | 51 min |
| 2.2.5 | Remove Old Modal Folders | 2 min | 53 min |
| 2.2.6 | Test Modal Changes | 7 min | 60 min |
| 2.3 | Create Barrel Exports | 5 min | 65 min |

**Total**: ~65 minutes (1 hour with buffer)

---

## 🎓 Next Steps

After Phase 2 completion:
- Commit changes with descriptive message
- Update `FRONTEND_REFACTORING_PLAN.md` to mark Phase 2 complete
- Review Phase 3 plan (feature-based reorganization)
- Take a break! ☕

---

## 📞 Ready to Execute?

Before starting, confirm:
- [ ] You understand the changes
- [ ] Dev server is ready
- [ ] Git is committed
- [ ] You have ~1 hour available

**Start with Step 2.1.1!** 🚀
