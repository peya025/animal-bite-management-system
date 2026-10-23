# UI Test Guide: Cycle 7 – Form 1 Enrolment & Document Print Views

## Objective
Verify the end-to-end functionality of printable document views (DOH iCLINICSYS Patient Enrolment Form 1, Rabies Exposure Registry, Monthly ABTC Report, and Quarterly Cohort Report) following the refactoring of `PrintController.php`.

---

## Target Endpoints Verified
- `GET /api/print/patient/{patient}/enrolment` (Form 1 Patient Enrolment Record with vitals and consultation data)
- `GET /api/print/reports/exposure-registry` and `GET /print/reports/exposure-registry`
- `GET /api/print/reports/monthly` and `GET /print/reports/monthly`
- `GET /api/print/reports/cohort` and `GET /print/reports/cohort`

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Logged in as authorized clinic staff (Admin, Registration, Triage, or Treatment).

---

## Step-by-Step Test Procedure

### 1. Patient Enrolment Printout (Form 1)
1. In the Web App, navigate to the Patients list (`/patients`).
2. Select any registered patient.
3. Click **Print Form 1 / Enrolment**.
4. **Expected Result:**
   - A print preview window/dialog opens rendering the DOH iCLINICSYS Patient Enrolment Record (`prints.patient-enrolment` Blade view).
   - Verifies:
     - Header grid with DOH branding and Clinic name.
     - Patient Demographics (Last Name, First Name in uppercase, Date of Birth, Gender, Contact Number).
     - Vitals & Consultation Details (temperature, weight, consultation date) from the patient's intake treatment record.
     - Bilingual Patient's Consent text (English & Filipino).
     - Signature block for patient and clinic representative.

---

### 2. Official DOH Reports Print Views
1. Navigate to the Reports section (`/admin/reports`).
2. Under the DOH Reports cards, click **Print / Export** for each report:
   - **Rabies Exposure Registry:** Renders `prints.exposure-registry` with weekly rows, case demographics, animal types, and totals.
   - **ABTC Monthly Report:** Renders `prints.monthly-report` with National Rabies Prevention and Control Program formatting.
   - **Cohort Report:** Renders `prints.cohort-report` with quarterly completion rate matrix.
3. **Expected Result:**
   - Document renders cleanly in printable HTML with embedded `@media print` stylesheets.
   - The browser's native print dialog displays proper pagination and headers without truncation.

---

### 3. Query Token Authentication
1. Open an incognito browser window (simulating an external print popup without shared session cookies).
2. Navigate to `http://127.0.0.1:8000/print/reports/monthly?month=2024-07&token=<STAFF_TOKEN>`.
3. **Expected Result:**
   - The document authenticates successfully via the query token and renders the ABTC Monthly Report HTML without requiring a login redirect.

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Print/PrintControllerCharacterizationTest.php` (7 tests, 26 assertions)
- `backend/tests/Feature/Print/PrintAuthAndAuthorizationTest.php` (5 tests, 23 assertions)
- `backend/tests/Feature/DohReportsTest.php` (7 tests, 55 assertions)
