# UI Test Guide: Cycle 6 – Public Portal Branding & Landing Page Settings

## Objective
Verify the end-to-end functionality of landing page settings (CMS headers, operating schedule, quick links, footer, and developer settings editor) following the refactoring of `LandingPageSettingsController.php`.

---

## Target Endpoints Verified
- `GET /api/landing-page-settings` (Public retrieval of portal branding, footer links, and schedule)
- `POST /api/developer/landing-page-settings` / `PUT /api/developer/landing-page-settings` (Developer / Admin settings update)

---

## Prerequisites
1. Local development environment running (`backend` at `http://127.0.0.1:8000`, `frontend` at `http://localhost:5173`).
2. Logged in as a user with Developer role (`role: 'developer'`) for editing tests, or public visitor for view tests.

---

## Step-by-Step Test Procedure

### 1. Public Landing Page Display
1. In an incognito window (unauthenticated), navigate to the root homepage (`http://localhost:5173/`).
2. Observe the Hero Section, Operating Schedule banner, and Footer.
3. Open browser DevTools -> Network tab.
4. Locate the `GET /api/landing-page-settings` request.
5. **Expected Result:**
   - Network call returns HTTP `200 OK`.
   - The portal dynamically reflects the branding:
     - Short name (e.g. `TABTA` or custom brand)
     - Operating schedule (e.g. `SCHEDULE: MONDAYS & THURSDAYS`)
     - Operating hours (e.g. `8:00 AM – 5:00 PM`)
     - Footer links (Quick Links, Support Links, System Info Links)

---

### 2. Developer Settings Editor
1. Log in with a Developer account.
2. Navigate to Developer Settings -> **Landing Page Settings** (route: `/developer/landing-settings`).
3. Modify a field (for example, edit the Short Name to `TABTC-EXP` or update the Registration Window text).
4. Click **Save Changes**.
5. **Expected Result:**
   - Network request `POST /api/developer/landing-page-settings` returns HTTP `200 OK`.
   - Success toast appears: `"Landing page settings updated successfully"`.
   - Revisit the homepage in an incognito window: the updated branding values appear immediately.

---

### 3. Role Protection Verification
1. Log out or switch to a Nurse or Registration user account.
2. Attempt to make a `POST` or `PUT` request to `/api/developer/landing-page-settings`.
3. **Expected Result:**
   - HTTP 403 Forbidden with uniform error message. Non-developers are strictly prevented from altering public portal settings.

---

## Automated Test Coverage Reference
- `backend/tests/Feature/Landing/LandingPageSettingsCharacterizationTest.php` (6 tests, 31 assertions)
