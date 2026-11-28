# 🏥 Animal Bite Management System (ABTC / RHU)
# Complete UI Testing Guide & QA Tester Manual (2026 Edition)

> **Document Version**: 2.0 (Post Phase 1–3 & Queue Modal Update)  
> **Target Roles**: Registration Staff, Triage Doctor, Treatment Nurse, Clinic Administrator  
> **Clinical Standards**: DOH National Rabies Prevention and Control Program (NRPCP) & WHO Rabies PEP Option A Guidelines  
> **Last Updated**: September 2026  

---

## 📑 Table of Contents
1. [Pre-Requisites & Test Environment Setup](#1-pre-requisites--test-environment-setup)
2. [Test User Accounts & Role Matrix](#2-test-user-accounts--role-matrix)
3. [End-to-End Clinical Flow Overview](#3-end-to-end-clinical-flow-overview)
4. [Test Suite 1: New Patient Registration & Auto-Queue (Form 1)](#test-suite-1-new-patient-registration--auto-queue-form-1)
5. [Test Suite 2: Doctor Clinical Triage & Exposure Grading (Form 2)](#test-suite-2-doctor-clinical-triage--exposure-grading-form-2)
6. [Test Suite 3: Nurse Treatment & Day 0 Administration (Form 3)](#test-suite-3-nurse-treatment--day-0-administration-form-3)
7. [Test Suite 4: Option A Scheduling & Weekend Drift Verification](#test-suite-4-option-a-scheduling--weekend-drift-verification)
8. [Test Suite 5: Routine Follow-Up Check-In & Administration (Day 3)](#test-suite-5-routine-follow-up-check-in--administration-day-3)
9. [Test Suite 6: Returning Patient Re-Exposure Booster Protocol (2-Dose)](#test-suite-6-returning-patient-re-exposure-booster-protocol-2-dose)
10. [Test Suite 7: Transferred-In External Doses & DOH Transfer Slip](#test-suite-7-transferred-in-external-doses--doh-transfer-slip)
11. [Test Suite 8: Clinical Immutability, Role Access & Queue Operations](#test-suite-8-clinical-immutability-role-access--queue-operations)
12. [QA Tester Printable Checklist & Bug Report Template](#12-qa-tester-printable-checklist--bug-report-template)

---

## 1. Pre-Requisites & Test Environment Setup

### 1.1 Start Backend API Server
Open PowerShell / Terminal 1:
```powershell
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
php artisan serve --host=0.0.0.0 --port=8000
```
- **Expected Console Output**: `Server running on [http://0.0.0.0:8000]`

### 1.2 Start Frontend Client
Open PowerShell / Terminal 2:
```powershell
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
npm run dev
```
- **Expected Console Output**: `Local: http://localhost:5173/`

### 1.3 Database & XAMPP Service
- Ensure **Apache** and **MySQL** services are green in the XAMPP Control Panel.
- Database: `animalbitecenter`
- App URL: `http://localhost:5173`

---

## 2. Test User Accounts & Role Matrix

Use the following pre-configured credentials to verify role-based permissions and desk handoffs:

| Role | Email | Password | Allowed Desks / Primary Features |
| :--- | :--- | :--- | :--- |
| **Registration** | `registration@clinic.com` | `password123` | Patient Registration (`/patients`), Form 1 creation, Auto-Queue generation, Demographic contact editing |
| **Triage (Doctor)** | `triage@clinic.com` | `password123` | Queue Dashboard (`/queue`), Doctor Patients (`/doctor/patients`), Form 2 Clinical Assessment, Category Grading, Addendums |
| **Treatment (Nurse)** | `treatment@clinic.com` | `password123` | Queue Dashboard (`/queue`), Nurse Desk (`/nurse/patients`), Vaccination Schedule (`/vaccinations/schedule`), Form 3 Recording, DOH Transfer Slips |
| **Admin** | `admin@clinic.com` | `password123` | Full System Access, Clinic Operating Schedule Setup (`/setup/schedule`), User Management (`/users`), Overriding locked legal demographics |
| **Developer** | `developer@clinic.com` | `password123` | Developer Settings, Database Explorer, Appointment Health Diagnostics |

---

## 3. End-to-End Clinical Flow Overview

```
                                 [ WALK-IN NEW BITE ]
                                          ¦
                                          ?
                      +---------------------------------------+
                      ¦ 1. REGISTRATION DESK (/patients)      ¦
                      ¦    - Staff fills Form 1 Demographics  ¦
                      ¦    - Auto-generates Queue Ticket #    ¦
                      +---------------------------------------+
                                          ¦ visit_type = 'new_case'
                                          ¦ status = 'waiting'
                                          ?
                      +---------------------------------------+
                      ¦ 2. DOCTOR TRIAGE DESK (/queue)        ¦
                      ¦    - Calls patient or clicks "View"   ¦
                      ¦    - Fills Form 2 Clinical Assessment ¦
                      ¦    - Clicks "Save Record"             ¦
                      +---------------------------------------+
                                          ¦ AUTO-HANDOFF
                                          ¦ visit_type = 'vaccination'
                                          ¦ status = 'waiting'
                                          ?
                      +---------------------------------------+
                      ¦ 3. NURSE TREATMENT DESK (/queue)      ¦
                      ¦    - Form 2 is now LOCKED (Post-Tx)   ¦
                      ¦    - Form 3 is ACTIVE & UNLOCKED      ¦
                      ¦    - Nurse administers Day 0 Dose     ¦
                      ¦    - Clicks "Save Vaccination Record" ¦
                      +---------------------------------------+
                                          ¦ AUTO-COMPLETION
                                          ¦ - Queue ticket completed
                                          ¦ - Inventory deducted
                                          ¦ - Option A auto-scheduled
                                          ?
                      +---------------------------------------+
                      ¦ 4. ROUTINE FOLLOW-UPS (Day 3/7/28)    ¦
                      ¦    - Patient checks in at Nurse Desk  ¦
                      ¦    - Day 0 is strictly IMMUTABLE      ¦
                      ¦    - Follow-up dose recorded & saved  ¦
                      +---------------------------------------+
```

---

## Test Suite 1: New Patient Registration & Auto-Queue (Form 1)

* **Objective**: Ensure new bite patients are properly registered with complete demographics and automatically placed into the doctor's triage queue without manual intervention.
* **Actor**: Registration Staff (`registration@clinic.com`)

### Step-by-Step Test Procedure:
1. Navigate to `http://localhost:5173/login`.
2. Log in using `registration@clinic.com` / `password123`.
3. In the sidebar navigation, click **Patients** (`/patients`).
4. Click the green **"+ Add Patient"** button in the top right header.
5. In the **Patient Enrollment Modal**, fill the required fields:
   - **Personal Info**:
     - Last Name: `Dela Cruz`
     - First Name: `Juan`
     - Middle Name: `Bautista`
     - Sex: `Male`
     - Date of Birth: `1995-05-15` (Age should auto-calculate to 31)
     - Civil Status: `Single`
   - **Contact & Address**:
     - Contact Number: `09171234567` (Must validate exactly 11 digits)
     - Emergency Contact Name: `Maria Dela Cruz`
     - Emergency Contact Phone: `09181234567`
     - Municipality: `Tagoloan`
     - Barangay: Select any (e.g. `Poblacion`)
     - Purok/Street: `Zone 2`
   - **Queue Assignment**:
     - Priority Category: Select `Regular` (or `Senior Citizen` / `Pregnant` / `PWD` to test priority badge)
     - Priority Level: Select `Normal` (or `Urgent` / `Emergency`)
6. Click **"Save Patient Record"** (or Submit).

### ? Verification Points (Expected Results):
- [ ] Modal closes cleanly and a green success notification appears: *"Patient enrolled successfully"*.
- [ ] Patient `Juan Dela Cruz` appears at the top of the **Patients** table with a generated Patient Number (e.g. `P-2026-XXXX`).
- [ ] Navigate to **Queue Dashboard** (`/queue`):
  - [ ] A new queue ticket has been automatically created (e.g. Ticket `#1` or next sequential number for today).
  - [ ] Ticket displays Patient Name `Juan Dela Cruz`, Type: `New Case`, Status: `Waiting`.
  - [ ] Waiting timer is actively ticking.

---

## Test Suite 2: Doctor Clinical Triage & Exposure Grading (Form 2)

* **Objective**: Verify that the physician can review demographics, grade the animal bite exposure, specify prescriptions, and automatically route the patient to the treatment queue.
* **Actor**: Triage Doctor (`triage@clinic.com`)

### Step-by-Step Test Procedure:
1. Log out or open an incognito window at `http://localhost:5173/login`.
2. Log in as `triage@clinic.com` / `password123`.
3. Navigate to **Queue Dashboard** (`/queue`).
4. Locate `Juan Dela Cruz` in the queue list.
5. Click the green **"View"** button on Juan Dela Cruz's queue row.
6. Observe the **Queue Patient Detail Modal**:
   - **Header**: Shows Patient Name, Age/Sex, Category, Queue Ticket #, and current status (`Waiting`).
   - **Tab 1 (Form 1 Demographics)**: All enrolled demographic details are displayed in read-only format.
   - **Tab 3 (Form 3 Nurse Treatment)**: Displays amber lock banner: `🔒 Awaiting Doctor Triage (Form 2 Required) — Exposure grading required before Day 0 can be administered.`
7. Switch to **Tab 2 (Form 2 Doctor Triage)**:
   - Date of Consultation: Today's date (defaults automatically).
   - Patient Weight: Enter `65` kg.
   - History / Chief Complaints: Enter *"Dog bite on right hand 2 hours ago"*.
   - **Exposure Details**:
     - Date of Exposure: Select today or yesterday.
     - Place of Exposure: `Tagoloan, Poblacion`.
     - Animal Type: Select `Dog`.
     - Animal Status: Select `Alive / Under Observation (14 Days)`.
     - Bite Type: Select `Bite`.
     - Exposure Category: Select **`Category III`** (Severe/transdermal exposure).
     - Anatomical Site: Select `Upper Extremity (Hand/Arm)`.
     - Washing of Bite: Select `Yes (Washed with soap and running water)`.
   - **Treatment Prescriptions**:
     - Tetanus Toxoid: Check `Given`.
     - Anti-Tetanus Serum: Check `Given`.
     - Rabies Vaccine Regimen: Select `Intradermal (ID) - Option A`.
     - ERIG (Equine Rabies Immunoglobulin): Check `Indicated / Prescribed` (Calculated by patient weight: 65 kg x 40 IU/kg = 2600 IU).
     - Attending Physician: Auto-fills with Doctor's Name.
8. Click **"Save Consultation" / "Save Record"**.

### ? Verification Points (Expected Results):
- [ ] Toast notification confirms: *"Consultation record saved successfully. Patient referred to Treatment."*.
- [ ] Modal closes or refreshes.
- [ ] On the Queue Dashboard, the ticket for Juan Dela Cruz **instantly updates**:
  - [ ] Visit Type changes from `New Case` -> **`Vaccination`**.
  - [ ] Status resets to **`Waiting`** (Ready for Nurse calling).
  - [ ] Notes show: *"Doctor completed Form 2 — referred to Treatment."*.
- [ ] Doctor completed the handoff **without having to click manual "Serving" or "Transfer" buttons**!

---

## Test Suite 3: Nurse Treatment & Day 0 Administration (Form 3)

* **Objective**: Verify that the nurse can review doctor orders, administer Day 0, deduct vaccine stock, complete the active queue ticket, and initiate the PEP Option A schedule.
* **Actor**: Treatment Nurse (`treatment@clinic.com`)

### Step-by-Step Test Procedure:
1. Log in as `treatment@clinic.com` / `password123`.
2. Navigate to **Queue Dashboard** (`/queue`).
3. Notice that `Juan Dela Cruz` is now listed under the Treatment Queue with Type: `Vaccination` and Status: `Waiting`.
4. Click the green **"View"** button on the queue row.
5. In the **Queue Patient Detail Modal**:
   - Tab 2 (Form 2 Doctor Triage) is now visible in read-only mode, displaying the Category III bite details and ERIG orders.
   - Switch to **Tab 3 (Form 3 Nurse Treatment)**:
     - The lock banner is gone; Form 3 is now **unlocked and active**.
     - Dose 0 (Day 0) row is highlighted in emerald green with badge: `🟢 Ready to Administer`.
     - Scheduled Date defaults to today's date.
6. Fill in the **Dose 0 Administration Row**:
   - **Vaccine Brand**: Select `Speeda` (or available in-stock brand).
   - **Batch Number**: Select an active non-expired batch from the dropdown.
   - **Route**: `ID (Intradermal)`.
   - **Site**: `Left Deltoid` (0.1 mL) and `Right Deltoid` (0.1 mL) per 2-site ID regimen.
   - **Administered By**: Auto-filled with logged-in nurse's name.
   - **Signature / Initials**: Auto-filled with nurse initials.
7. Fill in **ERIG Administration** (if prescribed):
   - Check `Administered`.
   - Brand: `Equirab` / Batch number / Total dose administered.
8. Click **"Save Vaccination Record"**.

### ✅ Verification Points (Expected Results):
- [ ] Toast notification: *"Vaccination record saved successfully."*.
- [ ] In the Modal, Dose 0 (Day 0) immediately transforms to **Locked / Completed** status:
  - [ ] Injection date, brand, and batch become greyed out and non-editable.
  - [ ] Badge displays `✅ Administered`.
- [ ] Close the modal and check the **Queue Dashboard**:
  - [ ] Juan Dela Cruz's queue ticket is marked **`Completed`**.
  - [ ] Ticket moves to the **Completed Archive panel** and disappears from active calling rows.
- [ ] Check Vaccine Inventory at `/inventory`:
  - [ ] The batch stock for `Speeda` has decremented correctly (or open vial count updated).

---

## Test Suite 4: Option A Scheduling & Weekend Drift Verification

* **Objective**: Confirm that Day 3, Day 7, and Day 28 are auto-scheduled according to WHO/DOH Option A calendar days, and automatically shifted forward to Monday when landing on closed weekend days.
* **Actor**: Treatment Nurse or Admin

### Step-by-Step Test Procedure:
1. Ensure the clinic operating schedule is set to **Closed on Saturdays and Sundays** (Standard ABTC schedule at `/setup/schedule`).
2. Re-open Juan Dela Cruz's record via **Vaccination Schedule** (`/vaccinations/schedule`) or search him in **Nurse Patients** (`/nurse/patients`).
3. View the generated PEP schedule:

| Dose | Formula | Calendar Interval | Weekend Conflict Check | Expected Schedule |
| :--- | :--- | :--- | :--- | :--- |
| **Day 0** | Administered Today | Day 0 | — | Actual administration date |
| **Day 3** | Day 0 + 3 days | +3d | If Saturday -> Shift to Monday (+2d)<br>If Sunday -> Shift to Monday (+1d) | Mon open day (Drift pill shown if shifted) |
| **Day 7** | Day 0 + 7 days | +7d | Same day of week as Day 0 | Next week same day |
| **Day 28** | Day 0 + 28 days | +28d | Same day of week as Day 0 | 4 weeks later same day |

4. Check the **Vaccination Schedule Page** (`/vaccinations/schedule`):
   - Locate Juan Dela Cruz's journey card.
   - Observe the 4 dose pills:
     - Day 0: `Completed` (Green dot)
     - Day 3: `Scheduled` (Blue dot if due today, or Amber calendar dot)
     - Day 7: `Scheduled`
     - Day 28: `Scheduled`
   - If Day 3 was shifted due to a weekend, verify an amber drift pill appears: `⚠️ Shifted +1d / +2d — clinic closed on weekend`.

### ✅ Verification Points (Expected Results):
- [ ] No appointments are booked on Saturday or Sunday.
- [ ] Any appointment falling on a closed day has auto-shifted forward to Monday.
- [ ] `schedule_drift_days` is accurately stored in the backend and reflected on the UI badge.

---

## Test Suite 5: Routine Follow-Up Check-In & Administration (Day 3)

* **Objective**: Verify that returning follow-up patients check in directly at the Nurse Desk (never at Registration Desk) and that past doses remain completely immutable.
* **Actor**: Treatment Nurse (`treatment@clinic.com`)

### Step-by-Step Test Procedure:
1. Log in as `treatment@clinic.com`.
2. Navigate to **Nurse Patients Desk** (`/nurse/patients`).
3. Click the **"Due Today"** tab (or **"All"** tab to find the patient).
4. Locate `Juan Dela Cruz`:
   - Note the action buttons: **[ 💉 Check In ]**, **[ 💊 Record Dose ]**, **[ 👁️ View ]**.
5. Click **"Check In"**:
   - A modal confirms check-in for vaccination follow-up.
   - Confirm check-in.
   - **Verification**: Patient receives a queue ticket with `visit_type = 'vaccination'`, routing directly to the Treatment Desk!
6. Open **Queue Dashboard** (`/queue`) or click **"Record Dose (Form 3)"**:
   - Open Form 3 for Juan Dela Cruz.
   - **Verify Hybrid Locking**:
     - **Day 0**: Entire row is disabled/locked. Vaccine brand, batch, date, and initials cannot be changed.
     - **Day 3**: Row is active with emerald highlight: `🟢 Ready to Administer`.
     - **Brand Consistency**: Pre-selects the same brand used on Day 0 (`Speeda`).
     - **Future Doses (Day 7, Day 28)**: Display `Pending` without any red `Missing Stock Info` errors.
7. Select the batch for Day 3, enter site (`Left Deltoid`), and click **"Save Vaccination Record"**.

### ✅ Verification Points (Expected Results):
- [ ] Day 3 marks as `Administered` and becomes locked.
- [ ] Today's queue ticket automatically completes and clears off the board.
- [ ] Day 7 becomes the next active upcoming target dose.

---

## Test Suite 6: Returning Patient Re-Exposure Booster Protocol (2-Dose)

* **Objective**: Confirm that patients with verified prior immunization who suffer a new bite receive the DOH 2-Dose Booster Protocol (Day 0 & Day 3 only), with ERIG contraindicated and Days 7/28 omitted.
* **Actor**: Triage Doctor & Treatment Nurse

### Step-by-Step Test Procedure:
1. Register a new bite case for a returning patient who completed a full series in the past (e.g. `Pedro Santos`).
2. Log in as **Triage Doctor** (`triage@clinic.com`) and open Form 2 for Pedro:
   - In Exposure / Clinical History, check **"Prior Rabies Immunization History Verified"**.
   - Select Regimen: **`2-Dose Booster (Day 0 & Day 3 only)`**.
   - Observe the **ERIG Prescription** section:
     - Checkbox is disabled / greyed out.
     - Tooltip / notice displays: `🚫 Contraindicated: Patient has prior verified immunization; Rabies Immunoglobulin (RIG) is not required and should not be administered.`
3. Save Form 2 -> Patient auto-refers to Treatment Queue.
4. Log in as **Treatment Nurse** (`treatment@clinic.com`) and open Form 3:
   - Observe the dose schedule table:
     - **Day 0**: Active (`Ready to Administer`).
     - **Day 3**: Scheduled for +3d (shifted if weekend).
     - **Days 7 and 28**: **Omitted / Cancelled** (marked as *Not applicable under Booster protocol*).
5. Administer Day 0 and save.
6. Check the patient's schedule card at `/vaccinations/schedule`:
   - Journey displays **2 doses total**.
   - After Day 3 administration, the episode transitions directly to **`Regimen Completed`**.

### ✅ Verification Points (Expected Results):
- [ ] ERIG cannot be prescribed or checked for booster cases.
- [ ] No appointments are generated for Day 7 or Day 28.
- [ ] Regimen completes cleanly on Day 3.

---

## Test Suite 7: Transferred-In External Doses & DOH Transfer Slip

* **Objective**: Verify that doses administered at other hospitals can be recorded as external without triggering local inventory stock errors, and that official DOH Transfer Slips can be generated.
* **Actor**: Treatment Nurse (`treatment@clinic.com`)

### Step-by-Step Test Procedure:
1. Open Form 3 for a patient who received their Day 0 dose at an external clinic (e.g. Provincial Hospital) and presented to your clinic for Day 3.
2. In the Day 0 row, check the box: **"Transferred-In (External Clinic)"**.
3. Fill in:
   - External Facility Name: `Northern Mindanao Medical Center (NMMC)`
   - Date Administered: `2026-09-02`
   - Vaccine Brand: `Verorab` (text or selection)
4. Observe the Status Column:
   - Badge displays neutral **`🏥 External Clinic`** (grey/blue).
   - **Does NOT display** the red `Missing Stock Info` error.
5. In Day 3 row, record the dose using local clinic stock.
6. Click **"Save Vaccination Record"**:
   - Form saves successfully without 422 "Insufficient stock" errors.
   - Local inventory stock is deducted **only for Day 3**, zero deduction for Day 0.
7. Open **DOH Transfer Slip**:
   - On `/vaccinations/schedule`, click the **"Transfer Slip"** or **"Card"** button on the patient's card.
   - The modal generates the printable DOH Rabies Vaccination Transfer Form with completed doses, next due dates, and clinic signature lines.

### ✅ Verification Points (Expected Results):
- [ ] External doses display the neutral `🏥 External Clinic` pill.
- [ ] Form submission succeeds without validating local stock for external rows.
- [ ] Printable transfer slip accurately shows prior external and local injections.

---

## Test Suite 8: Clinical Immutability, Role Access & Queue Operations

* **Objective**: Safeguard medical-legal compliance, prevent data tampering, and verify queue board actions.

### 8.1 Post-Treatment Form 2 Locking:
1. Find a patient whose Day 0 dose has already been saved.
2. Log in as Doctor (`triage@clinic.com`) and open Form 2 for that patient.
3. **Verify**:
   - Top banner: `🔒 Clinical Assessment Locked (Post-Treatment) — Exposure diagnosis and prescriptions cannot be altered after vaccination has started.`
   - Exposure category, date, animal status, and initial prescriptions are read-only and cannot be changed.
   - Doctor can scroll down to **"Clinical Addendum / Progress Notes"** to append new observations with timestamp and doctor name.

### 8.2 Demographic Edit Restrictions:
1. Log in as Nurse or Regular Staff.
2. Open **"Update Contact & Address"** modal (`PatientEditModal.tsx`):
   - **Locked fields**: Legal Full Name, Date of Birth, Sex, PhilHealth ID Number are disabled/greyed out with padlock icons.
   - **Editable fields**: Mobile Contact Number, Emergency Contact Name/Phone, Purok/Barangay address.
3. Log in as **Admin** (`admin@clinic.com`):
   - Admin can edit legal name and DOB (audit log records admin ID and reason).

### 8.3 Queue Board Controls & Second Chance:
1. On `/queue`, locate an active waiting patient.
2. Test **"Call Patient"**:
   - Audio chime / visual calling banner activates.
   - Ticket status changes to `Called`.
3. Test **"No Response"** (UserBlock icon):
   - Ticket moves to **Second Chance Queue** panel with a 10-minute countdown.
   - Click **"Recall"** to bring the patient back to active calling.
   - Click **"Mark Absent"** if the patient failed to appear after second call.
4. Test **"Trash Bin"** (Delete icon):
   - Confirm moving ticket to trash.
   - Open **"Trash Bin Modal"** (`Restore` icon on header) -> verify ticket can be restored or permanently purged.

---

## 12. QA Tester Printable Checklist & Bug Report Template

### Pre-Flight Checklist
- [ ] Backend running (`php artisan serve` on port 8000)
- [ ] Frontend running (`npm run dev` on port 5173)
- [ ] All 4 test accounts log in successfully (`registration`, `triage`, `treatment`, `admin`)
- [ ] Database contains active vaccine batches in `vaccine_inventories`

### Test Execution Matrix

| Test ID | Test Scenario | Expected Result | Result (PASS / FAIL) | Tester Initials & Date |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Register New Walk-in (Form 1) | Auto-creates ticket `#X`, `visit_type: new_case`, `status: waiting` | `[ ] PASS  [ ] FAIL` | |
| **TC-02** | Queue View Modal | Clicking "View" opens 3-tab modal in-place without page redirect | `[ ] PASS  [ ] FAIL` | |
| **TC-03** | Form 2 Doctor Triage Save | Auto-transitions ticket to `visit_type: vaccination`, `status: waiting` | `[ ] PASS  [ ] FAIL` | |
| **TC-04** | Form 3 Dose 0 Administration | Saves Day 0, auto-completes queue ticket, decrements vaccine vial | `[ ] PASS  [ ] FAIL` | |
| **TC-05** | Option A Schedule Auto-Creation | Schedules Day 3, 7, 28 from actual Day 0 date | `[ ] PASS  [ ] FAIL` | |
| **TC-06** | Weekend Shift Resolution | Weekend dates auto-shift forward to Monday with drift pill (`+1d`/`+2d`) | `[ ] PASS  [ ] FAIL` | |
| **TC-07** | Follow-Up Direct Nurse Check-In | Nurse desk `/nurse/patients` checks in Day 3 follow-up; bypasses Triage | `[ ] PASS  [ ] FAIL` | |
| **TC-08** | Dose Immutability (Hybrid Locking)| Day 0 row permanently locked; Day 3 row active and ready to record | `[ ] PASS  [ ] FAIL` | |
| **TC-09** | Re-Exposure 2-Dose Booster | Only Day 0 & Day 3 scheduled; ERIG greyed out; completes on Day 3 | `[ ] PASS  [ ] FAIL` | |
| **TC-10** | External Clinic Dose | Shows `🏥 External Clinic` pill; no false `Missing Stock Info` badge | `[ ] PASS  [ ] FAIL` | |
| **TC-11** | Post-Treatment Form 2 Lock | Form 2 locked post-Day 0; Addendum progress note section enabled | `[ ] PASS  [ ] FAIL` | |
| **TC-12** | Form 1 Role-Based Permissions | Regular staff can only edit contact/address; Name/DOB locked | `[ ] PASS  [ ] FAIL` | |
| **TC-13** | Queue Second Chance & Actions | No Response moves to 10-min Second Chance; Recall and Absent work | `[ ] PASS  [ ] FAIL` | |
| **TC-14** | Midnight Queue Auto-Expiry | Daily queue resets to #1; yesterday unserved tickets mark `no_response` | `[ ] PASS  [ ] FAIL` | |

---

### Bug Report Form (If any step fails)

```markdown
### 🐛 BUG REPORT TEMPLATE
- **Bug ID**: BUG-____
- **Test ID**: TC-____ (e.g. TC-04)
- **User Role Logged In**: [registration / triage / treatment / admin]
- **Page URL**: (e.g. http://localhost:5173/queue)
- **Patient ID / Name**: 
- **Steps to Reproduce**:
  1. 
  2. 
  3. 
- **Observed Result**: 
- **Expected Result**: 
- **Browser Console Error / Network 500 Response**: 
- **Screenshot / Screen Recording**: 
```
