# UI Test Guide: Cycle 8 – Clinic Module Configuration & Station Workflow Enforcement

## Objective
Verify the end-to-end functionality of clinic module configuration, dynamic field rules (41 canonical fields across 7 sections), and operational station capability enforcement (`registration_module_enabled`, `triage_module_enabled`, `treatment_module_enabled`) following the Persons 1–4 implementation (`docs/task_nov102016`).

---

## Target Endpoints & Routes
- **Admin Editor Route:** `/setup/modules` (canonical) and `/admin/settings` / `/setup/module-config` (aliases pointing to `ModuleConfigPage.tsx`)
- **Configuration Read:** `GET /api/clinic-module-config` (alias: `GET /api/setup/module-config`)
- **Configuration Update:** `PUT /api/clinic-module-config` (alias: `PUT /api/setup/module-config`, Admin only, optimistic locking via `revision`)
- **Configuration Audit History:** `GET /api/clinic-module-config/history` (alias: `GET /api/setup/module-config/history`, Admin only)

---

## Prerequisites
1. Local development environment running (`backend` + `frontend` built cleanly with `npm run build`).
2. Test accounts for isolated clinic verification (e.g., Clinic A vs Clinic B):
   - **Admin Account:** Role `admin` (two separate admin sessions recommended for 409 conflict checks)
   - **Registration Staff Account:** Role `registration`
   - **Triage Doctor Account:** Role `triage`
   - **Treatment Nurse Account:** Role `treatment`
   - **Developer Account (if applicable):** Role `developer` (view-only `can_edit = false` on `/api/clinic-module-config`)

---

## Step-by-Step Test Procedure

### 1. View Module Configuration as Staff
1. Log in as a Clinical Staff member (`registration`, `triage`, or `treatment`).
2. Navigate across clinical pages (`Patients`, `Queue`, `Doctor Patients`, `Nurse Patients`, `Vaccination Schedule`).
3. **Expected Result:**
   - Frontend loads active clinic configuration via `GET /api/clinic-module-config` (HTTP 200) containing:
     - 3 station switches (`registration_module_enabled`, `triage_module_enabled`, `treatment_module_enabled`)
     - 7 section toggles (`patient_registration_enabled`, `address_section_enabled`, `socioeconomic_section_enabled`, `gov_programs_section_enabled`, `bite_intake_section_enabled`, `triage_section_enabled`, `treatment_section_enabled`)
     - 41 canonical keys in `field_rules` (`required` | `optional` | `hidden`)
     - Metadata (`revision`, `updated_at`, `can_edit`).
   - Disabled stations display a visible warning banner while read-only patient history, treatment cards, and queue visibility remain accessible.

---

### 2. View & Edit Module Configuration as Admin
1. Log in as an Administrator (`admin`).
2. Navigate to `/setup/modules`.
3. **Expected Result:**
   - All 3 station module switches, 7 section switches, and 41 canonical field rules render with current clinic values.
   - `exposure_category` is locked to `required` (essential ABTC clinical safeguard) and cannot be downgraded to `optional` or `hidden`.
   - `Triage Module` off-state text accurately reflects that Registration must also remain disabled (only Treatment-only mode `001` allows Triage off; unsafe Registration → Treatment triage skip `101` / `100` and all-off `000` are rejected with an inline banner and HTTP 422).

---

### 3. Update Station Switches, Sections & Field Rules (Concurrency + Audit)
1. Change a section toggle (e.g. `socioeconomic_section_enabled`) and a configurable field rule (e.g. `blood_type` to `required`), then click **Save Changes**.
2. **Expected Result:**
   - Request `PUT /api/clinic-module-config` returns HTTP 200 OK with incremented `revision`, updated `config`, and audit diff recorded under `GET /api/clinic-module-config/history`.
   - Opening a stale second admin tab with an older `revision` and saving returns HTTP **409 Conflict** with the reconciliation dialog rather than silently overwriting changes.
   - Refreshing Form 1 / Form 2 / Form 3 displays and enforces the saved field rules (both UI indicators and server `422` validation).

---

### 4. Station Capability Matrix & Anti-Triage-Bypass Verification
1. Verify supported transitions succeed (`111`, `110`, `011`, `010`, and `001` only when 0 active triage queue tickets exist today).
2. Attempt `000`, `101`, `100`, or switching to `001` while a triage ticket (`new_case`, `consultation`, `booster`) is active today.
   - **Expected Result:** Rejected with HTTP **422**; previous config and `revision` remain unchanged.
3. Under `110` (Treatment disabled):
   - Direct nurse check-ins (`POST /api/patients/{id}/check-in-nurse`, follow-up `POST /api/appointments/{id}/check-in`), `POST /api/vaccination-records`, `POST /api/tagoloan-treatment-cards`, `POST /api/vaccinations/{id}/administer`, and `POST /api/queue/call-next` for nurse return **HTTP 422** (`code: "station_disabled"`, `station: "treatment"`).
   - Completing Form 2 consultation (`POST /api/treatment-records`) or `POST /api/queue/{id}/complete` marks the triage ticket `completed` cleanly without stranding patients in a disabled Treatment queue.

---

### 5. Role Authorization & Guard Precedence
1. Attempt `PUT /api/clinic-module-config` as non-admin (`registration`, `triage`, `treatment`, `developer`).
   - **Expected Result:** HTTP **403 Forbidden**; no database changes.
2. Disable Treatment (`110`), then attempt `POST /api/vaccination-records` as `registration` staff or `POST /api/vaccinations/{id}/administer` as `triage` doctor.
   - **Expected Result:** Role authorization runs first and returns **HTTP 403** (not `422`). `assigned_module` does not escalate roles or bypass disabled stations.

---

### 6. Automated Coverage Reference
- **Person 1 Config API:** `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`
- **Person 3 Form Integration:** `backend/tests/Feature/Form1IntegrationTest.php` & `backend/tests/Feature/Form2AndForm3IntegrationTest.php`
- **Person 4 Station Policy & Workflow:** `backend/tests/Feature/StationWorkflowPolicyTest.php`
- **Frontend Production Build:** `cd frontend; npm run build` (`tsc -b && vite build`)
- *(Note: Live Playwright browser execution requires installing/linking browser runtime dependencies and resolving ESM directory import compatibility on Node before running `module-config.spec.ts` in headless Chromium; see `docs/task_nov102016/verification_results.md` for full release status and open Person 3/pre-existing blockers.)*
