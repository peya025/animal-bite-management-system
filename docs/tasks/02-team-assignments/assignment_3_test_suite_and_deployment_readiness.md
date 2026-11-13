# Assignment 3 � Test Suite Fixes & Deployment Readiness

**System:** Animal Bite Management System  
**Branch:** `security-fix/test-and-deploy`  
**Audit source:** `tasks/pre_deployment_system_change_audit.md`  
**Priority items:** P0-5 � P0-8 (+ P2 reliability/deployment changes)  
**Estimated complexity:** Medium-High � involves test debugging, dependency upgrades, and infrastructure configuration  

---

## Objective

Bring the automated test suite to **zero failures**, update all production dependencies to eliminate known vulnerabilities, and establish the deployment configuration so the application can be safely hosted at a public URL for an instructor demo. This assignment is the final gate before the system goes online.

All work must be done on a dedicated `security-fix/test-and-deploy` branch. **Do not push directly to `main`.**

---

## Scope

| Area | Files/Concepts |
|---|---|
| Failed PHPUnit tests | `backend/tests/Feature/` � all 6 currently failing test areas |
| PHP dependency vulnerabilities | `backend/composer.lock`, `backend/composer.json` |
| JS dependency vulnerabilities | `frontend/package-lock.json`, `frontend/package.json` |
| Frontend hosting | `frontend/dist`, Vite env variables, Render static site config |
| Queue/scheduler | Laravel queue worker, scheduled commands |
| CORS / env config | `backend/.env`, `frontend/.env.production` |
| HTTP security | HTTPS enforcement, security headers |
| Demo seeder | `backend/database/seeders/` |
| Database migrations | Reliable one-time migration process |
| Health endpoint | `backend/routes/api.php` |

---

## Step-by-Step Tasks

### TASK 1 � Fix all six failing automated tests (P0-8)

Run the full test suite first to confirm the current failures:

```bash
cd backend
php artisan test
```

Then fix each failing area in order:

---

#### 1a. Admin user management � null `signature_path` on new intake nurse

**Observed:** A newly created intake nurse has a null `signature_path` where the test expects a default.

1. Decide the intended business rule: Does a new intake nurse get a default placeholder signature, or is the signature allowed to be null until they upload one?
2. If a default is required, add it to the factory or the `AuthController::register` / staff creation logic:
   ```php
   'signature_path' => $request->input('signature_path', 'signatures/default_placeholder.png'),
   ```
3. If null is acceptable, update the test to assert `null` or use `assertNull()`.
4. Update the staff-creation factory in `database/factories/UserFactory.php` accordingly.
5. Ensure the test covers both: "new nurse has no signature" and "nurse signature is required before they can record treatment."

---

#### 1b. Dose administration / void-re-record � returning 422 "Select a Doctor-approved bite episode"

**Observed:** Test fixtures do not satisfy the approval prerequisite added to the validation.

1. Open the failing test files in `backend/tests/Feature/`.
2. Locate the approval prerequisite in the controller validation: find the condition that checks for a doctor-approved bite episode.
3. Update the test fixtures to include a properly approved bite episode **before** calling the dose-administration endpoint:
   ```php
   // In setUp or the test itself:
   $biteEpisode = BiteEpisode::factory()->create([
       'patient_id' => $patient->id,
       'doctor_approved' => true,
       'approved_at' => now(),
   ]);
   ```
4. Add tests that explicitly cover both the **approved path** (expect 201) and the **rejected/unapproved path** (expect 422 with the correct message).
5. If the 422 is unintentional (a bug introduced by a recent change), trace the validation logic and fix it.

---

#### 1c. Nurse without signature � approval validation fires before signature check

**Observed:** The signature check is never reached because the bite approval validation fails first.

1. This is likely a test fixture ordering problem: the test does not provide an approved bite episode (same issue as 1b), so it fails earlier than intended.
2. Fix the fixture (add an approved bite episode), then re-run to confirm the signature check is now reachable.
3. Once the signature check fires, assert the response body contains the signature-related error message.
4. Add two test cases: "nurse with no signature is rejected" and "nurse with signature and approved bite succeeds."

---

#### 1d. Mobile booster booking � `has_completed_primary` field missing

**Observed:** Expected field `has_completed_primary: false` is missing from the API response.

1. Find the controller action that handles booster booking and check what fields it returns.
2. Add `has_completed_primary` to the response:
   ```php
   return response()->json([
       // ... existing fields ...
       'has_completed_primary' => $patient->hasCompletedPrimarySeries(),
   ]);
   ```
3. Implement `hasCompletedPrimarySeries()` on the `Patient` model if it does not exist (check the patient's treatment records for the full primary series of doses).
4. Update the test to cover both states:
   - `test_booster_response_includes_has_completed_primary_false()` � Patient has not finished primary series.
   - `test_booster_response_includes_has_completed_primary_true()` � Patient has completed primary series.

---

#### 1e. Vaccination card / booster � booking returns 422 where 201 is expected

**Observed:** A business rule or fixture mismatch causes the booking to be rejected.

1. Read the 422 response body in the test output to identify the failing validation rule.
2. Either:
   - Fix the test fixture to satisfy the business rule (if the rule is correct), or
   - Fix the business rule/controller if the rule is incorrect or overly strict.
3. Also verify the vaccination-card visibility rule: confirm that a patient who has completed the required doses can see their vaccination card in the UI (check the API endpoint that controls card visibility).
4. Add tests:
   - `test_booster_booking_returns_201_for_eligible_patient()`
   - `test_booster_booking_returns_422_for_ineligible_patient_with_reason()`
   - `test_vaccination_card_visible_after_completed_series()`

---

### TASK 2 � Update PHP dependencies to eliminate vulnerabilities (P0-5)

**Goal:** `composer audit --locked` returns no applicable production advisories.

1. Create a fresh branch from the current one for dependency updates (can be the same `security-fix/test-and-deploy` branch).
2. Check current locked advisories:
   ```bash
   cd backend
   composer audit --locked
   ```
3. Update affected packages one group at a time to preserve Laravel 12 compatibility:
   ```bash
   composer update guzzlehttp/guzzle guzzlehttp/psr7 --with-dependencies
   composer update league/commonmark --with-dependencies
   ```
4. After each update, run:
   ```bash
   composer audit --locked   # Must return zero advisories for updated packages
   php artisan test          # Must pass with 0 failures
   ```
5. Target versions (minimum � use latest compatible):
   - `guzzlehttp/guzzle`: = 7.15.2
   - `guzzlehttp/psr7`: = 2.12.3
   - `league/commonmark`: = 2.10.0
6. Commit only `composer.lock` and `composer.json` changes. Document which advisories remain (if any) and their CVE IDs with a written justification if they are judged non-exploitable.

---

### TASK 3 � Update JavaScript dependencies to eliminate vulnerabilities (P0-5)

**Goal:** `npm audit --omit=dev` returns no applicable production vulnerabilities.

1. Check current state:
   ```bash
   cd frontend
   npm audit --omit=dev
   ```
2. Update affected packages:
   ```bash
   npm update nanoid postcss --save
   ```
3. For `react-router-dom` / `react-router` (moderate advisories, currently 6.30.4):
   - This is a potential major-version migration (React Router 7.x). **Plan this separately.**
   - Check if upgrading to the latest React Router v6 patch fixes the moderate advisories first.
   - If a v7 migration is required, test all routes thoroughly � React Router v7 introduced breaking changes.
   - Run `npm run build` and test all navigation flows after upgrade.
4. After all updates:
   ```bash
   npm audit --omit=dev       # Target: no high/critical vulnerabilities
   npm run build              # Must succeed with 0 errors
   ```
5. Target versions (minimum):
   - `nanoid`: = 3.3.18
   - `postcss`: = latest patched version beyond 8.5.22
   - `react-router-dom`: latest stable React Router v6 patch, or v7 if required

---

### TASK 4 � Set up the demo deployment (P2 � hosting and infrastructure)

**Goal:** The application serves correctly from a public HTTPS URL with only synthetic data.

#### 4a. Frontend hosting (static site + SPA rewrite)

1. Confirm the correct Vite environment variable name is `VITE_API_BASE_URL` (not `VITE_API_URL`).
2. In `frontend/.env.production` (or Render environment settings):
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```
3. On Render, create a **Static Site** service for the frontend:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add a rewrite rule: `/* ? /index.html` (required for React Router SPA).
4. Do NOT serve the frontend from the Laravel backend. Use a separate static host.

#### 4b. Queue worker (background jobs)

1. Determine which features rely on queued jobs (email reminders, appointment notifications, etc.).
2. On Render, add a **Background Worker** service running:
   ```bash
   php artisan queue:work --sleep=3 --tries=3 --max-time=3600
   ```
3. If a persistent queue worker is not feasible on the free tier, **disable or clearly label** any background-dependent features in the demo UI (e.g., "Email reminders are not active in the demo").
4. Do not claim features work when the queue worker is not running.

#### 4c. Scheduler (cron jobs)

1. The following scheduled tasks must run for the demo to be consistent:
   - `sanctum:prune-expired` (from Assignment 1) � daily
   - Appointment recall/reminder generation � per clinic schedule
   - Any token/session cleanup
2. On Render (free tier), use the **Cron Job** service or an external cron trigger (e.g., cron-job.org) to call:
   ```bash
   php artisan schedule:run
   ```
   every minute.
3. Verify the scheduler runs by checking the output in Render logs after the first trigger.

#### 4d. Database migrations � reliable one-time process

1. **Do not** auto-run migrations in the start command (`php artisan migrate --force` in the Procfile). This is fragile.
2. Instead, run migrations **once** as a separate deploy step or Render pre-deploy command:
   ```bash
   php artisan migrate --force
   ```
3. Before running migrations on the hosted database, take a backup:
   ```bash
   mysqldump -h HOST -u USER -p DB_NAME > backup_$(date +%Y%m%d).sql
   ```
4. Have a rollback plan: keep the previous release tag and know the rollback migration command.

#### 4e. Demo database seeder (synthetic data only)

1. Create or review `backend/database/seeders/DemoSeeder.php`.
2. The seeder must:
   - Create one clinic with synthetic name/address (no real data).
   - Create one admin user with a **non-default, non-guessable password** stored in `.env` (not in code).
   - Create several staff users (nurse, doctor) with synthetic names.
   - Create a small set of synthetic patient records with synthetic bite incidents.
   - Create vaccine inventory with a realistic synthetic batch.
   - **Not** create a `developer` role user.
3. After seeding, force a password change flag on all demo accounts so a real password is set before use.
4. Document: "Only run `php artisan db:seed --class=DemoSeeder` on a fresh database. Never on production with real data."

#### 4f. Add a generic health check endpoint

1. In `backend/routes/api.php`, add a public health route (no auth required):
   ```php
   Route::get('/health', function () {
       return response()->json([
           'status' => 'ok',
           'timestamp' => now()->toISOString(),
       ]);
   });
   ```
2. Use this endpoint in Render's **Health Check URL** setting.
3. Verify it returns 200 after deployment with `curl https://your-api.onrender.com/api/health`.

#### 4g. Environment and HTTPS

1. Ensure `APP_ENV=production` and `APP_DEBUG=false` in the production `.env`. Debug mode must never be enabled on a public URL.
2. Confirm HTTPS is enforced at the Render/proxy level (Render provides HTTPS automatically for web services).
3. In `AppServiceProvider.php`, force HTTPS in production:
   ```php
   if (app()->environment('production')) {
       URL::forceScheme('https');
   }
   ```
4. Set `SESSION_SECURE_COOKIE=true` and `SESSION_COOKIE_SAMESITE=lax` in `.env`.

---

### TASK 5 � Deployment verification checklist

After deploying, run through each item manually on the live URL:

| # | Check | How | Expected |
|---|---|---|---|
| 1 | HTTPS enforced | Open `http://` URL in browser | Redirects to `https://` |
| 2 | Health endpoint | `curl https://API/api/health` | `{"status":"ok"}` |
| 3 | CORS correct | Open frontend, check network tab for CORS errors | No CORS errors |
| 4 | Login works | Log in as admin with demo credentials | Redirected to dashboard |
| 5 | Role-based access | Log in as nurse, attempt admin route | Redirected/denied |
| 6 | Rate limiting live | 6� rapid login attempts | 429 on 6th |
| 7 | Token expiry | Issue token, wait >24h, call API | 401 |
| 8 | No developer tools | GET `/api/developer/anything` | 404 |
| 9 | No public registration | POST `/api/register` | 403 |
| 10 | Print URL token blocked | GET `/api/print/patient/1/enrolment?token=abc` | 401 |
| 11 | Normal workflow | Full demo walkthrough (intake ? treatment ? vaccination) | No errors |
| 12 | Logs have no sensitive data | Check Render log stream | No passwords/tokens in logs |
| 13 | Teardown date documented | `tasks/demo_free_hosting_deployment_plan.md` | Teardown date set |

---

## Verification Plan

### Automated (run before PR merge)

```bash
cd backend

# Fix all failing tests (must pass before this assignment is done)
php artisan test   # Must exit 0 with 0 failures

# Dependency audits
composer audit --locked   # Must return 0 advisories

cd ../frontend
npm audit --omit=dev      # Must return 0 high/critical vulnerabilities
npm run build             # Must succeed with 0 errors
```

### Final Pre-Deployment Run

```bash
cd backend
php artisan test           # 0 failures
composer audit --locked    # 0 advisories
cd ../frontend
npm audit --omit=dev       # 0 high/critical
npm run build              # Build succeeds
```

---

## Release Checklist (this assignment)

- [x] `php artisan test` passes with **zero failures** (45 passed, 179 assertions)
- [x] All 6 previously failing test areas are resolved and covered by targeted tests
- [x] New tests added for P0-1 through P0-7 controls (from Assignments 1 & 2)
- [x] `composer audit --locked` returns **no applicable advisories** (0 advisories)
- [x] `npm audit --omit=dev` returns **no high/critical production vulnerabilities** (0 high, 0 critical)
- [x] `npm run build` succeeds (TypeScript compilation + Vite packaging cleanly passes)
- [x] `VITE_API_BASE_URL` is used (not `VITE_API_URL`)
- [x] Frontend is deployed as a static site with SPA rewrite rule (_redirects & config templates)
- [x] Queue worker is running or background features are labeled as inactive
- [x] Scheduler is configured and verified in Render logs
- [x] Migrations run **once** via pre-deploy command, not on every app start
- [x] Demo database contains **only synthetic data** - no real patient names, addresses, or health records
- [x] No `developer` user exists in the demo database
- [x] `APP_DEBUG=false` and `APP_ENV=production` in production `.env`
- [x] Health check endpoint responds with 200 (/api/health)
- [x] Full deployment verification checklist above has been run and passed
- [x] Teardown date is documented in `tasks/demo_free_hosting_deployment_plan.md`

---

## Important Notes

> **This assignment cannot be merged until Assignments 1 and 2 are also complete.** The full test suite (including tests added for P0-1 through P0-7) must pass together.

> **Do not deploy with real patient data.** Use only the synthetic demo seeder. Even for a demo, health records are sensitive data subject to privacy regulations.

> **The free-tier Render environment uses ephemeral storage.** Any file uploads (signatures, logos) will be lost on restart. Disable file uploads for the demo or use a persistent storage service.
