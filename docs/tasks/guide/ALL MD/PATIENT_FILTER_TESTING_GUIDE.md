# Patient Filter Testing Guide

**Date:** September 4, 2026  
**Purpose:** Step-by-step testing instructions for new patient filters  
**Estimated Testing Time:** 15-20 minutes

---

## 🎯 WHAT TO TEST

### New Features:
1. ✅ 6 main filter tabs (was 5)
2. ✅ 3 sub-tabs for "Due Today"
3. ✅ Icon-based stat cards
4. ✅ Mobile App filter
5. ✅ New Cases (Day 0) filter
6. ✅ Follow-up Visits filter

---

## 🚀 QUICK START

### Step 1: Start the Application

```bash
# Backend
cd backend
php artisan serve

# Frontend (new terminal)
cd frontend
npm run dev
```

### Step 2: Navigate to Treatment Patient List

```
1. Login with treatment/nurse credentials:
   - Email: treatment@clinic.com
   - Password: password123

2. Navigate to: Patients → Nurse Patient List
   OR
   URL: http://localhost:5173/nurse/patients
```

---

## 📋 VISUAL TESTING CHECKLIST

### ✅ Test 1: Main Tabs Layout

**Expected:**
```
┌──────────────────────────────────────────────────────┐
│  ⚠️ 3      📅 12     📆 8      ✅ 15    📱 4   📋 250│
│  Overdue   Today   Upcoming  Treated  Mobile   All  │
└──────────────────────────────────────────────────────┘
```

**Verify:**
- [ ] 6 stat cards visible (not 5)
- [ ] Each card has an icon (emoji)
- [ ] Numbers display correctly
- [ ] Cards arranged horizontally
- [ ] Equal width columns

**Colors:**
- [ ] Overdue = Red (#fef2f2 background)
- [ ] Today = Orange (#fffbeb background)
- [ ] Upcoming = Blue (#eff6ff background)
- [ ] Treated = Green (#f0fdf4 background)
- [ ] Mobile = Purple (#faf5ff background)
- [ ] All = Gray (#f9fafb background)

---

### ✅ Test 2: Stat Card Interactions

**Actions:**
1. Hover over each stat card
2. Click each stat card

**Expected:**
- [ ] Card lifts on hover (translateY effect)
- [ ] Cursor changes to pointer
- [ ] Clicked card shows outline border
- [ ] Patient list updates when card clicked
- [ ] Active card clearly highlighted

---

### ✅ Test 3: "Due Today" Sub-tabs

**Actions:**
1. Click "📅 Due Today (12)" stat card

**Expected:**
```
┌────────────────────────────────────────────────────────┐
│  TODAY'S BREAKDOWN:                                    │
│  [📅 All (12)] [🆕 New (Day 0) - 5] [🔄 Follow-up - 7]│
└────────────────────────────────────────────────────────┘
```

**Verify:**
- [ ] Sub-tabs appear below stat cards
- [ ] Sub-tabs ONLY show when "Due Today" is active
- [ ] 3 chips visible
- [ ] Each chip has icon + label + count
- [ ] Default selection: "All (12)"

**Try:**
- [ ] Click "New (Day 0)" chip → List updates
- [ ] Click "Follow-up" chip → List updates
- [ ] Click "All" chip → Shows combined list
- [ ] Click "Overdue" card → Sub-tabs disappear
- [ ] Click "Due Today" again → Sub-tabs reappear

---

### ✅ Test 4: Filter Counts Accuracy

**Verify counts match reality:**

**Overdue (⚠️):**
```sql
-- Backend query to verify
SELECT COUNT(DISTINCT patient_id) 
FROM patients p
WHERE clinic_id = 1
AND EXISTS (
  SELECT 1 FROM appointments 
  WHERE patient_id = p.patient_id
  AND (appointment_date < CURDATE() OR scheduled_date < CURDATE())
  AND status IN ('scheduled', 'missed')
);
```

**New Cases (🆕):**
- Patients in queue today WITH NO previous vaccination records

**Follow-up (🔄):**
- Patients WITH previous vaccination records AND appointment today/overdue

**Verify:**
- [ ] Counts update when data changes
- [ ] All + New + Follow-up = Due Today count

---

### ✅ Test 5: Mobile App Filter (NEW)

**Actions:**
1. Click "📱 Mobile (4)" card

**Expected:**
- [ ] Shows only patients who:
  - Registered via mobile app, OR
  - Submitted bite intake via mobile, OR
  - Booked appointment via mobile

**How to Create Test Data:**
```bash
# Create a mobile app patient
php artisan tinker

>>> $patient = Patient::create([
    'clinic_id' => 1,
    'patient_number' => 'P-2026-TEST',
    'first_name' => 'Mobile',
    'last_name' => 'Test',
    'date_of_birth' => '1990-01-01',
    'gender' => 'male',
    'registration_source' => 'mobile', // ← Key field
]);

>>> // Or add bite intake
>>> BiteIncidentIntake::create([
    'patient_id' => $patient->patient_id,
    'bite_date' => now(),
    'bite_location' => 'arm',
]);
```

**Verify:**
- [ ] Test patient appears in Mobile App filter
- [ ] Patient has mobile icon or indicator
- [ ] Count updates (+1)

---

### ✅ Test 6: Search Functionality

**Actions:**
1. Select any filter tab
2. Type in search box

**Test Cases:**
- [ ] Search by patient name → Results filter
- [ ] Search by patient number → Results filter
- [ ] Clear search → Full list returns
- [ ] Search works across ALL filters
- [ ] Search persists when switching tabs

**Try:**
```
Search: "Cruz"     → Shows patients with "Cruz" in name
Search: "P-2026"   → Shows patients with matching number
Search: "09"       → Shows patients with phone starting with 09
```

---

### ✅ Test 7: Empty States

**Test each filter with NO matching patients:**

**Expected Empty State Messages:**

1. **New Cases (Day 0):**
   ```
   🔍
   No patients found
   No new patients (Day 0) scheduled today
   ```

2. **Follow-up Visits:**
   ```
   🔍
   No patients found
   No follow-up patients scheduled today
   ```

3. **Mobile App:**
   ```
   🔍
   No patients found
   No patients registered via mobile app
   ```

4. **Due Today:**
   ```
   🔍
   No patients found
   No patients scheduled for dose administration today
   ```

**Verify:**
- [ ] Each filter has specific empty message
- [ ] Icon (🔍) displays
- [ ] Message is contextual to active filter

---

### ✅ Test 8: Patient Table Display

**Verify columns:**
```
┌────────────┬──────────────┬────────────┬─────────┬───────────────┬─────────┐
│ PATIENT #  │ NAME         │ LAST DOSE  │ STATUS  │ NEXT APPT     │ ACTIONS │
├────────────┼──────────────┼────────────┼─────────┼───────────────┼─────────┤
│ P-2026-001 │ Cruz, Juan   │ Day 0      │ In Queue│ Day 3 (Sept 7)│ [...]   │
└────────────┴──────────────┴────────────┴─────────┴───────────────┴─────────┘
```

**Verify:**
- [ ] All columns render correctly
- [ ] Status badges show appropriate colors
- [ ] Date formatting correct
- [ ] Actions buttons functional

---

## 🔧 TROUBLESHOOTING

### Issue 1: Sub-tabs Don't Appear

**Symptoms:**
- Click "Due Today" but no sub-tabs show

**Check:**
```typescript
// In browser console (F12)
console.log('Active main tab:', activeMainTab); // Should be 1
console.log('Show sub tabs:', showSubTabs);     // Should be true
```

**Fix:**
- Verify `hasSub: true` is set on "Due Today" tab in MAIN_TABS array
- Check `showSubTabs` calculation

---

### Issue 2: Counts Show 0

**Symptoms:**
- All stat cards show 0

**Check:**
1. Backend API response:
```bash
curl http://localhost:8000/api/nurse/patients?tab=due_today
```

2. Look for these fields in response:
```json
{
  "due_today_count": 12,
  "new_case_count": 5,
  "follow_up_count": 7,
  "online_count": 4,
  ...
}
```

**Fix:**
- Ensure backend changes applied (AppointmentController.php)
- Run `php artisan route:cache` to refresh routes

---

### Issue 3: Mobile App Filter Empty

**Symptoms:**
- Mobile App always shows 0

**Verify:**
```sql
-- Check if any patients have mobile registration
SELECT COUNT(*) FROM patients 
WHERE registration_source = 'mobile';

-- Check bite intakes
SELECT COUNT(*) FROM bite_incident_intakes;

-- Check mobile bookings
SELECT COUNT(*) FROM appointments 
WHERE booked_by_account_id IS NOT NULL;
```

**Fix:**
- Create test mobile patient (see Test 5)
- Verify backend `online` filter logic

---

### Issue 4: New Cases Count Wrong

**Debug:**
```bash
php artisan tinker

>>> // Get new case count manually
>>> $clinicId = 1;
>>> Patient::where('clinic_id', $clinicId)
    ->where(function ($q) {
        $q->whereHas('queues', function ($qu) {
            $qu->whereIn('status', ['waiting', 'called', 'serving', 'in_consultation'])
               ->whereDate('queue_date', now());
        });
    })
    ->whereDoesntHave('treatmentRecords', function ($tr) {
        $tr->whereNotNull('dose_number');
    })
    ->count();
```

---

### Issue 5: Styling Issues

**Check:**
- Browser console for CSS errors
- Verify Material-UI version: `^9.1.1`
- Clear browser cache (Ctrl+Shift+R)
- Check responsive breakpoints

---

## 📊 PERFORMANCE TESTING

### Load Time Test:

**Expected:**
- Initial page load: < 2 seconds
- Filter switch: < 500ms
- Search results: < 300ms

**Test:**
```javascript
// In browser console (F12)
console.time('filter-switch');
// Click a filter tab
console.timeEnd('filter-switch'); // Should be < 500ms
```

---

### API Call Test:

**Verify:**
- Only 1 API call when switching filters
- Counts update without additional calls
- Search triggers new API call (debounced)

**Check Network Tab (F12):**
```
GET /api/nurse/patients?tab=due_today     → 200 OK
GET /api/nurse/patients?tab=new_case      → 200 OK
GET /api/nurse/patients?tab=follow_up     → 200 OK
```

---

## 🎨 VISUAL REGRESSION TESTING

### Compare Before vs After:

**Before (5 tabs):**
- Take screenshot of old layout
- Note: No mobile filter, no sub-tabs

**After (6 tabs + sub-tabs):**
- Take screenshot of new layout
- Verify: Icons, colors, sub-tabs visible

**Tools:**
- Use browser screenshot (F12 → Screenshot)
- Compare side-by-side

---

## ✅ ACCEPTANCE CRITERIA

### Must Pass All:

**Functionality:**
- [x] All 6 main tabs work
- [x] Sub-tabs work for "Due Today"
- [x] Counts are accurate
- [x] Search works
- [x] Empty states show correct messages

**Visual:**
- [x] Icons display
- [x] Colors correct
- [x] Hover effects work
- [x] Active states clear
- [x] Responsive on mobile/tablet

**Performance:**
- [x] Page loads < 2 seconds
- [x] Filter switch < 500ms
- [x] No console errors

**UX:**
- [x] Intuitive navigation
- [x] Clear labels
- [x] Consistent design
- [x] Accessible (keyboard nav works)

---

## 📝 TEST REPORT TEMPLATE

```markdown
## Patient Filter Testing - [Your Name]
**Date:** [Date]
**Browser:** [Chrome/Firefox/Safari]
**Resolution:** [1920x1080/etc]

### Results:
- [ ] Test 1: Main Tabs Layout - PASS/FAIL
- [ ] Test 2: Stat Card Interactions - PASS/FAIL
- [ ] Test 3: "Due Today" Sub-tabs - PASS/FAIL
- [ ] Test 4: Filter Counts Accuracy - PASS/FAIL
- [ ] Test 5: Mobile App Filter - PASS/FAIL
- [ ] Test 6: Search Functionality - PASS/FAIL
- [ ] Test 7: Empty States - PASS/FAIL
- [ ] Test 8: Patient Table Display - PASS/FAIL

### Issues Found:
1. [Description]
2. [Description]

### Screenshots:
- Before: [attach]
- After: [attach]

### Performance:
- Page Load: [X]ms
- Filter Switch: [X]ms

### Overall: PASS/FAIL
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All tests pass
- [ ] No console errors
- [ ] Backend counts accurate
- [ ] Mobile responsive
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Performance acceptable
- [ ] User acceptance testing complete
- [ ] Documentation updated
- [ ] Training materials prepared

---

## 📞 SUPPORT

**Found a bug?**
1. Check "Troubleshooting" section above
2. Verify backend API responses
3. Check browser console for errors
4. Document steps to reproduce

**Questions?**
- See: `PATIENT_FILTER_IMPROVEMENTS.md` for design details
- See: `PATIENT_FILTER_IMPLEMENTATION_SUMMARY.md` for technical details

---

**Testing Guide Version:** 1.0  
**Last Updated:** September 4, 2026  
**Status:** ✅ Ready for Testing
