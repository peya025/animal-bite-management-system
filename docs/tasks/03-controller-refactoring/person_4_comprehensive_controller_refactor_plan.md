# Person 4 Comprehensive Controller Refactor Plan
**Domain:** Shared Infrastructure, Architecture, Reports & Supporting Services  
**Owner:** Person 4  
**Project:** Animal Bite Management System (ABMS)  
**Assigned Scope:** 4 Shared Infrastructure Artifacts + 16 Supporting Controllers (~2,081 Lines of Code)  
**Clients Consuming:** React + TypeScript Web App & Flutter Mobile App  

---

## 1. Domain Scope & Working Rules

Person 4 is the foundation architect responsible for the shared plumbing that all other teammates rely on:
1. **Request ID Middleware:** Attaching `X-Request-ID` to requests, responses, and structured log contexts (`Log::withContext`).
2. **Global Exception Handling:** Standardizing API error responses in `bootstrap/app.php` without swallowing debug stack traces.
3. **Base Response Helpers:** Ensuring consistent, non-wrapping JSON helpers in base `Controller.php` and `ApiResponse` trait.
4. **Route Review & Guardrails:** Maintaining routing integrity in `routes/api.php`.
5. **Supporting & Reporting Controllers:** Refactoring secondary domains (reports, audit logs, clinic setup, printing, mobile notifications, and developer diagnostics).

### Strict Working Rules
1. **One File at a Time:** Plan, test, and refactor one unit per cycle. Never bundle multiple files into one unverified change.
2. **File Isolation:** Person 4 owns shared files exclusively (`bootstrap/app.php`, base `Controller.php`, `RequestIdMiddleware.php`, `routes/api.php`) and the 16 supporting controllers.
3. **Behavior Must Stay 100% Identical:**
   - Zero changes to URLs, HTTP verbs, parameter names, or query strings.
   - Status codes (200, 201, 204, 400, 401, 403, 404, 422, 500) must remain identical.
   - Response shapes (JSON keys, casing, nullability, pagination format, flat vs nested structures) must never change.
   - Database transactions, audit logging steps, and cache operations must execute in their exact current order.
4. **No Bug Fixes or Dead Code Deletion During Refactor:** Suspected bugs and dead code must only be reported in the documentation, never altered during refactoring.

---

## 2. Person 4 Inventory & Execution Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE 0: Shared Infrastructure & Architecture               │
│        (RequestIdMiddleware, Global Exception Rendering, Base Helpers)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE 1: Supporting, Audit & Reporting Controllers          │
│   Cycle 1: AuditLogController           Cycle 4: RegistrationReportController│
│   Cycle 2: NotificationController       Cycle 5: PublicStorageController    │
│   Cycle 3: ReportController                                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE 2: Clinic Settings, Configuration & Prints            │
│   Cycle 6: LandingPageSettingsController Cycle 9: ClinicScheduleController  │
│   Cycle 7: PrintController              Cycle 10: ClinicSetupController     │
│   Cycle 8: ClinicModuleConfigController                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE 3: Mobile Supporting & History Controllers            │
│   Cycle 11: MobileLocationController    Cycle 13: MobileAppointmentController│
│   Cycle 12: MobileNotificationController Cycle 14: MobileHistoryController   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE 4: Developer & Diagnostic Endpoints                   │
│   Cycle 15: DeveloperDatabaseExplorerController                             │
│   Cycle 16: AppointmentDiagnosticController                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Complete Inventory Table

| Phase / Cycle | Target File | Lines | Risk Level | Primary Function |
| :---: | :--- | :---: | :---: | :--- |
| **Phase 0** | `backend/app/Http/Middleware/RequestIdMiddleware.php` + `bootstrap/app.php` | ~60 | 🟢 Completed | Request-ID generation, `Log::withContext`, global JSON exception formatting |
| **Cycle 1** | `backend/app/Http/Controllers/AuditLogController.php` | 114 -> 55 | 🟢 Completed | Paginated staff audit trails, SQL-optimized activity summary |
| **Cycle 2** | `backend/app/Http/Controllers/NotificationController.php` | 94 -> 85 | 🟢 Completed | Staff web notification feed, unread count, read markers |
| **Cycle 3** | `backend/app/Http/Controllers/ReportController.php` | 79 -> 80 | 🟢 Completed | DOH weekly exposure registry, monthly ABTC, quarterly cohort |
| **Cycle 4** | `backend/app/Http/Controllers/RegistrationReportController.php` | 94 -> 28 | 🟢 Completed | Registration throughput, PEP outcomes, surveillance CSV streaming |
| **Cycle 5** | `backend/app/Http/Controllers/PublicStorageController.php` | 36 -> 18 | 🟢 Completed | Secure public asset/logo streaming with CORS and caching |
| **Cycle 6** | `backend/app/Http/Controllers/LandingPageSettingsController.php` | 90 -> 40 | 🟢 Completed | Public portal branding, CMS texts, footer links |
| **Cycle 7** | `backend/app/Http/Controllers/PrintController.php` | 127 -> 59 | 🟢 Completed | Form 1 Enrolment, consultation sheets, card print views |
| **Cycle 8** | `backend/app/Http/Controllers/ClinicModuleConfigController.php` | 145 -> 40 | 🟢 Completed | Station feature flags and dynamic field validation rules |
| **Cycle 9** | `backend/app/Http/Controllers/ClinicScheduleController.php` | 272 -> 118 | 🟢 Completed | Weekly operating schedule, holiday exceptions, appointment slot calculations |
| **Cycle 10** | `backend/app/Http/Controllers/ClinicSetupController.php` | 354 -> 78 | 🟢 Completed | First-time clinic onboarding wizard, admin account setup |
| **Cycle 11** | `backend/app/Http/Controllers/Mobile/MobileLocationController.php` | 114 -> 49 | 🟢 Completed | Mobile GPS context, PSGC province/municipality/barangay lookups |
| **Cycle 12** | `backend/app/Http/Controllers/Mobile/MobileNotificationController.php` | 79 -> 44 | 🟢 Completed | Mobile patient push/in-app notification center & pagination |
| **Cycle 13** | `backend/app/Http/Controllers/Mobile/MobileAppointmentController.php` | 269 -> 50 | 🟢 Completed | Mobile booking, intake draft persistence, cancellation |
| **Cycle 14** | `backend/app/Http/Controllers/Mobile/MobileHistoryController.php` | 333 -> 24 | 🟢 Completed | Consolidated mobile medical, vaccination, and appointment history |
| **Cycle 15** | `backend/app/Http/Controllers/DeveloperDatabaseExplorerController.php` | 106 -> 38 | 🟢 Completed | Dev-only database schema inspection and row counter |
| **Cycle 16** | `backend/app/Http/Controllers/Developer/AppointmentDiagnosticController.php` | 75 -> 48 | 🟢 Completed | Dev diagnostic scan & auto-repair for scheduling anomalies |

---

## 3. Deep Dive Specification by Cycle

---

### PHASE 0: Shared Infrastructure & Architecture

#### 1. Request ID Middleware (`backend/app/Http/Middleware/RequestIdMiddleware.php`)
- **Objective:** Ensure every request entering the Laravel API receives a unique UUID v4 request ID.
- **Contract:**
  - Reads incoming `X-Request-ID` header if present; otherwise generates a new `Str::uuid()`.
  - Sets outgoing response header `X-Request-ID`.
  - Binds to logging context: `Log::withContext(['request_id' => $requestId])`.
- **Registration:** In `backend/bootstrap/app.php` within `$middleware->use([...])`.

#### 2. Global JSON Exception Handling (`backend/bootstrap/app.php`)
- **Objective:** Uniform error rendering for all API routes (`api/*`) without suppressing stack traces or swallowing errors.
- **Handling:**
  - `ValidationException` -> HTTP 422 with `{ "message": "...", "errors": { ... } }`.
  - `AuthenticationException` -> HTTP 401 with `{ "message": "Unauthenticated." }`.
  - `AuthorizationException` / `AccessDeniedHttpException` -> HTTP 403 with `{ "message": "..." }`.
  - `ModelNotFoundException` / `NotFoundHttpException` -> HTTP 404 with `{ "message": "Resource not found." }`.
  - General unhandled exceptions -> HTTP 500 with sanitized message in production, detailed message in local/testing.

#### 3. Base `Controller.php` & `ApiResponse` Helper
- Preserves existing helper methods (`json`, `success`, `error`, `noContent`) ensuring zero breaking changes for existing consumers.

---

### CYCLE 1: `AuditLogController.php`
- **File:** `backend/app/Http/Controllers/AuditLogController.php` (114 lines)
- **Role:** Staff audit trail listing and high-performance SQL metrics aggregation.
- **Routes:**
  - `GET /api/audit-logs` (`index`): Paginated audit logs with clinic scoping and filters (`user_id`, `action`, `date_from`, `date_to`, `search`).
  - `GET /api/audit-logs/summary` (`summary`): Parallel SQL aggregation of today/week actions, logins, suspicious after-hours, and most active staff.
  - `GET /api/audit-logs/user/{userId}` (`userActivity`): Paginated user activity history.
- **Client Dependencies:**
  - React: `frontend/src/features/audit/pages/StaffActivityPage.tsx`.
- **Extraction Blueprint:**
  - FormRequest: `AuditLogFilterRequest`.
  - Service: `AuditLogQueryService`.

---

### CYCLE 2: `NotificationController.php`
- **File:** `backend/app/Http/Controllers/NotificationController.php` (94 lines)
- **Role:** Web staff header notification bell and read receipts.
- **Routes:**
  - `GET /api/notifications` (`index`): User notifications feed and unread count.
  - `GET /api/notifications/unread-count` (`unreadCount`): Unread badge counter.
  - `POST /api/notifications/{id}/read` (`markAsRead`): Mark single notification read.
  - `POST /api/notifications/read-all` (`markAllAsRead`): Mark all notifications read.
- **Client Dependencies:**
  - React: App header notification popover.

---

### CYCLE 3: `ReportController.php`
- **File:** `backend/app/Http/Controllers/ReportController.php` (79 lines)
- **Role:** Official DOH epidemiological reports.
- **Routes:**
  - `GET /api/reports/doh/exposure-registry` (`exposureRegistry`)
  - `GET /api/reports/doh/monthly` (`monthlyReport`)
  - `GET /api/reports/doh/cohort` (`cohortReport`)
- **Client Dependencies:**
  - React: `frontend/src/features/reports/pages/ReportsDashboardPage.tsx`.

---

### CYCLE 4: `RegistrationReportController.php`
- **File:** `backend/app/Http/Controllers/RegistrationReportController.php` (94 lines)
- **Role:** Registration throughput, PEP completion outcomes, overdue dose sweep, and CSV streaming.
- **Routes:**
  - `GET /api/reports/registration` (`index`)

---

### CYCLE 5: `PublicStorageController.php`
- **File:** `backend/app/Http/Controllers/PublicStorageController.php` (36 lines)
- **Role:** Direct public storage file serving with CORS and aggressive caching.
- **Routes:**
  - `GET /storage/{path}` (`serve`)

---

### CYCLE 6: `LandingPageSettingsController.php`
- **File:** `backend/app/Http/Controllers/LandingPageSettingsController.php` (90 lines)
- **Role:** Public portal CMS, operating hours announcement, and footer links.
- **Routes:**
  - `GET /api/landing-page-settings`
  - `POST /api/landing-page-settings`

---

### CYCLE 7: `PrintController.php`
- **File:** `backend/app/Http/Controllers/PrintController.php` (127 lines)
- **Role:** Form 1 Enrolment, consultation records, and treatment card printable views.
- **Routes:**
  - `GET /print/patient/{patient}/enrolment`
  - `GET /print/patient/{patient}/card`

---

### CYCLE 8: `ClinicModuleConfigController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/ClinicModuleConfigController.php` (Refactored from 145 to 40 lines)
- **Role:** Workstation module toggle flags and dynamic registration field rules.
- **Routes:**
  - `GET /api/setup/module-config`
  - `PUT /api/setup/module-config`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Clinic/UpdateClinicModuleConfigRequest.php`
  - Service: `backend/app/Services/Clinic/ClinicModuleConfigService.php`
- **Test Suite:** `backend/tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php` (6 tests, 32 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_8_clinic_module_config_ui_guide_test.md`

---

### CYCLE 9: `ClinicScheduleController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/ClinicScheduleController.php` (Refactored from 272 to 118 lines)
- **Role:** Weekly operating schedule, slot intervals, capacity caps, and holiday exception dates.
- **Routes:**
  - `GET /api/clinics/schedule`
  - `PUT /api/clinics/schedule/weekly`
  - `GET /api/clinics/schedule/exceptions`
  - `POST /api/clinics/schedule/exceptions`
  - `DELETE /api/clinics/schedule/exceptions/{id}`
  - `PUT /api/clinics/schedule/policies`
  - `POST /api/clinics/schedule/recalculate`
  - `GET /api/mobile/schedule-summary` & `GET /api/clinics/schedule-summary`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Clinic/UpdateWeeklyScheduleRequest.php`
  - FormRequest: `backend/app/Http/Requests/Clinic/StoreScheduleExceptionRequest.php`
  - FormRequest: `backend/app/Http/Requests/Clinic/UpdateSchedulePoliciesRequest.php`
  - Domain Service Enrichment: `backend/app/Services/ClinicScheduleService.php` (`getScheduleWithDetails`, `updateWeeklySchedule`, `storeException`, `deleteException`, `updatePolicies`, `recalculatePendingAppointments`)
- **Test Suite:** `backend/tests/Feature/Clinic/ClinicScheduleCharacterizationTest.php` (11 tests, 92 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_9_clinic_schedule_ui_guide_test.md`

---

### CYCLE 10: `ClinicSetupController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/ClinicSetupController.php` (Refactored from 354 to 78 lines)
- **Role:** First-time clinic onboarding wizard, admin account initialization, branding logo upload, and geocoding.
- **Routes:**
  - `POST /api/setup/initialize`
  - `GET /api/setup/status`
  - `GET /api/setup/clinic`
  - `PUT/POST /api/setup/clinic`
  - `POST /api/setup/complete`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Clinic/InitializeClinicSetupRequest.php`
  - FormRequest: `backend/app/Http/Requests/Clinic/UpdateClinicProfileRequest.php`
  - Domain Service: `backend/app/Services/Clinic/ClinicSetupService.php` (`initialize`, `checkSetup`, `updateClinic`, `completeSetup`, `geocodeClinicAddress`, `getSmartZoomLevel`)
- **Test Suite:** `backend/tests/Feature/Clinic/ClinicSetupCharacterizationTest.php` (7 tests, 42 assertions, 100% pass) + `backend/tests/Feature/PrintLogosSetupTest.php` (2 tests, 35 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_10_clinic_setup_ui_guide_test.md`

---

### CYCLE 11: `Mobile/MobileLocationController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/Mobile/MobileLocationController.php` (Refactored from 114 to 49 lines)
- **Role:** Mobile GPS context and Philippine Standard Geographic Code (PSGC) lookups.
- **Routes:**
  - `GET /api/mobile/locations/context`
  - `GET /api/mobile/locations/municipalities`
  - `GET /api/mobile/locations/barangays`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Mobile/GetBarangaysRequest.php`
  - Domain Service: `backend/app/Services/Mobile/MobileLocationService.php` (`resolveClinic`, `getClinicContext`, `getMunicipalitiesForClinic`, `getBarangaysForMunicipality`, `resolveClinicProvince`, `resolveClinicMunicipality`)
- **Test Suite:** `backend/tests/Feature/Mobile/MobileLocationCharacterizationTest.php` (8 tests, 34 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_11_mobile_location_ui_guide_test.md`

---

### CYCLE 12: `Mobile/MobileNotificationController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/Mobile/MobileNotificationController.php` (Refactored from 79 to 44 lines)
- **Role:** Mobile in-app notification center, paging, relationship tagging, and read status.
- **Routes:**
  - `GET /api/mobile/notifications`
  - `PATCH /api/mobile/notifications/read-all`
  - `PATCH /api/mobile/notifications/{id}/read`
- **Extracted Components:**
  - Domain Service: `backend/app/Services/Mobile/MobileNotificationService.php` (`getPaginatedNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `invalidateNotificationCache`)
- **Test Suite:** `backend/tests/Feature/Mobile/MobileNotificationCharacterizationTest.php` (6 tests, 40 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_12_mobile_notification_ui_guide_test.md`

---

### CYCLE 13: `Mobile/MobileAppointmentController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/Mobile/MobileAppointmentController.php` (Refactored from 269 to 50 lines)
- **Role:** Mobile appointment booking, preliminary bite intake draft persistence, cancellation.
- **Routes:**
  - `GET /api/mobile/appointments`
  - `GET /api/mobile/appointments/{id}`
  - `POST /api/mobile/appointments`
  - `POST /api/mobile/appointments/{id}/cancel`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Mobile/StoreMobileAppointmentRequest.php`
  - FormRequest: `backend/app/Http/Requests/Mobile/CancelMobileAppointmentRequest.php`
  - Domain Service: `backend/app/Services/Mobile/MobileAppointmentService.php` (`listAppointments`, `getAppointmentDetails`, `bookAppointment`, `cancelAppointment`)
- **Test Suite:** `backend/tests/Feature/Mobile/MobileAppointmentCharacterizationTest.php` & `backend/tests/Feature/Mobile/MobilePatientWorkflowTest.php` (18 tests, 144 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_13_mobile_appointment_ui_guide_test.md`

---

### CYCLE 14: `Mobile/MobileHistoryController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/Mobile/MobileHistoryController.php` (Refactored from 333 to 24 lines)
- **Role:** Consolidated mobile patient history (past appointments, completed vaccination doses, active bite cases).
- **Routes:**
  - `GET /api/mobile/history`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Mobile/GetMobileHistoryRequest.php`
  - Domain Service: `backend/app/Services/Mobile/MobileHistoryService.php` (`getHistory`, `formatAppointments`, `formatVaccinations`, `mergeAndSortRecords`, `resolveActiveCase`)
- **Test Suite:** `backend/tests/Feature/Mobile/MobileHistoryCharacterizationTest.php` (12 tests, 71 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_14_mobile_history_ui_guide_test.md`

---

### CYCLE 15: `DeveloperDatabaseExplorerController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/DeveloperDatabaseExplorerController.php` (Refactored from 106 to 38 lines)
- **Role:** Dev-only database schema inspection, table row counters, and column metadata.
- **Routes:**
  - `GET /api/developer/database/tables`
  - `GET /api/developer/database/tables/{tableName}`
- **Extracted Components:**
  - Domain Service: `backend/app/Services/Developer/DeveloperDatabaseExplorerService.php` (`getTables`, `getTableDetails`)
- **Test Suite:** `backend/tests/Feature/Developer/DeveloperDatabaseExplorerCharacterizationTest.php` (5 tests, 462 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_15_developer_database_explorer_ui_guide_test.md`

---

### CYCLE 16: `Developer/AppointmentDiagnosticController.php` (COMPLETED)
- **File:** `backend/app/Http/Controllers/Developer/AppointmentDiagnosticController.php` (Refactored from 75 to 48 lines)
- **Role:** Diagnostic health scans for appointment slot collisions and automated repair tools.
- **Routes:**
  - `GET /api/developer/diagnostics/appointments`
  - `POST /api/developer/diagnostics/appointments/repair-all`
  - `POST /api/developer/diagnostics/appointments/repair-single`
- **Extracted Components:**
  - FormRequest: `backend/app/Http/Requests/Developer/RepairSingleDiagnosticRequest.php`
- **Test Suite:** `backend/tests/Feature/Developer/AppointmentDiagnosticCharacterizationTest.php` (7 tests, 30 assertions, 100% pass)
- **UI Test Guide:** `docs/ui-test-guides/cycle_16_appointment_diagnostic_ui_guide_test.md`

---

## 4. Contract Invariance Checklist (Strict Guarantees)

During all cycles, Person 4 will strictly uphold these contract invariants:

1. **Request ID Transparency:**
   - The addition of `X-Request-ID` middleware must not alter or wrap any existing response body.
2. **Streaming & Binary Responses:**
   - `RegistrationReportController::index` (CSV stream download) and `PublicStorageController::serve` (binary assets) must preserve their exact streaming headers (`Content-Type`, `Cache-Control: no-store`, `Content-Disposition`).
3. **Pagination Invariance:**
   - Paginated responses (`AuditLogController::index`, `MobileNotificationController::index`, `RegistrationReportController::index`) must preserve their exact pagination structure (`data`, `current_page`, `last_page`, `per_page`, `total`).
4. **Dev Route Guardrails:**
   - Developer routes must continue to verify developer authorization or environment constraints (`app.developer_tools_enabled`).

---

## 5. Person 4 Live Progress & Verification Matrix

| Cycle | Target | Characterization Test Status | FormRequest Extracted | Service Extracted | Thin Controller | Full Test Suite Pass | Verified in React & Flutter |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **P0** | `RequestIdMiddleware` & `bootstrap/app.php` | [x] PASS (6/6) | N/A | N/A | N/A | [x] (104/104) | [x] Verified |
| **C1** | `AuditLogController.php` | [x] PASS (10/10) | [x] `AuditLogFilterRequest` | [x] `AuditLogQueryService` | [x] (114 -> 48 LOC) | [x] (117/117) | [x] Verified |
| **C2** | `NotificationController.php` | [x] PASS (8/8) | [x] `NotificationListRequest` | [x] `NotificationService` | [x] (94 -> 68 LOC) | [x] (125/125) | [x] Verified |
| **C3** | `ReportController.php` | [x] PASS (6/6) | [x] `ExposureRegistry/Monthly/CohortReportRequest` | [x] `DohReportService` | [x] (79 -> 80 LOC) | [x] (131/131) | [x] Verified |
| **C4** | `RegistrationReportController.php` | [x] PASS (6/6) | [x] `RegistrationReportRequest` | [x] `RegistrationReportService` | [x] (94 -> 26 LOC) | [x] (137/137) | [x] Verified |
| **C5** | `PublicStorageController.php` | [x] PASS (5/5) | N/A (GET stream) | [x] `PublicStorageService` | [x] (36 -> 18 LOC) | [x] (142/142) | [x] Verified |
| **C6** | `LandingPageSettingsController.php` | [x] PASS (6/6) | [x] `UpdateLandingPageSettingsRequest` | [x] `LandingPageSettingsService` | [x] (90 -> 36 LOC) | [x] (148/148) | [x] Verified |
| **C7** | `PrintController.php` | [x] PASS (7/7) | N/A (GET views) | [x] `PrintDocumentService` | [x] (127 -> 48 LOC) | [x] (155/155) | [x] Verified |
| **C8** | `ClinicModuleConfigController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C9** | `ClinicScheduleController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C10** | `ClinicSetupController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C11** | `Mobile/MobileLocationController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C12** | `Mobile/MobileNotificationController.php` | [ ] Pending | N/A | [ ] | [ ] | [ ] | [ ] |
| **C13** | `Mobile/MobileAppointmentController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C14** | `Mobile/MobileHistoryController.php` | [ ] Pending | N/A (GET only) | [ ] | [ ] | [ ] | [ ] |
| **C15** | `DeveloperDatabaseExplorerController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
| **C16** | `Developer/AppointmentDiagnosticController.php` | [ ] Pending | [ ] | [ ] | [ ] | [ ] | [ ] |
