# Phase 4: Staff Module Assignments - Testing Guide

**Date**: July 31, 2026  
**Feature**: Staff Module Assignment UI  
**Status**: Implementation Complete - Ready for Testing

---

## 📋 Overview

Phase 4 implements the frontend UI for assigning staff members to specific modules (All, Registration, Triage, Treatment, Inventory). This controls which system areas each staff member can access.

### What Was Implemented:

1. **StaffAssignmentPage Component**
   - Staff list with search functionality
   - Module assignment dropdowns for each staff member
   - Real-time updates (changes save immediately on dropdown change)
   - Color-coded badges for visual identification
   - Statistics cards showing distribution across modules
   - Admin-only access

2. **Route Configuration**
   - New route: `/setup/staff-assignments`
   - Added to Clinic Setup submenu in navigation
   - Protected route (admin-only)

3. **API Integration**
   - Uses existing `staffApi.ts` service
   - GET `/api/users` - Load all staff members
   - PUT `/api/users/{id}/assigned-module` - Update assignment

---

## 🧪 Testing Checklist

### Pre-Testing Setup

**Backend Requirements**:
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Frontend Requirements**:
```bash
cd frontend
npm run dev
```

**Test Users Required**:
- ✅ Admin user (to access the page)
- ✅ At least 3-5 staff members with different roles (registration, triage, treatment)

---

## ✅ Manual Test Cases

### Test Case 1: Page Access Control

**Steps**:
1. Log in as **non-admin** user (registration/triage/treatment)
2. Try to navigate to `/setup/staff-assignments`
3. Check if redirected or access denied

**Expected Result**:
- ❌ Non-admin users should NOT see "Staff Assignments" in Clinic Setup menu
- ❌ Direct URL access should be blocked or redirected

**Status**: [ ] Pass [ ] Fail

---

### Test Case 2: Page Load - Admin Access

**Steps**:
1. Log in as **admin** user
2. Click: Clinic Setup → Staff Assignments
3. Wait for page to load

**Expected Result**:
- ✅ Page loads without errors
- ✅ All staff members displayed in table
- ✅ Statistics cards show correct counts
- ✅ Search box is visible and functional

**Status**: [ ] Pass [ ] Fail

**Notes**: _________________________

---

### Test Case 3: Statistics Cards Display

**Steps**:
1. On Staff Assignments page, observe the 6 statistics cards at the top

**Expected Result**:
- Card 1: **Total Staff** - Shows total count of all staff
- Card 2: **All Modules** - Count of staff assigned to "all"
- Card 3: **Registration** - Count of staff assigned to "registration"
- Card 4: **Triage** - Count of staff assigned to "triage"
- Card 5: **Treatment** - Count of staff assigned to "treatment"
- Card 6: **Inventory** - Count of staff assigned to "inventory"

**Verification**:
- ✅ Numbers match actual staff distribution
- ✅ Cards have appropriate color coding
- ✅ Icons display correctly

**Status**: [ ] Pass [ ] Fail

---

### Test Case 4: Staff Table Display

**Steps**:
1. Observe the staff table

**Expected Result**:
- ✅ Table shows: Name, Email, Role, Assigned Module, Actions
- ✅ Each staff member has:
  - Avatar with initials
  - Name displayed
  - Email displayed
  - Role badge (registration/triage/treatment/admin)
  - Current assigned module badge (color-coded)
  - Module dropdown in Actions column

**Status**: [ ] Pass [ ] Fail

---

### Test Case 5: Module Assignment Dropdown

**Steps**:
1. Click on a staff member's module dropdown
2. Observe available options

**Expected Result**:
- ✅ Dropdown shows 5 options:
  1. All Modules
  2. Registration
  3. Triage
  4. Treatment
  5. Inventory
- ✅ Current assignment is pre-selected
- ✅ Dropdown is clickable and functional

**Status**: [ ] Pass [ ] Fail

---

### Test Case 6: Change Module Assignment

**Steps**:
1. Select a staff member currently assigned to "All Modules"
2. Change their dropdown to "Triage"
3. Wait for the update

**Expected Result**:
- ✅ Dropdown shows loading/saving state briefly
- ✅ Success notification appears (green toast)
- ✅ Module badge updates to "Triage" with cyan color
- ✅ Statistics cards update immediately
- ✅ "Triage" count increases by 1
- ✅ "All Modules" count decreases by 1

**API Verification**:
```
PUT /api/users/{id}/assigned-module
Body: { "assigned_module": "triage" }
Response: { "message": "...", "user": {...} }
```

**Status**: [ ] Pass [ ] Fail

---

### Test Case 7: Multiple Assignment Changes

**Steps**:
1. Change 3 different staff members to 3 different modules:
   - Staff A: Registration
   - Staff B: Triage  
   - Staff C: Treatment
2. Observe each change

**Expected Result**:
- ✅ Each change saves successfully
- ✅ Success notification shows for each update
- ✅ All badges update correctly
- ✅ Statistics cards reflect all changes
- ✅ No conflicts or errors

**Status**: [ ] Pass [ ] Fail

---

### Test Case 8: Search Functionality

**Steps**:
1. In the search box, type a staff member's name (e.g., "John")
2. Observe filtered results
3. Clear search and try email (e.g., "nurse@")
4. Clear and try role (e.g., "triage")

**Expected Result**:
- ✅ Table filters to show only matching staff
- ✅ Search is case-insensitive
- ✅ Works for name, email, and role
- ✅ Clear button (×) appears when typing
- ✅ Clear button clears search and shows all staff
- ✅ Statistics cards remain unchanged (show total counts)

**Status**: [ ] Pass [ ] Fail

---

### Test Case 9: Data Persistence

**Steps**:
1. Change a staff member's module (e.g., Nurse A → Triage)
2. Wait for success notification
3. Refresh the page (F5)
4. Check Nurse A's assigned module

**Expected Result**:
- ✅ After refresh, Nurse A still shows "Triage"
- ✅ Change persisted in database
- ✅ Badge color matches module (cyan for Triage)

**Status**: [ ] Pass [ ] Fail

---

### Test Case 10: Color Coding Verification

**Steps**:
1. Assign staff to all 5 modules (one staff per module)
2. Observe badge colors

**Expected Result**:
- **All Modules**: Indigo (#6366f1)
- **Registration**: Purple (#8b5cf6)
- **Triage**: Cyan (#06b6d4)
- **Treatment**: Green (#10b981)
- **Inventory**: Orange (#f59e0b)

**Status**: [ ] Pass [ ] Fail

---

### Test Case 11: Error Handling

**Steps**:
1. Stop backend server (`php artisan serve`)
2. Try to change a staff member's module
3. Observe error handling

**Expected Result**:
- ✅ Error notification appears (red toast)
- ✅ Message: "Failed to update module assignment"
- ✅ Dropdown reverts to original value
- ✅ No data corruption

**Restart Backend**:
4. Restart `php artisan serve`
5. Try changing module again
6. Verify it works

**Status**: [ ] Pass [ ] Fail

---

### Test Case 12: Info Box Content

**Steps**:
1. Scroll to bottom of page
2. Read the blue info box

**Expected Result**:
- ✅ Info box displays module descriptions:
  - All Modules: Access to all system modules
  - Registration: Register patients and manage queue
  - Triage: Assess bite incidents and categorize severity
  - Treatment: Administer vaccines and record treatments
  - Inventory: Manage vaccine inventory and stock levels
- ✅ Blue info icon present
- ✅ Text is readable and clear

**Status**: [ ] Pass [ ] Fail

---

### Test Case 13: Navigation Integration

**Steps**:
1. Log in as admin
2. Click "Clinic Setup" in sidebar
3. Observe submenu

**Expected Result**:
- ✅ Submenu shows 5 items in this order:
  1. Clinic Information
  2. Module Configuration
  3. **Staff Assignments** ← NEW
  4. Predefined Templates
  5. Vaccination Schedules
- ✅ Clicking "Staff Assignments" navigates to page
- ✅ Active state highlights "Staff Assignments" when on page

**Status**: [ ] Pass [ ] Fail

---

### Test Case 14: Empty State

**Steps**:
1. Search for a non-existent name (e.g., "XXXXXX")
2. Observe table

**Expected Result**:
- ✅ Message: "No staff members match your search"
- ✅ No table rows shown
- ✅ Statistics cards still show total counts
- ✅ No errors in console

**Status**: [ ] Pass [ ] Fail

---

### Test Case 15: Mobile Responsiveness

**Steps**:
1. Open browser DevTools (F12)
2. Toggle device toolbar (mobile view)
3. Test on different screen sizes:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)

**Expected Result**:
- ✅ Statistics cards wrap to fewer columns on mobile
- ✅ Table scrolls horizontally if needed
- ✅ Search box is full width on mobile
- ✅ Dropdowns remain functional
- ✅ All text is readable

**Status**: [ ] Pass [ ] Fail

---

## 🔍 API Testing (Optional - For Developers)

### Test API Endpoints Directly

#### 1. Get All Staff (Admin Only)
```bash
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept: application/json"
```

**Expected Response**:
```json
[
  {
    "id": 2,
    "name": "Jane Nurse",
    "email": "nurse@clinic.com",
    "role": "triage",
    "assigned_module": "all",
    "is_active": true,
    "created_at": "2026-07-30T10:00:00.000000Z"
  },
  ...
]
```

#### 2. Update Assigned Module (Admin Only)
```bash
curl -X PUT http://localhost:8000/api/users/2/assigned-module \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"assigned_module": "triage"}'
```

**Expected Response**:
```json
{
  "message": "Staff module assignment updated successfully",
  "user": {
    "id": 2,
    "name": "Jane Nurse",
    "email": "nurse@clinic.com",
    "role": "triage",
    "assigned_module": "triage",
    ...
  }
}
```

#### 3. Test Non-Admin Access (Should Fail)
```bash
curl -X PUT http://localhost:8000/api/users/2/assigned-module \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assigned_module": "triage"}'
```

**Expected Response**: 403 Forbidden
```json
{
  "message": "Unauthorized. Admin access required."
}
```

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Developer User (clinic_id = NULL)
**Scenario**: Developer user has `clinic_id = NULL`

**Expected Behavior**:
- Developer should NOT appear in staff list
- Only clinic-specific users shown

**Test**: Verify developer account is excluded from list

---

### Issue 2: Self-Assignment
**Scenario**: Admin changes their own module assignment

**Expected Behavior**:
- ✅ Should be allowed (no restrictions)
- ✅ Admin can assign themselves to any module
- ⚠️ Note: If admin assigns self to non-admin module, they still retain admin role

**Test**: Change logged-in admin's own module assignment

---

### Issue 3: Concurrent Updates
**Scenario**: Two admins update same staff member simultaneously

**Expected Behavior**:
- Last update wins (database overwrite)
- Both see success notification
- No data corruption

**Test**: (Advanced) Open two browser tabs, change same staff in both

---

## ✅ Acceptance Criteria

Phase 4 is considered **COMPLETE** when:

- [ ] All 15 test cases pass
- [ ] Admin can view all staff members
- [ ] Admin can change staff module assignments
- [ ] Changes save and persist correctly
- [ ] Search functionality works
- [ ] Statistics update in real-time
- [ ] Color coding is correct
- [ ] Non-admin users cannot access page
- [ ] Error handling works gracefully
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Navigation integration complete

---

## 📸 Screenshots to Capture

For documentation, capture:

1. **Full Page View** - Staff Assignments page with data
2. **Statistics Cards** - Top stats section
3. **Staff Table** - Full table with multiple staff
4. **Module Dropdown** - Expanded dropdown showing options
5. **Badge Colors** - All 5 module badges in different colors
6. **Search in Action** - Filtered results
7. **Success Notification** - Green toast after update
8. **Info Box** - Blue info section at bottom
9. **Navigation Menu** - Clinic Setup submenu with Staff Assignments

---

## 🚀 Next Steps After Phase 4

Once all tests pass:

1. ✅ Mark Phase 4 as COMPLETE
2. ✅ Update `CLINIC_TEMPLATE_IMPLEMENTATION_PHASES.md`
3. ✅ Update `COMPLETE_SYSTEM_STATUS.md`
4. ▶️ **Begin Phase 5**: Integration, Testing & Documentation
   - Integrate with forms (respect field rules)
   - Integrate with queue flow (respect triage toggle)
   - Test complete workflows
   - Create user documentation
   - Final acceptance testing

---

## 🆘 Troubleshooting

### Problem: Page shows "Loading..." forever

**Solutions**:
- Check browser console for errors
- Verify backend is running (`php artisan serve`)
- Check network tab - is `/api/users` returning 200?
- Verify admin token is valid (localStorage)

---

### Problem: Dropdown doesn't save changes

**Solutions**:
- Check network tab - is PUT request being sent?
- Verify response is 200 OK
- Check browser console for errors
- Ensure backend route exists
- Test API endpoint directly with curl

---

### Problem: Statistics don't update

**Solutions**:
- Verify state management in component
- Check if `staff` state is updating correctly
- Add console.log to track state changes
- Refresh page to see if database updated

---

### Problem: Non-admin can access page

**Solutions**:
- Verify `ProtectedRoute` is wrapping route
- Check admin authorization in backend
- Test with different user roles
- Clear localStorage and re-login

---

## 📝 Test Results Log

**Tester Name**: _________________________  
**Date**: _________________________  
**Environment**: Local Dev / Staging / Production

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| TC1: Access Control | ☐ | |
| TC2: Page Load | ☐ | |
| TC3: Statistics | ☐ | |
| TC4: Table Display | ☐ | |
| TC5: Dropdown | ☐ | |
| TC6: Change Assignment | ☐ | |
| TC7: Multiple Changes | ☐ | |
| TC8: Search | ☐ | |
| TC9: Persistence | ☐ | |
| TC10: Color Coding | ☐ | |
| TC11: Error Handling | ☐ | |
| TC12: Info Box | ☐ | |
| TC13: Navigation | ☐ | |
| TC14: Empty State | ☐ | |
| TC15: Responsiveness | ☐ | |

**Overall Result**: ☐ PASS ☐ FAIL

**Sign-off**: _________________________  
**Date**: _________________________

---

**Testing Guide Created**: July 31, 2026  
**Phase**: Phase 4 - Staff Module Assignments  
**Status**: Ready for Testing  
**Next Step**: Execute test cases and verify all functionality

Good luck with testing! 🎯
