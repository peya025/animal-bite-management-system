# UI Test Guide: Cycle 9 – Clinic Operating Schedule & Exceptions

## Objective
Verify the end-to-end functionality of clinic weekly operating schedule, holiday exceptions, drift policies, and automated appointment synchronization following the refactoring of `ClinicScheduleController.php`.

---

## Target Endpoints Verified
- `GET /api/clinics/schedule` (Retrieve full 7-day schedule, exceptions, and policies, Admin only)
- `PUT /api/clinics/schedule/weekly` (Update weekly recurring schedule, Admin only)
- `GET /api/clinics/schedule/exceptions` (List active calendar exceptions, Admin only)
- `POST /api/clinics/schedule/exceptions` (Create/update holiday or special closure exception, Admin only)
- `DELETE /api/clinics/schedule/exceptions/{id}` (Delete schedule exception, Admin only)
- `PUT /api/clinics/schedule/policies` (Update drift policies & emergency referral info, Admin only)
- `POST /api/clinics/schedule/recalculate` (Synchronize and recalculate pending appointments, Admin only)
- `GET /api/mobile/schedule-summary` & `GET /api/clinics/schedule-summary` (Public/mobile schedule summary)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Two test accounts:
   - **Admin Account:** (e.g. `admin@clinic.gov.ph` / `password123`)
   - **Clinical Staff / Public Account:** (e.g. `staff@clinic.gov.ph` or unauthenticated mobile client)

---

## Step-by-Step Test Procedure

### 1. View Public/Mobile Operating Schedule Summary
1. Open the landing page or trigger mobile app schedule view.
2. The client fetches `GET /api/mobile/schedule-summary` or `GET /api/clinics/schedule-summary`.
3. **Expected Result:**
   - Returns HTTP 200 with open days of the week, formatted schedules (e.g., "8:00 AM - 5:00 PM"), exceptions dictionary, and clinic contact info.
   - Public users can view operating days without requiring login credentials.

---

### 2. View Operating Schedule as Admin
1. Log in to the Web App as an Administrator.
2. Navigate to **Clinic Settings > Operating Schedule** (`/setup/schedule`).
3. **Expected Result:**
   - The page fetches `GET /api/clinics/schedule`.
   - All 7 days of the week (Sunday through Saturday) are displayed in an interactive table with toggle switches for Open/Closed, Open Time, Close Time, Slot Interval, and Max Patients.
   - Any configured calendar exceptions (holidays, special closures) appear in the Exceptions table.
   - The Schedule Drift Policy (e.g., Forward Only, Nearest, Backward N days) and Emergency Access Policy are loaded.

---

### 3. Update Weekly Recurring Schedule
1. In `/setup/schedule`:
   - Toggle Saturday to Open with hours `09:00` to `14:00`.
   - Click **Save Operating Schedule**.
2. **Expected Result:**
   - Request `PUT /api/clinics/schedule/weekly` returns HTTP 200 with updated schedules and `shifted_count`.
   - Success modal/toast confirms: *"Weekly operating schedule updated successfully"*.
   - Refresh the page and confirm Saturday persists as Open.

---

### 4. Create and Delete Holiday Exception
1. In `/setup/schedule`, click **Add Holiday / Exception**:
   - Exception Date: Select an upcoming date (e.g., upcoming Monday).
   - Is Open: Set to Closed (toggle off).
   - Reason: "Official Public Holiday".
   - Click **Save Exception**.
2. **Expected Result:**
   - Request `POST /api/clinics/schedule/exceptions` returns HTTP 200 with the saved exception and recalculated `shifted_count`.
   - The new exception appears in the Exceptions table.
3. In the Exceptions table, click the **Delete / Trash** icon next to the created exception.
4. **Expected Result:**
   - Request `DELETE /api/clinics/schedule/exceptions/{id}` returns HTTP 200.
   - Modal/toast confirms: *"Schedule exception removed successfully"*.
   - The exception is removed from the table.

---

### 5. Update Schedule Policies
1. In the Drift & Emergency Policies section:
   - Change PEP Schedule Drift Policy to `Nearest Open Day`.
   - Change Urgent Access Policy to `Refer to Alternate Facility`.
   - Fill in Urgent Referral Facility Name: "Northern Mindanao Medical Center".
   - Click **Update Policies**.
2. **Expected Result:**
   - Request `PUT /api/clinics/schedule/policies` returns HTTP 200 with the updated clinic model.
   - Success toast confirms policies updated successfully.

---

### 6. Recalculate Pending Appointments
1. Click **Synchronize & Recalculate Appointments**.
2. **Expected Result:**
   - Request `POST /api/clinics/schedule/recalculate` returns HTTP 200 with:
     ```json
     {
       "message": "Successfully re-evaluated and synchronized scheduled appointments (0 moved to valid open days).",
       "shifted_count": 0
     }
     ```
   - Success notification confirms all future patient appointments are verified against the active operating calendar.

---

### 7. Access Control Verification
1. Log in as a Non-Admin user (e.g., Treatment Nurse).
2. Attempt to send a request to `GET /api/clinics/schedule` or `PUT /api/clinics/schedule/weekly`.
3. **Expected Result:**
   - Returns HTTP 403 Forbidden (`role:admin` middleware blocks access).

---

## Verification Summary
- **Zero regressions:** Response contracts across all 8 schedule endpoints strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Clinic/ClinicScheduleCharacterizationTest.php` passes 11/11 tests (92 assertions).
- **Full Suite pass:** 174 total characterization tests passing (905 assertions) across Person 1 and Person 4.
- **Frontend compatibility:** `ClinicOperatingSchedulePage.tsx` builds cleanly with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
