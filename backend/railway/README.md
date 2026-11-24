# Railway Services & Deployment Architecture

Set the Railway service root directory to `backend` for all Laravel services.

## Service Overview

The production architecture consists of four dedicated Railway services and one managed MySQL database:

1. **App Service (Laravel Web API & Auth)**
   - **Role:** Serves the REST API, Sanctum authentication, and WebSocket channel authorization (`/api/broadcasting/auth`).
   - **Start Command:** Default Railway PHP-FPM / Caddy web server.
   - **Pre-deploy Command:** `sh railway/init-app.sh` (runs database migrations, materializes Firebase credentials, clears/caches config).
   - **Public Networking:** Enabled with public domain (e.g. `animal-bite-backend.up.railway.app`).

2. **Reverb Service (Dedicated Real-Time WebSocket Server)**
   - **Role:** Handles high-concurrency WebSocket connections (Pusher v7 protocol) for live queue screens, patient lists, and staff alerts.
   - **Start Command:** `sh railway/run-reverb.sh`
   - **Pre-deploy Command:** None (runs stateless daemon).
   - **Public Networking:** Enabled with dedicated public domain (e.g. `reverb-production-xxxx.up.railway.app`).
   - **Port & TLS Architecture:** The container binds internally to `0.0.0.0:${PORT:-8080}`. Railway's edge reverse proxy automatically terminates TLS, allowing clients to connect securely over `wss://` on standard port `443`.

3. **Queue Worker Service (Messaging & Background Jobs)**
   - **Role:** Processes `notifications,default`, including `DeliverOutboundMessage` and `SendFcmPushNotification`. New queued broadcast events use the separate `broadcasts` queue described below; this service remains unchanged.
   - **Start Command:** `sh railway/run-worker.sh`
   - **Command Details:** `exec php artisan queue:work "${QUEUE_CONNECTION:-database}" --queue=notifications,default --sleep=3 --tries=3 --timeout=60 --max-time=3600`
   - **Public Networking:** Disabled (private worker). Shares the database, application encryption key, and Reverb configuration.

4. **Cron Service (Scheduler)**
   - **Role:** Triggers scheduled tasks (such as daily automatic vaccination recall sweeps at 08:00 AM Manila time).
   - **Start Command:** `sh railway/run-cron.sh`
   - **Public Networking:** Disabled (private worker).

---

## Service Networking & Architecture Diagram

```
[Vercel Frontend (React + TypeScript)]
      │
      ├─ HTTPS REST & Channel Auth (Bearer Sanctum) ──> [Railway App Service] (port 443 -> PHP-FPM)
      │                                                        │
      │                                                  Broadcasts (HTTP POST /apps/{id}/events)
      │                                                        │
      └─ WSS WebSocket Connection (Pusher v7) ─────────> [Railway Reverb Service] (port 443 -> 0.0.0.0:$PORT)
                                                               ▲
                                                               │ Broadcasts (HTTP POST)
                                                               │
                                                        [Dedicated Broadcast Worker (proposed)]
                                                               │
                                                        [Railway MySQL Database]
```

---

## Environment Variables Breakdown

### 1. App Service Environment Variables
Add these in the Railway App Service -> **Variables**:
```dotenv
APP_NAME="Animal Bite Management System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://animal-bite-backend.up.railway.app
APP_KEY=base64:...
APP_TIMEZONE=Asia/Manila
LOG_LEVEL=warning

# CORS configuration: Exact Vercel production origin(s), comma-separated if multiple, no trailing slash
FRONTEND_URL=https://your-project.vercel.app

# Database credentials (linked automatically from Railway MySQL service)
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
QUEUE_CONNECTION=database
CACHE_STORE=database

# Reverb Configuration
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=897821
REVERB_APP_KEY=your-production-reverb-app-key
REVERB_APP_SECRET=your-production-reverb-app-secret
REVERB_HOST=reverb-production-xxxx.up.railway.app
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_ALLOWED_ORIGINS=*

# Firebase credentials (see section below)
FIREBASE_CREDENTIALS_BASE64=...
FCM_ENABLED=false
```

### 2. Dedicated Reverb Service Environment Variables
Add these in the Railway Reverb Service -> **Variables**:
```dotenv
APP_ENV=production
APP_KEY=base64:... (same APP_KEY as App service)

# Reverb App Credentials (must match App and Worker services)
REVERB_APP_ID=897821
REVERB_APP_KEY=your-production-reverb-app-key
REVERB_APP_SECRET=your-production-reverb-app-secret

# Container Listening Settings
REVERB_SERVER_HOST="0.0.0.0"
REVERB_SERVER_PORT=8080

# Public Endpoint Configuration
REVERB_HOST=reverb-production-xxxx.up.railway.app
REVERB_PORT=443
REVERB_SCHEME=https

# Allowed Origins (restrict to production domains or '*' for unrestricted)
REVERB_ALLOWED_ORIGINS=your-project.vercel.app,*.vercel.app
REVERB_DEBUG=false
```

### 3. Queue Worker Service Environment Variables
Add these in the Railway Queue Worker Service -> **Variables**:
```dotenv
APP_ENV=production
APP_KEY=base64:... (same APP_KEY as App service)
APP_TIMEZONE=Asia/Manila
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

QUEUE_CONNECTION=database
MESSAGING_QUEUE_CONNECTION=database
CACHE_STORE=database

# Reverb Broadcaster Configuration (Worker dispatches queued broadcast events to Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=897821
REVERB_APP_KEY=your-production-reverb-app-key
REVERB_APP_SECRET=your-production-reverb-app-secret
REVERB_HOST=reverb-production-xxxx.up.railway.app
REVERB_PORT=443
REVERB_SCHEME=https

# Firebase credentials
FIREBASE_CREDENTIALS_BASE64=...
FCM_ENABLED=false
```

### 4. Cron Service (Scheduler) Environment Variables
Add these in the Railway Cron Service -> **Variables**:
```dotenv
APP_ENV=production
APP_KEY=base64:... (same APP_KEY as App service)
APP_TIMEZONE=Asia/Manila
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

CACHE_STORE=database
QUEUE_CONNECTION=database
MESSAGING_QUEUE_CONNECTION=database

# Broadcasting configuration for dispatched events
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=897821
REVERB_APP_KEY=your-production-reverb-app-key
REVERB_APP_SECRET=your-production-reverb-app-secret
REVERB_HOST=reverb-production-xxxx.up.railway.app
REVERB_PORT=443
REVERB_SCHEME=https
```

### 5. Vercel Frontend Environment Variables
Add these in your Vercel Dashboard -> **Settings** -> **Environment Variables**:
```dotenv
VITE_API_URL=https://animal-bite-backend.up.railway.app/api
VITE_API_BASE_URL=https://animal-bite-backend.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=

# Laravel Reverb Client Configuration
VITE_REVERB_APP_KEY=your-production-reverb-app-key
VITE_REVERB_HOST=reverb-production-xxxx.up.railway.app
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

---

## Port & Connection Distinctions

To ensure smooth operation across the container boundary and edge proxies:

| Layer | Environment Variable / Setting | Target Value | Description |
|---|---|---|---|
| **Reverb Bind Host** | `REVERB_SERVER_HOST` | `0.0.0.0` | Container network interface listening inside Railway. |
| **Reverb Bind Port** | `$PORT` / `REVERB_SERVER_PORT` | `PORT:-8080` | Port assigned by Railway container orchestrator. |
| **Public WSS Host** | `REVERB_HOST` / `VITE_REVERB_HOST` | `reverb-production-xxxx.up.railway.app` | Public domain with TLS termination at Railway edge. |
| **Public WSS Port** | `REVERB_PORT` / `VITE_REVERB_PORT` | `443` | Edge HTTPS/WSS port accessed by browsers. |
| **Public WSS Scheme** | `REVERB_SCHEME` / `VITE_REVERB_SCHEME` | `https` (or `wss`) | Enforces TLS (`forceTLS = true`) to prevent mixed content. |
| **Auth Endpoint** | `VITE_API_URL` | `https://.../api` | Sanctum Bearer channel auth via `POST /api/broadcasting/auth`. |

---

## Security & Channel Isolation

1. **Private Channel Protection:**
   - All clinic channels (`clinic.{id}.queue`, `clinic.{id}.notifications`, `clinic.{id}.inventory`) and patient channels (`patient.account.{id}`) are defined as `PrivateChannel`.
   - Reverb rejects subscription requests unless the client provides an authorization signature generated by `POST /api/broadcasting/auth`.
2. **Clinic Multi-Tenant Isolation:**
   - Staff credentials authenticate against Sanctum. The authorizer callback in `routes/channels.php` verifies that `(int) $user->clinic_id === (int) $clinicId`.
   - Staff cannot subscribe to another clinic's queue or notifications.
3. **Zero PHI in Public Payloads:**
   - `QueueTicketUpdated` broadcasts only queue ID, queue number, status, station, call count, and lane. Patient names and health conditions are strictly excluded.
4. **Secret Protection:**
   - `REVERB_APP_SECRET` is never sent to the frontend. The React client only possesses `REVERB_APP_KEY`.

---

## Firebase Service Account Credentials Configuration

Firebase service account credentials (`firebase-credentials.json`) are gitignored and never committed.
In Railway, configure credentials using one of the following environment variables:

1. **`FIREBASE_CREDENTIALS_BASE64` (Recommended):**
   - Encode the service account JSON file to Base64 (single line):
     ```bash
     base64 -w 0 storage/app/private/firebase-credentials.json
     ```
   - In Railway Dashboard, go to your project/service -> **Variables** -> Add `FIREBASE_CREDENTIALS_BASE64` with the output.
   - Base64 encoding avoids newline escaping and shell quoting issues across container environments.

2. **`FIREBASE_CREDENTIALS_JSON` (Alternative):**
   - Copy the raw JSON content of your service account file and set it as `FIREBASE_CREDENTIALS_JSON`.

During pre-deploy (`sh railway/init-app.sh`), the script materializes the credentials to `storage/app/private/firebase-credentials.json` with restrictive permissions (`0600`).
The backend application also dynamically reads `FIREBASE_CREDENTIALS_BASE64` or `FIREBASE_CREDENTIALS_JSON` in-memory across web and worker containers.

### Safe Verification (Dry-Run)
To test Firebase credentials on Railway without dispatching real push notifications to patients:
```bash
php artisan fcm:test --patient=1 --dry-run
```
Automatic push delivery remains disabled (`FCM_ENABLED=false`) until explicitly enabled after testing.

---

## Manual Production Verification Procedures

Once all services are provisioned on Railway and Vercel:

1. **Step 1: Check Reverb Server Logs**
   - In the Railway Dashboard, open the **Reverb Service** logs.
   - Confirm the startup log appears:
     ```
     Starting Laravel Reverb WebSocket server on 0.0.0.0:8080...
        INFO  Starting server on 0.0.0.0:8080 (reverb-production-xxxx.up.railway.app)
     ```

2. **Step 2: Verify WebSocket Handshake via Browser / Console**
   - Open browser DevTools on your deployed Vercel application.
   - In the **Network** tab, filter by `WS`.
   - Verify connection entry:
     - URL: `wss://reverb-production-xxxx.up.railway.app/app/your-production-reverb-app-key?protocol=7&client=js&version=8.6.0...`
     - Status: `101 Switching Protocols`.

3. **Step 3: Verify Channel Authorization**
   - Log in as clinical staff on Vercel.
   - In DevTools Network tab, check `POST /api/broadcasting/auth`.
   - Status must be `200 OK` with JSON response containing `{ "auth": "..." }`.
   - In the WebSocket frames tab, verify message:
     ```json
     {"event":"pusher:subscribe","data":{"auth":"...","channel":"private-clinic.1.queue"}}
     ```
     followed by:
     ```json
     {"event":"pusher_internal:subscription_succeeded","channel":"private-clinic.1.queue"}
     ```

4. **Step 4: End-to-End Real-Time Action Test**
   - Open the **Queue Display** page in one browser window (`/queue-display`).
   - In a separate window or device, call a patient from the queue table (`POST /api/queue/{id}/call`).
   - Verify the audio chime plays and the called ticket immediately appears on the Queue Display within < 500ms without manual page refresh.

---

## Troubleshooting & Rollback Procedures

### Issue 1: Mixed Content Error (`Mixed Content: The page at 'https://...' was loaded over HTTPS, but attempted to connect to the insecure WebSocket endpoint 'ws://...'`)
- **Cause:** `VITE_REVERB_SCHEME` is unset or set to `http`, or `VITE_REVERB_PORT` is set to `8080`.
- **Resolution:** In Vercel Environment Variables, set `VITE_REVERB_SCHEME=https` and `VITE_REVERB_PORT=443`. Trigger a redeploy on Vercel.

### Issue 2: WebSocket Connection Fails (`WebSocket connection to 'wss://...' failed`)
- **Cause:** Railway Reverb service does not have a public domain generated, or `REVERB_SERVER_HOST` is bound to `127.0.0.1` instead of `0.0.0.0`.
- **Resolution:**
  1. In Railway Dashboard -> Reverb Service -> **Settings** -> **Networking** -> Generate Public Domain.
  2. Verify start command is `sh railway/run-reverb.sh`.
  3. Verify `REVERB_SERVER_HOST="0.0.0.0"`.

### Issue 3: Channel Authorization 403 Forbidden
- **Cause:** User belongs to a different clinic than the requested channel (`(int) $user->clinic_id !== (int) $clinicId`), or token is invalid.
- **Resolution:** Verify user's clinic assignment in database. Check that Sanctum token is attached in `Authorization: Bearer <token>` header.

### Issue 4: Queued Broadcasts Not Delivering
- **Cause:** The dedicated broadcast worker is not running or not listening to `broadcasts` on the producer's queue connection.
- **Resolution:** After separately approved activation, verify the broadcast-only service command and `broadcasts` processing logs. The existing `run-worker.sh` consumes `notifications,default` and does not process new queued broadcasts. Verify Reverb publishing configuration and actual WebSocket frames; polling can mask delivery failures.

### Emergency Rollback
If WebSockets need to be temporarily disabled in production:
1. In Vercel environment variables, clear `VITE_REVERB_HOST`.
2. The React application automatically detects the missing host and falls back silently to adaptive HTTP polling (5s queue polling, 12s notification polling) with zero user-facing errors.

---

## Queue Worker Reliability & Production Hardening

### 1. Queue Topology & Process Allocation
- **Existing messaging worker queues:** `notifications` (high priority) followed by `default` (standard priority).
- **Existing messaging worker command (unchanged):**
  ```bash
  exec php artisan queue:work "${CONNECTION:-database}" --queue=notifications,default --sleep=3 --tries=3 --timeout=60 --max-time=3600
  ```
- **Job-to-Queue Mapping:**
  - `SendFcmPushNotification`: Enqueued on `notifications` (`config('messaging.queue')`).
  - `DeliverOutboundMessage`: Enqueued on `notifications` (`config('messaging.queue')`).
  - Broadcast Events (`AppointmentStatusChanged`, `StaffNotificationBroadcast`, `VaccineStockUpdated`): Placed on `broadcasts` (`public string $broadcastQueue = 'broadcasts'`), using the default queue connection.
  - Instant Broadcast Events (`QueueTicketUpdated`): Implements `ShouldBroadcastNow`, dispatched synchronously directly to Reverb without queuing delay.

### Dedicated broadcast worker: Phase 1 routing only

Phase 1 changes routing only; it does not deploy or activate a worker. The four services above retain their existing activation state. A separate fifth service is proposed for queued broadcasts.

From `backend`, after confirming the producer's effective queue connection is `database`:

```bash
php artisan queue:work database --queue=broadcasts --sleep=1 --tries=3 --backoff=3 --timeout=60 --max-time=3600
```

If the producer uses another supported persistent connection, use that verified connection explicitly. Do not change global `QUEUE_CONNECTION`, `DB_QUEUE`, or messaging configuration for this rollout. No database migration is required to use the named database queue. Supervise only this new service and restart it after its hourly exit; verify `retry_after` exceeds the 60-second timeout (database default: 90 seconds).

`DeliverOutboundMessage` (email/SMS) and `SendFcmPushNotification` retain `config('messaging.queue') = notifications` and `messaging.queue_connection`. The appointment FCM listener still enqueues separately when the application event is dispatched; processing its broadcast wrapper does not rerun that listener. Keep FCM disabled and preserve all delivery flags, existing workers, and scheduler behavior. Do not repurpose `run-worker.sh` for the broadcast-only service.

**Safe deployment gates (separate approval required):**

1. Pass local routing, event, authorization, and domain integration tests. Validate in staging with fake outbound providers and test patient/inventory records.
2. Verify producer/worker code versions, effective queue connection and database/table, and `BROADCAST_CONNECTION=reverb`. Verify matching Reverb credentials, reachable publish endpoint, browser WSS configuration, and private-channel authorization. A job succeeding with the null broadcaster is not proof of delivery.
3. Inspect `broadcasts` job metadata before activation: only the three expected `Illuminate\Broadcasting\BroadcastEvent` types should be present. Queue selection is not a job-class allowlist. Existing `notifications` jobs do not move automatically. Leave historical jobs and `quarantine_*` queues untouched; preserve quarantine commit `1664f153` and its protections.
4. Deploy the routing change, then activate only the separately approved broadcast service. Do not run the broad messaging worker, scheduler, migrations, or shared `queue:restart` as part of this activation.
5. In separate staging browsers, exercise ABTC check-in, calling, serving, no-response/recall, treatment transfer, and completion. Verify immediate queue/display updates and audio. Confirm/reschedule an appointment and verify its queued broadcast. Receive/adjust stock, open a vial, administer/deduct a dose, and discard a vial; verify the second inventory view matches persisted quantities. Capture WebSocket frames and event-triggered fetches, not just polling refreshes. Check cross-clinic/recipient rejection, reconnect recovery, and that consuming broadcasts does not consume messaging jobs. Monitor job age/failures and duplicate or delayed deliveries from retries.

**Rollback:** Stop only the dedicated broadcast service gracefully, then revert the three event queue properties and matching test expectations through the normal release process. Leave messaging workers, FCM settings, and scheduling unchanged. Retain pending/failed `broadcasts` jobs for separate review; reverting code does not relocate them. Do not bulk retry, delete, move, or replay jobs, including quarantined jobs. New queued broadcasts return to their prior `notifications` behavior; `QueueTicketUpdated` remains synchronous throughout.

### 2. Job Retries, Timeouts, and Dead-Letter Recovery
- **Global Worker Timeout:** `--timeout=60` (terminates jobs exceeding 60 seconds).
- **Database Connection Retry After:** `retry_after = 90` (`DB_QUEUE_RETRY_AFTER`).
  - *Invariant:* `retry_after (90s) > worker timeout (60s) >= job timeouts (30s/45s)`. This prevents premature job re-reservation by another worker while the current worker is still processing.
- **Job-Specific Retry Policies:**
  - `DeliverOutboundMessage`: Strictly `public int $tries = 1;` with `$timeout = 45;`. Outbound messages are never automatically re-sent on interruption to prevent duplicate SMS/emails.
  - `SendFcmPushNotification`: `public int $tries = 3;`, `$timeout = 30;`, `$backoff = [30, 120, 300];`. Retries are scheduled with exponential backoff on retryable HTTP errors (429 Rate Limit, 500, 502, 503 Service Unavailable, network timeouts).
  - *Deduplication across Retries:* `SendFcmPushNotification` records delivered device IDs in `fcm:job:delivered:{idempotencyKey}` in cache (24h TTL). Retries target only devices that experienced retryable errors.
  - *Failed Job Recording:* When all 3 attempts are exhausted with retryable errors, `$this->fail(...)` is invoked, permanently recording the failure in `failed_jobs`.

### 3. Failed Job Inspection and Management
All unrecoverable job exceptions are recorded in the MySQL `failed_jobs` table.

- **List Failed Jobs:**
  ```bash
  php artisan queue:failed
  ```
- **Inspect Specific Failed Job:**
  Inspect the `failed_jobs` table via database query or `queue:failed`. Diagnostics strictly mask tokens and exclude private medical information / service account credentials.
- **Retry a Failed Job by UUID/ID:**
  ```bash
  php artisan queue:retry <uuid|id>
  ```
- **Delete / Forget a Failed Job:**
  ```bash
  php artisan queue:forget <uuid|id>
  ```
- **Prune Old Failed Jobs (older than 48 hours):**
  ```bash
  php artisan queue:prune-failed --hours=48
  ```

---

## Scheduler (Cron) Reliability & Distributed Execution

### 1. Cron Service Architecture
- **Start Command:** `sh railway/run-cron.sh`
- **Execution Mechanism:** A persistent Railway worker container executing a drift-synchronized loop that aligns with the `:00` second of each minute:
  ```sh
  while true; do
      php artisan schedule:run --verbose --no-interaction || echo "Warning: schedule:run failed..."
      CURRENT_SEC=$(date +%S | sed 's/^0*//')
      CURRENT_SEC=${CURRENT_SEC:-0}
      SLEEP_SEC=$((60 - CURRENT_SEC))
      if [ "$SLEEP_SEC" -le 0 ] || [ "$SLEEP_SEC" -gt 60 ]; then
          SLEEP_SEC=60
      fi
      sleep "$SLEEP_SEC"
  done
  ```
- **Clock Drift Elimination:** Standard `sleep 60` drifts forward with each command execution, risking skipping `:00` minute-specific schedules. The drift-synchronized loop dynamically calculates `SLEEP_SEC=$((60 - CURRENT_SEC))` to always wake up exactly at `:00`.
- **Fault-Tolerant Daemon:** The script catches non-zero exit codes from `schedule:run` without letting `set -e` abort the container daemon.

### 2. Scheduled Task Matrix
| Task | Frequency | Timezone | Lock Mechanism | Purpose |
|---|---|---|---|---|
| `appointments:auto-recall` | Daily `08:00` | `Asia/Manila` | `withoutOverlapping(30)`, `onOneServer()` | Advance 1-day reminders & urgent missed dose recalls |
| `messaging:dispatch` | Every minute | `Asia/Manila` | `withoutOverlapping(5)`, `onOneServer()` | Outbound message recovery & delivery receipt reconciliation |
| `queue:auto-expire` | Daily `00:05` | `Asia/Manila` | `withoutOverlapping(15)`, `onOneServer()` | Auto-expires unserved tickets from prior clinic days |
| `sanctum:prune-expired --hours=24` | Daily `00:00` | `Asia/Manila` | `withoutOverlapping(30)`, `onOneServer()` | Prunes revoked & expired tokens |

### 3. Distributed Lock & Multi-Instance Safety
- When `CACHE_STORE=database` is configured, Laravel uses MySQL table `cache` with atomic `insertOrIgnore` for `onOneServer()` scheduling mutexes.
- If multiple container instances overlap during a Railway rolling redeploy at `08:00`, only ONE instance acquires the scheduling mutex; other instances log:
  ```
  Skipping [appointments:auto-recall] because the command already ran on another server.
  ```
- Mutex timeouts (`30m`, `5m`, `15m`) guarantee that an unexpected container termination or OOM event does not lock the command out for 24 hours.

## Provider configuration and invitations

Set all variables from `.env.railway.example` in Railway's Variables dashboard. Add the MySQL service values as `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`; never commit them.

## Live invitations

Staff links use `FRONTEND_URL` (the exact public Vercel HTTPS origin); patient
portal links use `APP_URL` (the public Railway HTTPS origin). Neither value
includes `/api` or a trailing slash. Vercel's Production `VITE_API_URL` and
`VITE_API_BASE_URL` must both be the Railway origin followed by `/api`; rebuild
the frontend after changing them. Local `.env` changes do not update Railway.

The example deliberately disables email delivery. Invitations require
`MAIL_MAILER=smtp`, `EMAIL_ENABLED=true`, explicit SMTP credentials, and a verified
sender. Use `MAIL_SCHEME=smtp` with port 587, or `smtps` with port 465; leave
`MAIL_URL` unset. When `MESSAGING_TEST_MODE=true`, every test recipient must be
in `MESSAGING_TEST_RECIPIENTS`. Run `php artisan email:diagnose --connect` in the
production service to check TLS/authentication without sending mail. This does
not prove mailbox receipt; verify receipt with fresh controlled invitations.

Both staff and patient invitations are sent synchronously through
`InvitationDelivery`. A worker is needed for queued notifications, not for
invitations. Restart existing workers after configuration changes, but do not
create one just to repair invitation URLs.

For an existing deployment's configuration-only refresh, run
`php artisan config:clear` then `php artisan config:cache` in the production
application environment using Railway's persistent deployment process. Do not
run the migration/seeding pre-deploy script just to refresh configuration.
Preserve the production database and `APP_KEY`, keep `SEED_DEMO_DATA=false`, and
retain `SESSION_SECURE_COOKIE=true` for the portal form. Follow
[`live-invitations-plan.md`](../../docs/tasks/06-deployment-and-audits/live-invitations-plan.md)
for network checks and rollback evidence.

## Merge review: configuration and deployment gates

- Preserve the existing frontend API origin in `frontend/.env.production`; both API variables end in `/api`. Example domains elsewhere in this guide are placeholders, not verified production endpoints.
- `VITE_REVERB_HOST` and `VITE_REVERB_APP_KEY` are intentionally blank in the committed production file. Supply the actual public Reverb host and public app key at frontend build time; use HTTPS/443. Never expose `REVERB_APP_SECRET` or provider credentials through Vite variables.
- Preserve the incoming public Google OAuth client ID. Confirm it matches backend `GOOGLE_CLIENT_ID` and the authorized frontend origins; it need not belong to the FCM Firebase project. Backend Google configuration also supports `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI`.
- Android Firebase project selection is still unresolved. Do not build/release Android until `mobile/android/app/google-services.json` is explicitly resolved and checked against the backend project and credentials.
- Backend FCM defaults remain disabled. Configure `FIREBASE_PROJECT_ID`, exactly one of `FIREBASE_CREDENTIALS_JSON` / `FIREBASE_CREDENTIALS_BASE64` (or a private file via `GOOGLE_APPLICATION_CREDENTIALS`), `FCM_ANDROID_CHANNEL_ID`, `FCM_CACHE_STORE`, `FCM_TEST_MODE`, and `FCM_ALLOWED_PATIENT_ACCOUNT_IDS` on every process that delivers notifications. Keep `FCM_ENABLED=false` until separately approved. The current default allowlist is account ID 1; confirm intended controlled test accounts explicitly.
- Runtime credential resolution prefers JSON, then Base64, then the private file. The pre-deploy script keeps an existing file and otherwise prefers Base64 over JSON. Set only one environment credential source to avoid inconsistent copies. Base64 is encoding, not encryption. Never include credential output in logs or version control.
- The existing messaging worker consumes `notifications,default`; the proposed separate broadcast worker consumes only `broadcasts` on the verified producer connection. Keep messaging settings and activation state unchanged. Restart only the affected service after approved changes; avoid shared `queue:restart` during broadcast-only rollout.
- `init-app.sh` runs `migrate --force`; this is not a configuration-only command. This merge review does not authorize running it. New vial tables do not backfill existing open-vial summaries into physical vial records: reconcile legacy open vials before rollout to avoid treating remaining portions as a new sealed vial.
- The Google SSO migration enables SSO for all existing clinic configurations; its rollback disables all of them. Review clinic intent before applying it. Intake changes alter MySQL columns and may lock tables; rollback is blocked while nullable answers exist. SQLite tests do not validate MySQL migration locking or concurrent deductions.
- Preserve storage/provider configuration and persistent uploads across services. Announcement images use the public disk and `/api/storage/...`; verify uploaded assets survive redeployment. Configure SMTP/provider secrets only in Railway. No live email, SMS, FCM, database migration, or deployment validation was performed during this merge.
