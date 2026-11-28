# UI Test Guide: Cycle 4 – Registration Throughput, PEP Outcomes & Surveillance CSV

## Objective
Verify the end-to-end functionality of Registration Reports (Clinic Summary, PEP Treatment Outcomes, Overdue Doses & Follow-up, Awaiting First Dose, Bite Surveillance, and Referrals & Transfers), pagination, print view, and CSV export following the refactoring of `RegistrationReportController.php`.

---

## Target Endpoints Verified
- `GET /api/reports/registration`
  - JSON format with pagination (`records.rows`, `records.page`, `records.total`, `records.last_page`, `meta`, `stats`, `period`)
  - Print format (`format=print` returning unpaginated rows)
  - CSV export (`format=csv` streaming UTF-8 BOM CSV with formula injection defense and `no-store` headers)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Logged in as a user with registration report access (e.g., Registration Clerk, Admin, or Developer).

---

## Step-by-Step Test Procedure

### 1. Access Registration Reports Page
1. Log in to the application as a Registration Clerk or Admin.
2. In the navigation sidebar, navigate to **Registration Reports** (e.g. `/reports/registration`).
3. **Expected Result:**
   - The report interface loads displaying the date range pickers (`From` and `To`), report selector, category dropdown, and action buttons.

---

### 2. Verify Report Types & Query Execution
1. Set the date range (e.g. from the 1st of the current month to today).
2. Test selecting each report type:
   - **Clinic Summary:** Renders operational throughput metrics and completion funnel.
   - **PEP Treatment Outcomes:** Displays patient cases, dose days, completion dates, and outcomes.
   - **Overdue Doses & Follow-up:** Lists patients with overdue doses, basis, and reminder flags.
   - **Awaiting First Dose:** Shows registered incidents awaiting initiation.
   - **Bite Surveillance:** Displays bite episodes with animal type, barangay, and age at incident.
   - **Referrals & Transfers:** Shows outgoing transfers, destinations, and referral outcomes.
3. Click **View / Generate**.
4. **Expected Result:**
   - Network call `GET /api/reports/registration?from=...&to=...&report=...` succeeds with `200 OK`.
   - Table populates with records matching the selected report structure.
   - Summary cards at the top reflect real-time counts from the `stats` payload.

---

### 3. Verify Pagination Controls
1. On a report with multiple pages (e.g., Bite Surveillance), navigate through pages using pagination buttons.
2. Change the `per_page` size dropdown (e.g. 10, 20, 50).
3. **Expected Result:**
   - Network call includes `&page=X&per_page=Y`.
   - Table smoothly transitions and pagination metadata reflects `page`, `last_page`, and `total`.

---

### 4. Verify CSV Export
1. On any report view, click the **Export CSV** button.
2. **Expected Result:**
   - A download initiates immediately for a file named `registration-<report>-<from>-<to>.csv`.
   - Open the file in Excel or a text editor:
     - The file begins with a UTF-8 BOM (`\xEF\xBB\xBF`) ensuring correct character rendering.
     - Header rows display Clinic, Period, Prepared By, and Definitions.
     - Data rows match the columns and records seen on screen.
     - Formula injection attempts (e.g., fields beginning with `=`, `+`, `-`, or `@`) are prefixed with a single quote `'` to protect spreadsheet consumers.

---

### 5. Verify Clinic Assignment Protection
1. If an unassigned user without a clinic tries to access `/api/reports/registration`, the server returns HTTP 403 Forbidden with `'A clinic assignment is required to view reports.'`.

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Reports/RegistrationReportControllerCharacterizationTest.php` (6 tests, 39 assertions)
- `backend/tests/Feature/RegistrationReportsTest.php` (7 tests, 53 assertions)
