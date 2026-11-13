# Railway services

Set the Railway service root directory to `backend`.

- **App service:** Deploy the Laravel repository normally. Railway detects Laravel and serves it through PHP-FPM/Caddy. Use `sh railway/init-app.sh` as the **pre-deploy command**.
- **Cron service:** Create a second service from the same repository and use `sh railway/run-cron.sh` as its start command. It runs the Laravel scheduler once per minute.
- **Queue worker:** Create a separate service from the same repository with `sh railway/run-worker.sh`. Set `MESSAGING_QUEUE_CONNECTION=database` and share the app's database, encryption key, cache, and provider configuration. The worker processes the `notifications` queue; the clinical patient queue remains separate. Restart workers after deployment or configuration changes.

Set all variables from `.env.railway.example` in Railway's Variables dashboard. Add the MySQL service values as `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`; never commit them.
