# 🧪 Cycle 1 UI Test Guide: Web Staff Authentication & Profile Management
**Target Controller:** `backend/app/Http/Controllers/AuthController.php`  
**Refactored Artifacts:** `LoginRequest`, `RegisterRequest`, `UpdateProfileRequest`, `GoogleLoginRequest`, `AuthUserResource`, `MeUserResource`, `StaffAuthService`, `GoogleStaffSsoService`  
**Target Web Application:** React + TypeScript Web Staff App (`http://localhost:5173`)  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Before testing in the browser, ensure both backend and frontend servers are running:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Frontend React Web App
cd frontend
npm run dev
```

### Credentials Matrix for Testing
| User Role | Email | Password | Expected Landing Page |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@tagoloan.gov.ph` | `password123` | `/dashboard` (Admin Overview) |
| **Intake Nurse** | `nurse@tagoloan.gov.ph` | `password123` | `/queue` (Workstation Queue) |
| **Triage Doctor**| `doctor@tagoloan.gov.ph` | `password123` | `/queue` (Triage Desk) |
| **Registration** | `receptionist@tagoloan.gov.ph` | `password123` | `/patients` (Enrollment) |

*(Note: If testing against seeded demo accounts, any account from `php artisan test tests/Feature/SeededDemoLoginTest.php` can be used).*

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Staff Quick Login & Dashboard Redirection
- **Goal:** Verify valid staff login succeeds, issues Sanctum bearer token, and stores user/clinic session data without console errors.
- **Steps:**
  1. Open browser to `http://localhost:5173/login`.
  2. Enter valid credentials (e.g. `admin@tagoloan.gov.ph` / `password123`).
  3. Click **Sign In**.
- **Expected Results:**
  - [ ] User is smoothly redirected to `/dashboard` (or assigned workstation route).
  - [ ] Open Browser DevTools (`F12`) -> **Application** -> **Local Storage**:
    - `authToken`: string starting with `<id>|...`
    - `userData`: valid JSON containing `id`, `name`, `email`, `role`, `clinic`
    - `clinicData`: valid JSON containing `name`, `is_setup_complete`
  - [ ] DevTools -> **Network** tab -> inspect `POST /api/login`:
    - Status: `200 OK`
    - Response structure:
      ```json
      {
        "user": {
          "id": 1,
          "name": "Admin User",
          "email": "admin@tagoloan.gov.ph",
          "role": "admin",
          "clinic": { ... }
        },
        "token": "...",
        "token_type": "Bearer"
      }
      ```

---

### Scenario 2: Active User Session Hydration (`GET /api/me`)
- **Goal:** Verify page reload properly calls `/me` and re-hydrates user state from the **flat** response shape without crashing.
- **Steps:**
  1. While logged in on the Dashboard, press `F5` / **Refresh**.
- **Expected Results:**
  - [ ] User remains authenticated without being redirected to `/login`.
  - [ ] Navbar displays correct user name, role badge, and clinic title.
  - [ ] DevTools -> **Network** tab -> inspect `GET /api/me`:
    - Status: `200 OK`
    - Response payload is **STRICTLY FLAT** (no outer `"user"` wrapper):
      ```json
      {
        "id": 1,
        "name": "Admin User",
        "email": "admin@tagoloan.gov.ph",
        "role": "admin",
        "phone": "...",
        "is_active": true,
        "clinic": { "id": 1, "name": "..." }
      }
      ```

---

### Scenario 3: Bad Credentials Error Feedback
- **Goal:** Verify invalid password submission produces immediate user feedback without unhandled exceptions.
- **Steps:**
  1. Navigate to `http://localhost:5173/login`.
  2. Enter `admin@tagoloan.gov.ph` with incorrect password: `WrongPassword999!`.
  3. Click **Sign In**.
- **Expected Results:**
  - [ ] Red error alert displays on screen: `"The provided credentials are incorrect."`.
  - [ ] User remains on the login page; inputs are not cleared abruptly.
  - [ ] DevTools -> **Network** tab -> inspect `POST /api/login`:
    - Status: `422 Unprocessable Content`
    - Response payload:
      ```json
      {
        "message": "The provided credentials are incorrect.",
        "errors": {
          "email": ["The provided credentials are incorrect."]
        }
      }
      ```

---

### Scenario 4: User Profile Update & Phone Regex Validation (`PUT /api/me`)
- **Goal:** Verify user can update their display name and mobile phone number, and that invalid phone patterns are blocked with the custom validation message.
- **Steps:**
  1. Log in and navigate to **Settings** / **Profile** (or click user avatar -> Profile).
  2. Change phone number to an invalid format: `12345678` (less than 11 digits / doesn't start with 09).
  3. Click **Save Changes**.
  4. *Verify*: Error banner appears: `"Mobile number must start with 09 and contain 11 digits."`.
  5. Change phone number to a valid format: `09123456789`.
  6. Click **Save Changes**.
- **Expected Results:**
  - [ ] Success toast notification appears: `"Profile updated successfully"`.
  - [ ] DevTools -> **Network** tab -> inspect `PUT /api/me`:
    - Status: `200 OK`
    - Payload contains updated `name` and `phone`.

---

### Scenario 5: Password Change & Multi-Device Session Invalidation
- **Goal:** Verify changing the password in profile settings enforces `current_password` verification and revokes old session tokens.
- **Steps:**
  1. In Profile Settings, enter wrong current password and enter a new password.
  2. Click **Update Password**.
  3. *Verify*: Error displays: `"Your current password is incorrect."` (HTTP 422).
  4. Now enter correct current password, enter new password `NewPassword123!`, and confirm.
  5. Click **Update Password**.
- **Expected Results:**
  - [ ] Password updates successfully.
  - [ ] Database verification: User tokens in `personal_access_tokens` table have been revoked/cleared.

---

### Scenario 6: Clean Staff Logout (`POST /api/logout`)
- **Goal:** Verify logging out revokes the token on the backend and purges local storage to prevent session leakage.
- **Steps:**
  1. Click User Menu in top right -> click **Log Out**.
- **Expected Results:**
  - [ ] Browser immediately redirects to `http://localhost:5173/login`.
  - [ ] Local storage items (`authToken`, `userData`, `clinicData`) are completely removed.
  - [ ] DevTools -> **Network** tab -> inspect `POST /api/logout`:
    - Status: `200 OK`
    - Body: `{ "message": "Successfully logged out" }`
  - [ ] Pressing Browser "Back" button does **not** allow access back into authenticated pages.

---

## 3. UI Guide Test Checklist & Sign-Off

| # | Test Item | Result | Tester Notes |
| :---: | :--- | :---: | :--- |
| 1 | Admin / Staff Login (`POST /api/login`) | [ ] PASS | |
| 2 | Flat User State Hydration (`GET /api/me`) | [ ] PASS | |
| 3 | Invalid Password Error Banner (422) | [ ] PASS | |
| 4 | Phone Regex Validation (`09\d{9}`) | [ ] PASS | |
| 5 | Profile Name / Phone Update (`PUT /api/me`) | [ ] PASS | |
| 6 | Password Change Verification & Token Purge | [ ] PASS | |
| 7 | Clean Logout & LocalStorage Eviction (`POST /api/logout`) | [ ] PASS | |
