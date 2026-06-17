# Phase 5 Testing Guide

**Phase:** Frontend Implementation (Steps 1-3)  
**Status:** Ready for Testing  
**Date:** June 18, 2026

---

## 🧪 Pre-Testing Checklist

Before testing, ensure:

- [ ] Backend is running: `cd backend && php artisan serve`
- [ ] Frontend is running: `cd frontend && npm run dev`
- [ ] Database has test data: `php artisan db:seed --class=DefaultClinicSeeder`
- [ ] Backend accessible at: http://localhost:8000
- [ ] Frontend accessible at: http://localhost:5173

---

## Test 1: Login Functionality

### Test 1.1: Admin Login
1. Navigate to http://localhost:5173/login
2. Enter credentials:
   - Email: `admin@clinic.com`
   - Password: `password123`
3. Click "Sign in"

**Expected Results:**
- ✅ No errors displayed
- ✅ Redirected to `/dashboard`
- ✅ Admin Dashboard loads
- ✅ Shows 4 stat cards (Patients, Cases, Vaccinations, Queue)
- ✅ Shows "Admin Dashboard" title
- ✅ Sidebar shows admin-specific menu items

### Test 1.2: Registration Staff Login
1. Logout (click logout button)
2. Login with:
   - Email: `registration@clinic.com`
   - Password: `password123`

**Expected Results:**
- ✅ Redirected to `/dashboard`
- ✅ Registration Dashboard loads
- ✅ Shows 2 stat cards (Patients, Queue)
- ✅ Shows "Registration Dashboard" title
- ✅ Sidebar shows only: Dashboard, Patients, Queue

### Test 1.3: Triage Staff Login
1. Logout and login with:
   - Email: `triage@clinic.com`
   - Password: `password123`

**Expected Results:**
- ✅ Triage Dashboard loads
- ✅ Shows 3 stat cards
- ✅ Sidebar shows: Dashboard, Patients, Queue, Bite Cases, Vaccinations

### Test 1.4: Treatment Staff Login
1. Logout and login with:
   - Email: `treatment@clinic.com`
   - Password: `password123`

**Expected Results:**
- ✅ Treatment Dashboard loads
- ✅ Shows vaccination schedule
- ✅ Sidebar shows: Dashboard, Patients, Queue, Bite Cases, Vaccinations

### Test 1.5: Invalid Login
1. Logout and try to login with:
   - Email: `invalid@email.com`
   - Password: `wrongpassword`

**Expected Results:**
- ✅ Error message displayed
- ✅ Stays on login page
- ✅ Form fields remain filled

### Test 1.6: Validation Errors
Test these scenarios:
1. Empty email and password → "Please fill in all fields"
2. Invalid email format → "Please enter a valid email address"
3. Password < 6 chars → "Password must be at least 6 characters"

---

## Test 2: Protected Routes

### Test 2.1: Unauthenticated Access
1. Open new incognito/private window
2. Navigate directly to http://localhost:5173/dashboard

**Expected Results:**
- ✅ Redirected to `/login`
- ✅ Dashboard NOT accessible

### Test 2.2: Token Persistence
1. Login as admin
2. Refresh the page (F5)

**Expected Results:**
- ✅ User stays logged in
- ✅ Dashboard reloads correctly
- ✅ No redirect to login

### Test 2.3: Logout
1. Click logout button in header
2. Confirm logout

**Expected Results:**
- ✅ Redirected to `/login`
- ✅ Token cleared from localStorage
- ✅ Cannot access `/dashboard` anymore

---

## Test 3: Dashboard Features

### Test 3.1: Statistics Display
Login as admin and verify:
- ✅ Total Patients stat card shows number
- ✅ Active Cases stat card shows number
- ✅ Pending Vaccinations stat card shows number
- ✅ Today's Queue stat card shows number

### Test 3.2: Recent Patients List
On admin dashboard:
- ✅ "Recent Patients" section visible
- ✅ Shows patient avatars
- ✅ Shows patient names
- ✅ Shows patient numbers

If no patients exist:
- ✅ Shows "No patients yet" message

### Test 3.3: Quick Actions
Click each quick action button (should do nothing yet, just verify they render):
- ✅ "Manage Users" button visible
- ✅ "Clinic Settings" button visible
- ✅ "View Reports" button visible
- ✅ "Send Invitations" button visible

### Test 3.4: Sidebar Navigation
1. Click "Dashboard" in sidebar → ✅ Stays on dashboard
2. Click "Patients" → ✅ Redirects (will show 404 for now, that's ok)
3. Verify active state highlighting works

### Test 3.5: Sidebar Collapse
1. Click collapse button (left arrow near top)
2. Verify sidebar collapses to icon-only view
3. Click expand button
4. Verify sidebar expands

---

## Test 4: API Integration

### Test 4.1: Network Requests
1. Login as admin
2. Open Browser DevTools → Network tab
3. Refresh dashboard

**Expected Requests:**
- ✅ GET /api/patients
- ✅ GET /api/bite-cases
- ✅ GET /api/vaccinations/today
- ✅ GET /api/queue
- ✅ All requests have `Authorization: Bearer <token>` header

### Test 4.2: Error Handling
1. Stop the backend server
2. Refresh the dashboard

**Expected Results:**
- ✅ Shows error message
- ✅ Shows "Failed to load dashboard data"
- ✅ Shows retry button

### Test 4.3: Token Expiry
1. In DevTools → Application → Local Storage
2. Delete the `authToken` key
3. Try to navigate to any page

**Expected Results:**
- ✅ Redirected to `/login`

---

## Test 5: Responsive Design

### Test 5.1: Mobile View
1. Open DevTools
2. Toggle device toolbar (mobile emulation)
3. Test on iPhone SE, iPhone 12, iPad

**Expected Results:**
- ✅ Sidebar adapts to mobile
- ✅ Stat cards stack vertically
- ✅ Header remains functional
- ✅ All content readable

### Test 5.2: Tablet View
Test on tablet sizes (768px - 1024px):
- ✅ Layout adapts appropriately
- ✅ Sidebar remains functional

---

## Test 6: Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

**Expected Results:**
- ✅ Login works in all browsers
- ✅ Dashboard renders correctly
- ✅ Styles consistent across browsers

---

## Test 7: Console Errors

Throughout all testing:
1. Keep DevTools console open
2. Watch for errors

**Expected Results:**
- ✅ No console errors (except 404 for unimplemented routes)
- ✅ No TypeScript errors
- ✅ No React warnings

---

## Test 8: Performance

### Test 8.1: Load Time
1. Clear cache
2. Login and time dashboard load

**Expected Results:**
- ✅ Dashboard loads < 2 seconds
- ✅ API calls complete quickly
- ✅ No flickering or layout shifts

### Test 8.2: Smooth Navigation
Click through sidebar menu items:
- ✅ Transitions are smooth
- ✅ No lag or freezing
- ✅ Active states update immediately

---

## 🐛 Common Issues & Solutions

### Issue: Cannot login
**Check:**
1. Backend running? → `php artisan serve`
2. Database seeded? → `php artisan db:seed --class=DefaultClinicSeeder`
3. CORS configured? → Check `backend/config/cors.php`

### Issue: 404 errors in console
**Solution:** This is expected for unimplemented routes (patients, queue, etc.). Ignore for now.

### Issue: Dashboard shows 0 for all stats
**Cause:** No data in database  
**Solution:** Seed more test data or create patients manually via API

### Issue: Token not persisting
**Check:**
1. Browser localStorage enabled?
2. Check DevTools → Application → Local Storage
3. Should see `authToken`, `userData`, `clinicData`

### Issue: Styling looks broken
**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Restart Vite dev server

---

## 📊 Test Results Template

Use this to track your testing:

```
[ ] Test 1.1: Admin Login
[ ] Test 1.2: Registration Login  
[ ] Test 1.3: Triage Login
[ ] Test 1.4: Treatment Login
[ ] Test 1.5: Invalid Login
[ ] Test 1.6: Validation Errors
[ ] Test 2.1: Unauthenticated Access
[ ] Test 2.2: Token Persistence
[ ] Test 2.3: Logout
[ ] Test 3.1: Statistics Display
[ ] Test 3.2: Recent Patients List
[ ] Test 3.3: Quick Actions
[ ] Test 3.4: Sidebar Navigation
[ ] Test 3.5: Sidebar Collapse
[ ] Test 4.1: Network Requests
[ ] Test 4.2: Error Handling
[ ] Test 4.3: Token Expiry
[ ] Test 5.1: Mobile View
[ ] Test 5.2: Tablet View
[ ] Test 6: Browser Compatibility
[ ] Test 7: Console Errors
[ ] Test 8.1: Load Time
[ ] Test 8.2: Smooth Navigation

Overall Status: ___________
Issues Found: ___________
Notes: ___________
```

---

## ✅ Sign-Off

After completing all tests:

- [ ] All critical tests passing
- [ ] No blocking issues
- [ ] Performance acceptable
- [ ] Ready for next phase

**Tested By:** ___________  
**Date:** ___________  
**Status:** ___________

---

## 📞 Need Help?

If tests fail:
1. Check **TROUBLESHOOTING** section in README.md
2. Verify backend logs: `backend/storage/logs/laravel.log`
3. Check frontend console for errors
4. Review **PHASE5_FRONTEND_SETUP.md** for technical details

---

**Happy Testing!** 🧪
