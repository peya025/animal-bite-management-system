# Assignment 1 — Authentication & Access Security (Revised)

**System:** Animal Bite Management System  
**Branch:** `security-fix/auth-and-access`  
**Audit source:** `tasks/pre_deployment_system_change_audit.md`  
**Priority items:** P0-1 · P0-2 · P0-3 · P0-4 · Authorization & IDOR Hardening (+ supporting P1-2, P1-3)  
**Estimated complexity:** High — involves backend routes, authorization policies, middleware, config, and frontend changes  

---

## Objective

Lock down entry points and resource access across the application so that an attacker or unauthorized user discovering the demo URL **cannot create privileged accounts, steal tokens from URLs, access records across patients/clinics (IDOR), use expired tokens, or brute-force credentials**.

This assignment covers:
1. Complete elimination of public self-registration from production routes.
2. Removal of token-in-URL authentication on the print route, reinforced with **explicit authorization policies** (preventing IDOR).
3. Runtime Sanctum token expiration with safe multi-session revocation logic.
4. Purpose-specific rate limiters tailored to endpoint risk profiles.
5. Strict developer-route gating using both environment and config flags.
6. Fail-closed CORS configuration and standard HTTP security headers.
7. Comprehensive authorization and privilege-escalation automated tests.

All work must be done on a dedicated `security-fix/auth-and-access` branch. **Do not push directly to `main`.**

---

## Scope

| Area | Files / Concepts |
|---|---|
| Public registration route | `backend/routes/api.php`, `AuthController::register()` |
| Print route auth & authorization | `PrintController::enrolment()`, `PatientPolicy.php`, `backend/routes/api.php` |
| Sanctum token expiry & revocation | `backend/config/sanctum.php`, user controllers, password reset flow |
| Rate limiting by endpoint type | `backend/routes/api.php`, `bootstrap/app.php` or `AppServiceProvider.php` |
| Developer route isolation | `backend/routes/api.php`, `backend/config/app.php` |
| CORS & security headers | `backend/config/cors.php`, `SecurityHeaders` middleware |
| Frontend print flow | `frontend/src` — authenticated blob print handling |
| Authorization tests | `backend/tests/Feature/Auth/`, `backend/tests/Feature/Print/` |

---

## Step-by-Step Tasks

### TASK 1 — Completely eliminate public self-registration in production (P0-1)

**Goal:** In production, the `/api/register` route does not exist (returns HTTP 404). Staff creation is strictly handled by authenticated administrators via invitations.

1. In `backend/config/app.php`, declare the flag:
   ```php
   'public_registration_enabled' => env('PUBLIC_REGISTRATION_ENABLED', false),
   ```
2. In `backend/routes/api.php`, register the route **only** when the flag is enabled:
   ```php
   if (config('app.public_registration_enabled', false)) {
       Route::post('/register', [AuthController::class, 'register']);
   }
   ```
3. In `AuthController::register()`, keep an internal guard as a defense-in-depth measure:
   ```php
   if (!config('app.public_registration_enabled', false)) {
       abort(404);
   }
   ```
4. In `.env.example`, ensure `PUBLIC_REGISTRATION_ENABLED=false` is documented with a warning that it must remain `false` for staging, demo, and production.
5. Verify the existing administrator staff-invitation workflow (`/api/admin/invitations` or equivalent) is the sole operational mechanism for provisioning staff accounts.
6. Write PHPUnit tests in `backend/tests/Feature/Auth/PublicRegistrationTest.php`:
   - `test_registration_returns_404_when_disabled()` — POST `/api/register` returns 404.
   - `test_admin_staff_invitation_remains_functional()` — Authenticated admin can successfully issue an invitation.

---

### TASK 2 — Secure and authorize the print route (P0-2 & IDOR Protection)

**Goal:** The print route rejects tokens in query strings and strictly enforces patient-level authorization via a Laravel Policy, ensuring no user can view or print records belonging to another patient or clinic.

#### 2a. Remove `?token=` from backend and require `auth:sanctum`
1. Open `backend/app/Http/Controllers/PrintController.php` and remove any manual token lookup via `PersonalAccessToken::findToken($request->query('token'))`.
2. Move print routes under `auth:sanctum`.

#### 2b. Add Authorization Policy (`PatientPolicy@printEnrolment`)
1. In `backend/app/Policies/PatientPolicy.php` (create if needed), define the authorization check:
   ```php
   public function printEnrolment(User $user, Patient $patient): bool
   {
       // 1. Staff check: user belongs to the same clinic and has clinical/administrative role
       if (in_array($user->role, ['admin', 'doctor', 'nurse'])) {
           return (int) $user->clinic_id === (int) $patient->clinic_id;
       }

       // 2. Patient self-service check (if patients have accounts):
       if ($user->role === 'patient') {
           return (int) $user->patient_id === (int) $patient->id;
       }

       return false;
   }
   ```
2. Apply the policy middleware to the route in `backend/routes/api.php`:
   ```php
   Route::middleware(['auth:sanctum', 'can:printEnrolment,patient'])->group(function () {
       Route::get('/print/patient/{patient}/enrolment', [PrintController::class, 'enrolment']);
   });
   ```

#### 2c. Update frontend to use authenticated blob download
1. In `frontend/src`, locate any window open or anchor tag pointing to `/api/print/.../?token=...`.
2. Convert to an authenticated blob download:
   ```ts
   const response = await apiClient.get(`/print/patient/${patientId}/enrolment`, {
     responseType: 'blob',
   });
   const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
   window.open(blobUrl, '_blank');
   ```

#### 2d. Invalidate prior tokens
1. Document and execute token revocation on the demo database:
   ```bash
   php artisan tinker --execute="Laravel\Sanctum\PersonalAccessToken::truncate();"
   ```

---

### TASK 3 — Enforce server-side Sanctum token expiry with safe revocation (P0-3)

**Goal:** Sanctum rejects expired tokens at runtime (returning 401). Credential changes safely revoke active tokens.

1. In `backend/config/sanctum.php`, configure expiration:
   ```php
   'expiration' => env('SANCTUM_TOKEN_EXPIRY_MINUTES', 1440), // 24 hours
   ```
2. Add `SANCTUM_TOKEN_EXPIRY_MINUTES=1440` to `.env.example`.
3. Add automatic pruning for stale database records in `routes/console.php`:
   ```php
   Schedule::command('sanctum:prune-expired --hours=24')->daily();
   ```
   *(Note: Pruning cleans up the database; runtime 401 checks are enforced independently by Sanctum on every request based on `created_at`.)*
4. Safe token revocation logic:
   - **Account deactivation / suspension:** Revoke all tokens:
     ```php
     $user->tokens()->delete();
     ```
   - **Password change / reset:**
     ```php
     // Invalidate all existing sessions on password change for security
     $user->tokens()->delete();
     ```
     *(Invalidating all sessions guarantees that if a credential was leaked or compromised, all sessions are immediately booted.)*

---

### TASK 4 — Tailor rate limiters to specific endpoint risk profiles (P0-4)

**Goal:** Protect authentication and account flows against brute force, enumeration, and denial-of-service without causing collateral throttling across distinct actions.

1. Define dedicated rate limiters in `bootstrap/app.php` or `AppServiceProvider.php`:
   ```php
   use Illuminate\Cache\RateLimiting\Limit;
   use Illuminate\Support\Facades\RateLimiter;
   use Illuminate\Http\Request;

   // 1. Staff & Patient Login: strict per-account and per-IP limit
   RateLimiter::for('login', function (Request $request) {
       return [
           Limit::perMinute(5)->by($request->input('email') . '|' . $request->ip()),
           Limit::perMinute(20)->by($request->ip()),
       ];
   });

   // 2. Password Reset: lower volume, longer window to prevent email flooding
   RateLimiter::for('password-reset', function (Request $request) {
       return [
           Limit::perHour(3)->by($request->input('email') . '|' . $request->ip()),
           Limit::perHour(10)->by($request->ip()),
       ];
   });

   // 3. Invitation Activation: prevent token-guessing attempts
   RateLimiter::for('invite-activation', function (Request $request) {
       return [
           Limit::perMinute(5)->by($request->ip()),
       ];
   });
   ```

2. Apply the individual limiters to their respective routes in `backend/routes/api.php`:
   ```php
   Route::middleware('throttle:login')->group(function () {
       Route::post('/login', [AuthController::class, 'login']);
       Route::post('/patient-login', [AuthController::class, 'patientLogin']);
   });

   Route::middleware('throttle:password-reset')->group(function () {
       Route::post('/password/email', [ForgotPasswordController::class, 'sendResetLinkEmail']);
       Route::post('/password/reset', [ForgotPasswordController::class, 'reset']);
   });

   Route::middleware('throttle:invite-activation')->group(function () {
       Route::post('/invite/activate', [InviteController::class, 'activate']);
   });
   ```

3. Ensure uniform responses: failed login attempts must return generic `Invalid credentials.` (401) to prevent user enumeration.

---

### TASK 5 — Defense-in-depth gating for developer routes (P1-2)

**Goal:** Developer endpoints are completely excluded unless running in a local/testing environment **AND** explicitly enabled via configuration.

1. Add configuration in `backend/config/app.php`:
   ```php
   'developer_tools_enabled' => env('DEVELOPER_TOOLS_ENABLED', false),
   ```
2. In `backend/routes/api.php`, gate the route group with both conditions:
   ```php
   if (
       app()->environment(['local', 'testing']) &&
       config('app.developer_tools_enabled', false)
   ) {
       Route::middleware(['auth:sanctum', 'role:developer'])->prefix('developer')->group(function () {
           // developer maintenance & introspection routes
       });
   }
   ```
3. Set `DEVELOPER_TOOLS_ENABLED=false` in `.env.example`.
4. Ensure no user with `role => 'developer'` is seeded in the demo environment.

---

### TASK 6 — Fail-closed CORS & security headers (P1-3)

**Goal:** Only the explicit `FRONTEND_URL` origin is allowed. If `FRONTEND_URL` is omitted, the configuration fails closed without falling back to `localhost`.

1. Update `backend/config/cors.php`:
   ```php
   'allowed_origins' => array_filter([
       env('FRONTEND_URL'),
   ]),
   'allowed_origins_patterns' => [],
   'supports_credentials' => false,
   ```
   *(For local development, `FRONTEND_URL=http://localhost:5173` is explicitly defined in `backend/.env`.)*

2. Create `backend/app/Http/Middleware/SecurityHeaders.php`:
   ```php
   public function handle(Request $request, Closure $next): Response
   {
       $response = $next($request);
       $response->headers->set('X-Content-Type-Options', 'nosniff');
       $response->headers->set('X-Frame-Options', 'DENY');
       $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
       $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
       return $response;
   }
   ```
3. Register the middleware in `bootstrap/app.php`.

---

## Verification Plan

### Automated Tests (`backend/tests/Feature/`)

Run targeted feature tests covering authentication, authorization, and rate limiting:

```bash
cd backend
php artisan test --filter=PublicRegistrationTest
php artisan test --filter=PrintAuthAndAuthorizationTest
php artisan test --filter=TokenExpiryAndRevocationTest
php artisan test --filter=RateLimitersTest
php artisan test --filter=RoleAuthorizationTest
```

#### Detailed Test Scenarios:

1. **`PublicRegistrationTest`**:
   - `test_registration_returns_404_when_disabled()`: POST `/api/register` receives 404.
2. **`PrintAuthAndAuthorizationTest`**:
   - `test_unauthenticated_request_cannot_print()`: Expect 401.
   - `test_print_rejects_token_in_query_string()`: `?token=...` is ignored; receives 401.
   - `test_user_cannot_print_patient_from_another_clinic()`: Authenticated staff from Clinic A trying to print Patient from Clinic B receives 403.
   - `test_patient_cannot_print_another_patient_record()`: Authenticated Patient 1 trying to print Patient 2 receives 403.
   - `test_authorized_staff_can_print_clinic_patient()`: Authenticated nurse in same clinic receives 200 (PDF/stream).
3. **`TokenExpiryAndRevocationTest`**:
   - `test_token_rejected_after_25_hours()`: Travel 25 hours forward; request to `/api/me` receives 401.
   - `test_password_change_invalidates_all_tokens()`: After password change, previously issued token receives 401.
   - `test_disabled_user_tokens_are_revoked()`: Deactivating a staff user immediately revokes access.
4. **`RateLimitersTest`**:
   - `test_login_throttled_after_5_failures()`: 6th POST `/api/login` receives 429.
   - `test_password_reset_throttled_independently()`: 4th POST `/api/password/reset` receives 429.
5. **`RoleAuthorizationTest`**:
   - `test_nurse_cannot_access_admin_endpoints()`: Nurse accessing `/api/admin/users` receives 403.
   - `test_developer_routes_return_404_when_flag_disabled()`: Developer route returns 404 in non-dev environment.

### Manual Verification (Deployed URL)

| Check | Test Command / Action | Expected Result |
|---|---|---|
| Registration disabled | `curl -i -X POST https://API/api/register` | HTTP 404 |
| URL token blocked | `curl -i "https://API/api/print/patient/1/enrolment?token=abc"` | HTTP 401 |
| Cross-clinic IDOR blocked | Request patient record belonging to another clinic | HTTP 403 |
| Expired token | Make API call with 25-hour-old bearer token | HTTP 401 |
| Login throttle | Send 6 rapid incorrect login attempts | 6th attempt returns 429 |
| Password reset throttle | Send 4 rapid reset requests | 4th attempt returns 429 |
| CORS closed | Send request from unauthorized origin | Blocked by CORS |
| Developer routes off | `curl -i https://API/api/developer/tables` | HTTP 404 |
| Security headers | `curl -I https://API/api/health` | Headers contain `nosniff`, `DENY` |

---

## Success Criteria

- [ ] `POST /api/register` returns **404** in staging/demo/production.
- [ ] `GET /api/print/patient/{patient}/enrolment` requires `auth:sanctum` and enforces `PatientPolicy@printEnrolment` (cross-clinic/cross-patient access returns 403).
- [ ] Query string `?token=` cannot authenticate print requests.
- [ ] Sanctum token expiration is active (tokens older than 1,440 minutes return 401).
- [ ] Password change invalidates active tokens.
- [ ] Separate rate limiters (`throttle:login`, `throttle:password-reset`, `throttle:invite-activation`) are active.
- [ ] Developer routes return 404 unless both environment is local/testing AND `developer_tools_enabled` is true.
- [ ] `allowed_origins` uses `array_filter([env('FRONTEND_URL')])` with no localhost fallback in code.
- [ ] All new authentication and authorization feature tests pass.
- [ ] Full `php artisan test` suite exits with 0 failures.
