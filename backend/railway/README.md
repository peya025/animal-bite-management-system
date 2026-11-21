# Railway services

Set the Railway service root directory to `backend`.

- **App service:** Deploy the Laravel repository normally. Railway detects Laravel and serves it through PHP-FPM/Caddy. Use `sh railway/init-app.sh` as the **pre-deploy command**.
- **Cron service:** Create a second service from the same repository and use `sh railway/run-cron.sh` as its start command. It runs the Laravel scheduler once per minute.
- **Queue worker:** Create a separate service from the same repository with `sh railway/run-worker.sh`. Set `MESSAGING_QUEUE_CONNECTION=database` and share the app's database, encryption key, cache, and provider configuration. The worker processes the `notifications` queue; the clinical patient queue remains separate. Restart workers after deployment or configuration changes.

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
