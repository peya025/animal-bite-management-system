# Deployment Readiness Remediation Tasks

**System:** Animal Bite Management System  
**Prepared from:** `tasks/pre_deployment_system_change_audit.md` and the implementation review on 2026-09-20  
**Current branch reviewed:** `deployment`  
**Release decision:** **Do not expose the application at a public URL until the isolated MySQL concurrency test and the final hosted release gate are complete.**

---

## Verified baseline

The following checks passed in the reviewed workspace:

- `php artisan test`: **57 passed, 223 assertions**
- `composer audit --locked`: **0 advisories**
- `npm audit --omit=dev`: **0 vulnerabilities**
- `npm run build`: completed successfully

These results do **not** prove that the deployed application is ready. In particular, the inventory concurrency test uses in-memory SQLite and sequential calls, not competing MySQL transactions.

---

## P0 — required before deployment

### P0-1 — Make inventory adjustment atomic and concurrency-safe

**Implementation status (2026-09-20):** Implemented and covered by local feature tests. MySQL contention evidence remains pending under P0-3.

**Problem**

`VaccineInventoryController::adjustStock()` reads a record, calculates a quantity, updates stock, writes an inventory transaction, and writes an audit record without a database transaction or `lockForUpdate()`.

**Risk**

Concurrent adjustments can overwrite each other, produce an incorrect stock balance, or leave the inventory change without its ledger or audit record.

**Required implementation**

1. Validate the request before opening the transaction.
2. Wrap the read, quantity calculation, inventory update, `InventoryTransaction` insertion, and audit insertion in one `DB::transaction()` callback.
3. Retrieve the clinic-scoped inventory record with `lockForUpdate()` inside that callback.
4. Re-read and calculate the quantity after the lock is held.
5. Reject a disposal/expiry request that exceeds stock, rather than silently clamping the quantity with `max(0, ...)`, unless an explicitly approved write-off workflow is required.
6. Keep the inventory transaction date server-generated and include the authenticated actor, reason/remarks, reference ID, and balance.
7. Write `inventory.adjust` atomically with complete before/after values.

**Files likely affected**

- `backend/app/Http/Controllers/VaccineInventoryController.php`
- `backend/tests/Feature/Inventory/`

**Acceptance criteria**

- Two competing adjustments cannot lose a stock update.
- A failed ledger or audit write rolls back the stock update.
- Stock never becomes negative.
- The successful request creates one ledger row and one `inventory.adjust` audit event with the correct actor and before/after quantities.

---

### P0-2 — Make open-vial discard atomic and auditable

**Implementation status (2026-09-20):** Implemented and covered by local feature tests. MySQL contention evidence remains pending under P0-3.

**Problem**

`VaccineInventoryController::discardVial()` updates the vial state and writes a transaction without `DB::transaction()`, `lockForUpdate()`, or an audit event.

**Risk**

Two users can change the same open-vial state concurrently, and a disposal event can lack immutable audit evidence.

**Required implementation**

1. Require a non-empty reason for a discard/write-off, with an appropriate minimum and maximum length.
2. Use a `DB::transaction()` callback.
3. Retrieve the clinic-scoped row with `lockForUpdate()` inside the transaction.
4. Confirm that the vial is currently open before clearing open-vial fields; return a meaningful conflict/validation response otherwise.
5. Update vial status, create the inventory transaction, and write an `inventory.discard_vial` audit event in the same transaction.
6. Record before/after open-vial state, actor, timestamp, reason, and any discarded quantity.

**Acceptance criteria**

- An unaudited discard cannot occur.
- A failure in either the ledger or audit insert rolls back the state change.
- Repeated/concurrent discard attempts do not create inconsistent vial state or duplicate disposal records.

---

### P0-3 — Add real MySQL 8 concurrency coverage

**Implementation status (2026-09-20):** Test and dedicated worker were added, but not executed because no explicitly configured disposable MySQL 8 test database is available in this workspace. This task remains open.

**Problem**

The existing `ConcurrencyTest` uses SQLite in-memory configuration and executes deductions one after another. SQLite does not validate MySQL row locking, and sequential calls do not simulate a race.

**Required implementation**

1. Create a dedicated MySQL 8 test configuration using an isolated test database. Do not use the development or demo database.
2. Run migrations against that test database as part of the MySQL test setup.
3. Create two independent concurrent workers/processes that attempt to deduct or adjust the same batch simultaneously.
4. Coordinate the workers so both contend for the same row while one transaction remains open.
5. Assert the final quantity, total transaction quantity, audit-event count, and batch status are consistent.
6. Cover at least these paths:
   - Manual FIFO deduction.
   - Automated open-vial dose administration.
   - Stock adjustment/disposal after P0-1 is implemented.
   - Open-vial discard after P0-2 is implemented.
7. Document the exact command and required environment variables in the test README or this file.

**Acceptance criteria**

- MySQL test evidence shows `lockForUpdate()` protects the contested row.
- No negative quantity, duplicate deduction, lost adjustment, or detached audit/ledger row is possible in the tested scenarios.
- The regular SQLite suite remains fast, while the MySQL integrity suite is a required release command.

---

### P0-4 — Complete print authorization coverage for patient accounts

**Implementation status (2026-09-20):** Decided and implemented: patient-account self-printing is intentionally rejected. A feature test proves a linked patient account receives 403.

**Problem**

Staff printing is protected by `auth:sanctum` and `PatientPolicy`, but the policy accepts `User`; mobile patient accounts are a different model/guard. Patient self-service print behavior is neither implemented nor covered by a test.

**Required decision**

Choose one approach and document it:

1. **Do not support patient self-service printing:** explicitly reject patient-account access and add a test proving it returns 403.
2. **Support patient self-service printing:** add a correctly scoped policy/authorization mechanism for `PatientAccount`, permit only its linked patient, and add cross-patient denial tests.

**Acceptance criteria**

- No patient account can print another patient's enrolment record.
- The intended patient-account behavior is covered by an automated feature test.
- Query-string tokens remain unusable for authentication.

---

## P1 — complete before sharing beyond the instructor

### P1-1 — Remove public diagnostic/version endpoint

**Implementation status (2026-09-20):** Implemented: the diagnostic route is only registered for local/testing when developer tools are explicitly enabled.

**Problem:** `/api/test` is publicly reachable and returns the Laravel version and timestamp.

**Task:** Remove it from production routes, or apply the same local/testing plus feature-flag gate as developer routes.

**Acceptance:** In production configuration, `/api/test` returns 404.

### P1-2 — Lock the setup path before public exposure

**Implementation status (2026-09-20):** Implemented: setup routes return 404 in production unless `PUBLIC_SETUP_ENABLED=true` is explicitly set. The hosted database must still be seeded before the URL is shared.

**Problem:** `/api/setup/initialize` is public while no clinic exists; it creates the first admin account.

**Task:** Seed the synthetic demo clinic and complete setup before the service is reachable publicly. Prefer removing or flag-gating setup routes in production after initial provisioning.

**Acceptance:** The deployed URL returns 403/404 for setup initialization, and no unauthenticated user can create an administrator.

### P1-3 — Add and verify a restrictive Content Security Policy

**Implementation status (2026-09-20):** Backend CSP is implemented and tested. The static frontend host must apply its corresponding CSP during deployment because Laravel cannot set headers for a separately hosted Vite site.

**Problem:** Standard security headers are present, but there is no CSP. Bearer tokens are stored in browser local storage, so XSS protection is especially important.

**Task:** Define an allow-list after identifying required API, map, font, and image origins. Add CSP in `SecurityHeaders` and verify normal application flows under the policy.

**Acceptance:** Production responses include a restrictive CSP and there are no CSP violations during the intended demo workflow.

### P1-4 — Fix tracked frontend environment configuration

**Implementation status (2026-09-20):** Implemented: `frontend/.env` was removed from version control, ignored, and the affected direct API calls now prefer `VITE_API_URL` (with `VITE_API_BASE_URL` retained as a backwards-compatible fallback).

**Problem:** `frontend/.env` is tracked and includes obsolete `VITE_API_URL` alongside `VITE_API_BASE_URL`.

**Task:** Move safe defaults to `frontend/.env.example`, ignore `frontend/.env`, and inject the real `VITE_API_URL` only through the hosting environment. `VITE_API_BASE_URL` may remain as a transitional compatibility fallback.

**Acceptance:** No real environment file is tracked; the frontend production build prefers `VITE_API_URL` and supports the existing `VITE_API_BASE_URL` configuration as a fallback.

### P1-5 — Reconcile old deployment documentation

**Implementation status (2026-09-20):** Implemented: the free-hosting guide no longer migrates at application start and no longer documents default hosted credentials.

**Problem:** `DEPLOYMENT_GUIDE_FREE_HOSTING.md` contains examples that run `php artisan migrate --force` as part of application startup, which conflicts with the audited one-time pre-deploy migration process.

**Task:** Mark the old guide obsolete or revise it. Keep one authoritative deployment runbook.

**Acceptance:** No documented web-service start command runs migrations automatically.

---

## P2 — deployment execution and proof

### P2-1 — Prepare production environment variables

Set these only in the hosting dashboard; do not commit them:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<backend-domain>
FRONTEND_URL=https://<frontend-domain>
SANCTUM_TOKEN_EXPIRY_MINUTES=1440
PUBLIC_REGISTRATION_ENABLED=false
DEVELOPER_TOOLS_ENABLED=false
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
LOG_LEVEL=warning
VITE_API_URL=https://<backend-domain>/api
```

Generate a new production `APP_KEY`; set unique, non-default demo credentials through secret environment variables.

### P2-2 — Deploy synthetic data only

1. Create an empty, dedicated MySQL database.
2. Take an encrypted backup before migration.
3. Run migrations once as a pre-deploy/release command, not at application start.
4. Run `php artisan db:seed --class=DemoSeeder` only against the fresh demo database.
5. Verify no developer account, real patient data, real clinic data, or default password is present.

### P2-3 — Configure frontend, worker, and scheduler

1. Deploy the frontend as a static site with `npm run build`, publish directory `dist`, and SPA rewrite `/* -> /index.html`.
2. Configure the frontend's `VITE_API_URL` to the exact HTTPS backend API origin.
3. Select and document either:
   - a monitored queue worker, or
   - `QUEUE_CONNECTION=sync` plus clearly labelled inactive background features for the short demo.
4. Configure a scheduler trigger for `php artisan schedule:run` and retain log evidence that recall jobs and Sanctum pruning run.

### P2-4 — Run and record live release verification

Record the date, release commit, frontend URL, backend URL, operator, and result for every check:

| Check | Expected result |
|---|---|
| HTTPS | HTTP redirects/enforces HTTPS at the host/proxy |
| Health endpoint | `GET /api/health` returns HTTP 200 with `status: ok` |
| Public staff registration | `POST /api/register` returns 404 |
| Developer routes | `/api/developer/...` returns 404 |
| Setup endpoint | `/api/setup/initialize` returns 403 or 404 |
| URL token print | Print request containing `?token=` returns 401 without an Authorization header |
| Cross-clinic printing | Returns 403 |
| Token expiry | A token older than 24 hours returns 401 |
| Login rate limit | Sixth rapid failed login returns 429 |
| CORS | Only the exact frontend origin is accepted |
| Security headers | `nosniff`, frame protection, referrer policy, HSTS, and CSP are present as applicable |
| Inventory integrity | MySQL contention test passes; FIFO violation changes no stock |
| Logs | No password, bearer token, or sensitive record values are exposed |
| Demo workflow | Intake, approval, treatment, and vaccination complete normally |

---

## Final release gate

Deployment is approved only when all conditions below have recorded evidence:

- [ ] P0-1 through P0-4 are complete and peer reviewed.
- [ ] `php artisan test` passes.
- [ ] Dedicated MySQL concurrency/integrity suite passes.
- [ ] `composer audit --locked` reports zero applicable advisories.
- [ ] `npm audit --omit=dev` reports zero production vulnerabilities.
- [ ] `npm run build` passes.
- [ ] Production environment variables are configured and independently checked.
- [ ] The demo database is confirmed synthetic and excludes developer users.
- [ ] The live verification table is complete.
- [ ] A teardown owner and date are recorded; hosted tokens/accounts and services will be removed after evaluation.
