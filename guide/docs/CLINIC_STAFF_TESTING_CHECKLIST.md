# 🏥 Clinic Staff Testing Checklist (Easy Step-by-Step Guide)
## Animal Bite Treatment Center (ABTC / RHU)

> **Document Type**: Operational User Testing & Quality Assurance Guide  
> **Target Audience**: Clinic Administrators, Registration Clerks, Triage Doctors, Treatment Nurses, and Non-Technical QA Testers  
> **Prerequisites**: No programming or IT knowledge required. Follow the on-screen steps.  
> **System URL**: `http://localhost:5173`  
> **Date**: September 2026  

---

## 📑 Table of Contents

1. [Test Logins (Credentials Matrix)](#1-test-logins-credentials-matrix)
2. [Testing Workflow Diagram](#2-testing-workflow-diagram)
3. [Stage 1: Clinic Administrator (Schedule & Vaccine Setup)](#stage-1-clinic-administrator-schedule--vaccine-setup)
4. [Stage 2: Registration Desk (Walk-In Enrollment & Form 1)](#stage-2-registration-desk-walk-in-enrollment--form-1)
5. [Stage 3: Doctor Triage Desk (Examine Wound & Prescribe Form 2)](#stage-3-doctor-triage-desk-examine-wound--prescribe-form-2)
6. [Stage 4: Nurse Treatment Desk (Day 0 Shot & Option A Calendar)](#stage-4-nurse-treatment-desk-day-0-shot--option-a-calendar)
7. [Stage 5: Routine Follow-Up Visit (Day 3 Return)](#stage-5-routine-follow-up-visit-day-3-return)
8. [Stage 6: Special Clinical Cases (Boosters, External Shots, Second Chance)](#stage-6-special-clinical-cases-boosters-external-shots-second-chance)
9. [Stage 7: Clinical Safety Red Flags (What Must Be Blocked)](#stage-7-clinical-safety-red-flags-what-must-be-blocked)
10. [Tester Sign-Off Sheet](#10-tester-sign-off-sheet)

---

## 1. Test Logins (Credentials Matrix)

To test how each desk works, sign in with the corresponding role account:

| Desk / Role | Email Address | Password | Main Tasks |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@clinic.com` | `password123` | Sets up clinic opening/closing days, checks stock, overrides locked names if authorized. |
| **Registration Clerk** | `registration@clinic.com` | `password123` | Enrolls new patients (Form 1) and issues automated queue tickets. |
| **Doctor (Triage)** | `triage@clinic.com` | `password123` | Evaluates animal bite wounds, selects rabies Category (I/II/III), and prescribes PEP + ERIG (Form 2). |
| **Nurse (Treatment)** | `treatment@clinic.com` | `password123` | Injects vaccines (Day 0, 3, 7, 28), records batch numbers, checks in follow-up patients, and prints transfer slips (Form 3). |

---

## 2. Testing Workflow Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. ADMIN SETUP  │ ────> │ 2. REGISTRATION │ ────> │ 3. DOCTOR TRIAGE│ ────> │ 4. NURSE DESK   │ ────> │ 5. FOLLOW-UP    │
│ Schedule & Stock│       │ Form 1 & Ticket │       │ Form 2 & Handoff│       │ Day 0 & Schedule│       │ Day 3 Return    │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Stage 1: Clinic Administrator (Schedule & Vaccine Setup)

**Objective**: Verify the clinic's operating days are configured correctly and vaccine vials are available.

- [ ] **1.1 Sign In as Admin**
  - Open `http://localhost:5173/login`.
  - Enter `admin@clinic.com` / `password123` and click **Sign In**.
  - *Verify*: The Admin Dashboard loads.

- [ ] **1.2 Verify Clinic Operating Days**
  - In the left sidebar, click **Clinic Setup** -> **Operating Schedule** (or navigate to `/setup/schedule`).
  - *Verify*:
    - **Tuesday through Saturday** are marked **Open**.
    - **Sunday and Monday** are marked **Closed**.
  - *Clinical Purpose*: The system must **never** book a patient's vaccination follow-up on a Sunday or Monday.

- [ ] **1.3 Check Vaccine Inventory**
  - In the left sidebar, click **Inventory** (`/inventory`).
  - *Verify*: At least one rabies vaccine brand (e.g. **Speeda** or **Verorab**) has available stock and shows a green/active status.

- [ ] **1.4 Sign Out**: Click your profile icon at top right and click **Sign Out**.

---

## Stage 2: Registration Desk (Walk-In Enrollment & Form 1)

**Objective**: Register a new walk-in patient with bite exposure and issue their initial queue ticket.

- [ ] **2.1 Sign In as Registration Clerk**
  - Log in using `registration@clinic.com` / `password123`.

- [ ] **2.2 Add a New Patient**
  - Click **Patients** (`/patients`) in the sidebar.
  - Click the green **"+ Add Patient"** button at the top right.
  - Complete the enrollment form:
    - **First Name**: `Juan`
    - **Last Name**: `Dela Cruz`
    - **Sex**: `Male`
    - **Date of Birth**: `1995-05-15` (Verify Age displays automatically).
    - **Contact Number**: `09171234567` (11 digits).
    - **Emergency Contact**: `Maria Dela Cruz` / `09181234567`.
    - **Address**: Municipality: `Tagoloan`, Barangay: `Poblacion`, Purok: `Zone 2`.
    - **Queue Category**: `Regular` (or select `Senior Citizen`, `Pregnant`, or `PWD` to test priority badges).
    - **Priority Level**: `Normal` (or `Urgent` / `Emergency`).
  - Click **Save Patient Record**.

- [ ] **2.3 Verify Automatic Ticket Generation**
  - *Verify*: A green confirmation toast appears: *"Patient enrolled successfully"*.
  - *Verify*: Juan Dela Cruz appears in the Patients table with a unique Patient ID (e.g. `P-2026-0001`).
  - Click **Queue Dashboard** (`/queue`) in the sidebar.
  - *Verify*: Juan Dela Cruz appears on the active queue board with:
    - Ticket Number (e.g. `#1`).
    - Type: **New Case**.
    - Status: **Waiting**.
    - Waiting timer is actively counting up.

- [ ] **2.4 Sign Out**: Click your profile icon and click **Sign Out**.

---

## Stage 3: Doctor Triage Desk (Examine Wound & Prescribe Form 2)

**Objective**: The physician examines the bite, determines the exposure category, prescribes the vaccine regimen, and triggers an automated handoff to the treatment desk.

- [ ] **3.1 Sign In as Triage Doctor**
  - Log in using `triage@clinic.com` / `password123`.
  - Go to **Queue Dashboard** (`/queue`).

- [ ] **3.2 Open In-Place Patient Detail Window**
  - Locate `Juan Dela Cruz` on the queue list.
  - Click the green **"View"** button on his row.
  - *Verify*: An in-place dialog window opens directly over the dashboard without redirecting or navigating away.
  - *Verify*: The header shows Juan's name, age, gender, ticket number, and waiting status.

- [ ] **3.3 Verify Desk Protection**
  - **Tab 1 (Demographics)**: Shows Juan's personal details in read-only format.
  - **Tab 3 (Nurse Treatment)**: Displays an amber lock banner:  
    `🔒 Awaiting Doctor Triage (Form 2 Required) — Exposure grading required before Day 0 can be administered.`  
    *(The nurse is prevented from administering vaccine until the physician completes triage!)*

- [ ] **3.4 Fill Out Form 2 (Doctor Triage)**
  - Click on **Tab 2 (Form 2 Doctor Triage)**.
  - Enter Patient Weight: `65` kg.
  - History / Complaints: *"Dog bite on right forearm 2 hours ago"*.
  - Exposure Date: Today's date.
  - Place: `Tagoloan, Poblacion`.
  - Animal Type: `Dog`.
  - Animal Status: `Alive / Under Observation`.
  - Bite Type: `Bite`.
  - Category: **`Category III`** (Severe bite).
  - Washing of Bite: `Yes` (Washed with soap and running water).
  - Tetanus Toxoid: Check `Given`.
  - Vaccine Regimen: `Intradermal (ID) - Option A`.
  - ERIG (Anti-Rabies Serum): Check `Indicated / Prescribed` (Calculates units: $65\text{ kg} \times 40\text{ IU/kg} = 2600\text{ IU}$).
  - Click **"Save Consultation" / "Save Record"**.

- [ ] **3.5 Verify Automated Desk Handoff**
  - *Verify*: Green toast notification: *"Consultation record saved successfully. Patient referred to Treatment."*
  - Look at the Queue Dashboard:
    - Juan Dela Cruz's ticket automatically transitions to Type: **`Vaccination`**.
    - Status resets to **`Waiting`** for the nurse.
    - Notes state: *"Doctor completed Form 2 — referred to Treatment."*
  - *Notice*: The doctor **did not click any manual transfer buttons**; the workflow progressed automatically.

- [ ] **3.6 Sign Out**: Click your profile icon and click **Sign Out**.

---

## Stage 4: Nurse Treatment Desk (Day 0 Shot & Option A Calendar)

**Objective**: Administer initial Dose 0, deduct inventory stock, complete today's ticket, and verify the Option A vaccination calendar.

- [ ] **4.1 Sign In as Treatment Nurse**
  - Log in using `treatment@clinic.com` / `password123`.
  - Go to **Queue Dashboard** (`/queue`).

- [ ] **4.2 Open Patient Record**
  - Locate `Juan Dela Cruz` under the Treatment queue (Type: `Vaccination`, Status: `Waiting`).
  - Click the green **"View"** button.

- [ ] **4.3 Verify Guardrails & Unlocked Dose Row**
  - Click **Tab 2 (Doctor Triage)**: All physician clinical findings are **locked/read-only** to prevent accidental alteration.
  - Click **Tab 3 (Nurse Treatment)**: The lock banner has cleared.
  - Look at the dose schedule table:
    - **Dose 0 (Day 0)** has an emerald highlight with badge: `🟢 Ready to Administer`.
    - Administration Date defaults to today's date.
    - Given By and Initials are pre-filled with the authenticated nurse's credentials.

- [ ] **4.4 Record Day 0 Administration**
  - Select **Vaccine Brand**: `Speeda` (or active brand).
  - Select **Batch Number** from the dropdown.
  - Select **Route**: `ID (Intradermal)`.
  - Select **Site**: `Left Deltoid` (0.1 mL) and `Right Deltoid` (0.1 mL).
  - If ERIG was prescribed: Check `Administered` in the ERIG section.
  - Click **"Save Vaccination Record"**.

- [ ] **4.5 Verify Automated System Actions**
  - *In the Form*: Day 0 immediately updates to `✅ Administered` and becomes **permanently locked**.
  - *On the Queue Board*: Juan Dela Cruz's ticket is automatically marked **`Completed`** and moves to the Completed archive panel.
  - *In Inventory*: 1 vial is deducted from vaccine inventory.
  - *In Calendar*: Days 3, 7, and 28 are auto-generated.

- [ ] **4.6 Verify Weekend Shift Rule (Option A Resolution)**
  - In the sidebar, click **Vaccination Schedule** (`/vaccinations/schedule`).
  - Find Juan Dela Cruz's journey card:
    - **Day 0**: Completed (Green dot).
    - **Day 3**: Scheduled for $+3\text{ days}$.
      - **CRITICAL CHECK**: If Day 3 lands on a closed Sunday or Monday, does it display an amber pill: `⚠️ Shifted +1d / +2d — clinic closed on weekend` and shift the target date forward to Tuesday?  
        *(If YES $\rightarrow$ Option A schedule resolution passed!)*
    - **Day 7**: Scheduled for $+7\text{ days}$.
    - **Day 28**: Scheduled for $+28\text{ days}$.

- [ ] **4.7 Sign Out**: Click your profile icon and click **Sign Out**.

---

## Stage 5: Routine Follow-Up Visit (Day 3 Return)

**Objective**: Ensure follow-up patients check in directly at the Nurse Desk (never at Registration) and that historical doses cannot be tampered with.

- [ ] **5.1 Patient Arrives on Day 3**
  - Sign in as Treatment Nurse (`treatment@clinic.com` / `password123`).
  - Click **Nurse Desk** (`/nurse/patients`) in the sidebar.
  - Click the **"Due Today"** tab (or **"All"** tab).
  - Find `Juan Dela Cruz`.

- [ ] **5.2 Nurse Station Check-In**
  - Click the **"Check In"** button on Juan's row.
  - Confirm the check-in modal.
  - *Verify*: Juan receives a ticket for the Treatment desk directly, bypassing Registration and Doctor Triage completely.

- [ ] **5.3 Record Day 3 Shot (Hybrid Immutability)**
  - Click **"Record Dose"** (or open his ticket on `/queue`).
  - Observe the dose rows:
    - **Day 0**: Entire row is disabled/locked. Vaccine brand, batch number, date, and initials cannot be changed.
    - **Day 3**: Active with emerald highlight: `🟢 Ready to Administer`.
    - **Future Doses (Day 7, 28)**: Display `Pending` (no false red stock errors).
    - **Brand Consistency**: Pre-selects `Speeda` to match Day 0 automatically.
  - Select the Batch Number for Day 3, set site (`Right Deltoid`), and click **"Save Vaccination Record"**.
  - *Verify*: Day 3 marks as administered and locks; the queue ticket completes automatically; Day 7 becomes the next active dose.

---

## Stage 6: Special Clinical Cases (Boosters, External Shots, Second Chance)

### 6.1 Priority Patients (Seniors, Pregnant, PWD)
- [ ] During registration, set Queue Category to `Senior Citizen`, `Pregnant`, or `PWD`.
- [ ] *Verify*: The ticket displays a distinct priority pill and is sorted ahead of standard regular tickets on the queue board.

### 6.2 Patient Does Not Respond When Called
- [ ] On `/queue`, locate an active ticket and click the purple **UserBlock Icon** ("No Response").
- [ ] *Verify*: The ticket moves into the **Second Chance Queue** panel with an active 10-minute timer.
- [ ] Click **"Recall"** to return the patient to active calling.
- [ ] Click **"Mark Absent"** if the patient left the clinic.

### 6.3 Booster Protocol (Patient Re-Exposed Years Later)
- [ ] For a returning patient with verified prior rabies series:
- [ ] In Form 2, the doctor checks **"Prior Rabies Immunization History Verified"** and selects **2-Dose Booster**.
- [ ] *Verify*:
  - The ERIG checkbox becomes disabled/greyed out with notice: `🚫 Contraindicated: Patient has prior verified immunization.`
  - In Form 3, the system schedules **Day 0 and Day 3 only** (Days 7 and 28 are omitted).
  - Upon saving Day 3, the episode transitions immediately to **`Regimen Completed`**.

### 6.4 Transferred-In Dose from Another Hospital
- [ ] Open Form 3. On Day 0, check **"Transferred-In (External Clinic)"**.
- [ ] Enter external facility name (e.g. `Northern Mindanao Medical Center`).
- [ ] *Verify*:
  - Status column displays a neutral **`🏥 External Clinic`** badge.
  - **Does NOT** display the red `Missing Stock Info` warning.
  - Saving the record does not fail or deduct local clinic stock for Day 0.
- [ ] On `/vaccinations/schedule`, click **"Transfer Slip"** $\rightarrow$ verify the printable DOH Rabies Vaccination Transfer Form renders accurately.

---

## Stage 7: Clinical Safety Red Flags (What Must Be Blocked)

Verify that the application actively blocks these potential clinical errors:

| Clinical Hazard to Prevent | Verification Test | Expected Protection | Pass / Fail |
| :--- | :--- | :--- | :--- |
| **Tampering with Doctor Diagnosis** | Open Form 2 after Day 0 is administered | All fields are locked/read-only. Doctors can only append addendums. | `[ ] PASS` |
| **Overwriting Administered Shots** | Open Form 3 for a patient with Day 0 on file | Day 0 brand, batch, date, and initials are completely non-editable. | `[ ] PASS` |
| **Booking on Closed Weekend Days** | Review generated appointments on `/vaccinations/schedule` | Zero appointments on Sunday or Monday; shifted forward to Tuesday. | `[ ] PASS` |
| **Prescribing ERIG to Booster Patient** | Select 2-Dose Booster regimen in Form 2 | ERIG checkbox is disabled and flagged contraindicated. | `[ ] PASS` |
| **Non-Admin Altering Legal Demographics** | Open demographic edit modal as Nurse or Clerk | Legal Full Name and Date of Birth are locked with padlock icons. | `[ ] PASS` |
| **Losing Queue Context on View** | Click "View" on any queue row on `/queue` | Opens an in-place pop-up modal; URL stays on `/queue`. | `[ ] PASS` |

---

## 10. Tester Sign-Off Sheet

- **Tester Name**: ___________________________
- **Date Tested**: ___________________________
- **Browser Tested**: Google Chrome / Microsoft Edge / Mozilla Firefox
- **Overall Verdict**: `[ ] ALL TESTS PASSED` / `[ ] ISSUES IDENTIFIED`

### Sign-Off Checklist:
- [ ] 1. Registration created patient and issued sequential queue ticket.
- [ ] 2. Doctor triage saved Form 2 and auto-referred ticket to Treatment Desk.
- [ ] 3. Nurse administered Day 0 and auto-completed queue ticket.
- [ ] 4. Vaccine stock decremented accurately in Inventory.
- [ ] 5. PEP Option A appointments generated without landing on closed days.
- [ ] 6. Returning follow-up patient checked in directly at Nurse Desk.
- [ ] 7. Past administered doses remained completely immutable.
- [ ] 8. Queue patient details opened smoothly in the in-place modal dialog.

**Comments / Observations**:  
____________________________________________________________________  
____________________________________________________________________  
____________________________________________________________________  