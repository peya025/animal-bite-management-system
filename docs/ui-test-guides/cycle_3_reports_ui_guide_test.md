# UI Test Guide: Cycle 3 – DOH Official Reports

## Objective
Verify the end-to-end functionality of the official DOH reports (Exposure Registry, Monthly ABTC Report, and Quarterly Cohort Report) on the web frontend following the refactoring of `ReportController.php`.

---

## Target Endpoints Verified
- `GET /api/reports/exposure-registry` (DOH Rabies Exposure Registry with weekly ranges, totals, and category breakdown)
- `GET /api/reports/monthly` (National Rabies Prevention and Control Program monthly report and completion rates)
- `GET /api/reports/cohort` (Quarterly cohort analysis and completion rates by exposure category)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Logged in as a clinic staff member with report permissions (e.g. Clinic Admin, Registration Clerk, Nurse, or Doctor).

---

## Step-by-Step Test Procedure

### 1. Navigate to Reports Dashboard
1. Log in to the Web Application.
2. In the navigation sidebar, click on **Reports** (or access `/admin/reports` / `/treatment/reports`).
3. Locate the **DOH Official Reports** section.

---

### 2. Verify Rabies Exposure Registry (Weekly / Form 2 & 4)
1. Select the **Exposure Registry** tab or card.
2. Set the date range (e.g., from `2024-07-01` to `2024-07-31`).
3. Choose an exposure category (e.g., `ALL`, `Category II`, or `Category III`).
4. Click **Generate / Preview Report**.
5. **Expected Result:**
   - Network request `GET /api/reports/exposure-registry?from=...&to=...&category=...` responds with `200 OK`.
   - The table renders weekly data rows with patient cases, bite types, severity, animal types, and post-exposure prophylaxis (HRIG, TCV).
   - Summary totals show correct aggregations (`total`, `cat_1`, `cat_2`, `cat_3`).

---

### 3. Verify ABTC Monthly Report (Form 1)
1. Select the **Monthly Report** tab.
2. Select a target month (e.g., `2024-07`).
3. Click **Generate / Preview Report**.
4. **Expected Result:**
   - Network request `GET /api/reports/monthly?month=2024-07` responds with `200 OK`.
   - Displays National Rabies Prevention and Control Program form data.
   - Accurately renders total cases, completed cases (by category), and overall completion rate.

---

### 4. Verify Cohort Report (Quarterly / Form 3)
1. Select the **Cohort Report** tab.
2. Select a target year (e.g., `2024`).
3. Click **Generate / Preview Report**.
4. **Expected Result:**
   - Network request `GET /api/reports/cohort?year=2024` responds with `200 OK`.
   - Displays quarterly cohort breakdown (`Q1`, `Q2`, `Q3`, `Q4`) with cases and completion rate indicators.

---

### 5. Verify Unassigned Clinic Access Rejection
1. If an unassigned user without a clinic tries to access reports, the server immediately rejects the request with HTTP 403 (`A clinic assignment is required.`).

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Reports/ReportControllerCharacterizationTest.php` (6 tests, 38 assertions)
- `backend/tests/Feature/DohReportsTest.php` (7 tests, 55 assertions)
