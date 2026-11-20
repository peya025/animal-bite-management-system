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

3. **Queue Worker Service (Background Jobs & Broadcast Dispatcher)**
   - **Role:** Processes asynchronous jobs including queued broadcasting events (`AppointmentStatusChanged`, `StaffNotificationBroadcast`, `VaccineStockUpdated`) and outbound push jobs (`SendFcmPushNotification`).
   - **Start Command:** `sh railway/run-worker.sh`
   - **Command Details:** `exec php artisan queue:work database --queue=notifications,default --sleep=3 --tries=3 --timeout=60 --max-time=3600`
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
                                                        [Railway Queue Worker]
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

### 4. Vercel Frontend Environment Variables
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
- **Cause:** Queue Worker is not running or not listening to the `notifications` queue.
- **Resolution:** Verify Railway Queue Worker service is active with command `sh railway/run-worker.sh` and logs show `Processing jobs from the [notifications, default] queues`.

### Emergency Rollback
If WebSockets need to be temporarily disabled in production:
1. In Vercel environment variables, clear `VITE_REVERB_HOST`.
2. The React application automatically detects the missing host and falls back silently to adaptive HTTP polling (5s queue polling, 12s notification polling) with zero user-facing errors.
