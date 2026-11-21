# 🧪 Cycle 7 UI Test Guide: Mobile Patient Demographic Profiles & Dependent Management
**Target Controller:** `backend/app/Http/Controllers/Mobile/PatientProfileController.php`  
**Refactored Artifacts:** `StoreMobilePatientRequest`, `UpdateMobilePatientRequest`, `MobilePatientProfileService`, `PatientProfileController`  
**Target Application:** Flutter Mobile App (Android / iOS / Emulator) & Mobile API Gateway  
**Date:** October 2026  

---

## 1. Test Environment Setup & Credentials Matrix

Ensure your backend server and mobile app environment are active:

```powershell
# Terminal 1: Backend Laravel API
cd backend
php artisan serve

# Terminal 2: Flutter Mobile App
cd mobile
flutter run -d chrome # Or run on Android emulator / physical device
```

### Credentials Matrix for Testing
| Actor / Account | Email | Password | Allowed Profile Actions |
| :--- | :--- | :--- | :--- |
| **Mobile Patient** | `patient.walkin@example.com` | `password123` | View linked patient cards, add child/dependent profiles, update demographics, manage PhilHealth details. |
| **New Mobile User** | `newpatient@example.com` | `password123` | First login creates initial primary `self` profile. |

---

## 2. Step-by-Step UI Verification Scenarios

### Scenario 1: Patient Profiles List & Cache Verification (`GET /api/mobile/patients`)
- **Goal:** Verify that the mobile home screen loads linked family profiles with primary status and cached performance.
- **Steps:**
  1. Open the mobile app and log in as `patient.walkin@example.com`.
  2. Navigate to the **"Profiles"** or **"Family Members"** tab.
- **Expected Results:**
  - [ ] Patient profiles render as interactive cards with Full Name, Relationship badge (`Self`, `Child`, `Dependent`), and Portal Status (`Verified` or `Pending`).
  - [ ] The primary self profile is displayed at the top (`pivot.is_primary == true`).
  - [ ] Inspect DevTools / Network:
    - `GET /api/mobile/patients` returns HTTP `200 OK`.
    - Subsequent navigation back to the screen is instant via backend cache (`mobile:patients:account:{id}`).

---

### Scenario 2: Add Family Dependent (`POST /api/mobile/patients`)
- **Goal:** Verify that a mobile account can register dependent profiles (e.g. child, parent, dependent).
- **Steps:**
  1. In the Profiles tab, tap **"+ Add Family Member"**.
  2. Fill in the profile form:
     - **Relationship:** Select `Child`.
     - **First Name:** `Pedro`
     - **Last Name:** `Dela Cruz`
     - **Gender:** `Male`
     - **Date of Birth:** `2018-06-12`
     - **Emergency Contact:** `Juan Dela Cruz` (`09171234567`)
  3. Tap **"Save Family Member"**.
- **Expected Results:**
  - [ ] Success snackbar notification appears: `"Profile created successfully"`.
  - [ ] New card for `Pedro Dela Cruz` appears in the profiles list with `Child` chip and `Pending` status.
  - [ ] Network inspection (`POST /api/mobile/patients`):
    - Status: `201 Created`
    - Response contains `details`, `memberships`, and `pivot` (`relationship: "child"`, `is_primary: false`).

---

### Scenario 3: Prevent Multiple "Self" Profiles (`422`)
- **Goal:** Verify that an account cannot register more than one `self` profile.
- **Steps:**
  1. Tap **"+ Add Family Member"**.
  2. Attempt to select **Relationship:** `Self`.
  3. Enter any name and tap **"Save Profile"**.
- **Expected Results:**
  - [ ] Validation alert dialog / banner appears: `"This account already has a self profile."`.
  - [ ] HTTP status `422 Unprocessable Content`.
  - [ ] No duplicate profile is created.

---

### Scenario 4: Update Demographic & PhilHealth Details (`PATCH /api/mobile/patients/:id`)
- **Goal:** Verify editing an existing profile updates demographics and PhilHealth/membership details without breaking pivot linkage.
- **Steps:**
  1. Tap on an existing profile card -> Tap **"Edit Profile"**.
  2. Update:
     - **Middle Name:** `Santos`
     - **Blood Type:** `B+`
     - **Civil Status:** `Married`
     - **PhilHealth Member:** `Yes`
     - **PhilHealth No:** `12-345678901-2`
     - **Category:** `Direct Contributor`
  3. Tap **"Update Profile"**.
- **Expected Results:**
  - [ ] Profile card updates immediately to reflect `B+` and PhilHealth badge.
  - [ ] Network inspection (`PATCH /api/mobile/patients/{id}`):
    - Status: `200 OK`
    - Response contains updated `details.blood_type: "B+"` and `details.philhealth_no: "12-345678901-2"`.

---

### Scenario 5: Cache Invalidation on Mutation
- **Goal:** Verify cache consistency across screen transitions after modifying a profile.
- **Steps:**
  1. Update a profile as in Scenario 4.
  2. Navigate to **"Book Appointment"** or **"Vaccination Card"**.
- **Expected Results:**
  - [ ] The updated name and details appear immediately in appointment booking and vaccination selection dropdowns, confirming `Cache::forget` evicted stale profile cache keys.

---

## 3. Rollback & Troubleshooting
- **Database Rollback:**
  ```powershell
  cd backend
  php artisan tinker --execute="App\Models\Patient::where('registration_source', 'mobile')->where('first_name', 'Pedro')->forceDelete();"
  ```
- **Cache Clear:**
  ```powershell
  cd backend
  php artisan cache:clear
  ```
