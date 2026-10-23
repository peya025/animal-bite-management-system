# UI Test Guide: Cycle 8 – Clinic Module Configuration

## Objective
Verify the end-to-end functionality of clinic module configuration and dynamic field rule management following the refactoring of `ClinicModuleConfigController.php`.

---

## Target Endpoints Verified
- `GET /api/setup/module-config` (View active station toggles and field requirement rules)
- `PUT /api/setup/module-config` (Update workstation modules and field requirement rules, Admin only)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Two test accounts:
   - **Admin Account:** (e.g. `admin@clinic.gov.ph` / `password123`)
   - **Clinical Staff Account:** (e.g. Registration Nurse, Triage Nurse, or Treatment Nurse)

---

## Step-by-Step Test Procedure

### 1. View Module Configuration as Staff
1. Log in to the Web App as a Clinical Staff member (e.g. Triage Nurse).
2. The frontend loads initial clinic module configurations via `clinicConfigApi.getModuleConfig()` (`GET /api/setup/module-config`).
3. **Expected Result:**
   - Station views and form fields respect the active configuration (e.g., triage module enabled, required fields indicated by red asterisks).
   - HTTP 200 OK returned with current configuration payload including all 41 configurable field rules.

---

### 2. View Module Configuration as Admin
1. Log in to the Web App as an Administrator.
2. Navigate to **Clinic Settings / Module Configuration** (`/admin/settings` or `/setup/module-config`).
3. **Expected Result:**
   - The Module Configuration page loads successfully.
   - All station toggles (Triage Module, Patient Registration, Socioeconomic, Government Programs, Bite Intake, Treatment) display current state.
   - The dynamic field rule table displays each configurable field with its requirement rule (`required`, `optional`, or `hidden`).

---

### 3. Update Station Toggles & Field Rules
1. In the Module Configuration page as Admin:
   - Toggle one or more module sections (e.g., toggle socioeconomic section or government programs).
   - Change a field rule (e.g., change `blood_type` from `optional` to `required`, or `spouse_name` to `hidden`).
2. Click **Save Changes** or **Update Configuration**.
3. **Expected Result:**
   - Request `PUT /api/setup/module-config` returns HTTP 200 OK with:
     ```json
     {
       "message": "Module configuration updated successfully",
       "config": { ... }
     }
     ```
   - Success toast / banner displays: *"Module configuration updated successfully"*.
   - Refresh the page and confirm the saved settings persist across page reloads.

---

### 4. Admin-Only Guard Verification
1. Log in as a Non-Admin user (e.g., Nurse or Patient account).
2. Attempt to send a `PUT /api/setup/module-config` request via DevTools or API client.
3. **Expected Result:**
   - Returns HTTP 403 Forbidden with payload:
     ```json
     {
       "message": "Unauthorized. Admin access required."
     }
     ```
   - No database alterations are performed.

---

## Verification Summary
- **Zero regressions:** Response contracts for `GET` and `PUT` strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php` passes 6/6 tests (32 assertions).
- **Frontend compatibility:** `frontend/src/services/clinicConfigApi.ts` and `ModuleConfigPage.tsx` builds with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
