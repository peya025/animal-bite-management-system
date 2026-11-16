# Implementation Plan: Google Sign-In / SSO

**Feature:** Google Sign-In & Single Sign-On (SSO)  
**Status:** 🟡 Code Ready, Missing Credentials  
**Issue:** ⚠️ Fails without OAuth setup  
**Tool / Service:** Google Cloud Console OAuth 2.0 Client ID  

---

## 1. Simple Summary (What is this and why is it yellow?)

### Why is this "Code Ready"?
Great news: The code is **already written in the project**!
- **Mobile App:** The Flutter login screen (`mobile/lib/views/login_view.dart`) already has the *"Sign in with Google"* button and Google Sign-In code.
- **Backend Server:** The Laravel controllers and services (`GoogleStaffSsoService.php` and `PatientAccountGoogleSsoService.php`) are already built and ready to verify Google login tokens.
- **Web Frontend:** The web login screen has the Google button integration ready.

### Why is it failing right now?
When you click *"Sign in with Google"*, Google pops up an error because **Google does not know who our app is yet**. 

To fix this, we need to create official **OAuth 2.0 Client IDs** in the Google Cloud Console and paste the keys into our `.env` files.

---

## 2. How Google Sign-In Works (In Simple Words)

```
[User on Phone or Web]              [Google Login Screen]            [ABTC Backend Server]
         │                                   │                                 │
         │ 1. Clicks "Sign in with Google"   │                                 │
         │──────────────────────────────────>│                                 │
         │                                   │                                 │
         │ 2. Selects their Gmail account    │                                 │
         │    and enters password            │                                 │
         │                                   │                                 │
         │ 3. Google returns a verified ID Token                               │
         │    (proof that this user owns this Gmail)                           │
         │<──────────────────────────────────│                                 │
         │                                   │                                 │
         │ 4. App sends ID Token to our backend                                │
         │────────────────────────────────────────────────────────────────────>│
         │                                   │                                 │
         │                                   │ 5. Backend verifies token       │
         │                                   │    with Google servers          │
         │                                   │    - For Staff: checks role     │
         │                                   │    - For Patient: logs them in  │
         │                                   │                                 │
         │ 6. Backend returns login session & token                            │
         │<────────────────────────────────────────────────────────────────────│
         │                                                                     │
         │ * User is now safely logged in! *                                   │
```

---

## 3. Step-by-Step Setup Guide

You need to create two Client IDs in Google Cloud Console:
1. **Web Client ID:** Used by the Web Staff portal and the backend server.
2. **Android Client ID:** Used by the Flutter Android mobile phone app.

---

### Step 1: Set up Google Cloud Project & Consent Screen

1. Open your browser and go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your developer or organization Google account.
3. At the top left, click the project dropdown and click **New Project**:
   - **Project name:** `ABTC Animal Bite Center`
   - Click **Create**.
4. In the left navigation menu, go to **APIs & Services** → **OAuth consent screen**:
   - Select **External** (so patients and staff with Gmail can log in).
   - Click **Create**.
5. Fill in the basic app information:
   - **App name:** `ABTC Clinic Portal`
   - **User support email:** Choose your email.
   - **Developer contact information:** Choose your email.
   - Click **Save and Continue**.
6. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Check these three standard scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click **Update** → **Save and Continue**.
7. On the **Test users** page:
   - Click **Add Users** and add your testing Gmail addresses.
   - Click **Save and Continue**.

---

### Step 2: Create the Web Client ID (For Backend & Web Frontend)

1. In the left menu, click **Credentials**.
2. At the top, click **+ CREATE CREDENTIALS** → **OAuth client ID**.
3. Select Application type: **Web application**.
4. Name it: `ABTC Web & Server Client`.
5. Under **Authorized JavaScript origins**, click **ADD URI** and add:
   - `http://localhost:5173` (Vite frontend local server)
   - `http://localhost:8000` (Backend local server)
   - *(Add your live production domain if deployed, e.g. `https://abtc.example.com`)*
6. Under **Authorized redirect URIs**, click **ADD URI** and add:
   - `http://localhost:8000/api/auth/google/callback`
   - `http://localhost:5173/login`
7. Click **Create**.
8. A popup will show:
   - **Your Client ID** (looks like: `123456789-abcdef.apps.googleusercontent.com`)
   - **Your Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxxx`)
9. **Copy both values.** You will need them in Step 4.

---

### Step 3: Create the Android Client ID (For Flutter Mobile App)

Google requires the Android app's package name and a cryptographic fingerprint called a **SHA-1 Fingerprint** so only your genuine app can use Google login.

1. **Find your computer's debug SHA-1 fingerprint:**
   Open a terminal (PowerShell or Command Prompt) on your computer and run:
   ```powershell
   keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```
   Look for the line that says `SHA1:`:
   ```text
   Certificate fingerprints:
        SHA1: AA:BB:CC:DD:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
   ```
   Copy that SHA-1 string!

2. **In Google Cloud Console:**
   - Go to **APIs & Services** → **Credentials**.
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
   - Select Application type: **Android**.
   - Name: `ABTC Android Mobile App`.
   - **Package name:** `com.example.mobile` (must match your app package name).
   - **SHA-1 certificate fingerprint:** Paste the SHA-1 fingerprint you copied above.
   - Click **Create**.

---

### Step 4: Add Credentials to `.env` Files

Now put the credentials into the project files:

#### 1. Backend (`backend/.env`):
Open `backend/.env` and update these lines:
```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

#### 2. Web Frontend (`frontend/.env`):
Open `frontend/.env` (or create if missing):
```env
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

#### 3. Mobile App (`mobile/.env`):
Open `mobile/.env` (or create from `mobile/.env.example`):
```env
# The Web Client ID must be provided here so Google gives back an ID Token for backend verification
GOOGLE_SERVER_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

---

### Step 5: Check Clinic Admin SSO Setting (Backend)

The backend has security rules: clinical staff can only use Google Sign-In if the clinic administrator has enabled it for their clinic!

1. In the database, check the table `clinic_module_configs`:
   - `google_sso_enabled`: Must be `1` (true).
   - `google_sso_roles`: Can list allowed roles (e.g. `["doctor", "nurse", "admin"]`) or empty for all staff.
   - `google_sso_domain`: Optional domain filter (e.g. `@gmail.com` or `@clinic.gov.ph`).
2. Alternatively, log in as Super Admin or Clinic Admin in the web app, go to **Clinic Settings** → **Integrations / SSO**, and switch the toggle **Enable Google Sign-In** to **ON**.

---

## 4. How to Test (Testing Guide)

| Test # | Platform | What to do | Expected Result |
| :--- | :--- | :--- | :--- |
| **Test 1** | Mobile Phone | Open mobile app, click *"Sign in with Google"*, and select your Gmail. | Google account dialog opens smoothly, logs you in, and takes you to the mobile patient home dashboard. |
| **Test 2** | Mobile Database | Check the database `patient_accounts` table. | A row exists with your email, and `google_id` is filled in. |
| **Test 3** | Web Staff Portal | On the web login screen, click *"Sign in with Google"* using an existing registered staff email. | Successfully logs into the Clinic Staff Dashboard. |
| **Test 4** | Web Security Check | Try signing in with a random Gmail that is **NOT** registered as a clinic staff member. | Login is safely blocked with message: *"Unauthorized: No clinical staff account is registered under this Google email."* Random strangers cannot access staff records! |

---

## 5. Action Checklist

- [ ] **Step 1: Google Cloud Console**
  - [ ] Create project in Google Cloud Console.
  - [ ] Configure OAuth Consent Screen (App Name, email, scopes).
  - [ ] Add testing Gmail accounts under Test Users.
- [ ] **Step 2: Create Credentials**
  - [ ] Create Web Application Client ID (save Client ID & Secret).
  - [ ] Run `keytool` command to find Android debug SHA-1.
  - [ ] Create Android Client ID with package `com.example.mobile` and SHA-1.
- [ ] **Step 3: Update Environment Files**
  - [ ] Fill in `backend/.env` with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  - [ ] Fill in `frontend/.env` with `VITE_GOOGLE_CLIENT_ID`.
  - [ ] Fill in `mobile/.env` with `GOOGLE_SERVER_CLIENT_ID`.
- [ ] **Step 4: Verification & Testing**
  - [ ] Test mobile patient login.
  - [ ] Test web staff login with authorized email.
  - [ ] Verify unauthorized Google account is blocked from staff portal.
