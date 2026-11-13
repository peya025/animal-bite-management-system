# 🧪 Cycle 5 UI Test Guide: Patient Portal Invitations & Account Linkage
**Target Controller:** `backend/app/Http/Controllers/PatientInvitationController.php`  
**Refactored Artifacts:** `SendPatientInvitationRequest`, `ActivatePatientInvitationRequest`, `LinkPatientAccountRequest`, `BulkPatientInvitationRequest`, `PatientInvitationService`, `PatientInvitationController`  
**Target Applications:** 
- Staff Web Portal (React + TypeScript): `http://localhost:5173`
- Patient Mobile Portal / Activation Web Flow: `http://localhost:5173/activate-account` or Flutter Mobile App  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure your backend environment and mail drivers are configured (e.g. `MAIL_MAILER=log` or local mailcatcher):

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Frontend React Web App
cd frontend
npm run dev
```

### Credentials Matrix for Testing
| User / Actor | Role / Context | Email / Identifiers | Actions Verified |
| :--- | :--- | :--- | :--- |
| **Admin / Clerk** | Staff Member | `admin@tagoloan.gov.ph` / `regclerk@tagoloan.gov.ph` | Send single invitation, bulk send invitations, resend invitations, link accounts, verify account linkage. |
| **Nurse** | Clinical Staff | `nurse@tagoloan.gov.ph` | Send invitation from patient profile. |
| **Walk-in Patient** | Target Invitee | E.g. `patient.walkin@example.com` (Record `#101`) | Receives activation email/token, submits password to activate mobile account. |
| **Mobile Patient** | Activated Account | `patient.walkin@example.com` | Receives auth token and linked profile payload. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Staff Sends Patient Portal Invitation (`POST /api/patient-invitations`)
- **Goal:** Verify clinical staff can invite a registered walk-in patient to the mobile patient portal.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Sign in as `regclerk@tagoloan.gov.ph` / `password123`.
  3. Navigate to **Patients** (`/patients`) and select a patient who has an email on file but no portal account.
  4. On the patient profile summary card, locate and click **"Invite to Mobile Portal"** (or **"Send Portal Invitation"**).
  5. Confirm the modal prompt showing the patient's email address.
- **Expected Results:**
  - [ ] A success toast notification displays: `"Invitation sent successfully."`.
  - [ ] The invitation status pill changes to `Invitation Sent (Pending)`.
  - [ ] DevTools (`F12`) -> **Network** tab -> inspect `POST /api/patient-invitations`:
    - Status: `201 Created`
    - Response body:
      ```json
      {
        "message": "Invitation sent successfully.",
        "invitation": {
          "id": 1,
          "patient_id": 101,
          "email": "patient.walkin@example.com",
          "status": "pending"
        },
        "delivery": {
          "email_sent": true,
          "sms_sent": false
        }
      }
      ```

---

### Scenario 2: Guarding Ineligible Patients (Missing Email / Already Verified)
- **Goal:** Verify that the system properly surfaces validation errors when attempting to invite ineligible patients.
- **Steps:**
  1. Select a patient record that has no email address.
  2. Attempt to click **"Invite to Mobile Portal"**.
  3. *Verify*: UI button is disabled or an alert appears: `"Patient must have an email address to receive an invitation."` (HTTP 422).
  4. Select a patient record that is already verified on the portal (`portal_access_status === 'verified'`).
  5. Attempt to send an invitation.
  6. *Verify*: Error banner displays: `"Patient already has a verified portal account."` (HTTP 422).

---

### Scenario 3: Bulk Portal Invitations (`POST /api/patient-invitations/bulk`)
- **Goal:** Verify clinic staff can select multiple uninvited walk-in patients and invite them in bulk.
- **Steps:**
  1. Navigate to the **Patients** table list (`/patients`).
  2. Select checkboxes next to 3-5 patients who have emails on file.
  3. Click **"Actions"** -> **"Send Bulk Portal Invitations"**.
  4. Confirm the dialog prompt.
- **Expected Results:**
  - [ ] A progress modal or toast summary appears: `"Processed X invitations: Y sent, Z skipped"`.
  - [ ] DevTools -> Network -> inspect `POST /api/patient-invitations/bulk`:
    - Status: `200 OK`
    - Response body:
      ```json
      {
        "message": "Bulk invitations processed.",
        "total": 3,
        "sent": 2,
        "skipped": 1,
        "details": [
          {"patient_id": 101, "status": "sent", "invitation_id": 1},
          {"patient_id": 102, "status": "sent", "invitation_id": 2},
          {"patient_id": 103, "status": "skipped", "reason": "Already has a verified account"}
        ]
      }
      ```

---

### Scenario 4: Resend Expired/Pending Invitation (`POST /api/patient-invitations/:id/resend`)
- **Goal:** Verify that staff can regenerate a fresh token and resend the email for a pending invitation.
- **Steps:**
  1. On a patient profile with a pending invitation, click the options menu (`...`) -> **"Resend Invitation"**.
- **Expected Results:**
  - [ ] Toast notification: `"Invitation resent successfully."`.
  - [ ] DevTools -> Network -> inspect `POST /api/patient-invitations/{id}/resend`:
    - Status: `200 OK`
    - Response contains new expiry date (extended by 7 days) and delivery confirmation.

---

### Scenario 5: Patient Portal Activation (`POST /api/patient-invitations/activate`)
- **Goal:** Verify the recipient can follow their activation link, choose a password, and successfully create their account.
- **Steps:**
  1. Open a new Incognito browser tab or use the mobile app.
  2. Navigate to `http://localhost:5173/activate-account?token={TOKEN_FROM_LOG}` (64-character token).
  3. Enter password: `PatientPassword123!` and confirm password.
  4. Click **"Activate Account"**.
- **Expected Results:**
  - [ ] Account is activated and the user is redirected to the Mobile Portal dashboard.
  - [ ] DevTools -> Network -> inspect `POST /api/patient-invitations/activate`:
    - Status: `201 Created`
    - Response body contains:
      ```json
      {
        "message": "Account created successfully.",
        "token": "1|sanctum_plain_text_token...",
        "account": {
          "id": 1,
          "email": "patient.walkin@example.com",
          "phone": "09171234567",
          "patients": [
            {
              "id": 101,
              "first_name": "...",
              "last_name": "..."
            }
          ]
        }
      }
      ```
  - [ ] The patient profile linkage is now active and ready for appointments/records viewing.

---

### Scenario 6: Manual Linkage & Verification (`POST /api/patients/:id/link-account` & `PATCH /api/patient-account-patient/:id/verify`)
- **Goal:** Verify manual linkage workflow when an existing portal account holder is linked to a walk-in record.
- **Steps:**
  1. As staff, navigate to a patient record without a portal link.
  2. Click **"Link to Portal Account"**.
  3. Search and select the existing patient account ID or email.
  4. Submit link. Inspect `POST /api/patients/{id}/link-account` -> Returns `201 Created` with `"verification_status": "pending"`.
  5. As Clinic Admin or Registration Clerk, click **"Verify Link"**.
  6. Inspect `PATCH /api/patient-account-patient/{linkId}/verify` -> Returns `200 OK` with `"message": "Patient account linkage verified successfully."`.
  7. Status badge updates to `Verified`.

---

## 3. Rollback & Troubleshooting
- **Database Rollback:** If test invitations need cleanup:
  ```powershell
  cd backend
  php artisan tinker --execute="App\Models\PatientInvitation::where('email', 'like', '%test%')->delete();"
  ```
- **Mailer Logging:** If testing without an SMTP server, check `backend/storage/logs/laravel.log` for generated activation tokens and email contents.
