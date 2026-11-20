# Railway services

Set the Railway service root directory to `backend`.

- **App service:** Deploy the Laravel repository normally. Railway detects Laravel and serves it through PHP-FPM/Caddy. Use `sh railway/init-app.sh` as the **pre-deploy command**.
- **Cron service:** Create a second service from the same repository and use `sh railway/run-cron.sh` as its start command. It runs the Laravel scheduler once per minute.
- **Queue worker:** Create a separate service from the same repository with `sh railway/run-worker.sh`. Set `MESSAGING_QUEUE_CONNECTION=database` and share the app's database, encryption key, cache, and provider configuration. The worker processes the `notifications` queue; the clinical patient queue remains separate. Restart workers after deployment or configuration changes.

Set all variables from `.env.railway.example` in Railway's Variables dashboard. Add the MySQL service values as `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`; never commit them.

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
The backend application also dynamically reads `FIREBASE_CREDENTIALS_BASE64` or `FIREBASE_CREDENTIALS_JSON` in-memory across web and worker containers, ensuring complete compatibility even if pre-deploy did not run on worker instances.

### Safe Verification (Dry-Run)
To test Firebase credentials on Railway without dispatching real push notifications to patients:
```bash
php artisan fcm:test --patient=1 --dry-run
```
Automatic push delivery remains disabled (`FCM_ENABLED=false`) until explicitly enabled after testing.
