# UI Test Guide: Cycle 10 – Clinic Setup & Onboarding Wizard

## Objective
Verify the end-to-end functionality of clinic initial onboarding, setup status verification, clinic profile updating (with logo branding and auto-geocoding), and final setup completion following the refactoring of `ClinicSetupController.php`.

---

## Target Endpoints Verified
- `POST /api/setup/initialize` (Public initialization of clinic and admin user, or setup resumption)
- `GET /api/setup/status` (Check clinic setup completion state, Admin only)
- `GET /api/setup/clinic` (Retrieve current clinic profile and branding assets, Admin only)
- `PUT/POST /api/setup/clinic` (Update clinic profile, upload/remove main & print logos, trigger geocoding, Admin only)
- `POST /api/setup/complete` (Finalize onboarding wizard and lock clinic setup, Admin only)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Browser access to the web portal.

---

## Step-by-Step Test Procedure

### 1. First-Time Setup Wizard (Public Initialization)
1. On a fresh installation (or test database with 0 clinics), navigate to `/setup`.
2. Enter initial clinic details:
   - Facility Name: "Tagoloan Animal Bite Treatment Center"
   - Administrator Name: "Super Admin"
   - Administrator Email: "admin@tagoloan.gov.ph"
   - Password: "Password123" (must contain uppercase, lowercase, and number)
3. Submit the initialization form.
4. **Expected Result:**
   - Request `POST /api/setup/initialize` returns HTTP 201 Created with `{ message, token, user, clinic }`.
   - The user is automatically authenticated with the issued `setup-token`.
   - Subsequent unauthenticated requests to `/setup/initialize` return HTTP 403 Forbidden with *"Setup has already been started"* or *"Setup has already been completed"*.

---

### 2. Check Setup Status & Profile
1. Log in as the newly created Administrator.
2. In the setup wizard or navigation bar, the app queries `GET /api/setup/status`.
3. **Expected Result:**
   - Returns `{ is_setup_complete: false, clinic: null }` while setup is in progress.
4. The setup wizard fetches `GET /api/setup/clinic`.
5. **Expected Result:**
   - Returns HTTP 200 with the active clinic profile.

---

### 3. Update Clinic Profile, Branding Logos, and Geocoding
1. In the Clinic Information step:
   - Subtitle: "Municipal Public Health Facility"
   - Address: "National Highway, Poblacion, Tagoloan, Misamis Oriental"
   - Mobile Contact: "09123456789"
   - Email: "info@tagoloanbitecenter.ph"
   - License / Hospital / DOH Accreditation numbers.
2. Attach logo files:
   - Main Logo: upload a test PNG file (`logo.png`).
   - Left Print Logo: upload a test PNG file (`left_print.png`).
   - Right Print Logo: upload a test PNG file (`right_print.png`).
3. Click **Save Clinic Profile**.
4. **Expected Result:**
   - Request `POST /api/setup/clinic` (multipart/form-data) returns HTTP 200 with updated clinic object.
   - Logos are stored in `storage/app/public/clinic-logos`.
   - `logo_path`, `left_print_logo_path`, and `right_print_logo_path` are populated and their asset URLs resolve via `/api/storage/...`.
   - Address is automatically geocoded; `latitude`, `longitude`, and `map_default_zoom` are updated.
   - Bite cases map cache for this clinic is automatically invalidated.

---

### 4. Remove Branding Logo
1. In the Clinic Information step, click the **Remove Logo** or **Delete Print Logo** option.
2. Click **Save Changes**.
3. **Expected Result:**
   - Request `POST /api/setup/clinic` with `remove_logo=1` returns HTTP 200.
   - The file is deleted from disk and `logo_path` is set to null.

---

### 5. Finalize and Complete Setup
1. Review all setup steps and click **Complete Setup**.
2. **Expected Result:**
   - Request `POST /api/setup/complete` returns HTTP 200 with:
     ```json
     {
       "message": "Setup completed successfully",
       "clinic": {
         "is_setup_complete": true,
         "setup_completed_at": "..."
       }
     }
     ```
   - The user is redirected to the main staff dashboard (`/dashboard` or `/queue`).
   - A subsequent call to `GET /api/setup/status` returns `{ is_setup_complete: true, clinic: { ... } }`.

---

## Verification Summary
- **Zero regressions:** Response contracts across all setup endpoints strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Clinic/ClinicSetupCharacterizationTest.php` passes 7/7 tests (42 assertions).
- **Print logos coverage:** `backend/tests/Feature/PrintLogosSetupTest.php` passes 2/2 tests (35 assertions).
- **Full Suite pass:** 183 total characterization tests passing (982 assertions) across Person 1 and Person 4.
- **Frontend compatibility:** Full build passes with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
