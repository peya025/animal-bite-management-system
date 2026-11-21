# UI Test Guide: Cycle 16 – Developer Appointment Diagnostics & Auto-Repair

## Objective
Verify the end-to-end functionality of the Appointment Health & Diagnostic Scan tool, anomaly detection across clinical stages (registration, triage, nurse, schedule engine), and the automated anomaly repair mechanism following the refactoring of `Developer/AppointmentDiagnosticController.php`.

---

## Target Endpoints Verified
- `GET /api/developer/diagnostics/appointments` (Run full clinic scheduling and lifecycle diagnostic scan)
- `POST /api/developer/diagnostics/appointments/repair-all` (Auto-repair all fixable scheduling anomalies)
- `POST /api/developer/diagnostics/appointments/repair-single` (Targeted auto-repair of a single anomaly by ID and action rule)

---

## Prerequisites
1. Local development backend running (`http://127.0.0.1:8000`).
2. Logged in staff user with the `developer` role.
3. Developer tools enabled in environment (`APP_ENV=local` or `DEVELOPER_TOOLS_ENABLED=true`).

---

## Step-by-Step Test Procedure

### 1. Run Diagnostic Health Scan
1. Open the web application and navigate to `/developer/diagnostics` (or click **Appointment Diagnostics** in the Developer sidebar).
2. The web client requests `GET /api/developer/diagnostics/appointments`.
3. **Expected Result:**
   - Returns HTTP 200 OK with `clinic_id`, `scanned_at`, `health_score` (0-100), `summary`, `role_breakdown`, and `anomalies` list.
   - **Health Score Gauge:** Displays overall system scheduling integrity (e.g. 98% Healthy).
   - **Role Stage Cards:** Visual status indicators for Registration Desk, Doctor / Triage, Treatment / Nurse, and Operating Schedule Engine.
   - **Anomalies Table:** Lists detected issues with rule codes (e.g. `SCHED-01`, `PEP-02`), affected patient name, severity badge (`critical`, `warning`, `info`), and whether an automated fix is available (`can_auto_fix: true`).

---

### 2. Auto-Repair All Fixable Issues
1. Click the **Auto-Repair All** button at the top of the diagnostic dashboard.
2. Confirm the prompt modal.
3. The web client sends `POST /api/developer/diagnostics/appointments/repair-all`.
4. **Expected Result:**
   - Returns HTTP 200 OK with `{"message": "Successfully auto-repaired X out of Y fixable issue(s).", "details": { ... }}`.
   - The UI automatically triggers a re-scan.
   - The health score updates upwards and repaired issues disappear from the active anomaly list.

---

### 3. Repair Single Anomaly
1. Find a specific anomaly in the table that has a "Fix" button (e.g. `shift_to_resolved_date`).
2. Click **Fix Issue**.
3. The web client sends `POST /api/developer/diagnostics/appointments/repair-single` with:
   ```json
   {
     "id": "anomaly-uuid-or-code",
     "appointment_id": 12,
     "auto_fix_action": "shift_to_resolved_date"
   }
   ```
4. **Expected Result:**
   - Returns HTTP 200 OK with `{"message": "Issue 'anomaly-uuid-or-code' repaired successfully."}`.
   - The specific anomaly row is marked as resolved and removed from the active issues list.

---

### 4. Input Validation & Error Handling
1. Send a request to `POST /api/developer/diagnostics/appointments/repair-single` with an empty JSON body `{}`:
   - **Expected Result:** HTTP 422 Unprocessable Entity with validation error messages for `id` and `auto_fix_action`.
2. Send a request with an invalid or non-existent action:
   - **Expected Result:** HTTP 422 Unprocessable Entity with `{"message": "Unable to auto-repair this specific issue. Please inspect manual records."}`.

---

### 5. Role Authorization & Access Control
1. Attempt to access any `/api/developer/diagnostics/*` endpoint without a bearer token:
   - **Expected Result:** HTTP 401 Unauthorized.
2. Attempt to access `/api/developer/diagnostics/*` using a user account having role `treatment`, `doctor`, or `nurse`:
   - **Expected Result:** HTTP 403 Forbidden with *"Unauthorized. This action requires developer role."*.

---

## Verification Summary
- **Zero regressions:** Diagnostic scanning structure, repair logging, and status codes strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Developer/AppointmentDiagnosticCharacterizationTest.php` passing 7/7 tests (30 assertions).
- **Frontend compatibility:** Full build passes with 0 errors.
