# Bite Cases Summary - Comprehensive Improvement Plan

## Executive Summary
This document outlines accessibility, HCI, and usability improvements for the Bite Cases Summary page (`BiteCaseRiskDashboard.tsx`) to meet WCAG AA standards and improve overall user experience.

---

## Current Analysis

### File Structure
**Main Component:** `frontend/src/features/bite-cases/pages/BiteCaseRiskDashboard.tsx`
- ~1200+ lines
- Contains: Location Risk Table, Cases Table, Stats, Filters, Modals
- Uses Material-UI components extensively
- Has complex state management and sorting logic

### Key Issues Identified

#### A. Accessibility Issues (WCAG AA)
1. **Color Contrast**
   - ❌ Light gray labels (`var(--bc-muted)`) likely fail WCAG AA (4.5:1)
   - ❌ Small colored pills/chips may have insufficient contrast
   - ❌ Priority badges need contrast verification

2. **Interactive Elements**
   - ❌ Icon-only buttons missing `aria-label`
   - ❌ Some interactive elements < 44x44px click target
   - ❌ Keyboard navigation incomplete
   - ❌ Focus indicators not visible on all interactive elements

3. **Table Accessibility**
   - ❌ Missing `scope` attributes on `<th>` elements
   - ❌ No `aria-sort` for sortable columns
   - ❌ Table rows not keyboard-activatable
   - ❌ No `aria-label` for tables

4. **Screen Reader Support**
   - ❌ Progress bars missing `aria-valuemin/max/now`
   - ❌ Status indicators need better labels
   - ❌ Modal dialogs need `aria-describedby`

#### B. HCI & Usability Issues
1. **Information Density**
   - Too many columns creating horizontal scroll
   - Important actions buried in row actions
   - Stats cards not immediately scannable

2. **Click Efficiency**
   - Multiple clicks needed to view case details
   - Filter application requires extra steps
   - Export functionality hard to find

3. **Visual Hierarchy**
   - Priority levels don't stand out enough
   - Overdue cases not immediately visible
   - Column headers inconsistent sizing

#### C. Responsive & Performance
1. Not optimized for smaller viewports
2. Large data sets may cause rendering delays
3. No virtual scrolling for large lists

---

## Proposed Solutions

### Phase 1: Critical Accessibility Fixes (WCAG AA Compliance)

#### 1.1 Color Contrast Improvements
```typescript
// Before
sx={{ color: 'var(--bc-muted)', fontSize: 10 }}

// After - WCAG AA compliant
sx={{ color: 'var(--bc-text-secondary)', fontSize: 10 }}
// Ensure --bc-text-secondary has 4.5:1 contrast ratio
```

**Files to Update:**
- `BiteCaseRiskDashboard.tsx` - Update all color variables
- Create new CSS variables with WCAG AA compliant colors

**Changes:**
- Replace `--bc-muted` with `--bc-text-secondary` (4.5:1 contrast)
- Update priority pill backgrounds for better contrast
- Ensure all text on colored backgrounds meets AA standards

#### 1.2 Interactive Element Fixes
```typescript
// Add aria-labels to icon buttons
<IconButton 
  aria-label="Filter bite cases by location" 
  onClick={...}
>
  <FilterAltOutlined />
</IconButton>

// Ensure minimum 44x44px click targets
<IconButton 
  sx={{ 
    minWidth: 44, 
    minHeight: 44,
    p: 1.5 // Adequate padding
  }}
>
```

**Changes:**
- Add descriptive `aria-label` to all icon-only buttons
- Increase button sizes to minimum 44x44px
- Add visible focus indicators with `:focus-visible`

#### 1.3 Table Accessibility
```typescript
<TableHead>
  <TableRow>
    <TableCell 
      component="th" 
      scope="col"
      aria-sort={sortDirection}
    >
      Location
    </TableCell>
  </TableRow>
</TableHead>

// Make rows keyboard-navigable
<TableRow 
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleRowClick(row);
    }
  }}
  sx={{
    '&:focus-visible': {
      outline: '2px solid var(--primary)',
      outlineOffset: -2,
    }
  }}
>
```

**Changes:**
- Add `scope="col"` to all `<th>` elements
- Add `aria-sort` for sortable columns
- Make table rows keyboard-activatable
- Add `aria-label` to tables describing their purpose

#### 1.4 Screen Reader Enhancements
```typescript
// Progress bars
<Progress 
  value={compliance} 
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={compliance}
  aria-label={`PEP compliance: ${compliance}%`}
/>

// Status indicators
<Chip 
  label="High Priority"
  aria-label="High priority surveillance - 85 out of 100 risk score"
/>
```

**Changes:**
- Add ARIA attributes to all progress indicators
- Enhance chip/badge labels with context
- Add `aria-describedby` to modals

---

### Phase 2: HCI & Usability Improvements

#### 2.1 Table Column Optimization
**Current columns (too many):**
- Location, Risk Score, Cases/Severity, Cat III, Cat II, Cat I, Animal Types, Follow-Up, Last Incident, Trend, Priority, Actions

**Proposed simplified view:**
- Location
- Priority (with visual indicator)
- Cases & Severity (combined with colored dots)
- Follow-Up Status (compliance + overdue)
- Last Activity
- Quick Actions

**Hidden columns accessible via:**
- Column visibility toggle
- Detailed view modal
- Export (includes all columns)

```typescript
const DEFAULT_VISIBLE_COLUMNS = [
  'location',
  'priority',
  'cases_severity',
  'follow_up',
  'last_activity',
  'actions'
];

const OPTIONAL_COLUMNS = [
  'cat_3',
  'cat_2', 
  'cat_1',
  'animal_types',
  'trend',
  'risk_score'
];
```

#### 2.2 Enhanced Row Actions
```typescript
// Quick action buttons on hover/focus
<TableRow>
  <TableCell>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton 
        size="small"
        aria-label="View location details"
        onClick={() => openDetails(row)}
        sx={{ 
          minWidth: 44, 
          minHeight: 44,
          opacity: 0,
          transition: 'opacity 0.2s',
          'tr:hover &, tr:focus-within &': {
            opacity: 1
          }
        }}
      >
        <OpenInNewOutlined />
      </IconButton>
      <IconButton 
        size="small"
        aria-label="View on map"
      >
        <MapOutlined />
      </IconButton>
    </Box>
  </TableCell>
</TableRow>
```

#### 2.3 Export CSV Feature (Toolbar Integration)
**Current:** No visible export button
**Proposed:** Add to table toolbar

```typescript
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
  <Box>{/* Filters */}</Box>
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Tooltip title="Show/hide columns">
      <IconButton 
        aria-label="Toggle column visibility"
        onClick={handleColumnToggle}
      >
        <ViewColumnOutlined />
      </IconButton>
    </Tooltip>
    <Button
      variant="outlined"
      startIcon={<FileDownloadOutlined />}
      onClick={handleExportCSV}
      aria-label="Export all bite cases to CSV file"
      sx={{ minHeight: 44 }}
    >
      Export CSV
    </Button>
  </Box>
</Box>
```

**Export includes ALL columns:**
- Location, Level, Risk Score, Priority
- Total Cases, Cat I, Cat II, Cat III
- Animal Types (formatted)
- PEP Compliance %, Overdue Count
- Last Incident Date, Days Ago, Trend
- Computed scores for reference

#### 2.4 Improved Visual Hierarchy

**Priority Indicators:**
```typescript
// Make priority more prominent
<PriorityPill 
  level={level}
  score={score}
  size="large" // New prop for better visibility
  sx={{
    fontSize: 13, // Increased from 11
    py: 0.75,     // More padding
    px: 1.5,
    fontWeight: 700,
    boxShadow: level === 'high' 
      ? '0 2px 8px rgba(220, 38, 38, 0.25)' 
      : undefined
  }}
/>
```

**Overdue Cases Highlight:**
```typescript
<TableRow 
  sx={{
    bgcolor: row.overdue_doses > 0 
      ? 'var(--bc-danger-bg-subtle)' 
      : undefined,
    borderLeft: row.overdue_doses > 0 
      ? '4px solid var(--bc-red)' 
      : undefined
  }}
>
```

---

### Phase 3: Responsive & Performance

#### 3.1 Responsive Table Design
```typescript
// Mobile: Stack important info
{isMobile ? (
  <Box>
    {filteredLocations.map(row => (
      <MobileLocationCard key={row.location} location={row} />
    ))}
  </Box>
) : (
  <Table>{/* Desktop table */}</Table>
)}
```

#### 3.2 Virtual Scrolling (if needed)
```typescript
// For large datasets (>100 rows)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={filteredLocations.length}
  itemSize={72}
>
  {({ index, style }) => (
    <LocationRow 
      location={filteredLocations[index]} 
      style={style} 
    />
  )}
</FixedSizeList>
```

---

### Phase 4: Animation & Motion

#### 4.1 Reduced Motion Support
```typescript
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

const animationDuration = prefersReducedMotion ? 0 : 180;

sx={{
  transition: prefersReducedMotion 
    ? 'none' 
    : 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
}}
```

#### 4.2 Subtle Animations
```typescript
// Hover effects
sx={{
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    transform: prefersReducedMotion ? 'none' : 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }
}}
```

---

## Implementation Plan

### Week 1: Critical Accessibility (Phase 1)
- [ ] Day 1-2: Color contrast fixes (1.1)
- [ ] Day 3: Interactive element accessibility (1.2)
- [ ] Day 4: Table accessibility (1.3)
- [ ] Day 5: Screen reader support (1.4)
- [ ] Test with keyboard only & screen reader

### Week 2: Usability Improvements (Phase 2)
- [ ] Day 1-2: Column optimization & visibility toggle (2.1)
- [ ] Day 3: Enhanced row actions (2.2)
- [ ] Day 4: Export CSV feature (2.3)
- [ ] Day 5: Visual hierarchy improvements (2.4)
- [ ] User testing

### Week 3: Responsive & Polish (Phase 3-4)
- [ ] Day 1-2: Responsive design (3.1)
- [ ] Day 3: Performance optimization (3.2)
- [ ] Day 4: Animation & motion (4.1-4.2)
- [ ] Day 5: Final testing & bug fixes

---

## Files to Modify

### Primary Files
1. **BiteCaseRiskDashboard.tsx** (main component)
   - Add accessibility attributes
   - Implement column visibility
   - Add export functionality
   - Enhance keyboard navigation
   - Improve visual styling

### Supporting Files (create if needed)
2. **biteCaseUtils.ts** (new)
   - Export CSV logic
   - Column visibility helpers
   - Accessibility helpers

3. **styles/biteCases.css** (new)
   - WCAG AA compliant color variables
   - Focus styles
   - Reduced motion queries

### Components to Extract
4. **LocationTableRow.tsx** (new)
   - Dedicated row component
   - Better keyboard handling
   - Cleaner code separation

5. **ColumnVisibilityMenu.tsx** (new)
   - Reusable column toggle
   - Persistent preferences

---

## Success Metrics

### Accessibility
- ✅ All color contrasts meet WCAG AA (4.5:1 minimum)
- ✅ All interactive elements ≥ 44x44px
- ✅ 100% keyboard navigable
- ✅ Screen reader announces all content correctly
- ✅ Focus indicators visible on all focusable elements

### Usability
- ✅ Reduced clicks to view details (1 click vs 3)
- ✅ Export accessible in ≤ 2 clicks
- ✅ Priority cases immediately identifiable
- ✅ Overdue patients highlighted
- ✅ Mobile-friendly responsive design

### Performance
- ✅ Initial load < 2 seconds
- ✅ Smooth scrolling (60fps)
- ✅ Filter response < 300ms

---

## Testing Checklist

### Manual Testing
- [ ] Test with keyboard only (no mouse)
- [ ] Test with NVDA/JAWS screen reader
- [ ] Test in light and dark modes
- [ ] Test on mobile devices
- [ ] Test with browser zoom (200%)
- [ ] Test with reduced motion enabled

### Automated Testing
- [ ] Run axe DevTools accessibility scan
- [ ] Check color contrast with online tools
- [ ] Validate ARIA attributes
- [ ] Test export CSV functionality

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS/Android)

---

## Limitations & Notes

### What We CANNOT Change
- ❌ Backend API structure
- ❌ Risk score calculation logic (in `computePriorityBreakdown`)
- ❌ Data model for cases/locations
- ❌ Authentication/permissions

### What We CAN Change
- ✅ All UI/UX presentation
- ✅ Frontend state management
- ✅ Column visibility and ordering
- ✅ Export formatting
- ✅ Accessibility attributes
- ✅ Styling and animations
- ✅ Keyboard interactions

---

## Risk Assessment

### Low Risk Changes
- Adding ARIA attributes
- Color contrast improvements
- Button sizing
- Export CSV feature

### Medium Risk Changes
- Column visibility toggle (requires testing)
- Table row keyboard navigation
- Responsive layout

### High Risk Changes
- Virtual scrolling (complex, test thoroughly)
- Major state management refactoring

---

## Rollback Plan

1. Keep original component as `BiteCaseRiskDashboard.backup.tsx`
2. Feature flag for new improvements
3. A/B test with subset of users
4. Monitor error logs and user feedback
5. Quick revert option if critical issues found

---

## Next Steps

After approval of this plan:
1. Create feature branch: `feature/bite-cases-accessibility`
2. Implement Phase 1 (Week 1)
3. Submit PR for review after each phase
4. Conduct user acceptance testing
5. Deploy incrementally with monitoring

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-05  
**Author:** Development Team  
**Status:** Awaiting Approval
