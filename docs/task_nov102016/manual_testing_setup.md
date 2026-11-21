# Shared manual testing setup and evidence guide

**Status:** Test instructions only; these acceptance tests have not been executed.  
**Applies to:** All four person-specific implementation plans.  
**Purpose:** Make results repeatable across the admin editor, API, forms, and station workflows.

## 1. Prepare the test environment

1. Use a dedicated local or staging database containing synthetic records. Record the application commit, database engine/version, frontend URL, API base URL, browser/version, and test date/time in Asia/Manila.
2. Have Person 1 prepare repeatable test fixtures and the approved migration/backfill instructions. Confirm the running backend actually uses that test database before any fixture, seed, migration, or recovery exercise.
3. Keep outbound email/SMS integrations disabled or directed to test transports. Do not use real patients or contact details.
4. Take a test-environment snapshot and save the baseline configuration for both fixture clinics. Record patient, queue, appointment, dose, and stock identifiers used by each case.
5. Use existing running services if available. With dependencies installed and test-environment settings configured, the usual development commands are `php artisan serve` from `backend/` and `npm run dev` from `frontend/`. Use the URLs they report; do not assume a port or copy production settings.
6. Open separate browser profiles for admin, registration, doctor, and treatment users. Two tabs in one profile share authentication; they are suitable for same-user stale drafts but not independent-role tests.
7. Open Developer Tools > Network, enable Preserve log, and filter for the relevant request. Record the response status/body as well as what the screen displays.

Do not run `migrate:fresh`, destructive seeders, or data recovery against an ordinary development/live database. Migration/reseed/recovery cases below require the disposable database snapshot. A PHPUnit in-memory database is not a persistent browser-test database.

## 2. Accounts and data fixtures

Person 1 supplies account access through the team's normal secure process. These labels are fixture names, not pre-existing accounts or credentials.

| Fixture | Required properties | Used by |
| --- | --- | --- |
| Clinic A / Clinic B | Distinct configuration values and unrelated patient records | All; isolation checks |
| A-Admin-1 / A-Admin-2 | Active administrators assigned to Clinic A | Editor, conflict, history tests |
| B-Admin | Active administrator assigned to Clinic B | Isolation/cache tests |
| A-Registration / A-Doctor / A-Treatment | Correct roles and station assignments for Clinic A | Live operations |
| A-Developer | Developer role with the declared read-only/denied policy | Access tests |
| A-Inactive | Inactive staff account; a previously issued test session/token if needed | Access revocation |
| NoClinic-Admin | Active administrator with no clinic, created through a test fixture | Missing-clinic regression |
| Fresh clinic dataset | Setup not yet completed | Setup round trip |
| Legacy datasets | Missing row, six-key rules, 41-key rules, partial rules, null rules; explicit false/hidden overrides | Normalization/migration |
| New patient | Unique synthetic identity, no previous episode | Registration -> consultation -> treatment |
| Existing patient | Stored optional fields and a completed historical record | Hide/edit/history checks |
| Conditional patient | Married/non-married and membership conditions can be exercised | Dependent fields |
| Returning patients | Separate follow-up, reassessment, new-exposure, and transferred/external-dose fixtures | Workflow/clinical regressions |
| Queue/appointment fixtures | Waiting and already-in-service entries; scheduled follow-up | Station transitions |
| Inventory fixture | Known test stock and baseline transaction totals | Treatment side effects |

Use a distinct patient or restored snapshot for each successful create/dose test. Replaying a successful clinical POST can create additional records or deduct stock; use disposable fixtures and inspect side effects.

## 3. Freeze expectations before testing

The plans refer to future `configuration_contract.md` and `workflow_decisions.md`. Person 1 and Person 4 must supply reviewed versions before dependent acceptance tests run. Do not label an undecided expectation as a pass.

Record the following in the test run:

- Exact request/response shape, writable keys, revision mechanism, and schema version.
- Exact status/code for missing clinic, unknown keys, missing fields, null flags, stale revision, forbidden operations, and unsupported transitions. Prefer field-specific 422 for invalid configuration; choose and document the conflict status (for example 409 or 412).
- Developer read-only versus route-denied behavior, no-op audit policy, and omission semantics.
- Approved station combinations and what happens to waiting/in-service patients when settings change.
- Config-load failure behavior, stale-open-form behavior, and hidden-value update semantics.
- Mobile scope, historical/print behavior, and compatibility policy for old clients.

Pick and record **RF1**, **RF2**, and **RF3**: one approved configurable field in each live form. Pick **CF1**: an approved conditional field, and **LF1**: a locked essential field. Blood type or spouse name are candidates only if the approved catalog permits their tested rules. Record actual labels, stable keys, request keys, and valid sample values; do not invent a field merely to make a test pass.

## 4. Navigation and manual API procedure

Current entry points inspected in the repository:

| Purpose | Entry point |
| --- | --- |
| Admin configuration | Clinic Setup > Module Configuration, `/setup/modules` |
| Registration | `/patients`, use its patient registration action/modal |
| Other clinical patient list | `/patient-registry` for permitted roles |
| Queue and patient forms | `/queue`, open the test queue entry; patient detail exposes Form 1/2/3 as appropriate |
| Activity/history of staff actions | `/staff-activity`, subject to the final access policy |
| Configuration API | `GET` and `PUT /api/setup/module-config` |

Do not use `/patients/create` as the registration acceptance path: its standalone component was a placeholder during inspection. Follow the live registration modal and record any entry-point changes in the release branch.

For API-level manual checks, use a local API client such as Postman, Insomnia, or an equivalent client:

1. Log in to the test application with the required fixture account and inspect a known-good request in Network.
2. Reproduce that request in the local API client with its actual test authentication mechanism. Use `Accept: application/json` and the observed JSON content type; preserve required session/CSRF headers if the deployment uses them.
3. For configuration changes, obtain a fresh GET and build the writable body from the agreed contract. Do not blindly PUT the full model response with read-only IDs/timestamps.
4. Duplicate the valid request and alter only the variable named in the test. Use a fresh revision except when deliberately testing stale requests.
5. Send it once; inspect status, response body, a follow-up GET, and relevant record/audit counts. UI success alone is insufficient.
6. For a clinical request, capture the actual working endpoint/payload from that form instead of guessing its field names. Use a separate fixture for valid creates and stock-changing actions.

Never attach authentication tokens, cookies, passwords, full session exports, or unredacted request headers to test evidence. Keep API client credentials local and remove them from shared collections.

## 5. Network-failure and delay procedure

1. Load the page normally and note the saved revision.
2. In Developer Tools, use request blocking for the configuration URL to test initial-load failure, or temporarily choose Offline to test a save failure.
3. Reload for a load-failure case; make a draft edit before attempting a save-failure case.
4. For slow-save cases, select network throttling and verify the PUT is still pending before interacting. If it completes too quickly, use a test-only controllable delay prepared by the implementer; do not claim the race was tested.
5. Remove request blocking, return to Online/No throttling, and use Retry/reload as the case directs.

These simulate transport failure, not all server-side failures. Audit/database rollback requires a controlled test fixture or fault hook supplied by Person 1 and removed/disabled outside the test environment.

## 6. Evidence record template

Create `verification_results.md` when execution begins. All cases start **Not run**; none is already a passing test because it appears in a plan.

| Field | Record |
| --- | --- |
| Case ID / AC IDs / MC finding | For example P2-M02 / AC-09 / MC-01 |
| Tester / date / build | Name, local timestamp, commit |
| Environment / account role / clinic | Use fixture labels; no credentials |
| Preconditions | Dataset, baseline revision, field keys, workflow policy version |
| Actual steps and values | Include deviations from the prescribed procedure |
| Expected result | Fixed before execution |
| Actual result | UI behavior, HTTP status, persisted values and side effects |
| Evidence | Redacted screenshot/response, audit event/revision, relevant before-after counts |
| Outcome | Pass / Fail / Blocked / Not run / Not applicable |
| Defect and owner | Reproduction link, severity, responsible person |
| Cleanup / retest | Restored fixture/configuration, new build and result |

Use **Blocked** when prerequisites or a decision are missing. Use **Not applicable** only for an explicitly excluded feature with a documented reason; confirm its controls cannot falsely advertise support. A failed advertised feature is not Not applicable.

## 7. Reset between cases

Restore configuration through a fresh GET and the current revision; never replay an old snapshot with a stale revision except in a conflict test. Verify Clinic B remained unchanged. Remove network overrides, sign out of test roles, and restore synthetic patient/queue/stock fixtures using the documented fixture process. Preserve audit history from the run; do not delete it simply to produce clean screenshots.

Each person's plan specifies additional case cleanup and exit evidence. Final acceptance requires both individual cases and the combined end-to-end run.
