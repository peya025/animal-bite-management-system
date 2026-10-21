# 🧪 Cycle 3 UI Test Guide: Patient Portal Access Verification
**Target Controller:** `backend/app/Http/Controllers/PatientAccessController.php`  
**Refactored Artifacts:** `PatientAccessService`, `PatientAccessController`  
**Target Web Application:** React + TypeScript Web Staff App (`http://localhost:5173`)  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure backend and frontend servers are running:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Frontend React Web App
cd frontend
npm run dev
```

### Credentials Matrix for Access Testing
| User Role | Email | Password | Allowed Access Actions |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@tagoloan.gov.ph` | `password123` | **Allowed**: Verify or reject any patient account linkage in current clinic. |
| **Registration Clerk** | `receptionist@tagoloan.gov.ph` | `password123` | **Allowed**: Verify or reject walk-in patient portal account access. |
| **Treatment Nurse** | `nurse@tagoloan.gov.ph` | `password123` | **Blocked (403)**: Cannot approve/reject portal access requests. |
| **Triage Doctor**| `doctor@tagoloan.gov.ph` | `password123` | **Blocked (403)**: Cannot approve/reject portal access requests. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Staff Verification of Patient Portal Account (`POST .../verify`)
- **Goal:** Verify that clinic staff can approve a mobile patient's access request to their electronic medical record.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Sign in as `receptionist@tagoloan.gov.ph` / `password123`.
  3. Navigate to **Patients** (`/patients`) -> click on a patient who has a pending portal access request.
  4. In the Patient Details sheet, locate the **Portal Access & Mobile Accounts** section.
  5. Click **Verify Access** (or **Approve**).
- **Expected Results:**
  - [ ] Success toast notification appears: `"Patient profile access verified."`.
  - [ ] The access badge transitions from yellow (`Pending`) to green (`Verified`).
  - [ ] DevTools (`F12`) -> **Network** tab -> inspect `POST /api/patients/{patient_id}/accounts/{account_id}/verify`:
    - Status: `200 OK`
    - Response body:
      ```json
      {
        "message": "Patient profile access verified."
      }
      ```
  - [ ] Database check: In `patient_account_patient`, `status` is `'verified'` and `verified_by` matches the logged-in staff user ID.

---

### Scenario 2: Staff Rejection of Patient Portal Account (`POST .../reject`)
- **Goal:** Verify staff can reject an invalid or unconfirmed portal link request.
- **Steps:**
  1. While logged in as `admin@tagoloan.gov.ph` or `receptionist@tagoloan.gov.ph`, navigate to a patient record with a pending or disputed portal account.
  2. Click **Reject Access** (or **Decline**).
- **Expected Results:**
  - [ ] Notice/toast displays: `"Patient profile access rejected."`.
  - [ ] The access badge transitions to red/gray (`Rejected`).
  - [ ] DevTools -> **Network** tab -> inspect `POST /api/patients/{patient_id}/accounts/{account_id}/reject`:
    - Status: `200 OK`
    - Response body:
      ```json
      {
        "message": "Patient profile access rejected."
      }
      ```
  - [ ] Database check: In `patient_account_patient`, `status` is `'rejected'` and `verified_by` matches the staff user ID.

---

### Scenario 3: Role-Based Authorization Enforcement (`403 Forbidden`)
- **Goal:** Confirm that unauthorized roles (such as Treatment Nurses and Doctors) cannot execute access approvals.
- **Steps:**
  1. Sign in as `nurse@tagoloan.gov.ph` / `password123`.
  2. Open DevTools Console and execute:
     ```javascript
     fetch('/api/patients/1/accounts/1/verify', {
       method: 'POST',
       headers: {
         'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
         'Accept': 'application/json'
       }
     }).then(r => console.log('Status:', r.status));
     ```
- **Expected Results:**
  - [ ] Console logs: `Status: 403`.
  - [ ] The backend blocks the request via `role:admin,registration` middleware.

---

### Scenario 4: Tenancy Isolation Enforcement (`404 Not Found`)
- **Goal:** Verify that staff cannot approve or reject portal access for a patient belonging to a different clinic.
- **Steps:**
  1. Attempt to post to a patient ID from another facility (or nonexistent ID):
     ```javascript
     fetch('/api/patients/99999/accounts/1/verify', {
       method: 'POST',
       headers: {
         'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
         'Accept': 'application/json'
       }
     }).then(r => console.log('Status:', r.status));
     ```
- **Expected Results:**
  - [ ] Request returns HTTP `404 Not Found`.
  - [ ] Cross-tenant data leakage is completely prevented.

---

## 3. UI Guide Test Checklist & Sign-Off

| # | Test Scenario | Result | Tester Notes |
| :---: | :--- | :---: | :--- |
| 1 | Registration Clerk verifies portal access (`POST .../verify`) | [ ] PASS | |
| 2 | Admin verifies portal access (`POST .../verify`) | [ ] PASS | |
| 3 | Staff rejects portal access (`POST .../reject`) | [ ] PASS | |
| 4 | Nurse/Doctor access blocked (`403 Forbidden`) | [ ] PASS | |
| 5 | Cross-clinic access blocked (`404 Not Found`) | [ ] PASS | |
| 6 | Unlinked account access blocked (`404 Not Found`) | [ ] PASS | |
