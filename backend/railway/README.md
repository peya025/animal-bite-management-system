# Railway services

Set the Railway service root directory to `backend`.

- **App service:** Deploy the Laravel repository normally. Railway detects Laravel and serves it through PHP-FPM/Caddy. Use `sh railway/init-app.sh` as the **pre-deploy command**.
- **Cron service:** Create a second service from the same repository and use `sh railway/run-cron.sh` as its start command. It runs the Laravel scheduler once per minute.
- **Queue worker:** Do not create one for the current system. The clinic patient queue is stored in MySQL, and the inspected notification flows use database records/direct mail rather than `ShouldQueue` jobs. Keep `QUEUE_CONNECTION=sync` unless queued jobs are deliberately introduced later.

Set all variables from `.env.railway.example` in Railway's Variables dashboard. Add the MySQL service values as `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`; never commit them.
