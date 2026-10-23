# Railway, Vercel, and Mobile Deployment Checklist

This is the deployment runbook for a **fresh synthetic demo database**. It does not migrate existing local records and must not be used for a real clinic deployment without a separate privacy, backup, and clinical-governance review.

## 1. Branch strategy

1. Keep `main` unchanged.
2. Use the existing `deployment` branch for deployment-only configuration and documentation.
3. Open a pull request from `deployment` to `main` only after every verification item below is recorded.
4. Never commit `.env`, MySQL credentials, `APP_KEY`, Google secrets, or real patient data. Only commit `.env.example` templates.

## 2. Before deployment

- [ ] Run `php artisan test` from `backend`.
- [ ] Run `composer audit --locked` from `backend`.
- [ ] Run `npm ci`, `npm audit --omit=dev`, and `npm run build` from `frontend`.
- [ ] Configure and run the isolated MySQL concurrency suite described in `backend/tests/Feature/Inventory/README.md`.
- [ ] Confirm `frontend/.env` and `mobile/.env` are ignored and not committed.
- [ ] Choose strong, unique values for `DEMO_ADMIN_PASSWORD` and `DEMO_STAFF_PASSWORD` in Railway only.

## 3. Railway: Laravel and MySQL

1. Create a Railway project and add a **MySQL** service.
2. Add an app service from the `deployment` branch. Set its root directory to `backend`.
3. In Railway Variables, enter values from `backend/.env.railway.example`:

   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=https://<railway-domain>`
   - `FRONTEND_URL=https://<vercel-domain>`
   - `DB_CONNECTION=mysql`, plus the five MySQL connection values from the Railway MySQL service
   - `PUBLIC_REGISTRATION_ENABLED=false`, `PUBLIC_SETUP_ENABLED=false`, and `DEVELOPER_TOOLS_ENABLED=false`
   - `SESSION_SECURE_COOKIE=true`

4. Generate an `APP_KEY` locally with `php artisan key:generate --show` and store the result only in Railway Variables.
5. Generate the Railway public domain, then set the health-check path to `/api/health`.
6. Set the app service **pre-deploy command** to:

   ```text
   sh railway/init-app.sh
   ```

   This runs `php artisan migrate --force`, conditionally runs `php artisan db:seed --class=DemoSeeder --force` only when `SEED_DEMO_DATA=true`, clears stale optimization files, and caches configuration.

7. For the first deploy only, set `SEED_DEMO_DATA=true`, provide both demo passwords, deploy, and confirm seeding succeeded. Set `SEED_DEMO_DATA=false` immediately afterward so later deploys do not reseed data.

8. Do **not** run `migrate:fresh` on Railway. It drops tables.

## 4. Railway scheduler and notifications

Create one non-public Railway Cron service from the same `backend` source, with root directory `backend` and start command:

```text
sh railway/run-cron.sh
```

It runs the Laravel scheduler once per minute. Current scheduled commands are:

- `appointments:auto-recall` daily at 08:00;
- `queue:auto-expire` daily at 00:05;
- `sanctum:prune-expired --hours=24` daily.

Do not create a queue-worker service for the current implementation. The patient queue is a first-come-first-served MySQL workflow, not a Laravel background queue. Notifications are stored in MySQL and mail is sent directly by the current controllers.

## 5. Vercel frontend

1. Import the same repository into Vercel and set the project root directory to `frontend`.
2. Use build command `npm run build` and output directory `dist`.
3. Add these Vercel Production environment variables before deploying:

   ```text
   VITE_API_URL=https://<railway-domain>/api
   VITE_API_BASE_URL=https://<railway-domain>/api
   ```

   `VITE_API_URL` is the preferred name. `VITE_API_BASE_URL` remains for compatibility with existing source files.

4. The committed `frontend/vercel.json` supplies the SPA rewrite required for direct visits to routes such as `/patients`.
5. Deploy, copy the exact Vercel HTTPS URL, set it as Railway `FRONTEND_URL`, then redeploy Railway so CORS configuration is rebuilt.

## 6. Mobile app

1. Copy `mobile/.env.example` to ignored `mobile/.env`.
2. Set:

   ```text
   API_BASE_URL=https://<railway-domain>/api/mobile
   CLINIC_ID=1
   ```

3. Rebuild the mobile application. `API_BASE_URL` is packaged into the app and is not a secret, but do not commit the real environment file.
4. Test against Railway:

   - [ ] patient login and registration;
   - [ ] patient profile registration/access rules;
   - [ ] appointment booking and cancellation;
   - [ ] mobile queue/appointment visibility;
   - [ ] treatment and vaccination schedule/card visibility;
   - [ ] notifications and read-state updates.

Native mobile clients do not require a browser CORS origin. Keep Laravel CORS restricted to the exact Vercel URL; mobile authentication continues through explicit Bearer tokens.

## 7. Final verification

- [ ] `GET https://<railway-domain>/api/health` returns HTTP 200 and `status: ok`.
- [ ] Vercel login reaches Railway without a CORS error.
- [ ] Reloading `/patients`, `/inventory`, and `/login` on Vercel does not return 404.
- [ ] Staff and mobile login work.
- [ ] Public staff registration, developer routes, setup routes, and `/api/test` are unavailable in production.
- [ ] A URL containing a print token cannot authenticate.
- [ ] Scheduler service logs show `schedule:run` executing.
- [ ] Only synthetic data and no developer account exist in MySQL.
- [ ] Record backend URL, Vercel URL, deployment commit, tester, and teardown date.
