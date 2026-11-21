# 🧪 Cycle 6 UI Test Guide: Clinic Staff Management & Patient Accounts Oversight
**Target Controller:** `backend/app/Http/Controllers/UserController.php`  
**Refactored Artifacts:** `StoreUserRequest`, `UpdateUserRequest`, `UpdateAssignedModuleRequest`, `UserManagementService`, `UserController`  
**Target Web Application:** React + TypeScript Web Admin App (`http://localhost:5173`)  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure your backend and frontend development servers are running:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Frontend React Web App
cd frontend
npm run dev
```

### Credentials Matrix for Testing
| User Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@tagoloan.gov.ph` | `password123` | **Full Access**: User CRUD, workstation role assignments, module permissions, patient account toggles. |
| **Intake Nurse** | `nurse@tagoloan.gov.ph` | `password123` | **Restricted (403)**: Blocked from user management and patient account oversight endpoints. |
| **Target Staff** | `staff.carlos@tagoloan.gov.ph` | `password123` | **Target User**: Used for password updates, deactivation token revocation tests. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Clinic Staff List & Signature Availability (`GET /api/users`)
- **Goal:** Verify that the admin can view all clinic staff members with assigned workstation roles and signature indicators.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Sign in as `admin@tagoloan.gov.ph` / `password123`.
  3. Navigate to **Staff Management** (`/admin/users` or `/users`).
- **Expected Results:**
  - [ ] Staff table renders rows displaying: Name, Email, Phone, Role badge, Assigned Module chip, License Number, and Signature Status.
  - [ ] Staff with digital signatures show a green `"Signature On File"` badge (`signature_available: true`).
  - [ ] Staff without signatures show a gray `"No Signature"` badge (`signature_available: false`).
  - [ ] DevTools (`F12`) -> **Network** tab -> inspect `GET /api/users`:
    - Status: `200 OK`
    - Response contains an array of staff models scoped to the current clinic.

---

### Scenario 2: Create New Staff Member with Workstation Roles (`POST /api/users`)
- **Goal:** Verify creating a new staff user with workstation role mapping and phone validation.
- **Steps:**
  1. In the Staff Management page, click **"Add Staff Member"** (or **"New User"**).
  2. Enter details:
     - **Name:** `Dr. Gregory House`
     - **Email:** `dr.house@tagoloan.gov.ph`
     - **Password:** `StrongPass2026!`
     - **Workstation Role:** `Doctor / Triage Officer`
     - **Phone:** `09171234567`
     - **Professional License No:** `MD-998877`
  3. Optional: In the Signature pad, draw or upload a sample signature image.
  4. Click **"Save Staff Member"**.
- **Expected Results:**
  - [ ] Success banner/toast: `"User created successfully"`.
  - [ ] Modal closes and new staff member appears in the list.
  - [ ] DevTools -> Network -> inspect `POST /api/users`:
    - Status: `201 Created`
    - Response payload:
      ```json
      {
        "message": "User created successfully",
        "user": {
          "id": 15,
          "name": "Dr. Gregory House",
          "email": "dr.house@tagoloan.gov.ph",
          "role": "triage",
          "professional_license_no": "MD-998877",
          "phone": "09171234567",
          "roles": [
            { "slug": "doctor", "display_name": "Doctor" }
          ]
        }
      }
      ```

---

### Scenario 3: Validation Error Handling on User Creation (`422`)
- **Goal:** Verify duplicate email and invalid phone formats are caught gracefully.
- **Steps:**
  1. Click **"Add Staff Member"**.
  2. Enter the same email: `dr.house@tagoloan.gov.ph`.
  3. Enter an invalid phone: `123456`.
  4. Click **"Save Staff Member"**.
- **Expected Results:**
  - [ ] Inline form error under Email: `"The email has already been taken."`.
  - [ ] Inline form error under Phone: `"Mobile number must start with 09 and contain 11 digits."`.
  - [ ] HTTP status `422 Unprocessable Content`.

---

### Scenario 4: Update Workstation Role & Module Assignment (`PUT /api/users/:id` & `PUT /api/users/:id/assigned-module`)
- **Goal:** Verify that modifying a user's workstation role and assigned module immediately updates the UI.
- **Steps:**
  1. In the Staff table, click the **"Edit"** action next to a staff member.
  2. Change workstation role from `Intake Nurse` to `Follow-Up Nurse`.
  3. Change Assigned Module from `all` to `treatment`.
  4. Click **"Save Changes"**.
- **Expected Results:**
  - [ ] Success toast: `"User updated successfully"` or `"Staff module assignment updated successfully"`.
  - [ ] Table row immediately reflects the new role and module chip.
  - [ ] DevTools -> Network -> inspect `PUT /api/users/{id}` (Status: `200 OK`).

---

### Scenario 5: Self-Deletion Guard (`DELETE /api/users/:id`)
- **Goal:** Verify that an administrator is prevented from deleting their own account.
- **Steps:**
  1. Locate the logged-in administrator (`admin@tagoloan.gov.ph`) in the staff table.
  2. Click the **"Delete"** icon on the admin's row (or test via DevTools console).
  3. If a confirmation dialog appears, confirm deletion.
- **Expected Results:**
  - [ ] Error notification appears: `"You cannot delete your own account"`.
  - [ ] HTTP status `403 Forbidden`.
  - [ ] The admin remains in the table and remains logged in.

---

### Scenario 6: Admin Patient Accounts Oversight & Toggle (`GET /api/patient-accounts` & `PUT /api/patient-accounts/:id/toggle`)
- **Goal:** Verify that administrators can oversee linked patient portal accounts and toggle their active status.
- **Steps:**
  1. In Staff Management, click the **"Patient Accounts"** tab (or navigate to `/admin/patient-accounts`).
  2. Verify the list of portal accounts:
     - Columns: Account Name, Email, Phone, Linked Profiles count, Active Status switch.
     - Expanding or inspecting a row shows active case summary (e.g. `CASE-2026-001`, `Category II`) and next appointment (e.g. `Day 1`).
  3. Toggle the switch for a patient account from **Active** to **Inactive**.
- **Expected Results:**
  - [ ] Switch transitions smoothly and toast appears: `"Patient account deactivated"`.
  - [ ] Toggle back to Active: toast appears `"Patient account activated"`.
  - [ ] DevTools -> Network -> inspect `PUT /api/patient-accounts/{id}/toggle`:
    - Status: `200 OK`
    - Response body:
      ```json
      {
        "message": "Patient account deactivated",
        "account": {
          "id": 1,
          "is_active": false
        }
      }
      ```

---

## 3. Rollback & Troubleshooting
- **Database Rollback:**
  ```powershell
  cd backend
  php artisan tinker --execute="App\Models\User::where('email', 'dr.house@tagoloan.gov.ph')->delete();"
  ```
- **Permission Issues:** If a 403 error is encountered while logged in as admin, verify that the admin user has role `admin` in the `users` table and `clinic_admin` in `user_roles`.
