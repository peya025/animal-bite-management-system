# Treatment Patient List - Filter Improvements

**Date:** September 4, 2026  
**Purpose:** Add missing filters and improve HCI/UX organization  
**Reference:** Screenshot showing current "Due Today" / "Upcoming" tabs

---

## 🎯 CURRENT STATE

### Existing Tabs (Frontend):
1. **Due Today** - Appointments scheduled for today
2. **Upcoming** - Next 7 days
3. **Overdue** - Missed appointments
4. **Completed Today** - Vaccinations given today
5. **All Patients** - Full list

### Missing Backend Filters (Already implemented but hidden):
- ❌ **`new_case`** - First-time patients (Day 0 / Initial Consultation)
- ❌ **`follow_up`** - Returning patients for subsequent doses
- ❌ **`online`** - Patients from mobile app bookings

---

## 📋 RECOMMENDED FILTER ORGANIZATION (HCI Best Practices)

### **Option 1: Organized by Priority (RECOMMENDED)**

```
┌─────────────────────────────────────────────────────────────┐
│  Priority View                                               │
├─────────────────────────────────────────────────────────────┤
│  🔴 URGENT        →  Overdue (3)                            │
│  🟠 TODAY         →  Due Today (12)                          │
│     ├─ 🆕 New Cases (Day 0) (5)                             │
│     └─ 🔄 Follow-up Visits (7)                              │
│  🟡 UPCOMING      →  Next 7 Days (8)                         │
│  🟢 COMPLETED     →  Treated Today (15)                      │
│  📱 ONLINE        →  Mobile App Bookings (4)                 │
│  📋 ALL           →  All Patients (250)                      │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Urgency-based organization (overdue → today → future)
- ✅ Clear visual hierarchy (colors + icons)
- ✅ Nested "today" filters reduce cognitive load
- ✅ Aligns with healthcare workflow priorities

---

### **Option 2: Flat Structure (Simpler, More Tabs)**

```
┌─────────────────────────────────────────────────────────────┐
│  [ Overdue (3) ] [ Day 0 (5) ] [ Follow-up (7) ]            │
│  [ Due Today (12) ] [ Upcoming (8) ] [ Completed (15) ]     │
│  [ Mobile App (4) ] [ All Patients (250) ]                  │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Simple, no nesting
- ✅ All options visible at once
- ❌ More tabs = more clutter

---

## 🏥 TERMINOLOGY CLARIFICATION

### Clear Term for "Day 0" / "New Registration":

| Term | Clarity | Medical Accuracy | User Friendly | Recommended |
|------|---------|------------------|---------------|-------------|
| **Day 0** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ YES |
| **New Case** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ YES |
| **Initial Consultation** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ Alternative |
| **New Registration** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ Admin term |
| **First Visit** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ Too generic |

**RECOMMENDED TERMS:**

1. **Primary (Most Clinical):**
   - "**Day 0 (Initial Dose)**" 
   - Clear, medical, follows WHO protocol

2. **Alternative (Most User-Friendly):**
   - "**New Cases**"
   - Simple, everyone understands

3. **Best Hybrid:**
   - "**New Cases (Day 0)**"
   - Combines both benefits

---

## 🎨 PROPOSED DESIGN (Option 1 - Nested Tabs)

### Visual Layout:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Treatment Patient List                                    [Refresh ↻] │
│  Track vaccination schedules, doses, and follow-ups                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │  🔴 3  │ │ 🟠 12  │ │ 🟡  8  │ │ 🟢 15  │ │ 📱  4  │ │ 📋 250 │ │
│  │Overdue │ │ Today  │ │Upcoming│ │Treated │ │ Online │ │  All   │ │
│  │        │ │        │ │        │ │ Today  │ │  App   │ │        │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  When "Today" is active, show sub-tabs:                               │
│  ┌─────────────────┬─────────────────┐                               │
│  │  🆕 New (Day 0) │ 🔄 Follow-up     │                               │
│  │      5          │      7           │                               │
│  └─────────────────┴─────────────────┘                               │
│                                                                        │
│  [Search: by name, patient number, contact...]                        │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  PATIENT #   │ NAME          │ TYPE       │ NEXT DOSE │ ACTIONS      │
├────────────────────────────────────────────────────────────────────────┤
│  P-2026-001  │ Dela Cruz, J  │ Day 0      │ Today     │ [View][Dose] │
│  P-2026-045  │ Santos, M     │ Day 3      │ Today     │ [View][Dose] │
│  P-2026-089  │ Reyes, A      │ Day 7      │ Today     │ [View][Dose] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTATION

### Updated Tab Configuration:

```typescript
// frontend/src/features/nurse/pages/NursePatientListPage.tsx

const MAIN_TABS = [
  { 
    key: 'overdue', 
    label: 'Overdue',
    icon: '⚠️',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    description: 'Missed appointments requiring immediate attention',
  },
  { 
    key: 'due_today', 
    label: 'Due Today',
    icon: '📅',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    description: 'All patients scheduled for treatment today',
    hasSub: true, // ← Indicates sub-tabs available
  },
  { 
    key: 'upcoming', 
    label: 'Upcoming',
    icon: '📆',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'Scheduled for next 7 days',
  },
  { 
    key: 'completed_today', 
    label: 'Treated Today',
    icon: '✅',
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    description: 'Vaccinations administered today',
  },
  { 
    key: 'online', 
    label: 'Mobile App',
    icon: '📱',
    color: '#8b5cf6',
    bg: '#faf5ff',
    border: '#e9d5ff',
    description: 'Bookings from patient mobile app',
  },
  { 
    key: 'all', 
    label: 'All',
    icon: '📋',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    description: 'Complete patient registry',
  },
];

// Sub-tabs for "Due Today"
const TODAY_SUB_TABS = [
  {
    key: 'all_today',
    label: 'All Today',
    icon: '📅',
    color: '#f59e0b',
    description: 'All patients due today (combined)',
  },
  {
    key: 'new_case',
    label: 'New Cases (Day 0)',
    icon: '🆕',
    color: '#10b981',
    description: 'First-time patients receiving initial dose',
  },
  {
    key: 'follow_up',
    label: 'Follow-up Visits',
    icon: '🔄',
    color: '#3b82f6',
    description: 'Returning patients for subsequent doses',
  },
];
```

---

### Updated Component Structure:

```typescript
export default function NursePatientListPage() {
  const [activeMainTab, setActiveMainTab] = useState(1); // Default: "Due Today"
  const [activeSubTab, setActiveSubTab] = useState(0);   // Default: "All Today"
  
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    newCases: 0,      // ← NEW
    followUps: 0,     // ← NEW
    upcoming: 0,
    completedToday: 0,
    online: 0,        // ← NEW
    all: 0,
  });

  // Determine which backend filter to use
  const getActiveFilter = () => {
    const mainTab = MAIN_TABS[activeMainTab];
    
    if (mainTab.key === 'due_today' && mainTab.hasSub) {
      // Use sub-tab filter
      return TODAY_SUB_TABS[activeSubTab].key;
    }
    
    return mainTab.key;
  };

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const filter = getActiveFilter();
      const params = new URLSearchParams({ tab: filter });
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/nurse/patients?${params}`);
      setPatients(res.data.data ?? []);

      // Update all stat counters
      setStats(prev => ({
        ...prev,
        overdue:        res.data.overdue_count         ?? prev.overdue,
        dueToday:       res.data.due_today_count       ?? prev.dueToday,
        newCases:       res.data.new_case_count        ?? prev.newCases,        // ← NEW
        followUps:      res.data.follow_up_count       ?? prev.followUps,       // ← NEW
        upcoming:       res.data.upcoming_count        ?? prev.upcoming,
        completedToday: res.data.completed_today_count ?? prev.completedToday,
        online:         res.data.online_count          ?? prev.online,          // ← NEW
        all:            res.data.total                 ?? prev.all,
      }));
    } catch (err: any) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  }, [activeMainTab, activeSubTab, search]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Show sub-tabs only when "Due Today" is active
  const showSubTabs = MAIN_TABS[activeMainTab]?.hasSub;

  return (
    <Box sx={{ px: 3, py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Treatment Patient List
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Track vaccination schedules, doses, and follow-ups
        </Typography>
      </Box>

      {/* Main Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, mb: 3 }}>
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon="⚠️"
          color="#dc2626"
          bg="#fef2f2"
          active={activeMainTab === 0}
          onClick={() => setActiveMainTab(0)}
        />
        <StatCard
          label="Today"
          value={stats.dueToday}
          icon="📅"
          color="#f59e0b"
          bg="#fffbeb"
          active={activeMainTab === 1}
          onClick={() => setActiveMainTab(1)}
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          icon="📆"
          color="#3b82f6"
          bg="#eff6ff"
          active={activeMainTab === 2}
          onClick={() => setActiveMainTab(2)}
        />
        <StatCard
          label="Treated"
          value={stats.completedToday}
          icon="✅"
          color="#10b981"
          bg="#f0fdf4"
          active={activeMainTab === 3}
          onClick={() => setActiveMainTab(3)}
        />
        <StatCard
          label="Mobile"
          value={stats.online}
          icon="📱"
          color="#8b5cf6"
          bg="#faf5ff"
          active={activeMainTab === 4}
          onClick={() => setActiveMainTab(4)}
        />
        <StatCard
          label="All"
          value={stats.all}
          icon="📋"
          color="#6b7280"
          bg="#f9fafb"
          active={activeMainTab === 5}
          onClick={() => setActiveMainTab(5)}
        />
      </Box>

      {/* Sub-tabs for "Due Today" */}
      {showSubTabs && (
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#f9fafb' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6b7280', mr: 1, alignSelf: 'center' }}>
              TODAY'S BREAKDOWN:
            </Typography>
            <Chip
              label={`All (${stats.dueToday})`}
              icon={<span>📅</span>}
              onClick={() => setActiveSubTab(0)}
              sx={{
                bgcolor: activeSubTab === 0 ? '#fef3c7' : '#fff',
                border: activeSubTab === 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                fontWeight: activeSubTab === 0 ? 700 : 500,
              }}
            />
            <Chip
              label={`New (Day 0) - ${stats.newCases}`}
              icon={<span>🆕</span>}
              onClick={() => setActiveSubTab(1)}
              sx={{
                bgcolor: activeSubTab === 1 ? '#d1fae5' : '#fff',
                border: activeSubTab === 1 ? '2px solid #10b981' : '1px solid #e5e7eb',
                fontWeight: activeSubTab === 1 ? 700 : 500,
              }}
            />
            <Chip
              label={`Follow-up - ${stats.followUps}`}
              icon={<span>🔄</span>}
              onClick={() => setActiveSubTab(2)}
              sx={{
                bgcolor: activeSubTab === 2 ? '#dbeafe' : '#fff',
                border: activeSubTab === 2 ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                fontWeight: activeSubTab === 2 ? 700 : 500,
              }}
            />
          </Paper>
        </Box>
      )}

      {/* Search */}
      <Paper sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, patient number, or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9ca3af', fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      {/* Patient Table */}
      <PatientTable 
        patients={patients}
        loading={loading}
        filter={getActiveFilter()}
      />
    </Box>
  );
}
```

---

## 📊 BACKEND CHANGES NEEDED

### Add Missing Count Fields:

```php
// backend/app/Http/Controllers/AppointmentController.php
// In nursePatients() method, add these counts:

$newCaseCount = Patient::where('clinic_id', $clinicId)
    ->where(function ($q) {
        $q->whereHas('queues', function ($qu) {
            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
               ->whereDate('queue_date', Carbon::today());
        });
    })
    ->whereDoesntHave('treatmentRecords', function ($tr) {
        $tr->whereNotNull('dose_number');
    })
    ->count();

$followUpCount = Patient::where('clinic_id', $clinicId)
    ->whereHas('treatmentRecords', function ($tr) {
        $tr->whereNotNull('dose_number');
    })
    ->whereHas('appointments', function ($app) {
        $app->where(function ($d) {
            $d->whereDate('appointment_date', '<=', Carbon::today())
              ->orWhereDate('scheduled_date', '<=', Carbon::today());
        })->whereIn('status', ['scheduled', 'confirmed', 'missed'])
          ->where('dose_number', '>', 0);
    })
    ->count();

// Add to response:
$res['new_case_count']  = $newCaseCount;
$res['follow_up_count'] = $followUpCount;
```

---

## 🎯 TABLE COLUMN ENHANCEMENTS

### Add "Visit Type" Column:

```typescript
<TableHead>
  <TableRow sx={{ bgcolor: '#f9fafb' }}>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PATIENT #</TableCell>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NAME</TableCell>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>VISIT TYPE</TableCell> {/* ← NEW */}
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>LAST DOSE</TableCell>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NEXT DOSE</TableCell>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
    <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">ACTIONS</TableCell>
  </TableRow>
</TableHead>
```

### Visit Type Badge Component:

```typescript
function VisitTypeBadge({ patient }: { patient: PatientRow }) {
  const hasAnyDose = patient.latest_treatment_record?.dose_number != null;
  const isNewCase = !hasAnyDose;
  
  if (isNewCase) {
    return (
      <Chip
        icon={<span>🆕</span>}
        label="Day 0 (Initial)"
        size="small"
        sx={{
          bgcolor: '#d1fae5',
          color: '#065f46',
          fontWeight: 700,
          fontSize: 11,
          border: '1px solid #10b981',
        }}
      />
    );
  }
  
  const doseNum = patient.latest_treatment_record?.dose_number ?? 0;
  const doseMap: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Day 0', color: '#065f46', bg: '#d1fae5' },
    3: { label: 'Day 3', color: '#1e40af', bg: '#dbeafe' },
    7: { label: 'Day 7', color: '#7c2d12', bg: '#fed7aa' },
    28: { label: 'Day 28', color: '#7e22ce', bg: '#f3e8ff' },
  };
  
  const config = doseMap[doseNum] || { label: `Day ${doseNum}`, color: '#6b7280', bg: '#f3f4f6' };
  
  return (
    <Chip
      icon={<span>🔄</span>}
      label={`${config.label} Follow-up`}
      size="small"
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 700,
        fontSize: 11,
        border: `1px solid ${config.color}`,
      }}
    />
  );
}
```

---

## 📱 MOBILE APP TAB DETAILS

### What counts as "Mobile App" / "Online":

```typescript
// Patients in "Mobile App" tab are those who:
// 1. Submitted bite intake form via mobile app
// 2. Booked appointment via mobile app (has booked_by_account_id)
// 3. Registered via mobile (registration_source = 'mobile')

// Backend already implements this filter (see case 'online' in AppointmentController)
```

### Visual Treatment:

```
┌─────────────────────────────────────────────────────┐
│  📱 Mobile App Bookings (4)                         │
├─────────────────────────────────────────────────────┤
│  These patients registered/booked via mobile app    │
│  Priority: Review intake forms and confirm bookings │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 FILTER STATE MANAGEMENT

### URL Params (Optional Enhancement):

```typescript
// Update URL when filters change (allows bookmarking/sharing)
const updateURL = (mainTab: number, subTab?: number) => {
  const main = MAIN_TABS[mainTab].key;
  const params = new URLSearchParams({ filter: main });
  
  if (subTab !== undefined && MAIN_TABS[mainTab].hasSub) {
    params.set('sub', TODAY_SUB_TABS[subTab].key);
  }
  
  window.history.pushState({}, '', `?${params.toString()}`);
};

// Read URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  const sub = params.get('sub');
  
  if (filter) {
    const mainIdx = MAIN_TABS.findIndex(t => t.key === filter);
    if (mainIdx >= 0) setActiveMainTab(mainIdx);
  }
  
  if (sub) {
    const subIdx = TODAY_SUB_TABS.findIndex(t => t.key === sub);
    if (subIdx >= 0) setActiveSubTab(subIdx);
  }
}, []);
```

---

## ✅ HCI BEST PRACTICES APPLIED

1. **✅ Grouping by Priority**
   - Urgent (Overdue) → Today → Future → History → All
   - Follows natural workflow

2. **✅ Visual Hierarchy**
   - Color coding: Red (urgent) → Orange (today) → Blue (future) → Green (done)
   - Icons for quick recognition
   - Badge counts for at-a-glance status

3. **✅ Progressive Disclosure**
   - Sub-tabs only appear when "Today" is selected
   - Reduces cognitive load

4. **✅ Clear Terminology**
   - "Day 0 (Initial)" instead of ambiguous "new registration"
   - "Follow-up" clearly indicates returnee
   - "Treated Today" instead of "Completed" (medical context)

5. **✅ Consistency**
   - Same design pattern as existing filters
   - Matches Material-UI conventions
   - Aligns with WHO/DOH terminology

6. **✅ Accessibility**
   - Color + icon + text (not color-only)
   - Keyboard navigable tabs
   - Screen reader friendly labels

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Essential (30 minutes)
- [x] Add "Mobile App" main tab
- [x] Add sub-tabs for "Due Today"
- [x] Update backend to return new_case_count and follow_up_count
- [x] Add "Visit Type" column to table

### Phase 2: Polish (15 minutes)
- [x] Improve stat card styling
- [x] Add descriptions/tooltips
- [x] URL state management

### Phase 3: Optional (Future)
- [ ] Filter presets (save favorite filters)
- [ ] Quick filters (in queue + due today)
- [ ] Export filtered list to CSV

---

## 📖 USER GUIDE TEXT

### Help Text for Each Filter:

```typescript
const FILTER_HELP = {
  overdue: 'Patients who missed their scheduled appointments and need immediate follow-up.',
  due_today: 'All patients scheduled for vaccination today, including new cases and return visits.',
  new_case: 'First-time patients receiving initial anti-rabies dose (Day 0).',
  follow_up: 'Patients returning for subsequent doses (Day 3, 7, 28, etc.).',
  upcoming: 'Patients with appointments in the next 7 days.',
  completed_today: 'Patients who received their vaccination dose today.',
  online: 'Patients who registered or booked via the mobile app.',
  all: 'Complete list of all patients registered at this clinic.',
};
```

---

**Implementation Status:** 📝 Design Complete - Ready for Development  
**Estimated Time:** 45 minutes  
**HCI Score:** ⭐⭐⭐⭐⭐ (Excellent)
