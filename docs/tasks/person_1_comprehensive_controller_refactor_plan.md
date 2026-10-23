# Person 1 Comprehensive Controller Refactor Plan
**Domain:** Authentication, Users, Security & Identity  
**Owner:** Person 1  
**Project:** Animal Bite Management System (ABMS)  
**Assigned Controllers:** 8 Files (~1,641 Lines of Code)  
**Clients Consuming:** React + TypeScript Web App & Flutter Mobile App  

---

## 1. Domain Scope & Working Rules

Person 1 owns the entire authentication, user identity, digital signature, onboarding invitation, and account management lifecycle across both the web staff portal and the mobile patient application.

### Strict Working Rules
1. **One File at a Time:** Refactor one controller per cycle. Do not begin the next controller until the current one has characterization tests passing, code refactored, and web/mobile integrations verified.
2. **File Isolation:** Person 1 modifies **ONLY** the 8 controller files listed below, plus newly created FormRequests, Services, Resources, and Feature Tests within Person 1's domain.
3. **No Touching Shared Files:** Do not modify `backend/routes/api.php`, `backend/bootstrap/app.php`, or `backend/app/Http/Controllers/Controller.php` without coordination with Person 4.
4. **Behavior Must Stay 100% Identical:**
   - No route URL changes, no HTTP verb changes, no parameter name changes.
   - Status codes (200, 201, 400, 401, 403, 404, 409, 422) must remain identical.
   - JSON keys, casing (`camelCase` vs `snake_case`), nullability, and nested vs flat structures must not change.
   - All DB transactions, audit logging steps, token deletions, password hashing, and email dispatches must maintain their exact order of execution.
5. **No Bug Fixes or Dead Code Deletion During Refactor:** Suspected bugs and dead code are logged strictly in the report section.

---

## 2. Person 1 Controller Inventory & Execution Sequence

| Cycle | Controller Path | Lines | Risk Level | Domain Function |
| :---: | :--- | :---: | :---: | :--- |
| **Cycle 1** | `backend/app/Http/Controllers/AuthController.php` | 310 | 🔴 High | Web/staff login, logout, Google SSO, session `/me`, profile update |
| **Cycle 2** | `backend/app/Http/Controllers/StaffSignatureController.php` | 30 | 🟢 Low | Staff digital signature retrieval, profile binding, record signature |
| **Cycle 3** | `backend/app/Http/Controllers/PatientAccessController.php` | 30 | 🟢 Low | Clinic staff verification and rejection of patient portal access |
| **Cycle 4** | `backend/app/Http/Controllers/StaffInvitationController.php` | 214 | 🟡 Medium | Staff onboarding invitations, token validation, invite acceptance |
| **Cycle 5** | `backend/app/Http/Controllers/PatientInvitationController.php` | 304 | 🟡 Medium | Patient portal invites, token emailer, mobile activation, linkage |
| **Cycle 6** | `backend/app/Http/Controllers/UserController.php` | 331 | 🔴 High | Admin staff user CRUD, workstation role sync, module assignment |
| **Cycle 7** | `backend/app/Http/Controllers/Mobile/PatientProfileController.php` | 166 | 🟡 Medium | Mobile patient demographic profiles, family linkage, cache invalidation |
| **Cycle 8** | `backend/app/Http/Controllers/Mobile/PatientAccountAuthController.php` | 256 | 🔴 High | Mobile Flutter patient registration, login, token revocation, Google SSO |

---

## 3. Deep Dive Specification by Cycle

---

### CYCLE 1: `AuthController.php`

- **File Path:** `backend/app/Http/Controllers/AuthController.php` (310 lines)
- **Role:** Web & Clinical Staff Authentication, Token Management & Google OAuth

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs & Validation Rules | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `login` | `POST /api/login` | `throttle:login` | `200`, `422` | `email`: required, email<br>`password`: required | 1. Validate inputs.<br>2. Find user by email.<br>3. Check password hash (422 if invalid).<br>4. Check `is_active` (422 if false).<br>5. `$user->updateLastLogin()`.<br>6. `AuditLog::logLogin($user)`.<br>7. `$user->createToken('auth_token')->plainTextToken`.<br>8. Load relations: `clinic`, `roles`. |
| `logout` | `POST /api/logout` | `auth:sanctum`<br>`active.user` | `200`, `401` | None | 1. `AuditLog::logLogout()`.<br>2. `$request->user()->currentAccessToken()->delete()`. |
| `me` | `GET /api/me` | `auth:sanctum`<br>`active.user` | `200`, `401` | None | 1. Eager load: `clinic`, `roles`.<br>2. Returns **flat** user JSON (no outer wrapper). |
| `updateProfile` | `PUT /api/me` | `auth:sanctum`<br>`active.user` | `200`, `422` | `name`: required, max:255<br>`phone`: nullable, regex `/^09\d{9}$/`<br>`current_password`: required_with:password<br>`password`: nullable, min:8, confirmed | 1. Validate inputs.<br>2. If changing password, verify `current_password` (422 if mismatch).<br>3. `$user->update(...)` (hashes password if provided).<br>4. If password changed, revoke all tokens: `$user->tokens()->delete()`. |
| `googleLogin` | `POST /api/auth/google` | `throttle:20,1` | `200`, `201`<br>`401`, `403` | `credential`: required, string (Google ID Token JWT) | 1. HTTP GET `https://oauth2.googleapis.com/tokeninfo`.<br>2. Verify `aud` against `config('services.google.client_id')`.<br>3. **Case 1 (Existing Staff):** check active, check clinic, check clinic SSO config; link `google_id`; update login; `AuditLog::logLogin`; issue token.<br>4. **Case 2 (Pending Invite):** provision user; accept invitation; `AuditLog::logLogin`; issue token.<br>5. **Case 3 (Unknown):** return 403. |
| `register` | `POST /api/register` | Conditional | `201`, `404` | `name`: required<br>`email`: required, unique:users<br>`password`: min:8, confirmed | 1. `abort(404)` if `!config('app.public_registration_enabled')`.<br>2. Create default `Clinic`.<br>3. Create `User` with `role: admin`.<br>4. Issue token. |

#### 2. Client Dependencies
- **React Web:**
  - Consuming files: `frontend/src/shared/services/auth.service.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/shared/types/common.types.ts`.
  - Dependent JSON keys:
    - `/login`: `data.token`, `data.token_type`, `data.user` (with `id`, `name`, `email`, `role`, `phone`, `is_active`, `signature_path`, `professional_license_no`, `roles`, `is_solo_nurse`, `is_nursing`, `clinic`).
    - `/me`: **STRICT FLAT STRUCTURE** (`response.data.user ?? response.data`): `id`, `name`, `email`, `role`, `phone`, `is_active`, `signature_path`, `professional_license_no`, `roles`, `is_solo_nurse`, `is_nursing`, `last_login_at`, `clinic`.
    - `/auth/google`: `data.token`, `data.user`, `data.sso_method`.
- **Flutter Mobile:**
  - Web `AuthController` is not directly called by mobile (mobile routes to `/api/mobile/login` via `PatientAccountAuthController`), but shares the Sanctum token table and `AuditLog` format.

#### 3. Target Extraction Blueprint
```
backend/app/
├── Http/
│   ├── Requests/Auth/
│   │   ├── LoginRequest.php
│   │   ├── RegisterRequest.php
│   │   ├── UpdateProfileRequest.php
│   │   └── GoogleLoginRequest.php
│   └── Resources/Auth/
│       ├── AuthUserResource.php        <-- Nested user representation (for login)
│       └── MeUserResource.php          <-- Flat user representation (for /me)
└── Services/Auth/
    ├── StaffAuthService.php            <-- Core login, logout, profile update
    └── GoogleStaffSsoService.php       <-- Google token verification and auto-provisioning
```

#### 4. Pre-Refactor Characterization Tests
File: `backend/tests/Feature/Auth/AuthControllerCharacterizationTest.php`
- `test_login_success_returns_nested_user_and_bearer_token()`
- `test_login_inactive_user_returns_422_with_exact_inactive_message()`
- `test_login_bad_credentials_returns_422_with_exact_message()`
- `test_login_touches_last_login_at_and_writes_audit_log()`
- `test_me_endpoint_returns_exact_flat_json_structure()`
- `test_logout_deletes_current_token_and_writes_audit_log()`
- `test_update_profile_updates_name_and_validates_09_regex()`
- `test_update_profile_with_password_revokes_tokens_and_requires_current_password()`
- `test_google_login_rejects_missing_credential()`
- `test_register_returns_404_when_public_registration_disabled()`

---

### CYCLE 2: `StaffSignatureController.php`

- **File Path:** `backend/app/Http/Controllers/StaffSignatureController.php` (30 lines)
- **Role:** Digital signature retrieval and verification for clinical staff and treatment records.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `current` | `GET /api/staff-signature` | `auth:sanctum`<br>`role:admin,treatment,nurse,triage,doctor` | `200` | None | Returns `{ signature_path: string\|null }` with header `Cache-Control: private, no-store`. |
| `profile` | `GET /api/users/{id}/signature` | `auth:sanctum`<br>`role:admin,treatment,nurse,triage,doctor` | `200`, `403`, `404`, `409` | Query `version` (optional) | 1. Find user in current clinic (404 if not found).<br>2. Abort 403 if not admin and not own profile.<br>3. If `version` given, abort 409 if signature changed.<br>4. Returns binary signature stream via `StaffSignatureService::response()`. |
| `record` | `GET /api/vaccination-records/{id}/signature` | `auth:sanctum` | `200`, `404` | None | Returns binary signature stream of `TreatmentRecord`. |

#### 2. Client Dependencies
- **React Web:** Used in consultation, vaccination, and triage workstations to display doctor/nurse signatures on official printouts and digital treatment cards.
- **Dependent Keys:** `{ "signature_path": "signatures/..." }` and binary image streams.

#### 3. Target Extraction Blueprint
Keep controller lightweight. Delegate logic to `StaffSignatureService`. Add dedicated `StaffSignatureResource` for `current()`.

---

### CYCLE 3: `PatientAccessController.php`

- **File Path:** `backend/app/Http/Controllers/PatientAccessController.php` (30 lines)
- **Role:** Clinic staff verification and rejection of patient portal access requests.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `verify` | `POST /api/patient-access/{patient}/{account}/verify` | `auth:sanctum`<br>`role:admin,registration` | `200`, `404` | None | 1. Verify `patient->clinic_id === user->clinic_id` (404).<br>2. Find account in pivot (404).<br>3. Update pivot: `status = 'verified'`, `verified_by = user->id`, `verified_at = now()`.<br>4. Return `{ message: 'Patient profile access verified.' }`. |
| `reject` | `POST /api/patient-access/{patient}/{account}/reject` | `auth:sanctum`<br>`role:admin,registration` | `200`, `404` | None | 1. Verify `patient->clinic_id === user->clinic_id` (404).<br>2. Find account in pivot (404).<br>3. Update pivot: `status = 'rejected'`, `verified_by = user->id`, `verified_at = now()`.<br>4. Return `{ message: 'Patient profile access rejected.' }`. |

#### 2. Client Dependencies
- **React Web:** Staff admin/registration patient detail screen managing portal authorizations.

#### 3. Target Extraction Blueprint
Extract pivot status transitions into `App\Services\Auth\PatientAccessService`.

---

### CYCLE 4: `StaffInvitationController.php`

- **File Path:** `backend/app/Http/Controllers/StaffInvitationController.php` (214 lines)
- **Role:** Clinic staff onboarding invitation lifecycle.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs & Validation Rules | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `invite` | `POST /api/staff-invitations` | `auth:sanctum`<br>`role:admin` | `201`, `422` | `email`: required, email<br>`role`: nullable<br>`workstation_role`: nullable | 1. Check user exists (422).<br>2. Check pending active invite (422).<br>3. Canonicalize workstation role.<br>4. Create `StaffInvitation` (UUID token, 7-day expiry).<br>5. Send `StaffInvitationMail`. |
| `index` | `GET /api/staff-invitations` | `auth:sanctum`<br>`role:admin` | `200` | None | Returns list of invitations with `inviter` relation. |
| `validateToken`| `GET /api/staff-invitations/validate/{token}` | Public | `200`, `400`, `404` | Route `token` | Validates existence, expiry, and used status. |
| `accept` | `POST /api/staff-invitations/accept/{token}` | Public<br>`throttle:invite-activation` | `201`, `400`, `422` | `name`: required<br>`password`: required, min:8, confirmed<br>`phone`: nullable, regex `/^09\d{9}$/` | 1. Validate input.<br>2. Validate token validity (400).<br>3. Create `User`.<br>4. Sync workstation roles.<br>5. Mark invitation accepted.<br>6. Create Sanctum token for auto-login.<br>7. Return `{ message, user, token, token_type: 'Bearer' }`. |
| `cancel` | `DELETE /api/staff-invitations/{id}` | `auth:sanctum`<br>`role:admin` | `200`, `400`, `404` | Route `id` | Marks pending invitation as `expired`. |

#### 2. Client Dependencies
- **React Web:** Staff management page (`frontend/src/services/staffApi.ts`) and public `/accept-invitation/:token` page.

#### 3. Target Extraction Blueprint
```
backend/app/
├── Http/
│   ├── Requests/Staff/
│   │   ├── SendStaffInvitationRequest.php
│   │   └── AcceptStaffInvitationRequest.php
│   └── Resources/Staff/
│       ├── StaffInvitationResource.php
│       └── StaffInvitationValidationResource.php
└── Services/Staff/
    └── StaffInvitationService.php      <-- Role canonicalization, invite creation, acceptance, and role syncing
```

---

### CYCLE 5: `PatientInvitationController.php`

- **File Path:** `backend/app/Http/Controllers/PatientInvitationController.php` (304 lines)
- **Role:** Patient portal account invitations, bulk invite dispatch, token emailer, and mobile account activation.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `store` | `POST /api/patient-invitations` | `auth:sanctum` | `201`, `422`, `503` | `patient_id`: required | 1. Validate email on record.<br>2. Check if verified portal account exists.<br>3. Expire previous pending invites.<br>4. Generate 64-char token (7-day expiry).<br>5. Dispatch email via delivery mailer.<br>6. Return invitation. |
| `bulkStore` | `POST /api/patient-invitations/bulk` | `auth:sanctum` | `200`, `422` | `patient_ids`: required, array | Loops through patients, skips invalid/existing, generates tokens, and sends emails. Returns sent/skipped counts and error list. |
| `activate` | `POST /api/patient-invitations/activate` | Public<br>`throttle:invite-activation` | `200`, `404`, `422` | `token`: required<br>`email`: required, email<br>`password`: required, confirmed | **In DB::transaction:**<br>1. Create `PatientAccount`.<br>2. Create `PatientAccountPatient` pivot (`status: verified`, `is_primary: true`).<br>3. Mark invitation accepted.<br>4. Create Sanctum token `mobile-app-patient`.<br>5. Return `{ message, token, account, patient, linkage }`. |
| `resend` | `POST /api/patient-invitations/{id}/resend` | `auth:sanctum` | `200`, `422`, `503` | Route `id` | Generates new token, resends email, resets expiry. |
| `linkAccount`| `POST /api/patients/{patient_id}/link-account` | `auth:sanctum` | `201`, `422` | `patient_account_id`: required | Links existing `PatientAccount` to `Patient` (`status: pending`). |
| `verifyLink` | `PATCH /api/patient-account-patient/{id}/verify`| `auth:sanctum` | `200` | Route `id` | Marks linkage verified. |

#### 2. Client Dependencies
- **React Web:** Patient management view (`frontend/src/pages/patients/*`) sending invites.
- **Flutter Mobile:** Account activation screen (`mobile/lib/views/auth/account_activation_view.dart`, `mobile/lib/services/mobile_api.dart`).
- **Dependent Keys:** Mobile activation depends on `{ "token": "...", "account": { ... }, "patient": { ... } }`.

#### 3. Target Extraction Blueprint
Move email verification and transactional activation into `App\Services\Patient\PatientInvitationService`.

---

### CYCLE 6: `UserController.php`

- **File Path:** `backend/app/Http/Controllers/UserController.php` (331 lines)
- **Role:** Admin staff user CRUD, workstation role assignments, digital signature uploads, and module toggles.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs & Rules | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `index` | `GET /api/users` | `auth:sanctum`<br>`role:admin` | `200`, `403` | None | Returns all staff users for current clinic with roles and `signature_available`. |
| `store` | `POST /api/users` | `auth:sanctum`<br>`role:admin` | `201`, `403`, `422` | `name`, `email`, `password`, `workstation_role`, `roles`, `phone`, signature rules | **In DB::transaction:**<br>1. Map legacy role from workstation role.<br>2. Create `User`.<br>3. Sync workstation roles with `assigned_by`.<br>4. Apply digital signature PNG.<br>5. Return created user. |
| `show` | `GET /api/users/{id}` | `auth:sanctum`<br>`role:admin` | `200`, `404` | Route `id` | Returns single user with roles. |
| `update` | `PUT /api/users/{id}` | `auth:sanctum`<br>`role:admin` | `200`, `403`, `422` | Similar to store, optional password | **In DB::transaction:**<br>1. Update user fields.<br>2. Resync workstation roles.<br>3. Update signature if provided.<br>4. If deactivated, revoke all active tokens. |
| `destroy` | `DELETE /api/users/{id}` | `auth:sanctum`<br>`role:admin` | `200`, `400`, `403` | Route `id` | Prevents deleting self. Deletes user. |
| `updateAssignedModule` | `PUT /api/users/{id}/assigned-module` | `auth:sanctum`<br>`role:admin` | `200`, `422` | `assigned_module`: required | Updates user's station assignment. |

#### 2. Client Dependencies
- **React Web:** Admin User Management table (`frontend/src/features/admin/*`, `frontend/src/services/staffApi.ts`).
- **Dependent Keys:** `signature_available`, `assigned_module`, `roles`, `role`, `is_active`.

#### 3. Target Extraction Blueprint
```
backend/app/
├── Http/
│   ├── Requests/User/
│   │   ├── StoreUserRequest.php
│   │   ├── UpdateUserRequest.php
│   │   └── UpdateAssignedModuleRequest.php
│   └── Resources/User/
│       └── UserManagementResource.php
└── Services/User/
    └── UserManagementService.php       <-- Encapsulates role mapping, user mutations, token revocation
```

---

### CYCLE 7: `Mobile/PatientProfileController.php`

- **File Path:** `backend/app/Http/Controllers/Mobile/PatientProfileController.php` (166 lines)
- **Role:** Mobile patient profile management, dependent/family registration, and PhilHealth/4Ps demographics.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `index` | `GET /api/mobile/patients` | `auth:sanctum`<br>`patient.account` | `200` | None | Returns cached patient profiles attached to account (`Cache::remember` 10 mins). |
| `store` | `POST /api/mobile/patients` | `auth:sanctum`<br>`patient.account` | `201`, `422` | Demographics, address, emergency contact, PhilHealth, memberships | **In DB::transaction:**<br>1. Normalize field aliases (`sex` -> `gender`).<br>2. Validate core and details payloads.<br>3. Create `Patient`.<br>4. Create `PatientDetail`.<br>5. Sync memberships.<br>6. Attach to `PatientAccount` pivot.<br>7. Invalidate cache `mobile:patients:account:{id}`. |
| `show` | `GET /api/mobile/patients/{id}` | `auth:sanctum`<br>`patient.account` | `200`, `404` | Route `id` | Returns single patient with details and memberships. |
| `update` | `PUT /api/mobile/patients/{id}` | `auth:sanctum`<br>`patient.account` | `200`, `404`, `422` | Demographic fields | Updates `Patient` and `PatientDetail`, clears cache. |

#### 2. Client Dependencies
- **Flutter Mobile:**
  - Consuming files: `mobile/lib/services/mobile_api.dart` (`patients`), `mobile/lib/models/patient_profile.dart`.
  - Dependent JSON structure: Expects array of patients with nested `details` and `memberships` arrays.

#### 3. Target Extraction Blueprint
Move composite validation into `StoreMobilePatientRequest` and `UpdateMobilePatientRequest`. Move patient creation and cache clearing into `MobilePatientProfileService`.

---

### CYCLE 8: `Mobile/PatientAccountAuthController.php`

- **File Path:** `backend/app/Http/Controllers/Mobile/PatientAccountAuthController.php` (256 lines)
- **Role:** Flutter mobile patient authentication, account registration, password management, and mobile Google SSO.

#### 1. Current Behavior & Route Mapping
| Action | HTTP Verb & URI | Middleware | Status Code | Inputs & Validation Rules | Side Effects & Order |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `register` | `POST /api/mobile/register` | Public | `201`, `422` | `name`, `email` (unique:patient_accounts), `phone` (09 regex), `password` (min:8, confirmed) | 1. Validate inputs.<br>2. Create `PatientAccount`.<br>3. Issue Sanctum token `mobile`.<br>4. Return `{ account, token, token_type: 'Bearer' }`. |
| `login` | `POST /api/mobile/login` | `throttle:login` | `200`, `422` | `email`, `password` | 1. Validate.<br>2. Verify password.<br>3. Check `is_active` (422).<br>4. Update `last_login_at`.<br>5. Issue token `mobile`. |
| `me` | `GET /api/mobile/me` | `auth:sanctum`<br>`patient.account` | `200` | None | Returns cached account with `patients.details` and `patients.memberships` (5 mins). |
| `update` | `PATCH /api/mobile/me` | `auth:sanctum`<br>`patient.account` | `200`, `422` | `name`, `phone` (09 regex) | Updates account, clears cache `mobile:account:me:{id}`. |
| `logout` | `POST /api/mobile/logout` | `auth:sanctum`<br>`patient.account` | `200` | None | Deletes current token. |
| `logoutOtherDevices`| `POST /api/mobile/logout-other-devices` | `auth:sanctum`<br>`patient.account` | `200` | None | Deletes all tokens except current. |
| `changePassword` | `POST /api/mobile/change-password` | `auth:sanctum`<br>`patient.account` | `200`, `422` | `current_password`, `password` (min:8, confirmed) | Checks current password, hashes new password, revokes other tokens. |
| `deleteAccount` | `DELETE /api/mobile/me` | `auth:sanctum`<br>`patient.account` | `200`, `422` | `password`: required | Validates password, marks account inactive, revokes all tokens. |
| `googleLogin` | `POST /api/mobile/auth/google` | `throttle:20,1` | `200`, `201`, `401`, `403` | `credential`: required | Verifies Google ID token, finds existing patient account or auto-provisions, issues token. |

#### 2. Client Dependencies
- **Flutter Mobile:**
  - Consuming file: `mobile/lib/services/mobile_api.dart`.
  - Dependent JSON structure: Expects `{ "token": "...", "account": { "id": 1, "name": "...", "email": "..." } }`.

#### 3. Target Extraction Blueprint
```
backend/app/
├── Http/
│   ├── Requests/Mobile/Auth/
│   │   ├── MobileRegisterRequest.php
│   │   ├── MobileLoginRequest.php
│   │   ├── MobileUpdateAccountRequest.php
│   │   ├── MobileChangePasswordRequest.php
│   │   └── MobileGoogleLoginRequest.php
│   └── Resources/Mobile/Auth/
│       └── PatientAccountResource.php
└── Services/Mobile/
    ├── PatientAccountAuthService.php   <-- Registration, login, token management, cache invalidation
    └── PatientAccountGoogleSsoService.php
```

---

## 4. Contract Invariance Checklist (Strict Guarantees)

During all 8 cycles, Person 1 will strictly uphold these contract invariants:

1. **`/api/login` vs `/api/me` Shape Invariance:**
   - `POST /api/login` **must** return `{ "user": { ... }, "token": "...", "token_type": "Bearer" }`.
   - `GET /api/me` **must** return a **flat** JSON object: `{ "id": 1, "name": "...", "email": "...", "clinic": { ... } }`.
2. **Mobile API Path Invariance:**
   - Mobile endpoints reside under `/api/mobile/*` and must never have route parameters or prefixes changed.
3. **Regex Invariance:**
   - Phone numbers must consistently use `/^09\d{9}$/` with custom error message: `"Mobile number must start with 09 and contain 11 digits."`.
4. **Token Revocation Invariance:**
   - In `updateProfile`, `changePassword`, and `deleteAccount`, changing credentials must continue to revoke tokens across other devices.
5. **Audit Trail Invariance:**
   - `AuditLog::logLogin()` and `AuditLog::logLogout()` must be invoked with identical parameters in identical sequence.

---

## 5. Person 1 Progress & Verification Matrix

| Cycle | Controller | Characterization Test Status | FormRequest Extracted | Service Extracted | Resource Extracted | Thin Controller | Full Test Suite Pass | Verified in React & Flutter |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C1** | `AuthController.php` | [x] PASS (12/12) | [x] | [x] | [x] | [x] (75 LOC) | [x] (22/22) | [x] Verified |
| **C2** | `StaffSignatureController.php` | [x] PASS (9/9) | N/A (GET only) | [x] | [x] | [x] (48 LOC) | [x] (31/31) | [x] Verified |
| **C3** | `PatientAccessController.php` | [x] PASS (8/8) | N/A (Route model binding) | [x] | N/A (Standard Message) | [x] (40 LOC) | [x] (39/39) | [x] Verified |
| **C4** | `StaffInvitationController.php` | [x] PASS (12/12) | [x] | [x] | [x] | [x] (60 LOC) | [x] (51/51) | [x] Verified |
| **C5** | `PatientInvitationController.php` | [x] PASS (12/12) | [x] | [x] | [x] | [x] (83 LOC) | [x] (63/63) | [x] Verified |
| **C6** | `UserController.php` | [x] PASS (13/13) | [x] | [x] | [x] | [x] (134 LOC) | [x] (76/76) | [x] Verified |
| **C7** | `Mobile/PatientProfileController.php` | [x] PASS (9/9) | [x] | [x] | [x] | [x] (55 LOC) | [x] (85/85) | [x] Verified |
| **C8** | `Mobile/PatientAccountAuthController.php` | [x] PASS (13/13) | [x] | [x] | [x] | [x] (86 LOC) | [x] (98/98) | [x] Verified |
