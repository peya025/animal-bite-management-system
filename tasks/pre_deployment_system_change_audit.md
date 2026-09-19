# Pre-Deployment System Change Audit

**System:** Animal Bite Management System  
**Audit date:** 2026-09-19  
**Scope:** current source code, route configuration, migrations, dependency locks, automated tests, and proposed free-host deployment  
**Decision:** **BLOCKED for an internet-accessible instructor demo until all P0 release blockers are resolved and re-tested.**

This is an engineering pre-deployment audit, not a legal, medical, DOH, privacy, penetration-testing, or compliance certification. Findings are based on code inspection and the commands listed in the Evidence section. No production credentials, live host, real patient data, or live database were tested.

---

## 1. Executive summary

The application has a good foundation: Laravel validation, password hashing, Sanctum authentication, role middleware, clinic scoping in many controllers, and several database foreign keys are present. However, it is **not ready to expose on the internet**, even for a limited demo, without targeted changes.

The principal risks are not only the previously documented vaccine-inventory weaknesses. The current code also permits unauthenticated account provisioning, accepts an authentication token in a print URL, issues never-expiring bearer tokens, exposes a public cross-clinic stock endpoint, and has unresolved dependency vulnerabilities. The automated suite also has six failing feature tests.

### Release recommendation

| Release level | Recommendation |
|---|---|
| Local-only presentation on a team laptop | Permitted using synthetic data, with no public URL. |
| Internet-accessible instructor demo | Block until every P0 item below is fixed, tests pass, and only synthetic data is used. |
| Clinic pilot, real patient data, or public registration | Block. Requires a separate production security/privacy/compliance review, backup and retention design, user-access governance, monitoring, and professional penetration testing. |

---

## 2. Audit evidence

### Commands run

| Check | Result |
|---|---|
| `composer validate --no-check-publish` in `backend` | Passed: `composer.json` is valid. |
| `composer audit --locked` | Failed: 21 advisories affecting 3 locked PHP packages. |
| `npm audit --omit=dev --json` in `frontend` | Failed: 4 production dependency vulnerabilities (2 high, 2 moderate). |
| `php artisan test` in `backend` | Failed: 16 passed, 6 failed, 99 assertions. |
| Route, controller, model, migration, frontend, environment, and deployment-configuration inspection | Findings below are confirmed from the current tracked files. |

### Important limits

- The test suite uses SQLite in-memory, not the Railway/MySQL target. MySQL migrations, locking, and constraints still need testing on MySQL 8.
- Dependency audit results are point-in-time advisories. Run both audits again immediately before deployment.
- No dynamic attack, load, authentication bypass, or browser security-header test was run against a deployed URL.

---

## 3. P0 release blockers — must change before an online demo

### P0-1: Public registration can create an administrator and a new clinic

**Evidence:** `POST /api/register` is public in `backend/routes/api.php`. `AuthController::register()` creates a clinic and then creates an active user with `role => 'admin'`; it does not require an invitation, setup state, or administrator approval.

**Risk:** Anyone who discovers the demo API can create their own clinic administrator. Even if records are subsequently clinic-scoped, this creates an unauthorized tenant and uses your hosted resources. It also makes the intended one-clinic demo state harder to control.

**Required change:**

1. Remove this public staff-registration route from the deployed build, or allow it only in local development.
2. Use the existing admin-controlled staff invitation flow for staff accounts.
3. Make initial setup a deliberate, one-time administrator process before publishing the URL.
4. Add a feature flag such as `PUBLIC_REGISTRATION_ENABLED=false` with a safe production default, and test a request returns 404 or 403 when disabled.

**Pass condition:** An unauthenticated request cannot create a clinic, staff user, or administrator on the deployed API.

---

### P0-2: The print route accepts bearer tokens in the query string

**Evidence:** `PrintController::enrolment()` accepts `GET /api/print/patient/{id}/enrolment?token=<Sanctum token>` and calls `PersonalAccessToken::findToken()`.

**Risk:** URL tokens may be retained in browser history, copied into screenshots, captured in proxy/access logs, stored in analytics/referrer data, and accidentally shared. The token gives the recipient the user's API access until it expires or is revoked.

**Required change:**

1. Delete the `?token=` authentication path.
2. Do not put access tokens, reset tokens, invitation tokens, or patient identifiers in shareable URLs unless they are short-lived, single-use, purpose-bound, and carefully designed.
3. For printing, use an authenticated request with the bearer token in the `Authorization` header, obtain a PDF/blob, then open or download that blob. Alternatively, redesign to a server-session/cookie model with the appropriate CSRF controls.
4. Revoke every existing demo token after the change.

**Pass condition:** A URL containing a token cannot authenticate a request, and the authorized print flow still works without disclosing a token in the address bar.

---

### P0-3: Server-issued tokens never expire

**Evidence:** `backend/config/sanctum.php` sets `expiration => null`. The React client removes `authToken` after 15 minutes of browser inactivity, but that does not invalidate the token in the database.

**Risk:** A stolen, copied, or previously shared token remains valid indefinitely unless logout deletes that exact token.

**Required change:**

1. Set a server-side Sanctum expiration appropriate to the demo (for example, 24 hours or less).
2. Add an explicit token cleanup/revocation policy; revoke all demo tokens at teardown and when a user is disabled or has a password reset.
3. Keep the frontend idle timer as usability protection, but do not treat it as token expiry.
4. Add integration tests that prove expired and revoked tokens return 401.

**Pass condition:** An expired or revoked token cannot call `/api/me` or any protected endpoint.

---

### P0-4: Login and public registration do not have explicit rate limits

**Evidence:** `POST /api/login` and `POST /api/register` have no `throttle` middleware. Google login and setup initialization do have throttles.

**Risk:** Automated password guessing and account-creation abuse are possible against a public URL.

**Required change:**

1. Disable public registration as required by P0-1.
2. Add an account-and-IP-aware rate limiter to staff login, patient login, password-reset, invitation activation, and Google login.
3. Use uniform invalid-login responses; do not reveal whether an email exists.
4. Record failed-login events without storing passwords or tokens.

**Pass condition:** Repeated failed attempts receive HTTP 429; a legitimate user can still log in after the cooldown.

---

### P0-5: Dependency vulnerabilities are present in locked production dependencies

**Evidence:** Official advisory checks found the following affected locked versions:

| Ecosystem | Locked package | Current version | Audit result | Required action |
|---|---|---:|---|---|
| PHP | `guzzlehttp/guzzle` | 7.11.1 | 7 advisories: 1 high, 6 medium | Update lock to at least the advisory-fixed version, currently 7.15.2 or later; test outbound HTTP features. |
| PHP | `guzzlehttp/psr7` | 2.11.0 | 2 medium advisories | Update to at least 2.12.3 or later. |
| PHP | `league/commonmark` | 2.8.2 | 12 advisories: 9 high, 3 medium | Update to at least 2.10.0 or later. |
| JavaScript | `nanoid` | 3.3.12 | 2 high advisories | Update lock to 3.3.18 or later. |
| JavaScript | `postcss` | 8.5.15 | 2 advisories, including high path traversal/file disclosure | Update lock to a version newer than the affected `<=8.5.22` range. |
| JavaScript | `react-router-dom` / `react-router` | 6.30.4 | 2 moderate advisories | Upgrade to an advisory-fixed supported release; audit indicates React Router 7.18.0+ for the transitive router findings. This is likely a major-version migration, so plan and test it. |

**Required change:**

1. Create a dependency-update branch; do not use `--no-audit` or ignore advisories as a deployment workaround.
2. Update PHP dependencies with Composer while preserving Laravel 12 compatibility, then run `composer audit --locked` until it returns no applicable advisories.
3. Update frontend dependencies and lockfile. Run `npm audit --omit=dev` until it returns no applicable production vulnerabilities.
4. Run the entire test suite and a production build after every dependency update.

**Pass condition:** Both dependency audits are clean, or a documented, reviewed, time-limited risk acceptance exists for a non-exploitable advisory. No such acceptance is recommended for this demo.

---

### P0-6: Vaccine inventory operations are not concurrency-safe and FIFO can be bypassed

**Evidence:** `VaccineInventoryUsageService::deductForTreatment()` reads an eligible batch, calculates a quantity, updates it, and inserts a transaction without a database transaction or `lockForUpdate()`. When `force_batch_id` is supplied, it chooses the requested active batch and does not confirm it is the earliest-expiring FIFO batch. The automated open-vial path has the same read/update concurrency pattern.

**Risk:** Concurrent administration can overspend stock or generate inconsistent open-vial state. A client can choose a non-FIFO batch. These are medical inventory integrity problems and were correctly identified as critical in the prior project audit.

**Required change:**

1. Place selection, stock/open-vial update, and transaction insert in one `DB::transaction()`.
2. Select the relevant inventory row(s) with `lockForUpdate()` on MySQL.
3. Re-check stock after the lock is acquired.
4. Enforce FIFO in the same transaction; reject a non-FIFO `force_batch_id` or require a separately authorized, audited override.
5. Add a MySQL concurrency test (not only an SQLite unit test) and verify no negative stock, duplicate consumption, or skipped FIFO batch occurs.

**Pass condition:** A concurrent test against MySQL leaves quantities and transaction totals consistent, and a non-FIFO request returns 422/403 without changing stock.

---

### P0-7: Inventory history can be hard-deleted and changes lack full audit records

**Evidence:** `DELETE /api/inventory/{id}` permits `admin,developer`; `VaccineInventoryController::destroy()` hard-deletes the record. Inventory create, update, open-vial, discard, adjust, use, and delete methods do not call the available `AuditLog` model. The database foreign key from transactions cascades on inventory delete.

**Risk:** A privileged developer can remove an inventory record and its associated transaction history. This undermines traceability. The issue is narrower than the older report's “any nurse can delete” claim—the route currently excludes nurses—but it remains an unacceptable destructive privilege for a deployed clinical-inventory system.

**Required change:**

1. Restrict deletion to an administrator only; remove `developer` from destructive production permissions.
2. Prefer soft deletion/status archival over hard deletion. Preserve transactions permanently, including actor, timestamp, reason, before/after values, and correlation/reference ID.
3. Require a non-empty reason and optionally a second approval for inventory write-offs and deletion.
4. Add audit log events atomically in the same transaction as every inventory mutation.
5. Add authorization tests for admin, developer, nurse/treatment, registration, and unauthenticated users.

**Pass condition:** Non-admin deletion returns 403; an admin archival creates an immutable audit event and does not erase transaction history.

---

### P0-8: The test suite is failing

**Evidence:** `php artisan test` result: 16 passed, 6 failed.

| Failed test area | Observed failure | Required change |
|---|---|---|
| Admin user management | A newly created intake nurse has a null `signature_path` where the test expects a default signature. | Decide the intended rule, implement it, and align code/test. Do not deploy with an unresolved staff-signature workflow. |
| Dose administration / void-re-record | Requests return 422: “Select a Doctor-approved bite episode before recording treatment.” | Update test fixtures for the approval prerequisite or fix unintended validation behavior. Cover the approved and rejected paths. |
| Nurse without signature | The test cannot reach its intended signature check because the bite approval validation fails first. | Fix the fixture/order, then prove a missing signature is rejected where required. |
| Mobile booster booking | Expected `has_completed_primary: false` is missing. | Return the documented API field or update the contract/test; test incomplete and completed primary series. |
| Vaccination card / booster | Booking returns 422 where the test expects 201. | Resolve the business rule/fixture mismatch and verify the vaccination-card visibility rule. |

**Required change:** Fix or deliberately update every failing test. Add deployment-critical tests for P0-1 through P0-7. A passing build is a release gate, not a post-demo task.

**Pass condition:** `php artisan test` exits successfully with no failures, and new authorization/token/inventory tests pass against an appropriate MySQL test environment where locking is involved.

---

## 4. P1 changes — complete before sharing beyond the instructor

### P1-1: Public vaccine availability is not clinic-scoped

**Evidence:** `/api/public/vaccine-availability` is public. `publicAvailability()` loads all active `VaccineInventory` rows without `clinic_id`, then returns the first clinic's name and address.

**Risk:** In a multi-clinic deployment, visitors can infer aggregate stock availability across clinics and receive the wrong facility identity. It also exposes operational stock signals unnecessarily.

**Required change:** Remove the endpoint for the demo unless it is essential. If retained, scope it to one deliberate public clinic identifier, return only intentionally public availability bands, and avoid exposing exact stock quantities, clinic address, cold-chain statements, or claims such as `who_pep_compliant: true` unless verified and authorized.

---

### P1-2: Developer database and repair endpoints must not exist in the public deployment

**Evidence:** A `developer` role can list database table details and run appointment repair endpoints under `/api/developer/...`.

**Risk:** A compromised developer account gets powerful introspection and data-changing tools; deploying them increases attack surface with no instructor-demo value.

**Required change:** Exclude these routes/controllers from the demo/production build using a feature flag or environment gate. Keep diagnostic tooling local only. Do not create a developer account on the hosted demo.

---

### P1-3: CORS and authentication architecture need deliberate production configuration

**Evidence:** `config/cors.php` retains localhost allow-list entries and localhost origin patterns. The React client uses bearer tokens stored in `localStorage` and sets `withCredentials: false`.

**Required change:**

1. Set `FRONTEND_URL` to the exact HTTPS Render domain.
2. In production, allow only that exact domain. Remove localhost origins and patterns from production configuration.
3. Maintain bearer-token authentication consistently, or deliberately migrate to cookie/session authentication. Do not add CSRF settings as a superficial fix to a bearer-token flow; CSRF protection is principally required when browsers automatically attach authentication cookies.
4. Add a restrictive Content Security Policy after confirming required map, font, and API origins. This is particularly important while bearer tokens remain in `localStorage`.

---

### P1-4: File and signature handling should be hardened

**Evidence:** Staff signature uploads are moved directly to `public/signatures` with a filename using the client-supplied extension. Base64 signature data is decoded and written without an apparent decoded-size cap or image-content inspection. `signature_path` can be supplied as a string. Clinic logos use the public disk.

**Risk:** Publicly served uploads may be overwritten, malformed, unexpectedly large, or point to arbitrary paths. They are also lost on ephemeral free-host storage.

**Required change:** Store uploads outside the web root or in private object storage, generate filenames server-side, validate MIME type and actual image content, cap decoded size, reject arbitrary `signature_path`, authorize reads, and add malware scanning if real uploads are ever supported. For the demo, disable uploads and use prepackaged fictional assets.

---

### P1-5: Database integrity protections need to back up application validation

**Evidence:** `vaccine_inventory` has indexes but no unique `(clinic_id, batch_number)` constraint and no database-level non-negative `current_quantity` check. `InventoryTransaction` allows caller-controlled `transaction_date` through `$fillable`.

**Required change:** Add migration-level unique/check constraints appropriate to MySQL 8, lock down model fillable fields, set transaction timestamp and actor server-side, prevent direct transaction creation outside approved service methods, and test invalid writes at both HTTP and database levels.

---

### P1-6: Safety policy for open-vial behavior needs server enforcement

**Evidence:** Create/update preset rules permit `open_vial_hours` up to 48 hours; `openVial()` accepts request-provided hours without validation and applies them directly.

**Required change:** Define an approved per-vaccine maximum in configuration/data, enforce it server-side, require an audited administrator override with reason if an exception is permitted, and make the UI display the same rule. This is a clinical workflow rule that must be approved by the appropriate clinical authority; the software team should not hard-code a medical policy without that approval.

---

## 5. P2 reliability and deployment changes

| Area | Current state / risk | Required change before any real use |
|---|---|---|
| Frontend hosting | The prior Railway guide starts Laravel but does not serve `frontend/dist`; the real API variable is `VITE_API_BASE_URL`, not `VITE_API_URL`. | Use a proper static frontend host with SPA rewrite, or implement one tested unified web-server deployment. |
| Queues | `.env.example` uses database queues; free hosting will not run jobs without a worker. | Run and monitor a worker, or disable/label background workflows in the demo. Do not claim reminders are sent when they are queued only. |
| Scheduler | No deployment scheduler is defined. | Add a scheduled command/cron design and test recalls, reminders, cleanup, and token expiry. |
| Mail | Demo configuration uses `MAIL_MAILER=log`. | Treat email/SMS as simulated; use a controlled provider and secrets only after a separate review. |
| Storage | Free web-service filesystems are ephemeral. | Use durable private object storage or a persistent volume; plan backup/restore tests. |
| Backups and restore | No host backup/restore procedure is verified. | Implement encrypted database backups, retention, access controls, and a restore drill. |
| Observability | No defined health check, alerting, error monitoring, or log redaction review. | Add a minimal generic health endpoint, monitor failures, redact sensitive fields, and set production log level. |
| HTTP security | No confirmed production security headers/HTTPS enforcement review. | Enforce HTTPS at host/proxy; configure CSP, `X-Content-Type-Options`, referrer policy, frame protection, and HSTS where appropriate. Test rather than assume. |
| Migration process | Running migrations in every application start command is unreliable. | Run reviewed migrations once per release, take a backup first, and have a rollback plan. |

---

## 6. Findings from the earlier audit — re-validation status

| Earlier finding | Current code status | Current audit result |
|---|---|---|
| Inventory race condition | No transaction/row lock in manual or open-vial deduction flow. | Confirmed P0. |
| FIFO bypass | `force_batch_id` is accepted without server-side FIFO match. | Confirmed P0. |
| “Anyone can delete inventory” | Current route permits `admin,developer`, not all nurses. | Reclassified: still P0 due to developer deletion, hard delete, and cascaded history loss. |
| No inventory audit trail | `AuditLog` model exists but inventory controller methods do not call it. | Confirmed P0. |
| Open-vial timer manipulation | Up to 48 hours is accepted in related paths; `openVial()` lacks request validation. | Confirmed P1 clinical rule gap. |
| Inventory mass assignment | Model has sensitive fields fillable, though inspected controller methods use an explicit allow-list. | Defense-in-depth P1; no direct `$request->all()` exploit was confirmed in inspected methods. |
| Weak defaults | Development seeding can create predictable accounts; a safe deployed seeding path is not verified. | P1: use a controlled demo seeder and force password replacement. |
| Manual/backdated inventory transaction | `transaction_date` is fillable. | Confirmed P1. |
| CSRF absent | App currently uses explicit bearer headers, not cookie credentials. | Reframed: use correct CORS + XSS controls now; CSRF becomes mandatory if migrating to cookie-based auth. |
| Permissive CORS | Localhost remains permitted by configuration. | Confirmed P1 deployment configuration task. |
| XSS in report preview | `dangerouslySetInnerHTML` is present. | Confirmed P1; inspect/report-data escaping and sanitize if any untrusted value reaches the HTML string. |
| Unlimited tokens | Sanctum expiration is null. | Confirmed P0. |
| Missing inventory constraints | No composite batch uniqueness or quantity check found in inventory migration. | Confirmed P1. |

---

## 7. Required implementation order

1. **Create a security-fix branch.** Do not deploy directly from the current branch.
2. **Eliminate public privileged provisioning**: P0-1, P0-2, P0-3, P0-4.
3. **Repair inventory integrity**: P0-6 and P0-7, including MySQL concurrency tests.
4. **Update dependencies**: P0-5, then rebuild and test.
5. **Fix all six automated-test failures** and add tests for every P0 control.
6. **Remove developer tools and unnecessary public endpoints** from the demo build; scope public availability if retained.
7. **Apply P1 upload, database, CORS, and open-vial rules.**
8. **Set up the demo hosting path** from `tasks/demo_free_hosting_deployment_plan.md` using only synthetic data.
9. **Perform a deployment verification**: HTTPS, CORS, role checks, throttling, expired-token rejection, no URL-token print flow, normal demo workflow, logs, and teardown.
10. **Re-run this audit evidence** on the release commit and document the version, results, outstanding items, and final decision.

---

## 8. Release checklist

### Required for online instructor demo

- [ ] Every P0 item has a pull request, peer review, passing automated tests, and verification evidence.
- [ ] `php artisan test` passes with zero failures.
- [ ] `composer audit --locked` and `npm audit --omit=dev` have no applicable production vulnerabilities.
- [ ] MySQL concurrency/FIFO tests pass.
- [ ] Public registration is disabled and no public route can create an administrator.
- [ ] URL-token authentication has been removed; print is disabled until its safe replacement is verified.
- [ ] Tokens expire server-side; revocation has been tested.
- [ ] Login and related public endpoints are rate-limited.
- [ ] The deployed build has no developer user/tools, debug mode, real data, default passwords, or unreviewed public setup path.
- [ ] The frontend uses `VITE_API_BASE_URL` and CORS permits only its exact deployed origin.
- [ ] Only synthetic data is in the hosted database and assets.
- [ ] A local presentation fallback and a documented teardown date exist.

### Required before real operation (not satisfied by a demo)

- [ ] Privacy/data-protection assessment and clinic authorization.
- [ ] Real hosting agreement, backup/restore drill, durable private file storage, and monitoring/incident response.
- [ ] Clinical governance approval for inventory, open-vial, FIFO, treatment, and override rules.
- [ ] Formal access-management, account-recovery, retention, and audit-log review.
- [ ] Independent security testing and remediation review.

