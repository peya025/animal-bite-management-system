# Instructor Demo Deployment Plan

**System:** Animal Bite Management System  
**Purpose:** short, instructor-only demonstration — **not** clinical use, pilot use, or public launch  
**Target duration:** one to three weeks  
**Recommended hosting:** Railway free trial for Laravel + MySQL, Render Static Site for React  
**Last reviewed:** 2026-09-19

---

## 1. Decision and demo boundary

Use Railway only as a short-lived test environment. It is the best fit for this repository because the backend is Laravel 12 on PHP 8.2+ and currently requires MySQL. Railway's free access is a **one-time $5 trial credit**, not a recurring free plan. Stop the services after the presentation or before the credits end.

Deploy the React frontend as a Render Static Site. This keeps the frontend free and removes the need to make Laravel serve the Vite build. The result is two URLs:

```text
Instructor browser
  -> Render Static Site (React user interface)
  -> Railway Web Service (Laravel API)
  -> Railway MySQL service (demo data)
```

This is slightly more setup than one service, but is much safer than the current one-URL Railway instructions, which start Laravel without placing or serving `frontend/dist`. It also avoids using Vercel Hobby for an institutional system; its free tier is limited to personal, non-commercial use.

### Non-negotiable scope

- Use only synthetic, non-identifying records. Do not enter real names, mobile numbers, birth dates, addresses, exact map points, clinic identifiers, signatures, photos, login credentials, or patient records.
- Do not present the deployed site as ready for real clinic operations.
- Give the instructor one least-privileged demo account. Do not share an administrator or developer account unless a specific admin-only workflow must be demonstrated.
- Remove the hosted services and revoke all demo credentials after the assessment.

The system stores sensitive health-related information, and a free testing host does not provide the operational controls, backups, access management, or service commitment needed for live patient data.

---

## 2. Why this platform choice

| Option | Decision | Reason |
|---|---|---|
| Railway API + MySQL | Use for the demo | Matches the existing Laravel and MySQL stack without database conversion. |
| Render Static Site | Use for the React app | Free static hosting; handles the Vite output cleanly. |
| Render free web service + free database | Do not use first | The free database is PostgreSQL, not MySQL, expires after 30 days, and the web service sleeps after 15 minutes. |
| Vercel Hobby | Avoid for this deployment | Its free plan is for personal, non-commercial use. |
| Railway as a permanent free host | Do not assume | The trial credit is one-time; paid Hobby begins at $5/month. |

Authoritative plan references:

- [Railway plans and trial credit](https://docs.railway.com/pricing/plans)
- [Render free service limitations](https://render.com/docs/free)
- [Vercel Hobby plan restrictions](https://vercel.com/docs/plans/hobby)

---

## 3. Readiness gates — do not deploy until these pass

### Gate A — demo data and repository hygiene

- [ ] The database used for the demo contains synthetic data only.
- [ ] No `.env`, credentials, database export containing real data, private keys, or OAuth secrets are committed to GitHub.
- [ ] Make the GitHub repository private.
- [ ] Change `frontend/.env` to a safely committed `frontend/.env.example`, and add `frontend/.env` to `.gitignore`. The current tracked frontend file contains public build variables only, but keeping it tracked invites an accidental future secret commit.
- [ ] Create a separate backend production environment in the hosting dashboard. Never upload or commit `backend/.env`.
- [ ] Generate a new, unique `APP_KEY` in the deployment environment; do not reuse a local key.
- [ ] Save an encrypted or access-controlled local copy of the demo database export before the first deployment.

### Gate B — required security work

The existing `SECURITY_FIX_CHECKLIST.md` labels the following as critical. They should be implemented and tested before exposing inventory workflows, even for a short demo:

- [ ] Prevent concurrent vaccine deduction races using a database transaction and `lockForUpdate()`.
- [ ] Enforce FIFO batch selection on the backend, not only in the user interface.
- [ ] Limit inventory deletion to `admin` only. The current route permits both `admin` and `developer` to delete inventory.
- [ ] Record inventory creation, adjustment, use, and deletion in audit logs.

The following are the minimum additional guards for an internet-accessible demo:

- [ ] Add throttling to `/api/login` and `/api/register`. These standard public routes currently have no explicit throttle, while Google login and setup have limits.
- [ ] Disable public registration for the demo, or restrict it to a controlled invitation flow. Do not let visitors create staff accounts.
- [ ] Ensure initial clinic setup has completed, then disable or protect `/api/setup/initialize`. It is currently publicly reachable.
- [ ] Set Sanctum token expiry (for example, 24 hours) and revoke demo tokens after the presentation. `backend/config/sanctum.php` currently uses `expiration => null`; the frontend's 15-minute idle timeout only removes a browser token and does not expire it on the server.
- [ ] Remove query-string token authentication from `/api/print/patient/{id}/enrolment`. The current print controller accepts `?token=...`; URL tokens can leak through browser history, screenshots, logs, referrers, and shared links. Until fixed, do not demonstrate printing from the hosted environment.
- [ ] Do not create a `developer` account online. The developer role exposes database-explorer and repair endpoints; it also has destructive inventory access today.
- [ ] Remove or restrict `/api/test` in the hosted build. It exposes the Laravel version and timestamp without authentication.
- [ ] Set `APP_ENV=production`, `APP_DEBUG=false`, and `LOG_LEVEL=warning` or `error`.
- [ ] Set `FRONTEND_URL` to the exact Render URL and remove localhost origins/patterns from the production CORS configuration. The app uses bearer tokens in `localStorage` with `withCredentials: false`; do not add cookie-based CSRF settings unless authentication is deliberately redesigned to use cookies.
- [ ] Review every use of `dangerouslySetInnerHTML` and sanitize untrusted HTML before it can contain user-supplied content. This matters especially because an XSS attack can steal a bearer token stored in `localStorage`.

### Gate C — deployment behavior

- [ ] `composer install --no-dev --optimize-autoloader` completes for `backend`.
- [ ] `npm ci` and `npm run build` complete for `frontend`.
- [ ] `php artisan test` passes for the backend.
- [ ] Run `php artisan migrate --force` against an empty demo database successfully.
- [ ] Run the app locally using production-style values and test login, patient display, role restrictions, inventory display, maps, and logout.
- [ ] Confirm the React build uses `VITE_API_BASE_URL`. This is the actual variable in `frontend/src/shared/services/api.ts`; the older deployment guide incorrectly refers to `VITE_API_URL`.

---

## 4. Recommended step-by-step deployment

### Phase 0 — prepare a safe release branch

1. Create a branch such as `demo/instructor-deployment`.
2. Implement the Gate B fixes on that branch and have a teammate review them.
3. Create a fresh MySQL database locally and seed only demonstrative records. Use invented places and coordinates, not real clinic locations.
4. Export that demo-only database as a recovery copy. Keep it out of Git.
5. Create distinct demo accounts:
   - `demo-admin`: only if administration must be shown; use only while presenting.
   - `demo-staff` or `demo-treatment`: for normal instructor login and workflows.
   - Do not create `developer` users on the hosted database.
6. Reset any predictable seeded password before making the URL available.

### Phase 1 — create the private repository

1. Confirm the root, backend, and frontend ignore rules exclude `node_modules`, `vendor`, `dist`, `.env` files, logs, and database exports.
2. Commit only source code, migrations, safe example environment files, and deployment configuration.
3. Push the branch to a **private** GitHub repository.
4. Enable two-factor authentication on the GitHub, Railway, and Render accounts.

### Phase 2 — provision Railway backend and database

1. Sign in to Railway and create a project from the private GitHub repository.
2. Add a MySQL service to that project.
3. Add a web service for `backend`.
4. Configure the build and start commands for the backend service:

```text
Build: composer install --no-dev --optimize-autoloader
Start: php artisan serve --host=0.0.0.0 --port=$PORT
```

For a short demo, run migrations manually after a successful first build. Do **not** put `php artisan migrate --force` in every start command; repeated migrations on each restart make failures harder to diagnose.

5. In Railway, add backend environment variables. Use Railway's MySQL variables for the database values rather than typing credentials into source code:

```env
APP_NAME="Animal Bite Management System — Demo"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<railway-api-domain>
APP_TIMEZONE=Asia/Manila
APP_KEY=base64:<new-unique-key>

DB_CONNECTION=mysql
DB_HOST=${{MYSQLHOST}}
DB_PORT=${{MYSQLPORT}}
DB_DATABASE=${{MYSQLDATABASE}}
DB_USERNAME=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}

SESSION_DRIVER=database
CACHE_STORE=database

# Choose deliberately; see queue risk below.
QUEUE_CONNECTION=sync

MAIL_MAILER=log
LOG_LEVEL=warning
FRONTEND_URL=https://<render-frontend-domain>
SANCTUM_STATEFUL_DOMAINS=<render-frontend-domain-without-https>
SEED_DEFAULT_CLINIC=false
```

`QUEUE_CONNECTION=sync` is appropriate only for this small demo if queued features are not being load tested. It makes jobs run during the request. Do not use this setting for real clinic operations.

6. Once deployed, use the Railway service shell or a one-off controlled command to run:

```bash
php artisan migrate --force
php artisan db:seed --class=<YourDemoSeeder>
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Use an explicit demo seeder only after verifying it cannot create known default production-like accounts. If no safe seeder exists, create the minimum fictional clinic and accounts through the protected application setup while the URL is not shared.

7. Generate a Railway public domain and test these endpoints without revealing any sensitive data:

```text
GET  https://<railway-api-domain>/api/test       (remove this endpoint before sharing)
POST https://<railway-api-domain>/api/login
GET  https://<railway-api-domain>/api/me
```

### Phase 3 — deploy the React frontend on Render

1. In Render, create a **Static Site** from the same private repository.
2. Set the Root Directory to `frontend`.
3. Use:

```text
Build command: npm ci && npm run build
Publish directory: dist
```

4. Add this Render environment variable before deploying:

```env
VITE_API_BASE_URL=https://<railway-api-domain>/api
```

5. Configure a single-page app rewrite so routes such as `/login`, `/patients`, and `/inventory` serve `index.html` instead of returning 404. In Render Static Site routing, add a rewrite from `/*` to `/index.html` with status `200`.
6. Deploy and copy the Render URL.
7. Update `FRONTEND_URL` in Railway to that exact URL, then redeploy or clear/configure the Laravel configuration cache.
8. Test browser CORS behavior: login, reload a nested route, open an authorized page, and log out. A CORS failure means the Render origin and `FRONTEND_URL` do not exactly match.

### Phase 4 — controlled verification

Perform verification in an incognito/private browser session as the instructor would:

- [ ] The landing page and login page load over HTTPS.
- [ ] A normal demo account can sign in and sign out.
- [ ] A normal demo account cannot access admin, developer, database explorer, user deletion, or inventory deletion functions.
- [ ] An invalid login receives a generic error and rate limiting returns HTTP 429 after the configured threshold.
- [ ] A direct request to an authenticated endpoint without a token returns HTTP 401.
- [ ] A normal account cannot access another role's protected endpoint by pasting its URL.
- [ ] Patient, case, treatment, queue, inventory, and map screens show only synthetic data.
- [ ] Refreshing a frontend URL such as `/patients` does not return 404.
- [ ] No browser console CORS, mixed-content, or exposed-stack-trace errors appear.
- [ ] Logs do not contain tokens, passwords, or patient-like data.
- [ ] A duplicate/non-FIFO/concurrent inventory test behaves according to the critical fixes.
- [ ] The print route is not used until the query-token design is removed.

Record the deployed frontend URL, backend URL, Railway credit balance, deploy date, and teardown date in a private team note.

---

## 5. Current-system risk register

| Risk / current observation | Impact in a public demo | Required mitigation | Owner / gate |
|---|---|---|---|
| Railway trial credit is finite | Demo can stop unexpectedly or turn paid | Monitor credit; set a teardown date; do not promise permanent access | Deployment owner |
| Real patient or clinic data | Privacy breach and inappropriate data processing | Synthetic records only; private repository; limited accounts; delete after demo | Entire team |
| `/api/print/...?...token=` authenticates from URL token | Token can leak and grant protected record access | Remove query token flow; use an authorized blob request or server session redesign; do not demo printing until fixed | Backend blocker |
| Sanctum token expiry is `null`; token is stored in browser `localStorage` | A copied or XSS-stolen token remains usable | Server-side expiry and token revocation; sanitize HTML; short demo tokens | Backend blocker |
| `/api/login` and `/api/register` have no explicit throttle | Password guessing and account creation abuse | Add rate limits; disable/restrict registration | Backend blocker |
| `/api/setup/initialize` is public | A visitor may attempt setup manipulation | Complete setup before sharing and require admin/authentication or disable endpoint | Backend blocker |
| Developer endpoints expose database exploration and repair tools | High-impact data exposure or modification | Do not deploy developer users; remove or feature-flag those routes in demo | Backend blocker |
| Inventory delete allows `developer` | Destructive action beyond administrator | Make deletion admin-only and test 403 for non-admins | Critical checklist |
| Inventory deduction/FIFO issues from security report | Incorrect stock records during a demo | Implement transaction locking, backend FIFO enforcement, database constraints, audit logs | Critical checklist |
| Free-host filesystem is ephemeral | Uploaded clinic logos and signatures can vanish after redeploy/restart | Avoid uploads; use prepackaged fake assets; later use object storage or persistent volume | Demo limitation |
| Signature handling writes to `public/signatures` without visible file validation in `processSignature()` | Malicious or oversized files could be public | Do not expose signature upload in demo; add MIME, size, image-content validation and non-public storage before real use | High priority |
| Clinic logo uses Laravel `public` disk | Needs `storage:link` and durable storage; may disappear | Do not upload during demo or use a persistent/object storage design | Demo limitation |
| Database queue driver without worker | Recall/notification jobs can accumulate and not run | Use `sync` only for the demo, or deploy and monitor a worker; document which features are excluded | Demo limitation |
| `MAIL_MAILER=log` | Invitations and reminders do not actually send | Do not claim email/SMS reminders work; test the UI/state only | Demo limitation |
| No scheduled worker/cron plan | Automatic recalls and scheduled tasks may not run | Exclude automated jobs from demo or trigger only controlled manual demo actions | Demo limitation |
| Current CORS includes localhost origins | Incorrect origins can cause browser failures or wider-than-needed access | Production configuration must include only the exact Render origin | Deployment gate |
| Frontend `.env` is tracked | Future developers could commit secrets | Commit only `.env.example`; ignore actual `.env` | Repository gate |
| Public `/api/test` discloses version | Minor reconnaissance information | Remove or return a generic health result during demo | Pre-share task |
| Render frontend is public by URL | Anyone with link can reach the login page | Share only with instructor; use non-obvious URL; turn down immediately after demo | Deployment owner |

---

## 6. Features to include and exclude from the instructor demo

### Safe to demonstrate after the readiness gates

- Login and role-based navigation using demo accounts.
- Fictional patient registration and case journey.
- Queue workflow with a single presenter account.
- Vaccine inventory viewing and a controlled workflow only after the inventory fixes are verified.
- Dashboard, reports, and map visuals using fictional/de-identified locations.

### Exclude or clearly label as simulated

- Printing patient enrolment forms until URL-token authentication is removed.
- Actual email, SMS, password reset delivery, and automated recall scheduling.
- Google OAuth unless a separate demo OAuth client and authorized redirect URLs are configured.
- Uploading clinic logos, signatures, photos, or clinical attachments.
- Parallel inventory transactions or stress testing during the live presentation.
- Developer diagnostics, database browser, repair tools, and any destructive delete actions.

---

## 7. Presentation runbook

### The day before

1. Check Railway credit and service status.
2. Run the Phase 4 verification checklist on a different browser or device.
3. Confirm the Render URL points to the intended Railway API.
4. Record two demo account credentials in a password manager or offline note; do not place them in slides, chat, source code, or the repository.
5. Prepare screenshots or a local fallback in case the free host is unavailable.
6. Export the demo database again so the team can restore the exact starting state if a demo workflow changes data.

### During the demo

1. Use the normal least-privileged account first.
2. Explain that the environment is a synthetic-data evaluation deployment.
3. Avoid showing the browser address bar while a tokenized or sensitive URL is open.
4. Do not open browser developer tools, logs, Railway variables, GitHub settings, or the database dashboard in the presentation.
5. If a security question arises, state the mitigation status accurately; do not describe unfinished controls as implemented.

### If the host fails

1. Wait for the Railway service to recover and check Railway deployment logs.
2. Verify `FRONTEND_URL`, `VITE_API_BASE_URL`, MySQL service status, and migrations.
3. Use the prepared local XAMPP environment/screenshots as the presentation fallback.
4. Do not make rushed changes directly in production variables without recording them; make the change on the release branch and redeploy.

---

## 8. Teardown plan

Immediately after the instructor has finished evaluating the system:

- [ ] Revoke/delete all hosted Sanctum personal access tokens.
- [ ] Disable or delete all demo user accounts, especially admin and developer accounts.
- [ ] Take one final demo-data export only if the team needs it for local development; keep it private and delete it when no longer needed.
- [ ] Delete the Railway web service, MySQL service/volume, and Render Static Site, or at minimum stop them before the trial credit expires.
- [ ] Remove the public Render and Railway URLs from shared documents.
- [ ] Remove the demo OAuth redirect URL, if OAuth was enabled.
- [ ] Record lessons learned and unresolved security items in the project task list.

Deletion is the correct endpoint for this demo environment. Do not repurpose it for a clinic pilot without a separate production security, privacy, backup, monitoring, access-control, and hosting review.

---

## 9. Definition of done

The deployment is ready to share with the instructor only when all of the following are true:

- Critical inventory controls and the listed internet-facing auth/token guards are implemented and verified.
- The site contains only synthetic data.
- Both URLs work over HTTPS, including React deep links and authenticated API calls.
- The instructor uses a least-privileged account.
- No developer, setup, unsafe print-token, or uncontrolled registration path is exposed.
- The team has a tested local fallback and a scheduled teardown.

