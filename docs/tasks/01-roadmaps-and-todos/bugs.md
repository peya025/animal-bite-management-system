# Bug Investigation & Resolution Plan

**Date**: September 14, 2026  
**Status**: Documented for Implementation Tomorrow  
**Location**: `tasks/bugs.md`  

---

## Executive Summary

During testing of the patient journey (administering follow-ups and booking boosters), two major architectural and UI/UX issues were identified in the Nurse and Reception Patient Management views:

1. **Unwanted Day 28 Dose Generation**:
   - The clinic protocol strictly follows the DOH NRPCP / WHO **3-Dose Primary PEP Series** (Day 0, Day 3, Day 7), followed by **2 Boosters** (Booster 1 and Booster 2) only upon re-exposure.
   - However, the system continues to generate a Day 28 appointment for every patient, displays Day 28 in the treatment card, and requires `dose_number >= 28` before marking a patient as "Completed".
2. **Status and Last Dose Misalignment in "All Patients" Filter**:
   - In both Walk-in and Online patient rows under the **All Patients** tab, the **LAST DOSE** and **STATUS** columns are logically contradictory and visually misaligned.
   - For example, a patient who completed Day 7 shows `LAST DOSE: Day 7 (Dose 2)` but `STATUS: In Progress` indefinitely because the system is waiting for Day 28.
   - For online patients, status often defaults to `Awaiting Triage (Form 2)` even after triage or booking because relationships (`biteIncidents`) are not eager-loaded in the `all` tab.
   - Visually, the table cells have mismatched vertical heights and mixed text/chip baselines (some cells have 2 lines, some have 1, some are center-aligned while others are left-aligned).

---

## Part 1: Day 28 Removal — 3 Primary Doses + 2 Boosters Protocol

### 1.1 Clinical Requirement
- **Standard Primary PEP Series (Naive / First Exposure)**: Strictly **3 doses**:
  1. **Day 0** (Initial dose)
  2. **Day 3** (Dose 1 follow-up)
  3. **Day 7** (Dose 2 follow-up — **Series Complete**)
- **Re-Exposure Protocol (Previously Vaccinated Patients)**: Strictly **2 booster doses**:
  1. **Booster 1** (Day 0 of re-exposure)
  2. **Booster 2** (Day 3 of re-exposure — **Booster Complete**)
- **Day 28 Must Be Removed**: Routine Day 28 scheduling is obsolete in the 2-site ID standard regimen and must not be automatically generated, displayed, or expected.

---

### 1.2 Root Cause Analysis: Where Day 28 Exists in Code

#### A. Frontend: `VaccinationRecordForm.tsx`
- **Location**: [`frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx:238-250`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx)
- **Problem**: `createInitialDoses()` automatically pre-populates `Day 28` with a calculated date:
  ```ts
  const d28 = scheduledDoseDate(baseDate, 28);
  // ...
  { period: 'Day 28', route: '', ...d28, ... }
  ```
- **Consequence**: When Form 3 is submitted, `doses` array always contains an object for Day 28 with a non-empty `date` field (`d28.date`).

#### B. Backend: `VaccinationRecordController.php`
- **Location**: [`backend/app/Http/Controllers/VaccinationRecordController.php:984-990`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Http/Controllers/VaccinationRecordController.php#L984-L990)
- **Problem**: The backend auto-scheduler checks:
  ```php
  $hasExplicitDay28 = collect($request->doses ?? [])->contains(
      fn($d) => ($d['period'] ?? '') === 'Day 28' && !empty($d['date'])
  );
  if ($hasExplicitDay28) {
      $schedule[] = ['period' => 'Day 28', 'days_after' => 28, 'dose_number' => 28];
      $doseIntervals[28] = 21;
  }
  ```
- **Consequence**: Because `VaccinationRecordForm.tsx` always pre-fills `d28.date`, `$hasExplicitDay28` is **always true**. Thus, the scheduler creates a Day 28 appointment for every patient who receives Day 0.

#### C. Backend Episode Completion: `VaccinationRecordController.php`
- **Location**: [`backend/app/Http/Controllers/VaccinationRecordController.php:823-834`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Http/Controllers/VaccinationRecordController.php#L823-L834)
- **Problem**:
  ```php
  if ($isBooster && in_array(3, $savedDoseNumbers)) {
      $incident->update(['status' => 'completed']);
  } elseif (!$isBooster && in_array(28, $savedDoseNumbers)) {
      $incident->update(['status' => 'completed']);
  }
  ```
- **Consequence**: For non-booster (primary) episodes, it requires `dose_number = 28` to mark the incident as completed. Patients who finish Day 7 remain in `status = 'active'` forever.

#### D. Frontend Completion Check: `NursePatientListPage.tsx`
- **Location**: [`frontend/src/features/patients/pages/NursePatientListPage.tsx:239`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/patients/pages/NursePatientListPage.tsx#L239)
- **Problem**:
  ```ts
  if (record.dose_number >= 28 && !appt) {
      return { label: 'Completed', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  ```
- **Consequence**: A patient who completed Day 7 (`dose_number = 7`) fails the `7 >= 28` check and stays in `In Progress` status forever.

#### E. Printable Card Modals: `TagoloanTreatmentCardModal.tsx`
- **Location**: [`frontend/src/features/vaccinations/components/TagoloanTreatmentCardModal.tsx:158`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/vaccinations/components/TagoloanTreatmentCardModal.tsx#L158)
- **Problem**: Hardcoded period rows include:
  ```ts
  { period: 'Day 28', key: 'day28', doseNum: 28 },
  ```

---

### 1.3 Action Items for Tomorrow (Day 28 Fix)

1. **Remove Day 28 from Default Doses in `VaccinationRecordForm.tsx`**:
   - In `createInitialDoses()`, remove `d28` and the `{ period: 'Day 28' }` entry from the default schedule.
   - The primary doses array should strictly be: **Day 0, Day 3, Day 7**.
   - Boosters remain separate: **Booster 1 (Day 0), Booster 2 (Day 3)**.
2. **Remove Day 28 Auto-Scheduling in `VaccinationRecordController.php`**:
   - Remove the `$hasExplicitDay28` block completely from `createFollowUpAppointments()`.
   - The primary schedule should only contain `Day 3` (`days_after => 3`) and `Day 7` (`days_after => 7`).
3. **Update Regimen Completion Logic in `VaccinationRecordController.php`**:
   - Change line 830:
     ```php
     } elseif (!$isBooster && in_array(7, $savedDoseNumbers)) {
         $incident->update(['status' => 'completed']);
     }
     ```
   - Primary PEP is officially completed when **Day 7** is administered.
4. **Update Frontend Status Resolution in `NursePatientListPage.tsx`**:
   - Change line 239:
     ```ts
     const isPrimaryComplete = record.dose_number >= 7 && record.dose_number < 90;
     const isBoosterComplete = record.dose_number >= 365;
     if ((isPrimaryComplete || isBoosterComplete) && !hasUpcomingAppt) {
         return { label: 'Completed', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
     }
     ```
5. **Database Cleanup Script**:
   - Run a migration script to cancel or prune all orphan `dose_number = 28` appointments that are currently in `status = 'scheduled'`.

---

## Part 2: "All Patients" Filter Status & Last Dose Alignment

### 2.1 Problem Manifestation
When viewing the patient list under the **All Patients** filter (`tab=all`), rows exhibit both logical contradictions and visual misalignments:

```text
PATIENT NAME           LAST DOSE                     STATUS                      NEXT APPOINTMENT
------------------------------------------------------------------------------------------------------------------
hhd, kirara [Online]   Booster 1                     Checked In / Ready for Dose Initial Consultation / Day 0
1y · male              Administered: Nov 30, 2026                                Checked In / Ready for Dose
------------------------------------------------------------------------------------------------------------------
Doe, John [Walk-in]    Day 7 (Dose 2)                In Progress                 None (Completed)
35y · male             Administered: Sep 14, 2026
------------------------------------------------------------------------------------------------------------------
Smith, Anna [Online]   No doses                      Awaiting Triage (Form 2)    Initial Consultation
24y · female                                                                     Monday, Sep 14, 2026
```

---

### 2.2 Root Cause Analysis

#### A. Logical Contradiction 1: Day 7 Completed but Status Says "In Progress"
- **Cause**: Line 239 in `NursePatientListPage.tsx` checks `record.dose_number >= 28`. Because Day 7 is dose 7, it fails and outputs `In Progress`.
- **Fix**: Recognize `dose_number === 7` as the completion of primary PEP. If there are no pending follow-up appointments, status must be **Completed**.

#### B. Logical Contradiction 2: Booster Patient Showing "Initial Consultation / Day 0"
- **Cause**: In `AppointmentController.php`, when `checkInByPatient` ran without finding an appointment for today, it generated an appointment with `dose_number = null`.
- When `NursePatientListPage.tsx` renders `next_appointment`:
  ```ts
  const appointmentTitle = appt.dose_number !== undefined && appt.dose_number !== null && doseMap[appt.dose_number]
    ? doseMap[appt.dose_number]
    : (isBoosterAppt ? 'Booster Vaccination' : 'Initial Consultation / Day 0');
  ```
  If `dose_number` is null and notes do not contain "booster", it falls back to `"Initial Consultation / Day 0"`.
- **Fix**:
  1. Determine `dose_number` from previous treatment records when creating walk-in appointments.
  2. In `next_appointment`, if the patient already has completed doses (e.g. `latest_treatment_record` exists), it should NEVER fall back to "Initial Consultation / Day 0"; it should calculate the next logical dose (Day 3, Day 7, or Booster).

#### C. Logical Contradiction 3: Online Patients Showing "Awaiting Triage (Form 2)" Even When Scheduled
- **Cause**: In `AppointmentController.php`, `case 'all'` eager loads:
  `'latestTreatmentRecord', 'upcomingAppointment', 'appointments', 'biteIntakes', 'queues'`
  It does **NOT** eager load `'biteIncidents'`.
- In `NursePatientListPage.tsx`:
  ```ts
  const hasCompletedTriage = Boolean(
    (patient as any).bite_incidents?.length ||
    (patient as any).biteIncidents?.length ||
    record
  );
  ```
  For an online patient who registered and has a bite incident or consultation booking, `patient.bite_incidents` is `undefined` because it wasn't loaded!
  As a result, `hasCompletedTriage` returns `false`, causing the status to display `Awaiting Triage (Form 2)` erroneously.
- **Fix**: In `AppointmentController.php` under `case 'all'`, add `'biteIncidents' => fn($q) => $q->latest('bite_id')` to the `with()` eager loading array.

#### D. Visual Misalignment Across Table Columns
- **Cause**:
  1. **Column Alignment Discrepancy**:
     - `PATIENT #`: `align: 'center'`
     - `PATIENT NAME`: `align: 'left'` (2 lines: Name + Badge; Demographics)
     - `LAST DOSE`: `align: 'center'` (Chip + optional small text date)
     - `STATUS`: `align: 'center'` (Single chip only, no date)
     - `NEXT APPOINTMENT`: `align: 'left'` (2 lines: Title; Date / Status)
     - `ACTIONS`: `align: 'center'` (Buttons)
  2. **Vertical Height Mismatch**:
     - In `LAST DOSE`, when `record?.treatment_date` exists, it renders an extra `<Typography>` line:
       `Administered: Mon DD, YYYY`.
     - In `STATUS`, there is only a single Chip with no secondary text.
     - This causes the Chip in `STATUS` to float in the vertical center while `LAST DOSE` extends downwards, breaking horizontal alignment across the row.
  3. **Inconsistent Chip Heights & Styles**:
     - `LAST DOSE` chip: `height: 24px, fontSize: 11.5px`.
     - `STATUS` chip: `height: 24px, fontSize: 11.5px`.
     - `NEXT APPOINTMENT` badge: raw `<Box>` with `border` and `padding`, not using MUI Chip.

---

### 2.3 Action Items for Tomorrow (Alignment Fix)

1. **Eager Load `biteIncidents` in `AppointmentController.php`**:
   - In `nursePatients()` under `case 'all'`, add `'biteIncidents'` to `with([...])`.
   - Also add `'biteIncidents'` in `PatientController.php` for consistency.
2. **Harmonize `getVaccinationStatus()` in `NursePatientListPage.tsx`**:
   - Base status strictly on dose completion:
     - 0 doses + active queue in triage: `In Triage`
     - 0 doses + triage completed: `Ready for Day 0`
     - Dose 0 completed: `Day 0 Done (Awaiting Day 3)`
     - Dose 3 completed: `Day 3 Done (Awaiting Day 7)`
     - Dose 7 completed: `Primary Series Completed` (Green chip)
     - Booster 1 completed: `Booster 1 Done (Awaiting Booster 2)`
     - Booster 2 completed: `Booster Series Completed` (Green chip)
     - Any scheduled appointment overdue: `Overdue` (Red chip)
     - Active confirmed appointment for today: `Checked In / Ready for Dose` (Emerald chip)
3. **Synchronize Visual Layout of `LAST DOSE` and `STATUS`**:
   - Structure both columns with identical two-line flex containers (`display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 44px`):
     - Line 1: Primary Status / Dose Badge (`<Chip size="small" />`)
     - Line 2: Supporting Subtext (e.g. `Administered: Sep 14, 2026` in `LAST DOSE`, and `Due: Sep 17, 2026` or `Series Complete` in `STATUS`).
   - Ensures consistent row height and aligned baselines across all patient rows.
4. **Standardize `NEXT APPOINTMENT` Cell**:
   - Use center alignment or consistent structured badges.
   - For completed patients with no pending appointments, display a clean muted badge: `All Doses Completed`.

---

## Part 3: Verification Checklist for Implementation

- [ ] Submitting Form 3 for Day 0 schedules **only Day 3 and Day 7** (no Day 28 appointment created).
- [ ] Submitting Day 7 marks the episode and primary series as **Completed**.
- [ ] No Day 28 row appears in the Form 3 dose recording table.
- [ ] In `NursePatientListPage.tsx` under **All Patients** tab:
  - [ ] Patients who finished Day 7 show `LAST DOSE: Day 7` and `STATUS: Primary Series Completed`.
  - [ ] Online patients with bookings correctly reflect their booked appointment status, not `Awaiting Triage`.
  - [ ] `LAST DOSE` and `STATUS` columns have identical vertical centering and row heights.
- [ ] Clicking the **View** icon opens `TagoloanTreatmentCardModal` (ready-to-print card), while clicking **Record Dose** opens Form 3.
- [ ] `npx tsc --noEmit` compiles cleanly with 0 errors.
- [ ] `php artisan test --filter=MobilePatientWorkflowTest` passes.
