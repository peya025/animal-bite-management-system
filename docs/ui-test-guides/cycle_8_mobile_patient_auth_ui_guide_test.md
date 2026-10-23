# 🧪 Cycle 8 UI Test Guide: Mobile Patient Authentication, Security & Google SSO
**Target Controller:** `backend/app/Http/Controllers/Mobile/PatientAccountAuthController.php`  
**Refactored Artifacts:** `MobileRegisterRequest`, `MobileLoginRequest`, `MobileUpdateAccountRequest`, `MobileChangePasswordRequest`, `MobileDeleteAccountRequest`, `MobileForgotPasswordRequest`, `MobileGoogleLoginRequest`, `PatientAccountAuthService`, `PatientAccountGoogleSsoService`, `PatientAccountAuthController`  
**Target Application:** Flutter Mobile App (Android / iOS / Chrome / Emulator)  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure your backend server and Flutter mobile app development environment are running:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Flutter Mobile App
cd mobile
flutter run -d chrome # Or target connected Android/iOS device
```

### Credentials Matrix for Testing
| User / Actor | Email | Password | Validated Features |
| :--- | :--- | :--- | :--- |
| **Existing Patient** | `maria@example.com` | `password123` | Login, `/me` profile cache, profile update, change password, logout. |
| **Inactive Patient** | `inactive.patient@example.com` | `password123` | Inactive guard check (HTTP 422: `"This patient account is inactive."`). |
| **New Registrant** | `newuser@example.com` | `securepassword123` | Public registration with phone validation (`09\d{9}`), auto-token issue. |
| **Google SSO User** | `patient.google@gmail.com` | *Google Auth* | Tier 9 Google ID Token exchange, auto-provisioning, patient invitation linking. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Mobile Patient Registration (`POST /api/mobile/register`)
- **Goal:** Verify new mobile users can register an account with phone validation and automatically log in.
- **Steps:**
  1. Open the Flutter mobile app. On the landing page, tap **"Create Account"** or **"Register"**.
  2. Enter details:
     - **Full Name:** `Carlos Dalisay`
     - **Email:** `carlos.dalisay@example.com`
     - **Mobile Number:** `09181234567`
     - **Password:** `PatientPass2026!`
     - **Confirm Password:** `PatientPass2026!`
  3. Tap **"Register"**.
- **Expected Results:**
  - [ ] Account is created and the app automatically transitions to the Welcome / Home dashboard.
  - [ ] Network inspection (`POST /api/mobile/register`):
    - Status: `201 Created`
    - Response body:
      ```json
      {
        "account": {
          "id": 10,
          "name": "Carlos Dalisay",
          "email": "carlos.dalisay@example.com",
          "phone": "09181234567"
        },
        "token": "10|sanctum_plain_text_token...",
        "token_type": "Bearer"
      }
      ```

---

### Scenario 2: Validation of Invalid Phone Number & Password Confirmation (`422`)
- **Goal:** Verify that phone regex enforcement and password match rules prevent invalid registrations.
- **Steps:**
  1. In the registration form, enter mobile number `08123456789` (non-09 prefix).
  2. Enter mismatched passwords.
  3. Tap **"Register"**.
- **Expected Results:**
  - [ ] Error message under mobile number: `"Mobile number must start with 09 and contain 11 digits."`.
  - [ ] Error message under password confirmation: `"The password field confirmation does not match."`.
  - [ ] HTTP status `422 Unprocessable Content`.

---

### Scenario 3: Patient Login & Inactive Account Guard (`POST /api/mobile/login`)
- **Goal:** Verify credential authentication, active status verification, and token storage.
- **Steps:**
  1. On the login screen, enter invalid credentials (`maria@example.com` / `wrongpassword`).
  2. Tap **"Log In"** -> Verify error: `"The provided credentials are incorrect."` (HTTP 422).
  3. Enter valid credentials (`maria@example.com` / `password123`).
  4. Tap **"Log In"**.
- **Expected Results:**
  - [ ] User is signed in and directed to the patient home dashboard.
  - [ ] Inspect `POST /api/mobile/login`: Status `200 OK`, returns `token` and `account`.

---

### Scenario 4: Account Details & Cache Eviction (`GET /api/mobile/me` & `PATCH /api/mobile/me`)
- **Goal:** Verify profile display, 5-minute caching, and cache eviction upon profile update.
- **Steps:**
  1. In the mobile app bottom navigation, tap **"Account"** / **"Settings"**.
  2. Verify that name, email, and phone number are populated immediately from `GET /api/mobile/me`.
  3. Tap **"Edit Profile"**.
  4. Update name to `Maria Santos Gomez` and phone to `09198765432`.
  5. Tap **"Save Changes"**.
- **Expected Results:**
  - [ ] Profile screen immediately updates with new name and phone number.
  - [ ] Inspect `PATCH /api/mobile/me`: Status `200 OK`.
  - [ ] Cache key `mobile:account:me:{id}` is evicted and re-cached with updated values.

---

### Scenario 5: Change Password & Multi-Device Token Invalidation (`POST /api/mobile/change-password`)
- **Goal:** Verify that changing the account password invalidates other device sessions while keeping the current session active.
- **Steps:**
  1. In Account Settings, tap **"Security"** -> **"Change Password"**.
  2. Enter Current Password: `password123`.
  3. Enter New Password: `NewSecretPass2026!` and confirm.
  4. Tap **"Update Password"**.
- **Expected Results:**
  - [ ] Success banner: `"Password has been changed successfully."`.
  - [ ] The current mobile session continues uninterrupted.
  - [ ] Any other active sessions on other phones/browsers are immediately invalidated.

---

### Scenario 6: Account Deactivation (`DELETE /api/mobile/me`)
- **Goal:** Verify patient self-service account deactivation.
- **Steps:**
  1. In Account Settings, tap **"Deactivate Account"** / **"Delete Account"**.
  2. Enter account password when prompted.
  3. Confirm the warning dialog.
- **Expected Results:**
  - [ ] Toast notification: `"Your account has been deactivated successfully."`.
  - [ ] App clears stored tokens and navigates back to the Login screen.
  - [ ] Attempting to log back in immediately displays: `"This patient account is inactive."`.

---

### Scenario 7: Google OAuth SSO (`POST /api/mobile/auth/google`)
- **Goal:** Verify Google sign-in auto-provisions patient account and reconciles pending clinic invitations.
- **Steps:**
  1. On the Login screen, tap **"Continue with Google"**.
  2. Complete Google OAuth prompt.
- **Expected Results:**
  - [ ] App exchanges Google ID Token with backend.
  - [ ] Backend auto-creates `PatientAccount` (if new) or links `google_id` (if existing).
  - [ ] If a walk-in patient invitation was pending for that email, the record is automatically verified and linked.
  - [ ] User arrives on the mobile dashboard logged in via Bearer token (`sso_method: "google"`).

---

## 3. Rollback & Troubleshooting
- **Database Cleanup:**
  ```powershell
  cd backend
  php artisan tinker --execute="App\Models\PatientAccount::where('email', 'carlos.dalisay@example.com')->delete();"
  ```
- **Reactivate Deactivated Account:**
  ```powershell
  cd backend
  php artisan tinker --execute="App\Models\PatientAccount::where('email', 'maria@example.com')->update(['is_active' => true]);"
  ```
