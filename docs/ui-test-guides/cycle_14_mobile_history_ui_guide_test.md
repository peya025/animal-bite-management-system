# UI Test Guide: Cycle 14 – Mobile Patient Treatment, Vaccination & Appointment History

## Objective
Verify the end-to-end functionality of the consolidated mobile patient history screen, past appointment tracking, administered vaccination dose progress, multi-patient relationship tagging, and active bite case banners following the refactoring of `MobileHistoryController.php`.

---

## Target Endpoints Verified
- `GET /api/mobile/history` (Consolidated real-time history feed for linked patient profiles, active bite case banner, summary metrics)
- `GET /api/mobile/history?patient_id={id}` (Scoped timeline filtered specifically to a selected family member / dependent)

---

## Prerequisites
1. Local development backend running (`http://127.0.0.1:8000`).
2. Logged in mobile patient account with at least one linked patient profile (e.g., self or dependent).
3. Past appointments and/or completed treatment records in the database for the account or linked patient.

---

## Step-by-Step Test Procedure

### 1. View Consolidated History Feed
1. Open the mobile application and tap the **History** tab in the bottom navigation bar.
2. The app requests `GET /api/mobile/history`.
3. **Expected Result:**
   - Returns HTTP 200 OK with `summary`, `active_case`, and `records`.
   - **Summary Banner:** Displays total visits count, completed vaccinations count, and active cases count.
   - **Active Case Banner:** If an active bite episode or upcoming scheduled dose exists:
     - Displays case number (e.g. `TAG-2026-001 · Active`).
     - Next scheduled dose description (e.g. `Next: Day 3 dose · October 25, 2026`).
     - Due badge with relative timing (`Due in 2 days`, `Due today`, or `Overdue`).
     - Schedule drift indicators if clinic operating schedule shifted the ideal date.
   - **Timeline Cards:** Chronologically sorted list (newest first) interleaving completed consultations and administered vaccination doses.
   - Each card displays formatted date/time, patient name, relationship badge (`Self`, `Child`), and status pill (`Completed`, `Missed`).

---

### 2. Dose Progress & Vaccination Card Details
1. In the History feed, observe a vaccination timeline card.
2. **Expected Result:**
   - Dose label indicates completion progress (e.g., `1 of 4 done` or `2 of 4 done`).
   - Title indicates the anti-rabies dose protocol (`Anti-rabies vaccine · Day 0`, `Anti-rabies vaccine · Day 3`, `Booster 1`, etc.).
   - Vaccine brand name displayed (e.g. `Verorab` or generic fallback).

---

### 3. Patient Filter Switching (Family Dependents)
1. For an account with multiple linked profiles (e.g., parent and child):
2. Tap the patient selector pill/tab at the top of the history view to filter by a specific dependent.
3. The app requests `GET /api/mobile/history?patient_id={child_patient_id}`.
4. **Expected Result:**
   - Timeline filters instantly to show exclusively the records belonging to the selected child.
   - `summary.patients` includes only the selected profile.
   - Active case banner updates to reflect only the selected patient's active case status.

---

### 4. Empty State for Accounts with No Records
1. Log in with a newly registered patient account that has no linked patients or past appointments.
2. Navigate to the **History** tab.
3. **Expected Result:**
   - Returns HTTP 200 OK with `total_visits: 0`, `total_vaccinations: 0`, `active_cases: 0`, `active_case: null`, and `records: []`.
   - The UI displays an empty state placeholder ("No history records yet").

---

### 5. Access Control & Cross-Account Isolation
1. Attempt to request `GET /api/mobile/history` without an authentication token:
   - **Expected Result:** HTTP 401 Unauthorized.
2. Attempt to request `GET /api/mobile/history` using a clinic staff Bearer token:
   - **Expected Result:** HTTP 403 Forbidden with *"Patient account authentication is required."*.
3. Request history passing a `patient_id` belonging to an unlinked patient:
   - **Expected Result:** HTTP 200 OK with empty records (no data leaked from other patients).

---

## Verification Summary
- **Zero regressions:** Response shape strictly conforms to the mobile contract (`summary`, `active_case`, `records`).
- **Automated coverage:** `backend/tests/Feature/Mobile/MobileHistoryCharacterizationTest.php` passing 12/12 tests (71 assertions).
- **Mobile feature suite:** 33/33 tests passing (180 assertions).
- **Full backend suite:** 227 tests passing (1270+ assertions) across Person 1 and Person 4.
- **Frontend build:** `npm run build` (`tsc -b && vite build`) passes in 4.63s with 0 errors.
- **Mobile analysis:** `flutter analyze` passes with 0 errors.
