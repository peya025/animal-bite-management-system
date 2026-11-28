# 🧪 Cycle 2 UI Test Guide: Staff Digital Signatures & Verification
**Target Controller:** `backend/app/Http/Controllers/StaffSignatureController.php`  
**Refactored Artifacts:** `CurrentStaffSignatureResource`, `StaffSignatureService`, `StaffSignatureController`  
**Target Web Application:** React + TypeScript Web Staff App (`http://localhost:5173`)  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure both backend and frontend servers are running:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Frontend React Web App
cd frontend
npm run dev
```

### Credentials Matrix for Signature Testing
| User Role | Email | Password | Allowed Signature Actions |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@tagoloan.gov.ph` | `password123` | Can view any staff signature in the clinic, upload/remove signatures. |
| **Treatment Nurse** | `nurse@tagoloan.gov.ph` | `password123` | Can view own signature, view signatures on administered treatment records. |
| **Triage Doctor**| `doctor@tagoloan.gov.ph` | `password123` | Can view own signature, view signatures on clinical consultations. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Current Staff Signature Status Query (`GET /api/staff-signature`)
- **Goal:** Verify that logging in queries the user's active signature status and responds with private, non-cacheable headers.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Sign in as `nurse@tagoloan.gov.ph` / `password123`.
  3. Open DevTools (`F12`) -> **Network** tab.
  4. Navigate to any workstation (e.g. `/queue`).
- **Expected Results:**
  - [ ] DevTools -> Network -> inspect `GET /api/staff-signature`:
    - Status: `200 OK`
    - Response Headers:
      - `Cache-Control: no-store, private`
    - Response JSON Payload:
      ```json
      {
        "signature_path": "signatures/...uuid....png"
      }
      ```
      *(Or `null` if the staff member has not yet uploaded a digital signature).*

---

### Scenario 2: Profile Signature Image Preview in Settings (`GET /api/users/{id}/signature`)
- **Goal:** Verify that viewing a user's profile displays the binary PNG image preview correctly without CORS or header errors.
- **Steps:**
  1. In the web staff portal, click User Avatar / Menu -> **Profile & Signature**.
  2. If a signature exists, observe the signature preview box.
- **Expected Results:**
  - [ ] The signature image renders clearly in the canvas or `<img>` element.
  - [ ] DevTools -> Network -> inspect `GET /api/users/{id}/signature`:
    - Status: `200 OK`
    - Response Headers:
      - `Content-Type: image/png`
      - `Content-Disposition: inline; filename="signature.png"`
      - `Cache-Control: private, no-store, max-age=0`
      - `X-Content-Type-Options: nosniff`

---

### Scenario 3: Stale Preview Version Detection (`409 Conflict`)
- **Goal:** Verify the backend rejects stale preview versions to prevent staff from consenting to outdated or replaced signatures.
- **Steps:**
  1. Open a browser tab with DevTools Console while logged in.
  2. Execute an API request simulating an outdated cached version:
     ```javascript
     fetch('/api/users/2/signature?version=signatures/outdated-hash.png', {
       headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken'), 'Accept': 'application/json' }
     }).then(r => console.log(r.status));
     ```
- **Expected Results:**
  - [ ] Console displays HTTP Status: `409` (Conflict).
  - [ ] Response JSON contains:
    ```json
    {
      "message": "Signature changed. Refresh the preview."
    }
    ```

---

### Scenario 4: Cross-User Signature Security Barrier (`403 Forbidden`)
- **Goal:** Verify that a non-admin staff member cannot inspect another staff member's private signature.
- **Steps:**
  1. Log in as regular staff: `nurse@tagoloan.gov.ph` (ID: 2).
  2. Attempt to fetch Doctor's private signature (ID: 3):
     ```javascript
     fetch('/api/users/3/signature', {
       headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken'), 'Accept': 'application/json' }
     }).then(r => console.log(r.status));
     ```
- **Expected Results:**
  - [ ] Request is strictly rejected with HTTP `403 Forbidden`.
  - [ ] No image bytes are leaked.

---

### Scenario 5: Historical Treatment Record Signature Rendering (`GET /api/vaccination-records/{treatment_id}/signature`)
- **Goal:** Verify that completed vaccination cards and treatment records display the historical signature captured at administration time.
- **Steps:**
  1. In the web portal, navigate to **Patients** -> Select a patient with a completed dose -> Open Treatment Record Sheet.
  2. Inspect the "Administering Nurse Signature" field on the digital treatment card.
- **Expected Results:**
  - [ ] The signature image rendered matches the nurse who recorded the dose.
  - [ ] DevTools -> Network -> inspect `GET /api/vaccination-records/{treatment_id}/signature`:
    - Status: `200 OK`
    - `Content-Type: image/png`
    - Binary image stream displays inline.

---

## 3. UI Guide Test Checklist & Sign-Off

| # | Test Scenario | Result | Tester Notes |
| :---: | :--- | :---: | :--- |
| 1 | Current Signature Path Query (`GET /api/staff-signature`) | [ ] PASS | |
| 2 | Profile Signature Image Inline Rendering (200 PNG) | [ ] PASS | |
| 3 | Stale Version Preview Guard (409 Conflict) | [ ] PASS | |
| 4 | Unauthorized Cross-User Access Block (403 Forbidden) | [ ] PASS | |
| 5 | Cross-Clinic Access Block (404 Not Found) | [ ] PASS | |
| 6 | Treatment Record Administration Signature Rendering | [ ] PASS | |
