# 🧪 Cycle 4 UI Test Guide: Clinic Staff Onboarding & Invitations
**Target Controller:** `backend/app/Http/Controllers/StaffInvitationController.php`  
**Refactored Artifacts:** `SendStaffInvitationRequest`, `AcceptStaffInvitationRequest`, `StaffInvitationService`, `StaffInvitationController`  
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

### Credentials Matrix for Testing
| User Role | Email | Password | Allowed Invitation Actions |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@tagoloan.gov.ph` | `password123` | **Allowed**: Send invitations, view invitation list, cancel invitations. |
| **Non-Admin Staff** | `nurse@tagoloan.gov.ph` | `password123` | **Blocked (403)**: Cannot access staff invitation endpoints. |
| **New Invitee** | `newhire@tagoloan.gov.ph` | *New Password* | **Allowed**: Validate token, accept invitation, auto-login. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Admin Sends Staff Onboarding Invitation (`POST /api/staff-invitations`)
- **Goal:** Verify that a clinic admin can invite a new staff member with a specific workstation role.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Sign in as `admin@tagoloan.gov.ph` / `password123`.
  3. Navigate to **Staff Management** (`/admin/users` or `/staff`).
  4. Click **Invite Staff** (or **Add Member**).
  5. Enter a new email: `newstaff@tagoloan.gov.ph`.
  6. Select Workstation Role: `Intake Nurse` (or `Doctor`, `Receptionist`).
  7. Click **Send Invitation**.
- **Expected Results:**
  - [ ] Success toast notification appears: `"Invitation sent successfully"`.
  - [ ] The new invitation appears in the pending table with status `Pending` and a 7-day expiration date.
  - [ ] DevTools (`F12`) -> **Network** tab -> inspect `POST /api/staff-invitations`:
    - Status: `201 Created`
    - Response body:
      ```json
      {
        "message": "Invitation sent successfully",
        "invitation": {
          "email": "newstaff@tagoloan.gov.ph",
          "role": "treatment",
          "workstation_role": "intake_nurse",
          "status": "pending"
        },
        "email_sent": true,
        "invitation_link": "http://localhost:5173/accept-invitation/..."
      }
      ```

---

### Scenario 2: Validation of Duplicate Email or Pending Invite (`422`)
- **Goal:** Verify that inviting an already registered user or an email with an active pending invitation is blocked.
- **Steps:**
  1. In the Invite modal, enter `nurse@tagoloan.gov.ph` (already registered user).
  2. Click **Send Invitation**.
  3. *Verify*: Error banner appears: `"A user with this email already exists."` (HTTP 422).
  4. Enter `newstaff@tagoloan.gov.ph` (just invited in Scenario 1).
  5. Click **Send Invitation**.
  6. *Verify*: Error banner appears: `"An invitation has already been sent to this email."` (HTTP 422).

---

### Scenario 3: Public Invitation Token Validation (`GET /api/staff-invitations/validate/:token`)
- **Goal:** Verify that navigating to the invitation link displays clinic information and the account setup form.
- **Steps:**
  1. Open a new Incognito browser window.
  2. Paste the invitation URL generated in Scenario 1 (or query the token from database `staff_invitations`).
  3. Open `http://localhost:5173/accept-invitation/{token}`.
- **Expected Results:**
  - [ ] The page loads with heading `"Join Tagoloan ABTC"`.
  - [ ] Email is pre-filled and locked to `newstaff@tagoloan.gov.ph`.
  - [ ] Assigned role (`Intake Nurse`) is displayed.
  - [ ] DevTools -> Network -> inspect `GET /api/staff-invitations/validate/{token}`:
    - Status: `200 OK`
    - Response body:
      ```json
      {
        "valid": true,
        "invitation": {
          "email": "newstaff@tagoloan.gov.ph",
          "role": "treatment",
          "clinic_name": "Tagoloan ABTC",
          "expires_at": "..."
        }
      }
      ```

---

### Scenario 4: Invitee Accepts Invitation & Completes Registration (`POST .../accept/:token`)
- **Goal:** Verify account creation, role assignment, and automatic session login upon accepting the invitation.
- **Steps:**
  1. On the Accept Invitation page, fill in:
     - Name: `Nurse Maria Santos`
     - Phone: `09123456789`
     - Password: `Password123!`
     - Confirm Password: `Password123!`
  2. Click **Create Account**.
- **Expected Results:**
  - [ ] Toast notification: `"Account created successfully"`.
  - [ ] Browser automatically transitions into an authenticated session and redirects to the workstation default route (e.g. `/queue`).
  - [ ] DevTools -> Network -> inspect `POST /api/staff-invitations/accept/{token}`:
    - Status: `201 Created`
    - Returns `{ user: { ... }, token: "...", token_type: "Bearer" }`.
  - [ ] Local storage contains `authToken` and `userData`.

---

### Scenario 5: Admin Cancels Pending Invitation (`DELETE /api/staff-invitations/:id`)
- **Goal:** Verify that a clinic admin can revoke/cancel a pending invitation.
- **Steps:**
  1. As Admin, navigate to Staff Invitations table.
  2. Click **Cancel** on a pending invitation.
- **Expected Results:**
  - [ ] Toast displays: `"Invitation cancelled successfully"`.
  - [ ] DevTools -> Network -> inspect `DELETE /api/staff-invitations/{id}`:
    - Status: `200 OK`
  - [ ] If the invitee tries to open their link afterward, the validate endpoint returns `400` with message `"This invitation has expired"`.

---

## 3. UI Guide Test Checklist & Sign-Off

| # | Test Scenario | Result | Tester Notes |
| :---: | :--- | :---: | :--- |
| 1 | Admin sends invitation with workstation role (`POST /api/staff-invitations`) | [ ] PASS | |
| 2 | Existing user duplicate email block (422) | [ ] PASS | |
| 3 | Active pending duplicate email block (422) | [ ] PASS | |
| 4 | Token validation on public page (`GET .../validate/:token`) | [ ] PASS | |
| 5 | Invalid token rejection (404 / 400) | [ ] PASS | |
| 6 | Invitee registration, role attachment & auto-login (`POST .../accept/:token`) | [ ] PASS | |
| 7 | Admin cancels pending invitation (`DELETE .../:id`) | [ ] PASS | |
