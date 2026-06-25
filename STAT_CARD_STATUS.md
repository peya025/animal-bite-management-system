# StatCard Components - Current Status

Quick reference for stat card components across the application.

---

## 🎯 Current State

### ✅ Using Unified StatCard (Donut Design)

**Component**: `components/common/StatCard/StatCard.tsx`

**Pages**:
1. ✅ `pages/Dashboard.tsx`
   - Admin Dashboard (4 cards)
   - Registration Dashboard (2 cards)
   - Triage Dashboard (4 cards)
   - Treatment Dashboard (2 cards)

2. ✅ `pages/Inventory/VaccineInventory.tsx`
   - 5 stat cards (Active Batches, Total Vials, etc.)

3. ✅ `pages/Queue/QueueDashboard.tsx`
   - 4 stat cards (Total in Queue, Waiting, etc.)

**Design**: Donut chart with value in center  
**Styling**: MUI-based, no external CSS  
**Status**: ✅ Complete & working

---

### ⏳ Using Separate SdCard (Rectangle Design)

**Component**: Inline in `App.tsx` (lines 461-470)

**Pages**:
1. ⏳ `App.tsx` - Universal Dashboard
   - 8 stat cards:
     - Total Patients
     - Active Cases
     - Pending Vaccinations
     - Today's Queue
     - Completed Cases
     - Follow-up Patients
     - Bite Cases
     - New Today

**Design**: Simple rectangular card with value and subtitle  
**Styling**: CSS-based (`SimpleDashboard.css`)  
**Status**: ⏳ TODO - Will unify in Phase 3

---

## 📊 Visual Comparison

### StatCard (Donut - Current Standard)
```
   ┌─────────────┐
   │   ╭───╮     │
   │  ╱ 72% ╲    │
   │ │   42  │   │  ← Value
   │  ╲     ╱    │
   │   ╰───╯     │
   │             │
   │  Active     │  ← Label
   │  Batches    │
   └─────────────┘
```
**Used by**: Dashboard (roles), Inventory, Queue

### SdCard (Rectangle - Legacy)
```
   ┌─────────────────┐
   │ Total Patients  │  ← Label
   │      42         │  ← Value
   │   Registered    │  ← Subtitle
   └─────────────────┘
```
**Used by**: App.tsx universal dashboard

---

## 🎨 Color Systems

### StatCard Colors
**Props**: `success | info | warning | error | primary`  
**Also accepts**: `blue | green | yellow | red | purple` (mapped)

| Prop | Color | Hex | Usage |
|------|-------|-----|-------|
| success / green | Green | #1D9E75 | Positive metrics |
| info / blue | Blue | #378ADD | Informational |
| warning / yellow | Yellow | #EF9F27 | Attention needed |
| error / red | Red | #E24B4A | Critical items |
| primary / purple | Purple | #7F77DD | General stats |

### SdCard Colors
**Props**: `purple | blue | indigo | teal | violet | cyan | green | emerald`

Colors defined in `SimpleDashboard.css` as `.sd-card--{color}`

---

## 🔄 Migration Path

When ready to unify (Phase 3):

### Step 1: Update App.tsx Stats
```tsx
// BEFORE
<SdCard color="purple" label="Total Patients" value="0" sub="Registered" />

// AFTER  
<StatCard color="primary" label="Total Patients" value={stats?.total_patients || 0} />
```

### Step 2: Add Subtitle Support (Optional)
If we want to keep subtitles, add to StatCard:
```tsx
interface StatCardProps {
  // ... existing props
  subtitle?: string;  // Optional "Registered", "Waiting", etc.
}
```

### Step 3: Remove SdCard
- Delete `SdCard` function from App.tsx
- Remove `SimpleDashboard.css` or keep only layout styles
- Test universal dashboard

### Step 4: Verify
- [ ] 8 cards display correctly
- [ ] Colors match or are acceptable
- [ ] No layout issues
- [ ] No console errors

---

## 📝 Props Comparison

### StatCard Props
```typescript
{
  label: string;           // "Total Patients"
  value: number | string;  // 42 or "42"
  icon?: React.ReactNode;  // Optional (not rendered)
  color: string;           // Color name
  loading?: boolean;       // Show skeleton
}
```

### SdCard Props
```typescript
{
  color: string;   // "purple", "blue", etc.
  label: string;   // "Total Patients"
  value: string;   // Must be string
  sub: string;     // "Registered", "Waiting", etc.
}
```

**Key Difference**: SdCard has `sub` prop for subtitle, StatCard doesn't (yet)

---

## 🎯 Recommendations

### For Now (Phase 2):
- ✅ Keep SdCard separate
- ✅ Focus on modal consolidation (Part 2)
- ✅ Document as TODO

### For Phase 3:
- 🔄 Unify SdCard with StatCard
- 🔄 Add subtitle support if needed
- 🔄 Consistent design across all dashboards

### For Phase 4:
- 🎨 Standardize colors
- 🎨 Create theme configuration
- 🎨 Remove CSS dependencies

---

## 📚 Related Files

- `components/common/StatCard/StatCard.tsx` - Unified component
- `App.tsx` (lines 461-470) - SdCard definition
- `pages/Dashboard.tsx` - Role-based dashboards
- `SimpleDashboard.css` - SdCard styling

---

## 🔗 Documentation

- [PHASE_2_PART_1_COMPLETE.md](PHASE_2_PART_1_COMPLETE.md) - Consolidation details
- [FRONTEND_REFACTORING_TODO.md](FRONTEND_REFACTORING_TODO.md) - TODO #1
- [FRONTEND_REFACTORING_PLAN.md](FRONTEND_REFACTORING_PLAN.md) - Main plan

---

**Last Updated**: June 25, 2026  
**Current Status**: StatCard unified for role dashboards, SdCard TODO for universal dashboard
