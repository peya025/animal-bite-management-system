# Testing Guide - Complete Workflow
## Animal Bite Management System

---

## 🚀 PRE-TEST SETUP

### 1. Start Backend Server
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Verify:** Server shows "Server running on [http://0.0.0.0:8000]"

### 2. Start Frontend Server
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
npm run dev
```

**Verify:** Frontend runs on `http://localhost:5173` (or similar)

### 3. Check Database Connection
- MySQL/MariaDB running via XAMPP
- Database: `animalbitecenter`
- User has permissions

### 4. Login with Different Roles
You'll need to test with multiple user accounts:
- **Admin** - Can do everything
- **Triage/Doctor** - Can see Form 2
- **Treatment/Nurse** - Can see Form 3
- **Registration** - Can add patients

---

## ✅ TEST 1: NEW PATIENT - FULL WORKFLOW

### Expected Flow:
```
Registration → Auto-Queue → Doctor (Form 2) → Nurse (Form 3) → Completed
```

### Step-by-Step:

#### 1️⃣ REGISTER NEW PATIENT (Form 1)

**Action:**
1. Login as **Registration Staff** or **Admin**
2. Navigate to **Patients** page
3. Click **"Add Patient"** button (green, top right)
4. Fill out Form 1 - Patient Enrolment:
   - **Last Name:** Test
   - **First Name:** Patient
   - **Middle Name:** One
   - **Date of Birth:** 1990-01-01
   - **Sex:** Male
   - **Municipality:** Select any
   - **Barangay:** Select any
   - **Contact Number:** 09123456789
5. Click **"Save Patient Record"**

**Expected Results:**
- ✅ Success message appears
- ✅ Modal closes
- ✅ Patient appears in patients table

**Verify Auto-Queue:**
1. Navigate to **Queue Dashboard** (`/queue`)
2. **Check:** New patient appears in queue table
   - Queue Number: #1 (or next sequential number)
   - Patient Name: Test, Patient One
   - Status: 🟡 **Waiting** (yellow badge)
   - Visit Type: New Case
   - Priority: Normal
3. **Check Statistics Cards:**
   - "Total in Queue" increased by 1
   - "Waiting" count increased by 1

**If Failed:**
- Check browser console for errors
- Check backend logs: `backend/storage/logs/laravel.log`
- Verify backend server is running
- Check database `queues` table for new entry

---

#### 2️⃣ DOCTOR CONSULTATION (Form 2)

**Action:**
1. Login as **Doctor/Triage** or **Admin**
2. Navigate to **Queue Dashboard**
3. Find the patient (status: "Waiting")
4. Click **green "Form 2" button** in "Clinical Forms" column
5. **Form 2 - General Consultation** modal opens
6. Verify patient info is pre-filled (read-only):
   - Name, Age, Address should show
7. Fill required fields:
   - **Mode of Transaction:** Walk-in (radio button)
   - **Date of Consultation:** (defaults to today)
   - **Consultation Time:** (defaults to now)
   - **Vital Signs (optional):**
     - Blood Pressure: 120/80
     - Temperature: 36.5
     - Height: 170
     - Weight: 70
   - **Nature of Visit:** New Consultation/Case (radio) - **REQUIRED**
   - **Type of Consultation:** Check "Injury" (checkbox) - **REQUIRED**
   - **Chief Complaints:** "Patient bitten by dog on right arm" - **REQUIRED**
   - **Diagnosis (optional):** "Animal bite - category II"
   - **Medication/Treatment (optional):** "Wound cleaning performed"
   - **Name of Attending Provider:** Dr. Juan Cruz
8. Click **"Save Patient Record"**

**Expected Results:**
- ✅ Success toast: "Treatment record saved successfully"
- ✅ Modal closes
- ✅ Queue refreshes automatically

**Verify Status Change:**
1. Check queue table
2. Patient status changed from "Waiting" to 🔵 **In Consultation** (blue badge)
3. **Blue "Form 3" button** now visible in "Clinical Forms" column
4. Statistics updated:
   - "Waiting" count decreased by 1
   - "In Consultation" count increased by 1

**If Failed:**
- Check browser console for errors
- Look for validation errors in red text
- Ensure all required fields filled
- Check backend error: `POST /api/treatment-records`

---

#### 3️⃣ NURSE TREATMENT (Form 3)

**Action:**
1. Login as **Nurse/Treatment** or **Admin**
2. Navigate to **Queue Dashboard**
3. Find the patient (status: "In Consultation")
4. Click **blue "Form 3" button** in "Clinical Forms" column
5. **Form 3 - Animal Bite Treatment Record** modal opens
6. Verify patient info is pre-filled (read-only):
   - Name, Age, DOB, Address, Sex
7. Fill **Section 1: Patient & Registration Information:**
   - Date: (defaults to today)
   - Registry No.: ABC-001
   - Hospital No.: (optional)
   - Referred by: (optional)
   - PhilHealth PIN: (optional)
   - **Exposure Category:** II (radio) - **REQUIRED**
   - **Date of Exposure:** 2026-08-02 - **REQUIRED**
   - Date Treatment Started: (defaults to today)
   - Place of Exposure: Poblacion, Tagoloan
8. Fill **Section 2: Exposure Details:**
   - Mode of Animal Exposure: Check "Transdermal Bite"
   - Body Part Affected: Check "Other parts of the body"
   - Type of Animal: Check "Dog"
   - Past History: Select "No"
   - Was PEP completed?: Select "No"
9. Fill **Section 3: Vaccination Record Table:**
   - **Day 0 row:**
     - Route: Select "IM" (radio)
     - Date: Today's date
     - Given by: Nurse Maria Santos
     - Signature: M. Santos
   - Leave other rows blank (future doses)
10. Fill **Section 4: Additional Medications:**
    - (Optional) Check ERIG, TT, or ATS if given
    - ICD 10 Code: W54.0
11. Click **"Save Record"**

**Expected Results:**
- ✅ Success toast: "Vaccination record saved successfully"
- ✅ Modal closes
- ✅ Queue refreshes automatically

**Verify Status Change:**
1. Check queue table
2. Patient status changed from "In Consultation" to 🟢 **Completed** (green badge)
3. Statistics updated:
   - "In Consultation" count decreased by 1
   - "Completed Today" count increased by 1
4. Patient might disappear from queue (if filtering completed entries)

**If Failed:**
- Check validation errors (Exposure Category and Date of Exposure are required)
- Check browser console
- Backend error: `POST /api/vaccination-records`
- Verify queue_id is being sent in request

---

## ✅ TEST 2: FOLLOW-UP PATIENT

### Expected Flow:
```
Walk-in → Add to Queue (Manual) → Nurse (Form 3) → Completed
(Skip Doctor)
```

### Step-by-Step:

#### 1️⃣ ADD EXISTING PATIENT TO QUEUE

**Action:**
1. Login as **Registration** or **Admin**
2. Navigate to **Queue Dashboard**
3. Click **green "Add to Queue"** button (top right)
4. **"Add Patient to Queue"** modal opens
5. In patient search dropdown:
   - Start typing patient name: "Test Patient"
   - Select from dropdown
6. Select **Visit Type:** Follow-up (dropdown)
7. Select **Priority:** Normal (dropdown)
8. **Check-in Notes:** "Day 3 dose - follow-up"
9. Click **"Add to Queue"**

**Expected Results:**
- ✅ Success toast: "Patient added to queue successfully"
- ✅ Modal closes
- ✅ Queue refreshes

**Verify:**
1. Patient appears in queue with new queue number
2. Visit Type shows: **Follow-up**
3. Status shows: **Waiting**
4. **Blue "Form 3" button visible** (should skip Form 2)

---

#### 2️⃣ NURSE UPDATES FORM 3

**Action:**
1. Login as **Nurse/Treatment** or **Admin**
2. Navigate to **Queue Dashboard**
3. Find follow-up patient
4. Click **blue "Form 3" button**
5. **Form 3 opens with previous data pre-filled:**
   - Patient info (read-only)
   - Exposure details (already filled from Day 0)
   - Day 0 vaccination row (already filled)
6. Fill **Day 3 row** in Vaccination Record Table:
   - Route: Select "IM"
   - Date: Today's date
   - Given by: Nurse Maria Santos
   - Signature: M. Santos
7. Leave other fields unchanged
8. Click **"Save Record"**

**Expected Results:**
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Status changes to **Completed**

**Verify:**
1. Check database `treatment_records` table
2. Should have 2 rows for this patient:
   - One for Day 0 (dose_number = 0)
   - One for Day 3 (dose_number = 3)

---

## ✅ TEST 3: QUEUE MANAGEMENT ACTIONS

### Call Patient

**Action:**
1. Patient with status "Waiting"
2. Click **📞 Call** button in "Queue Actions" column
3. Confirm dialog appears
4. Click **"Yes, Call Now"**

**Expected:**
- ✅ Status changes to "In Consultation"
- ✅ Toast: "Called #X · Patient Name"

---

### Manual Complete

**Action:**
1. Patient with status "In Consultation"
2. Click **✓ Complete** button (green checkmark)
3. Dialog opens with "Consultation Notes" field
4. Enter notes (optional): "Treatment completed successfully"
5. Click **"Mark Complete"**
6. Confirmation dialog appears
7. Click **"Yes, Complete"**

**Expected:**
- ✅ Status changes to "Completed"
- ✅ Toast: "Consultation completed"

---

### Cancel Queue Entry

**Action:**
1. Patient with status "Waiting" or "In Consultation"
2. Click **✕ Cancel** button (red X)
3. Confirmation dialog appears
4. Click **"Yes, Cancel"**

**Expected:**
- ✅ Status changes to "Cancelled"
- ✅ Toast: "Cancelled #X"

---

## ✅ TEST 4: FILTERS AND SEARCH

### Search by Name

**Action:**
1. Queue Dashboard
2. Search box: Type "Test"
3. Press Enter or wait

**Expected:**
- ✅ Table filters to show only matching patients
- ✅ Queue statistics stay unchanged

---

### Filter by Status

**Action:**
1. Status dropdown: Select "Waiting"

**Expected:**
- ✅ Table shows only patients with "Waiting" status
- ✅ Other statuses hidden

**Action:**
1. Status dropdown: Select "Completed"

**Expected:**
- ✅ Table shows only completed patients

---

## ✅ TEST 5: ROLE-BASED ACCESS

### Test Form 2 Access

**Login as Doctor:**
- ✅ Green "Form 2" button visible

**Login as Nurse:**
- ❌ Green "Form 2" button hidden (or disabled)

### Test Form 3 Access

**Login as Nurse:**
- ✅ Blue "Form 3" button visible

**Login as Doctor:**
- ❌ Blue "Form 3" button hidden (or disabled)

### Test Admin

**Login as Admin:**
- ✅ Both "Form 2" and "Form 3" buttons visible

---

## 🐛 TROUBLESHOOTING

### Issue: Patient not appearing in queue after registration

**Check:**
1. Browser console for JavaScript errors
2. Network tab: `POST /api/patients` - Check response
3. Backend logs: `backend/storage/logs/laravel.log`
4. Database `queues` table - Check if entry created
5. Backend server running

**Fix:**
- Restart backend server
- Clear Laravel cache: `php artisan cache:clear`
- Check `patientService.ts` has auto-queue code

---

### Issue: Form 2 save fails

**Common Errors:**
- "Field 'dose_number' doesn't have a default value"
  - **Fix:** Already fixed! Migration run successfully
- "Data truncated for column 'status'"
  - **Fix:** Already fixed! Status uses 'completed'
- "Nature of visit is required"
  - **Fix:** Select one of the radio options
- "Chief complaints is required"
  - **Fix:** Enter text in chief complaints field

**Check:**
1. Browser console
2. Network tab: `POST /api/treatment-records` - Check response
3. Backend logs
4. All required fields filled

---

### Issue: Form 3 save fails

**Common Errors:**
- "Exposure category is required"
  - **Fix:** Select I, II, or III
- "Date of exposure is required"
  - **Fix:** Enter date
- No doses saved
  - **Fix:** Fill at least one row with date

**Check:**
1. Browser console
2. Network tab: `POST /api/vaccination-records` - Check payload
3. Backend logs
4. Required fields filled

---

### Issue: Queue status not updating

**Check:**
1. Network tab - Verify API calls successful
2. Backend logs for errors
3. Database `queues` table - Check status column
4. Refresh page manually

**Fix:**
- Check queue_id is being passed to Form 2/Form 3
- Verify backend updates queue status after save
- Check QueueController update logic

---

### Issue: Forms not opening

**Check:**
1. Browser console errors
2. Modal component errors
3. Entry data (queue entry object) passed correctly
4. User role has permission

**Fix:**
- Check role permissions
- Verify button onClick handlers
- Check modal state management

---

## 📊 VERIFICATION CHECKLIST

### Database Verification

**After completing Test 1, check database:**

#### `patients` table
```sql
SELECT * FROM patients ORDER BY patient_id DESC LIMIT 1;
```
- ✅ Should show newly registered patient

#### `queues` table
```sql
SELECT * FROM queues ORDER BY queue_id DESC LIMIT 1;
```
- ✅ Should show queue entry
- ✅ Status should be 'completed'
- ✅ visit_type should be 'new_case'

#### `treatment_records` table
```sql
SELECT * FROM treatment_records WHERE patient_id = [patient_id] ORDER BY treatment_id DESC;
```
- ✅ Should show 2 records:
  - 1 for general consultation (Form 2) - has consultation_date, chief_complaints
  - 1 for Day 0 vaccination (Form 3) - has dose_number = 0

---

## ✅ SUCCESS CRITERIA

### All tests pass if:

1. ✅ New patient auto-added to queue after registration
2. ✅ Green "Form 2" button visible for doctors, opens modal
3. ✅ Form 2 saves successfully, status changes to "in_consultation"
4. ✅ Blue "Form 3" button visible for nurses, opens modal
5. ✅ Form 3 saves successfully, status changes to "completed"
6. ✅ Follow-up patient can be manually added to queue
7. ✅ Form 3 pre-fills existing data for follow-up patients
8. ✅ Queue actions work (Call, Complete, Cancel)
9. ✅ Search and filter work correctly
10. ✅ Role-based access control works (forms show for correct roles)
11. ✅ Statistics update in real-time
12. ✅ No console errors
13. ✅ Database records created correctly

---

## 📝 TEST REPORT TEMPLATE

```
=== TESTING REPORT ===
Date: 2026-08-02
Tester: [Your Name]

TEST 1: NEW PATIENT WORKFLOW
- Registration (Form 1): [PASS/FAIL]
- Auto-Queue: [PASS/FAIL]
- Doctor Consultation (Form 2): [PASS/FAIL]
- Nurse Treatment (Form 3): [PASS/FAIL]
- Status Updates: [PASS/FAIL]

TEST 2: FOLLOW-UP PATIENT
- Add to Queue: [PASS/FAIL]
- Form 3 Pre-fill: [PASS/FAIL]
- Update Vaccination: [PASS/FAIL]

TEST 3: QUEUE ACTIONS
- Call Patient: [PASS/FAIL]
- Manual Complete: [PASS/FAIL]
- Cancel Entry: [PASS/FAIL]

TEST 4: FILTERS
- Search: [PASS/FAIL]
- Status Filter: [PASS/FAIL]

TEST 5: ROLE ACCESS
- Doctor (Form 2): [PASS/FAIL]
- Nurse (Form 3): [PASS/FAIL]
- Admin (Both): [PASS/FAIL]

ISSUES FOUND:
1. [Issue description]
2. [Issue description]

OVERALL: [PASS/FAIL]
```

---

**Last Updated:** 2026-08-02  
**System Version:** v1.0  
**Ready for Testing:** YES ✅  
**Estimated Test Time:** 30-45 minutes
