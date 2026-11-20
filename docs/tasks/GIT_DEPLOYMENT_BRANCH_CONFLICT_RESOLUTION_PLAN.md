# ABTC — Safe Git Deployment Branch Conflict Resolution Audit & Plan

**Document Path:** `docs/tasks/GIT_DEPLOYMENT_BRANCH_CONFLICT_RESOLUTION_PLAN.md`  
**Date:** November 20, 2026  
**Audit Status:** Read-Only Audit Completed — Awaiting User Approval Prior to Execution  
**Target Branch:** `deployment`  

---

## 1. Executive Summary & Git Divergence Analysis

A rigorous, read-only Git audit was performed to evaluate the divergence between the local working branch and the upstream remote repository on the `deployment` branch.

### 1.1 Git Topology Summary
* **Local Active Branch:** `deployment`
* **Local HEAD Commit:** `6e208869` (`akoa ni cycy4.5`)
* **Remote Tracking Ref:** `origin/deployment` (`d77075f4` - `reg1 name of prov fixed`)
* **Merge Base Commit:** `f5615cbd118d0795b43584bbffca29a6d905f99e` (`akoa ni cycy`)
* **Divergence Metrics:**
  * **23 commits ahead** of merge base on local `deployment` (Real-time Laravel Reverb WebSockets, Firebase Cloud Messaging [FCM HTTP v1], Railway Queue Worker & Scheduler infrastructure, mobile FCM device token registration).
  * **21 commits behind** (ahead on upstream) on `origin/deployment` (SMTP email integration & characterization tests, Cloudflare R2 cloud file storage, patient online intake check-in vitals modal, vaccination schedule walkthrough tour system, overdue follow-up outreach logs).
* **Working Tree State:** Clean (0 untracked files, 0 uncommitted changes).
* **Merge Preview Method:** Executed three-way tree simulation via `git merge-tree --write-tree --name-only origin/deployment HEAD` and reverse validation.

```
                  ┌── [23 commits] Local HEAD (6e208869) [Reverb + FCM + Workers]
                  │
Merge Base ───────┤ (f5615cb: "akoa ni cycy")
                  │
                  └── [21 commits] origin/deployment (d77075f4) [SMTP + R2 Storage + Walkthrough + Intake Vitals]
```

---

## 2. Comprehensive Conflict & Auto-Merge Inventory

The simulated merge detected exactly **8 conflicting files** and **12 cleanly auto-merging files**.

### 2.1 The 8 Conflicting Files (Requires Manual Guided Resolution)
1. `backend/.env.railway.example` (Environment template: Reverb/FCM variables vs Cloudflare R2 storage variables)
2. `backend/app/Services/Messaging/OutboundDelivery.php` (Messaging dispatcher: FCM push dispatch vs SMTP Email & appointment update event)
3. `backend/composer.lock` (Lockfile: `google/auth` + `laravel/reverb` vs `league/flysystem-aws-s3-v3`)
4. `backend/config/cors.php` (CORS configuration: Comma-delimited origin parsing vs `FRONTEND_URL_ALT` support)
5. `backend/routes/api.php` (API routes: Mobile FCM token routes vs Mobile find-existing, email activity, and followup routes)
6. `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php` (Feature test: Identical migration isolation fix with divergent code comments)
7. `frontend/src/features/patients/pages/PatientListPage.tsx` (React page: Real-time Reverb WebSocket listener vs Online intake check-in modal)
8. `frontend/src/features/vaccinations/pages/VaccinationSchedulePage.tsx` (React page: Recall reason validation & tooltip vs Walkthrough tour attributes & tab query params)

### 2.2 The 12 Auto-Merging Files (Verified Clean Semantic Coexistence)
1. `backend/.env.example` (Clean: local Reverb/FCM variables and remote storage/email variables do not collide)
2. `backend/app/Providers/AppServiceProvider.php` (Clean: local registers `AppointmentStatusChanged` FCM listener; remote registers `AppointmentEmailObserver`)
3. `backend/app/Services/AppointmentReminderService.php` (Clean: local adds test/dryRun flags; remote adds clinic contact formatting)
4. `backend/app/Services/Clinical/BiteIncidentIntakeService.php` (Clean: local dispatches real-time broadcast events; remote adds intake payload vitals support)
5. `backend/app/Services/Clinical/PatientService.php` (Clean: local dispatches real-time queue/appointment events; remote adds online transaction mode)
6. `backend/app/Services/Mobile/MobileAppointmentService.php` (Clean: local broadcasts appointment creation; remote adds queue lock guard)
7. `backend/app/Services/Mobile/PatientAccountAuthService.php` (Clean: local dispatches FCM password change alert; remote dispatches security email)
8. `backend/bootstrap/app.php` (Clean: local adds `withBroadcasting()`; remote adds sanitized QueryException invitation logging)
9. `backend/composer.json` (Clean: local adds `google/auth` & `laravel/reverb`; remote adds `league/flysystem-aws-s3-v3`)
10. `backend/tests/Feature/MessagingIntegrationTest.php` (Clean: local adds in-app recall FCM test; remote configures test SMTP emails)
11. `frontend/src/features/inventory/pages/VaccineInventoryPage.tsx` (Clean: local adds Reverb live stock updates; remote adds window focus listeners)
12. `frontend/src/shared/contexts/AuthContext.tsx` (Clean: local adds `disconnectEcho()` on idle timeout/logout; remote removes welcome modal flag)

---

## 3. File-by-File Conflict Deep-Dive & Resolution Strategies

### File 1: `backend/.env.railway.example`
* **Base State (`f5615cb`):** Standard single-origin `FRONTEND_URL`, synchronous queues (`QUEUE_CONNECTION=sync`), basic SMS placeholders.
* **Local Changes (`6e208869`):**
  * Configures `FRONTEND_URL` comment to explain comma-separated multiple origins.
  * Updates `QUEUE_CONNECTION=database` for the dedicated Railway Queue Worker (`railway/run-worker.sh`).
  * Adds full Laravel Reverb WebSocket section (`BROADCAST_CONNECTION=reverb`, `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_SERVER_HOST`, `REVERB_SERVER_PORT`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`, `REVERB_ALLOWED_ORIGINS`).
  * Adds Firebase Cloud Messaging (FCM HTTP v1) section (`FCM_ENABLED`, `FCM_TEST_MODE`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FCM_ANDROID_CHANNEL_ID`, `FIREBASE_CREDENTIALS_BASE64`, `FIREBASE_CREDENTIALS_JSON`).
* **Remote Changes (`d77075f4`):**
  * Appends Cloud File Storage (Cloudflare R2) section (`FILESYSTEM_DISK=s3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION=auto`, `AWS_BUCKET=abtc-storage`, `AWS_URL`, `AWS_ENDPOINT`, `AWS_USE_PATH_STYLE_ENDPOINT=false`).
* **Preservation Objective:** Retain 100% of both configurations. They manage completely separate infrastructure concerns.
* **Recommended Resolution Strategy:** Union merge. Keep local multi-origin notes, `QUEUE_CONNECTION=database`, Reverb variables, FCM variables, AND remote Cloudflare R2 storage variables.

---

### File 2: `backend/app/Services/Messaging/OutboundDelivery.php`
* **Base State (`f5615cb`):** Standard SMS dispatcher using `SmsManager` and simple raw mailer `Mail::raw()`. Increments appointment reminder count upon success.
* **Local Changes (`6e208869`):**
  * In `deliver(int $id)`: In the `in_app` branch (patient account notification), checks `FcmService::isAccountAllowed()` and account preference `allowsNotificationCategory('appointment_reminder')`, then enqueues `SendFcmPushNotification::dispatch()`.
  * In `finish(...)`: Adds guard `&& ! ($message->context['is_test'] ?? false)` to prevent synthetic test reminders from mutating real appointment counters.
* **Remote Changes (`d77075f4`):**
  * In `deliver(int $id)`: Adds `$isEvent = $message->purpose === 'appointment_update'` validation logic with snapshot comparison via `AppointmentEmailEvents::snapshot()`. Replaces raw mailer with `app(SmtpEmailService::class)->send($message->recipient, new ClinicEmail(...), $message->provider)`.
  * In `finish(...)`: Adds guard `$message->purpose !== 'appointment_update'` so event notification emails don't increment reminder counters.
* **Preservation Objective:** Preserve both FCM push dispatching for mobile reminders and SMTP email delivery with appointment event validation.
* **Recommended Resolution Strategy:**
  1. Add both imports:
     ```php
     use App\Jobs\SendFcmPushNotification;
     use App\Mail\ClinicEmail;
     ```
  2. In `deliver()`: Keep remote's `$isEvent` check and `SmtpEmailService` call for the `email` channel. In the `else` (`in_app`) channel, retain local's FCM push dispatch logic.
  3. In `finish()`: Combine both safety guards:
     ```php
     if ($message->purpose !== 'appointment_update' && in_array($status, ['accepted', 'delivered']) && ! ($message->context['is_test'] ?? false)) {
         Appointment::whereKey($message->appointment_id)->update([
             'reminder_sent_count' => DB::raw('COALESCE(reminder_sent_count, 0) + 1'),
             'last_reminded_at' => now(),
         ]);
     }
     ```

---

### File 3: `backend/composer.lock`
* **Base State (`f5615cb`):** Standard dependencies without Reverb, Google Auth, or AWS S3 Flysystem.
* **Local Changes (`6e208869`):** Added `"google/auth": "^1.55"` and `"laravel/reverb": "^1.13"` to `composer.json` and generated respective lockfile hashes.
* **Remote Changes (`d77075f4`):** Added `"league/flysystem-aws-s3-v3": "^3.0"` to `composer.json` and generated respective lockfile hashes.
* **Preservation Objective:** Maintain all 3 packages (`google/auth`, `laravel/reverb`, `league/flysystem-aws-s3-v3`).
* **Recommended Resolution Strategy:**
  * Do **NOT** attempt manual line-by-line text editing of `composer.lock` (which breaks content-hash verification).
  * In `backend/composer.json`, git auto-merges cleanly with all three packages present.
  * During the merge resolution process, checkout `composer.lock` from either branch, then execute:
    ```bash
    cd backend
    composer update google/auth laravel/reverb league/flysystem-aws-s3-v3 --lock
    # OR run: composer install (if lockfile is refreshed)
    composer validate
    ```
  * This guarantees an internally consistent dependency tree and valid content hash.

---

### File 4: `backend/config/cors.php`
* **Base State (`f5615cb`):**
  ```php
  'allowed_origins' => array_values(array_filter([
      env('FRONTEND_URL'),
  ])),
  ```
* **Local Changes (`6e208869`):** Parses comma-separated origin strings:
  ```php
  'allowed_origins' => array_values(array_filter(
      array_map('trim', explode(',', env('FRONTEND_URL', '')))
  )),
  ```
* **Remote Changes (`d77075f4`):** Adds support for secondary origin `FRONTEND_URL_ALT`:
  ```php
  'allowed_origins' => array_values(array_filter([
      env('FRONTEND_URL'),
      env('FRONTEND_URL_ALT'),
  ])),
  ```
* **Preservation Objective:** Support comma-delimited strings across both primary and alternate domain environment variables without origin duplication.
* **Recommended Resolution Strategy:**
  Integrate both approaches:
  ```php
  'allowed_origins' => array_values(array_unique(array_filter(array_merge(
      array_map('trim', explode(',', env('FRONTEND_URL', ''))),
      array_map('trim', explode(',', env('FRONTEND_URL_ALT', '')))
  )))),
  ```

---

### File 5: `backend/routes/api.php`
* **Base State (`f5615cb`):** Misplaced `use` statements in the middle of the file (lines 160–175) separating public routes and authenticated routes.
* **Local Changes (`6e208869`):**
  * Added `use App\Http\Controllers\Mobile\PatientDeviceTokenController;` at top.
  * In `auth:sanctum` mobile prefix: registered 4 FCM device token & preferences routes:
    ```php
    Route::post('/device-token', [PatientDeviceTokenController::class, 'register']);
    Route::delete('/device-token', [PatientDeviceTokenController::class, 'destroy']);
    Route::get('/notification-preferences', [PatientDeviceTokenController::class, 'preferences']);
    Route::put('/notification-preferences', [PatientDeviceTokenController::class, 'updatePreferences']);
    ```
* **Remote Changes (`d77075f4`):**
  * Cleaned up and moved all mid-file imports to the top of the file.
  * Added imports for `EpisodeFollowupController`, `OutboundMessage`, `SmtpEmailService`, etc.
  * In mobile routes: added `Route::post('/patients/find-existing', [PatientProfileController::class, 'findExisting']);`.
  * In staff routes: added `/staff-invitations` rate-limiting, `/email-activity`, `/email-configuration-status`, patient merge route `/{id}/merge-online-booking`, and episode follow-up outreach routes.
* **Preservation Objective:** Keep all remote endpoints and throttles, all local FCM routes, and clean imports at the top of the file.
* **Recommended Resolution Strategy:**
  1. Organize all imports at the top; remove redundant mid-file `use` declarations.
  2. Inside `Route::middleware('auth:sanctum')->prefix('mobile')->group(...)`, include both remote's `find-existing` and local's four `/device-token` and `/notification-preferences` endpoints:
     ```php
     Route::get('/patients', [PatientProfileController::class, 'index']);
     Route::post('/patients/find-existing', [PatientProfileController::class, 'findExisting']);
     Route::post('/patients', [PatientProfileController::class, 'store']);
     Route::patch('/patients/{patient}', [PatientProfileController::class, 'update']);
     Route::get('/patients/{patient}/vaccination-card', [MobileVaccinationCardController::class, 'show']);

     Route::get('/notifications', [MobileNotificationController::class, 'index']);
     Route::patch('/notifications/read-all', [MobileNotificationController::class, 'markAllAsRead']);
     Route::patch('/notifications/{notification}/read', [MobileNotificationController::class, 'markAsRead']);

     // FCM Device Token Registration & Management
     Route::post('/device-token', [PatientDeviceTokenController::class, 'register']);
     Route::delete('/device-token', [PatientDeviceTokenController::class, 'destroy']);
     Route::get('/notification-preferences', [PatientDeviceTokenController::class, 'preferences']);
     Route::put('/notification-preferences', [PatientDeviceTokenController::class, 'updatePreferences']);
     ```
  3. Retain all remote staff invitation, email activity, followup logs, and role middleware additions.

---

### File 6: `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`
* **Base State (`f5615cb`):** Executed `Artisan::call('migrate:rollback', ['--step' => 1])`.
* **Local Changes (`6e208869`):** Replaced generic rollback with direct migration execution to isolate the test from subsequent migrations:
  ```php
  // 2. Perform rollback of the intended migration directly to avoid rolling back unrelated newer migrations
  $migration = require database_path('migrations/2026_11_11_100000_update_clinic_module_configs_add_stations_and_revision.php');
  $migration->down();
  ```
* **Remote Changes (`d77075f4`):** Replaced generic rollback with the exact same direct migration call:
  ```php
  // Exercise this migration specifically; newer unrelated migrations may follow it.
  $migration = require database_path('migrations/2026_11_11_100000_update_clinic_module_configs_add_stations_and_revision.php');
  $migration->down();
  ```
* **Preservation Objective:** Ensure the migration rollback rehearsal executes reliably regardless of newer migrations.
* **Recommended Resolution Strategy:** The executable code is 100% identical. Retain either comment or combine them into:
  ```php
  // 2. Perform rollback of this migration specifically; newer unrelated migrations may follow it in the sequence.
  $migration = require database_path('migrations/2026_11_11_100000_update_clinic_module_configs_add_stations_and_revision.php');
  $migration->down();
  ```

---

### File 7: `frontend/src/features/patients/pages/PatientListPage.tsx`
* **Base State (`f5615cb`):** Standard patient list with polling timer and returning patient check-in modal.
* **Local Changes (`6e208869`):**
  * Added `useEcho` hook integration and `clinicId` resolution.
  * Added WebSocket subscription to `clinic.{clinicId}.queue` listening for `.appointment.changed` and `.queue.updated` events with reconnection recovery.
* **Remote Changes (`d77075f4`):**
  * Added `OnlineIntakeCheckInModal` import and state `onlineCheckInTarget`.
  * Added handler `handleOpenMobileIntakeCheckIn` to launch the modal when clicking "Check In to Triage" on online mobile intake rows.
  * Added "📱 Send Mobile Portal Invite" button inside Add Patient success dialog.
* **Preservation Objective:** Enable real-time queue synchronization while preserving the online intake check-in vitals modal and mobile portal invite buttons.
* **Recommended Resolution Strategy:**
  1. Top imports: Keep both `useEcho` and `OnlineIntakeCheckInModal`:
     ```tsx
     import { useEcho } from '../../../shared/hooks/useEcho';
     import OnlineIntakeCheckInModal from '../components/OnlineIntakeCheckInModal';
     ```
  2. Component state: Initialize both state hooks:
     ```tsx
     // Returning Patient Reassessment Check-In state
     const [reassessmentCheckInPatient, setReassessmentCheckInPatient] = useState<Patient | null>(null);

     // Online Mobile Booking Intake Check-In state
     const [onlineCheckInTarget, setOnlineCheckInTarget] = useState<{
       patient: Patient;
       intake: any;
     } | null>(null);

     const { clinic: authClinic, user: authUser } = useAuth();
     const { echo, isConnected } = useEcho();
     const userData   = localStorage.getItem('userData');
     const clinicData = localStorage.getItem('clinicData');
     const storedClinic = clinicData ? JSON.parse(clinicData) : null;
     const clinic       = authClinic || storedClinic;
     const clinicId     = clinic?.id ?? authUser?.clinic_id ?? null;
     ```
  3. Keep remote's `handleOpenMobileIntakeCheckIn`, table action buttons, Add Patient modal invite prompt, and `<OnlineIntakeCheckInModal />`.
  4. Keep local's `useEffect` hooks for Reverb channel listening and reconnection catching-up.

---

### File 8: `frontend/src/features/vaccinations/pages/VaccinationSchedulePage.tsx`
* **Base State (`f5615cb`):** Standard vaccination schedule matrix with basic recall dialog.
* **Local Changes (`6e208869`):**
  * Added `isRecallTargetOverdue` calculation helper.
  * Added `getRecallDisabledReason()` helper to validate appointment eligibility, consent, and channel availability, displaying inline warning alerts and tooltips on the dispatch button.
  * Broadened `isMissed` and `isDueToday` definitions to account for `late_days > 0` and `is_today`.
  * Added explanatory note for in-app delivery without requiring SMS/email consent.
* **Remote Changes (`d77075f4`):**
  * Synchronized active tabs with URL query params (`setSearchParams(nextParams, { replace: true })`).
  * Made KPI cards clickable to filter tabs.
  * Added `data-walkthrough` attributes throughout the component for the onboarding guide.
  * Updated label visibility: `const showNextLabel = (!isTriageDoctor || isMissed) && Boolean(patient.next_appointment);`.
* **Preservation Objective:** Retain all walkthrough selectors and URL tab synchronization from remote, while preserving local's recall eligibility guards, button tooltips, and warning banners.
* **Recommended Resolution Strategy:**
  1. In the patient list mapping:
     ```tsx
     <Stack spacing={2} data-walkthrough="vax-sched-patient-list">
       {filteredPatients.map((patient, pIdx) => {
         const isMissed = patient.compliance_status === 'overdue_missed' || Boolean(patient.next_appointment?.is_missed) || Boolean(patient.next_appointment && patient.next_appointment.late_days > 0);
         const isDueToday = patient.compliance_status === 'due_today' || Boolean(patient.next_appointment?.is_today);
         const showNextLabel = (!isTriageDoctor || isMissed) && Boolean(patient.next_appointment);
         const showOverdueNotice = Boolean(isMissed && patient.next_appointment && patient.next_appointment.late_days > 0);
         const hasTextAbove = showNextLabel || showOverdueNotice;
     ```
  2. Retain all remote `data-walkthrough` attributes across headers, KPI cards, filters, dose pills, and table actions.
  3. Retain local's `isRecallTargetOverdue`, `getRecallDisabledReason()`, inline alert banner, and disabled tooltip on the single recall dialog button.

---

## 4. Database Migrations & Cross-Cutting Architecture Audit

### 4.1 Migration Chronology & Zero-Collision Verification
A total of 5 migrations exist across both branches since the merge base. All timestamps are sequential, with zero filename collisions and zero schema conflicts:

| Timestamp & Filename | Branch Origin | Target Table | Changes Introduced | Status |
|---|---|---|---|---|
| `2026_11_14_000001_create_patient_password_reset_tokens.php` | Remote | `patient_password_reset_tokens` | Creates token table with FK to `patient_accounts.id` | Compatible |
| `2026_11_14_000002_protect_invitation_tokens.php` | Remote | `staff_invitations`, `patient_invitations` | Adds `encrypted_token`, `recipient_email` | Compatible |
| `2026_11_16_200000_create_patient_device_tokens_table.php` | Local | `patient_device_tokens` | Creates token table with FK to `patient_accounts.id` | Compatible |
| `2026_11_17_000001_create_patient_followup_logs_table.php` | Remote | `patient_followup_logs` | Creates follow-up outreach logs table | Compatible |
| `2026_11_17_190000_add_notification_preferences_to_patient_accounts_table.php` | Local | `patient_accounts` | Adds nullable JSON column `notification_preferences` | Compatible |

**Migration Execution Verdict:** Running `php artisan migrate` after merge will apply all 5 migrations in clean chronological order with zero schema deadlocks.

---

### 4.2 Cross-Cutting Service Dependencies
* **Broadcasting vs Email Observers:** In `AppServiceProvider.php`, the local `AppointmentStatusChanged` event listener and remote `AppointmentEmailObserver` observe different lifecycles and operate concurrently without race conditions.
* **Bite Intake Check-In:** `BiteIncidentIntakeService::checkIn()` receives `$payload = []` (remote) to store consultation vitals and then dispatches `QueueTicketUpdated` and `AppointmentStatusChanged` (local) to notify all listening web dashboards and mobile clients via Reverb.

---

## 5. Integration, Concurrency & Security Risk Assessment

| Risk Category | Risk Description | Severity | Mitigation Strategy |
|---|---|---|---|
| **CORS Misconfiguration** | Incorrectly merging `cors.php` could reject valid Vercel domains or introduce overly permissive wildcards | Medium | Use `array_unique(array_filter(array_merge(...)))` with strict trimming. Test preflight `OPTIONS` requests from both primary and preview origins. |
| **Credential Leakage** | New Firebase and Cloudflare R2 credentials might be accidentally committed or logged in test outputs | High | Keep all credentials strictly in environment variables (`FIREBASE_CREDENTIALS_BASE64`, `AWS_SECRET_ACCESS_KEY`). Ensure `.env` is ignored and exception handlers dontFlash tokens. |
| **Composer Lock Drift** | Merging lockfiles manually can result in missing transitive packages or corrupted hash mismatches | High | Perform automated regeneration via `composer update --lock` followed by `composer validate` on the merged `composer.json`. |
| **Queue & Scheduler Overlap** | Automated reminder scheduler running concurrently with manual staff recalls could dispatch duplicate SMS or push alerts | Medium | Outbound delivery uses DB transactions, idempotency keys, and snapshot matching in `OutboundDelivery.php` and `DeliveryPolicy.php`. |
| **Walkthrough UI Regressions** | Removing or breaking `data-walkthrough` attributes would cause frontend tour tests and guide steps to fail | Low | Ensure every `data-walkthrough` attribute from remote is preserved verbatim in `VaccinationSchedulePage.tsx`. |

---

## 6. Post-Merge Regression Verification Matrix

Following code reconciliation, the following test suites must be executed:

### 6.1 Backend Test Suites (PHP / Laravel)
```bash
# 1. Broadcasting & WebSocket Foundation Tests
php artisan test tests/Feature/BroadcastingAuthFoundationTest.php
php artisan test tests/Feature/BroadcastingEventClassesTest.php
php artisan test tests/Feature/DomainServicesBroadcastingIntegrationTest.php
php artisan test tests/Feature/ReverbProductionConfigurationTest.php

# 2. Firebase Cloud Messaging & Push Notification Tests
php artisan test tests/Feature/Mobile/PatientDeviceTokenApiTest.php
php artisan test tests/Feature/Notifications/AutomatedFcmNotificationTriggersTest.php
php artisan test tests/Feature/Notifications/FcmTestAccountAllowlistTest.php
php artisan test tests/Feature/Console/FcmTestCommandTest.php
php artisan test tests/Feature/Console/AutomatedReminderTestCommandTest.php
php artisan test tests/Unit/Services/FcmServiceTest.php
php artisan test tests/Unit/Services/FirebaseAuthServiceTest.php
php artisan test tests/Unit/Jobs/SendFcmPushNotificationTest.php
php artisan test tests/Unit/Jobs/FcmSecurityAndRetryTest.php

# 3. Messaging, SMTP Email & Outreach Tests
php artisan test tests/Feature/MessagingIntegrationTest.php
php artisan test tests/Feature/SmtpEmailSecurityTest.php
php artisan test tests/Feature/PatientInvitationEmailTest.php
php artisan test tests/Feature/Clinical/OverdueFollowupOutreachTest.php

# 4. Clinic Module & Migration Isolation Tests
php artisan test tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php
php artisan test tests/Feature/CloudStorageIntegrationTest.php
php artisan test tests/Feature/MobilePatientWorkflowTest.php
php artisan test tests/Feature/Reports/Phase4SummaryAndReconciliationTest.php
```

### 6.2 Frontend Test Suites (React / TypeScript)
```bash
cd frontend
# 1. TypeScript Contract & Build Validation
npm run typecheck
# 2. Production Build Validation
npm run build
# 3. Walkthrough Tour E2E Tests (Playwright)
npx playwright test tests/registration/vaccinationScheduleWalkthrough.spec.ts
```

### 6.3 Mobile Test Suites (Flutter / Dart)
```bash
cd mobile
flutter test test/fcm_device_registration_service_test.dart
flutter test test/push_notification_service_test.dart
flutter test test/firebase_configuration_test.dart
flutter test test/bite_intake_stepper_test.dart
flutter test test/profile_setup_scroll_test.dart
```

---

## 7. Step-by-Step Safe Merge Execution Procedure

> [!IMPORTANT]
> **DO NOT EXECUTE THESE COMMANDS NOW.**  
> This protocol is prepared for subsequent execution only after receiving explicit user authorization.

### Phase 1: Safeguard Points & Safety Refs
```bash
# Verify clean working tree
git status

# Create isolated safety refs to ensure deterministic rollback capability
git branch backup/deployment-local-6e208869 HEAD
git branch backup/deployment-remote-d77075f4 origin/deployment
```

### Phase 2: Create Rehearsal Reconciliation Branch
```bash
# Branch off local HEAD to conduct reconciliation safely without affecting deployment
git checkout -b reconcile/deployment-merge
```

### Phase 3: Initiate Merge
```bash
# Merge remote deployment into the rehearsal branch
git merge origin/deployment
```

### Phase 4: Resolve the 8 Conflict Files
Apply the exact resolutions documented in Section 3:
1. `backend/.env.railway.example`: Merge environment variables.
2. `backend/app/Services/Messaging/OutboundDelivery.php`: Combine FCM dispatch with SMTP email & event guard.
3. `backend/config/cors.php`: Combine comma-delimited `FRONTEND_URL` and `FRONTEND_URL_ALT`.
4. `backend/routes/api.php`: Keep top-level imports, remote endpoints, and local FCM endpoints.
5. `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`: Keep isolated migration invocation.
6. `frontend/src/features/patients/pages/PatientListPage.tsx`: Integrate Echo listener with Online Intake modal.
7. `frontend/src/features/vaccinations/pages/VaccinationSchedulePage.tsx`: Integrate walkthrough attributes with recall validation.
8. `backend/composer.lock`:
   ```bash
   cd backend
   composer update google/auth laravel/reverb league/flysystem-aws-s3-v3 --lock
   composer validate
   cd ..
   ```

### Phase 5: Mark Resolved & Complete Merge Commit
```bash
git add backend/.env.railway.example
git add backend/app/Services/Messaging/OutboundDelivery.php
git add backend/composer.json backend/composer.lock
git add backend/config/cors.php
git add backend/routes/api.php
git add backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php
git add frontend/src/features/patients/pages/PatientListPage.tsx
git add frontend/src/features/vaccinations/pages/VaccinationSchedulePage.tsx

git commit -m "chore(merge): reconcile local Reverb/FCM features with origin SMTP/storage updates"
```

### Phase 6: Run Comprehensive Verification
Execute all tests listed in Section 6.

### Phase 7: Fast-Forward `deployment` Branch
```bash
git checkout deployment
git merge --ff-only reconcile/deployment-merge
git branch -d reconcile/deployment-merge
```

---

## 8. Backup & Rollback Protocol

If at any point during or after reconciliation an unexpected issue arises:

### 8.1 Aborting Mid-Merge
```bash
git merge --abort
```

### 8.2 Instant Rollback to Pre-Merge Local State
```bash
git checkout deployment
git reset --hard backup/deployment-local-6e208869
```

### 8.3 Restoring Remote State Reference
```bash
git branch -f origin/deployment backup/deployment-remote-d77075f4
```

---

## 9. Explicit Operations Requiring User Approval

Before any merge or branch modification takes place, explicit user approval is required for the following operations:
1. Approval of the file-by-file resolution logic detailed in Section 3.
2. Authorization to checkout the temporary rehearsal branch (`reconcile/deployment-merge`).
3. Authorization to execute `git merge origin/deployment` on the rehearsal branch.
4. Authorization to regenerate `backend/composer.lock` with the combined dependencies.
5. Final authorization to fast-forward the primary `deployment` branch once all automated tests pass.
