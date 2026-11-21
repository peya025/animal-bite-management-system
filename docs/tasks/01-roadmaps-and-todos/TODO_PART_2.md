# 📌 Project Tasks & Roadmap — Part 2

> **System**: Animal Bite Management System (ABTC / RHU)  
> **Target Desks**: Registration Desk, Doctor Triage Desk, Treatment / Nurse Desk, Mobile Patient Portal  
> **Standards Compliance**: DOH National Rabies Prevention and Control Program (NRPCP) & WHO Rabies PEP Guidelines  
> **Date**: August 2026  

---

## ⚠️ CRITICAL GUARDRAILS & WHAT NOT TO DO (Avoid Bugs & Confusion)

> [!CAUTION]
> **1. NEVER Hardcode Raw Static Dates in Scripts or Services**:
> - **DO NOT** add raw offsets (e.g. `$date->addDays(7)`) directly into appointment creation without passing through `ClinicScheduleService::resolveScheduleDate()`.
> - **Why**: Tagoloan ABTC is closed on Sundays and Mondays. Bypassing `ClinicScheduleService` will book patients on closed days, triggering critical violations and missed vaccination windows.

> [!WARNING]
> **2. NEVER Overwrite Past Administered Treatment Doses**:
> - Once a dose (e.g. Day 0) has been administered and saved, its injection date, vaccine brand, batch number, and vial deduction are **STRICTLY IMMUTABLE**.
> - Submitting follow-up doses (Day 3, 7, 28) must **ONLY insert or update the specific dose being administered today**, never re-touching or modifying Day 0.

> [!WARNING]
> **3. NEVER Allow Registration Desk to Check In Follow-Up Vaccination Patients**:
> - Registration Desk (`/patients`) is strictly for **New Walk-In Bites** and **Pre-Registered Initial Cases** (`visit_type = 'new_case'`).
> - Follow-up patients (Day 3, 7, 28, Boosters) bypass registration and check in **directly at the Nurse Treatment Desk** (`/nurse/patients`). Double check-ins create ghost tickets and clinical confusion.

> [!IMPORTANT]
> **4. NEVER Create Days 7 and 28 for Re-Exposure (Booster) Episodes**:
> - For returning patients with verified prior immunization, the DOH protocol is strictly a **2-Dose Booster (Day 0 & Day 3 only)**.
> - The scheduler must **never generate Day 7, Day 28, or RIG prescriptions** for re-exposure cases.

> [!NOTE]
> **5. NEVER Seed or Alter Database Records Without Explicit Permission**:
> - Always request permission before creating test data or modifying database records.

---

## 🎯 Prioritized Implementation Plan (Step-by-Step)

---

### 🥇 PHASE 1: Clinical Form Immutability & Access Control (Top Priority)

* **Goal**: Safeguard medical-legal accountability and prevent inventory batch tampering by locking clinical diagnoses and past injections after Day 0 is administered.

#### 1.1 Form 2: Doctor Triage Post-Treatment Locking (`GeneralTreatmentForm.tsx`)
- [x] **Lock Form 2 After Administration**:
  - If the patient has $\ge 1$ administered dose (Day 0 on file), Form 2 automatically becomes **strictly read-only**.
  - Hide or disable the `[ ✏️ Edit Form 2 ]` button for regular staff.
- [x] **Visual Banner**:
  - Display a prominent amber lock banner: `🔒 Clinical Assessment Locked (Post-Treatment) — Exposure diagnosis and prescriptions cannot be altered after vaccination has started.`
- [x] **Doctor / Admin Addendum Support**:
  - Provide a clean addendum section allowing physicians to append clinical progress notes without altering the original baseline diagnosis.

#### 1.2 Form 3: Vaccination Records Hybrid Locking (`VaccinationRecordForm.tsx`)
- [x] **Hybrid Dose-Level Immutability**:
  - **Administered Doses (e.g. Day 0)**: Injection date, vaccine brand, batch number, vial units used, and nurse signature are **permanently locked/disabled** (`isLocked = true`).
  - **Upcoming Doses (Day 3, Day 7, Day 28, Boosters)**: Remain **active, clean, and editable** for the nurse to select the opened vial batch on the day the patient arrives.
- [x] **Prevent False Validation Flags**:
  - Un-administered follow-up doses must not highlight as red required errors while viewing past history.

#### 1.3 Form 1: Patient Demographic Edit Modal (`PatientDetailsModal.tsx` & `/patients`)
- [x] **Selective Field Editing**:
  - Provide a dedicated **"Update Contact & Address"** modal.
  - **Editable by Staff**: Mobile Contact Number, Emergency Contact Name/Phone, Residential Address (Purok, Barangay, Municipality).
  - **Locked for Regular Staff (Admin Only Override)**: Legal Full Name, Date of Birth, Gender, PhilHealth / Government ID Number.
- [x] **Audit Trail**: Record editor user ID and timestamp on any demographic updates.

#### 1.4 Dead Code Cleanup (`IndividualTreatmentForm.tsx`)
- [x] Remove or deprecate legacy `IndividualTreatmentForm.tsx` (which called non-existent `/api/consultations` endpoints).
- [x] Ensure all references point cleanly to `GeneralTreatmentForm.tsx`.

---

### 🥈 PHASE 2: Automated Queue Flow & Desk Handoff

* **Goal**: Complete 100% automation so clinicians never need to click manual "Serving" or "Complete" buttons on queue boards.

#### 2.1 Doctor Triage $\rightarrow$ Treatment Desk Auto-Handoff
- [x] When the Doctor clicks **"Save Record" / "Save Consultation"** on Form 2:
  - Triage ticket automatically transitions from `in_consultation` $\rightarrow$ `visit_type = 'vaccination'`, `status = 'waiting'` (Referred to Treatment).
  - Automatically unlocks Form 3 at the Nurse Treatment Desk.
  - Logs transition in `queue_history` with doctor user ID.

#### 2.2 Nurse Treatment Desk $\rightarrow$ Auto-Completion
- [x] When the Nurse submits Form 3 for **ANY dose** (Day 0, Day 3, Day 7, Day 28, or Booster):
  - Today's active queue ticket automatically marks as `completed` (`status = 'completed'`, `completed_at = now()`).
  - Auto-schedules the next follow-up appointment according to the clinic's operating schedule.
  - Ticket clears off the active calling screen.

#### 2.3 Daily Queue Reset & Midnight Auto-Expiry
- [x] Every clinic day resets cleanly starting from **Queue #1**.
- [x] Past-day unserved tickets are automatically closed as `no_response (Auto-expired at end of clinic day)` to prevent ghost tickets leaking into today's queue.

#### 2.4 In-Place Queue Patient Detail Modal (`QueuePatientDetailModal.tsx` & `QueueDashboardPage.tsx`)
- [x] Clicking "View" on any queue entry opens an in-place Dialog modal directly over the Queue Dashboard rather than navigating away to a separate page.
- [x] Includes 3-tab workflow: Form 1 Demographics, Form 2 Doctor Triage, Form 3 Nurse Treatment.
- [x] Preserves 100% of clinic operating logic:
  - Doctor saving Form 2 auto-refers patient from Triage to Treatment Queue.
  - Nurse saving Form 3 auto-completes the queue ticket and triggers inventory deductions.
  - Un-administered follow-up doses remain editable; completed doses remain strictly locked.
  - Closed clinic weekend shifts remain enforced.

---

### 🥉 PHASE 3: PEP Option A Scheduling & Re-Exposure Protocol

* **Goal**: Strict adherence to DOH calendar day intervals with automated operating schedule shifts.

#### 3.1 Option A Standard PEP Scheduling (`ClinicScheduleService.php`)
- [x] Calculate Day 3 ($+3\text{d}$), Day 7 ($+7\text{d}$), Day 28 ($+28\text{d}$) from actual Day 0 date.
- [x] If target date lands on a **closed day (Saturday or Sunday)**:
  - **Automatically shift forward to Monday** (next open day).
  - Log `schedule_drift_days` (`+1d` or `+2d`) and `schedule_adjustment_reason` (e.g. *"Shifted +1d — clinic closed on weekend"*).
  - Frontend Form 3 preview dates now also reflect the drift with an amber pill indicator.

#### 3.2 Re-Exposure Booster Protocol (2-Dose Regimen)
- [x] Returning patients with prior completed series only schedule **Day 0 and Day 3**.
- [x] Omit Day 7, Day 28, and RIG prescriptions automatically (ERIG checkbox greyed out with contraindication tooltip).
- [x] Transition episode to **`Regimen Completed`** immediately upon Day 3 administration.

#### 3.3 Mobile Calendar & Dot Marker Sync (`schedule_calendar_view.dart`)
- [x] Month-switching arrow updates visible dot indicators dynamically — all events loaded in memory via `_allEvents`; `_filteredEvents` getter re-filters on each rebuild automatically.
- [x] Appointment cards show drift tags (amber pill) when `scheduleDriftDays != 0` (lines 879–890).

---

### 🏅 PHASE 4: Vaccine Inventory & Open-Vial Safety

* **Goal**: Prevent inventory batch mismatches and enforce 6-hour open vial cold-chain safety.

#### 4.1 Multi-Dose Vial Sharing & Expiration Timer (`VaccineInventoryUsageService.php`)
- [ ] Multi-dose vials (e.g. 3 doses per vial for Speeda ID) decrement 1 vial on open and allow remaining 2 doses with 0 vial deduction.
- [ ] Enforce 6-hour discard timer (`open_vial_discard_at`):
  - If open vial exceeds 6 hours, auto-expire open vial status and require opening a fresh vial for the next patient.

#### 4.2 Exact Brand Name Sync
- [ ] Ensure vaccine brand names in `VaccineInventory` match Form 3 dropdown options cleanly to prevent `"Insufficient stock"` 422 errors.

#### 4.3 Fix False "Missing Stock Info" Badge on External Clinic Doses (`VaccinationRecordForm.tsx`)
- [x] Dose rows with **"Transferred-In (External Clinic)"** checked currently show a red `Missing Stock Info` status badge even though no local stock deduction is expected for those doses.
- [x] Fix: When `is_external = true` on a dose row, the Status column displays a neutral **`External Clinic`** badge (grey/blue) instead of the red `Missing Stock Info` badge.
- [x] The `Missing Stock Info` red badge only appears for local (non-external) doses where a vaccine type has not been selected for today's active dose.
- [x] Saving the form does not block or warn on external dose rows due to missing local stock — only validates stock for locally-administered doses (`is_external = false`).

---

## 📋 Verification & Testing Checklist

> 📖 **Full Comprehensive Guide & Printable Tester Matrix**: See [`guide/08-phase-logs-and-testing/UI_TESTING_GUIDE_2026.md`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/guide/08-phase-logs-and-testing/UI_TESTING_GUIDE_2026.md) for step-by-step instructions, test credentials, expected results, and QA sign-off sheet.

- [ ] **Test 1**: Create a new bite case $\rightarrow$ Fill Form 2 $\rightarrow$ Verify ticket auto-moves to Treatment Queue.
- [ ] **Test 2**: Administer Day 0 in Form 3 $\rightarrow$ Verify Day 0 locks, queue ticket completes, and Day 3/7/28 auto-schedule with Option A.
- [ ] **Test 3**: Re-open Form 2 for that patient $\rightarrow$ Verify Form 2 is completely locked in read-only mode.
- [ ] **Test 4**: Re-open Form 3 for that patient $\rightarrow$ Verify Day 0 row is locked (brand, batch, date non-editable), and Day 3 row is open for recording.
- [ ] **Test 5**: Run full TypeScript check (`npx tsc --noEmit`) and backend test suite.
