# SMTP email audit and implementation

Audit date: 2026-11-14. Initial audit recorded before implementation. All work remains local.

## Architecture and evidence

React 19 / TypeScript / Vite staff frontend, Flutter mobile app, Laravel 12 / PHP 8.2 API with Sanctum authentication and role middleware. Laravel Mail already uses Symfony Mailer (installed vendor implementation supports require_tls). Existing database queue, notifications queue worker, daily appointment sweep, minute dispatch, encrypted outbound_messages and outbound_message_attempts ledger, appointment_reminders and communication_preferences are reusable. No new SMTP library is necessary.

Repository-wide email call search found StaffInvitationService (Mailable), PatientInvitationService (raw text), OutboundDelivery (raw reminder). NotificationService and MobileNotificationService primarily provide database/in-app notifications; those are not proof of email delivery.

| Existing feature | Audit finding |
|---|---|
| Staff invitations | Synchronous shared InvitationDelivery; seven-day token; frontend accept-invitation route; role mapping; pending duplicate check. Log transport rejected by shared policy. Missing strict role validation, resend endpoint and send throttle. HTML only; template shows legacy role. |
| Patient invitation / resend / bulk | Registered patient email, 64-character token, seven days, mobile code-entry activation. Fails with 503 if delivery policy rejects. Failed resend preserves old token, but new send expires previous token before success. No patient activation web/deep-link handler found. |
| Account activation | Staff and patient token consumption exist; patient accepts a different email as verified; concurrent activation not locked. Tokens stored plaintext in existing tables. |
| Password recovery | Mobile forgot-password calls a no-op and controller claims instructions sent. No reset completion endpoint. |
| Email verification / password-change notices | No outgoing email implementation found. |
| Appointment / vaccination reminders | Existing advance (tomorrow) and recall (past scheduled appointments) use actual recorded dates and explicit communication consent; queued with deduplication and stale-record checks. SMTP errors currently become unknown without categorization. |
| Booking confirmation / cancellation / rescheduling | Application events exist; no outgoing email implementation found in email call inventory. Proposed additions, not existing working email features. |
| Announcements / general updates | No existing email broadcast workflow found; database notifications are separate. No speculative bulk emailing will be enabled. |

## Verified local root cause

Bootstrapped Laravel configuration, without printing credentials: mail.default=log, SMTP host=127.0.0.1, port=2525, scheme=null, username missing, password missing; messaging.email_enabled=false, test_mode=true, allowlist count=0; configuration not cached. DeliveryPolicy returns channel_disabled first; enabling only that switch would still fail allowlisting, then delivery mailer checks. These reproduce the supplied error path without SMTP traffic. No evidence supports blaming provider TLS, authentication, DNS or spam filters: no real provider is configured. Deployed configuration and screenshot-session logs are unavailable; local findings are not a claim about remote deployment.

## Security and reliability findings

InvitationDelivery creates an encrypted ledger without invitation bodies/tokens, but accepts a callback returning null as success and loses SMTP message IDs. SMTP configuration does not require authentication/TLS or validate sender configuration. Failover includes log (shared policy rejects composite mailers). Patient invitation service queries are not clinic-scoped. Activation needs transaction/row locking and duplicate-account checks. Staff request permits arbitrary workstation_role. Invitation sends are not throttled. Appointment reminders already have bounded queue retries, unknown-state protection, consent and contact revalidation; preserve these. Existing plaintext invitation tokens need a compatible migration strategy, not an unreviewed breaking replacement.

## Implementation plan

Reuse Laravel/Symfony and current delivery policy/ledger; enforce authenticated TLS SMTP, safe diagnostics and categorized failures; preserve existing MAIL_* variables with SMTP_* aliases; add reusable multipart templates and accurate feedback; strengthen invitation authorization/activation/resend; test isolated SQLite fixtures and transport doubles. Preserve clinical logic and existing queue. Provider authentication and mailbox receipt will remain Not Verified until credentials and a controlled mailbox are supplied. Do not fabricate an activation URL for a mobile route that does not exist.


## Implemented locally

- `SmtpEmailService` is the single backend SMTP submission boundary, using the existing Laravel/Symfony dependency. No new package or credentials were added. Explicit authenticated SMTP, mandatory TLS/STARTTLS, certificate validation, 15-second socket timeout, sender/recipient validation, safe failure categories, non-delivery transport rejection and null-send rejection are enforced. Existing API/sendmail transports are no longer accepted for these SMTP workflows.
- `InvitationDelivery` reuses the encrypted outbound ledger, captures SMTP message IDs, tracks attempts, enforces recipient cooldown and provider-wide rate limits, and bounds known temporary rejection retries to three. Authentication/permanent rejections do not retry; ambiguous disconnects stay unknown. Reminder jobs retain database queue retries with exponential backoff and atomic claims. No SMTP response is labeled Delivered.
- Staff invitations retain the current modal, role permissions, seven-day validity, activation page and workstation mapping. Invalid roles are rejected; failure returns HTTP 503, preventing the prior unconditional success toast. Admin resend rotates the token only after acceptance; failed resends preserve it. The existing invitation API now supports `/api/staff-invitations/{id}/resend`.
- Patient invitations use the registered address, enforce clinic scope on single/bulk/resend endpoints, share one bulk/single implementation and preserve previous valid invitations after failure. Activation is bound to the invited email snapshot and current patient contact. A changed email requires a fresh invitation. Issuance/rotation/activation use transactions and locks; accepted, expired and replaced tokens cannot be reused. Seven-day validity remains.
- Both invitation tables retain their indexed token column, now holding SHA-256 lookup hashes. A separate encrypted copy preserves existing authorized staff copy-code/link workflows. Migration encrypts existing tokens without changing their links; models hide encrypted storage fields from JSON. Patient invitations additionally store an encrypted recipient snapshot. Retain and protect APP_KEY. These changes require a coordinated migration/code release; do not run old code against hashed token rows.
- `ClinicEmail` supplies shared inline-styled HTML and plain-text bodies, escaped user values, neutral preview text, teal branding, expiry text and action links. Staff mail shows the actual workstation role. Reminder text uses actual recorded dates and times, with no derived treatment schedule.
- Added real backend web activation and password-reset pages at `/patient-portal/activate` and `/patient-portal/reset-password`. Links carry codes in the fragment, consumed by a same-origin external script compatible with CSP. Codes are not sent in GET request URLs. Forms use CSRF protection and throttles; code/password validation inputs are excluded from session flashing. Mobile code-entry and login remain compatible. Web activation does not create an unused mobile auth token.
- Replaced the existing mobile forgot-password no-op with a 30-minute hashed, single-use reset flow, preserving a generic response without asserting delivery. Failed submissions preserve an earlier reset token. Reset revokes all sessions. Normal password changes and completed resets submit a neutral security notice independently of optional reminder consent.
- Added consent-based email events for model-created scheduled appointments and model-updated cancellation, rescheduling and confirmation. They use persisted dates/times and the existing queue. Jobs recheck appointment snapshots, recipient, consent and expiry; superseded updates are suppressed. Email events do not increment reminder counters or alter clinical scheduling. Query-builder/bulk SQL changes bypass Eloquent observers and therefore do not emit these new events; existing scheduled reminders remain independent.
- Existing advance/overdue vaccination reminders remain tied to recorded appointments and `communication_preferences`. No default Day 0/3/7/28 dates are generated for email. No announcements/broadcast audience, independent signup-verification flow, or staff password-recovery flow was invented; these were not existing email workflows.
- Authorized clinic admins can inspect safe categories and the existing ledger through `GET /api/email-configuration-status` and `GET /api/email-activity`. The latter is clinic-scoped and hides message bodies, context, idempotency keys and encrypted token fields. Standalone patient-account security activity uses clinic_id=0 until a verified clinic linkage exists and is not exposed to arbitrary clinic admins.

## Configuration and operations

The local `.env` was not changed. Email remains disabled; the configured mailer is still log, and no provider credentials or authorized mailbox were supplied. No production database migration, provider configuration, commit, push, merge or deployment was performed.

Use `backend/.env.smtp.example` as a backend-only setup reference. Brevo is the example, **not a configured or provisioned provider**. Another authenticated SMTP provider can be used through the same settings.

| Variable | Required value/purpose |
|---|---|
| MAIL_MAILER | smtp |
| SMTP_HOST / MAIL_HOST | Provider SMTP hostname; Brevo example: smtp-relay.brevo.com |
| SMTP_PORT / MAIL_PORT | Provider port, typically 587 with STARTTLS or 465 with implicit TLS |
| SMTP_SECURE / MAIL_SCHEME | false / smtp for mandatory STARTTLS; true / smtps for implicit TLS |
| SMTP_USER / MAIL_USERNAME | Provider SMTP login, not necessarily the sender address |
| SMTP_PASSWORD / MAIL_PASSWORD | SMTP key or permitted app password; never an invented credential |
| SMTP_FROM_EMAIL / MAIL_FROM_ADDRESS | Provider-verified sender address |
| SMTP_FROM_NAME / MAIL_FROM_NAME | Tagoloan Animal Bite Treatment Center |
| APP_URL | Reachable backend HTTPS origin, used for patient activation and reset links |
| FRONTEND_URL | Reachable staff frontend HTTPS origin, used for staff activation links |
| APP_BASE_URL | Fallback alias for application URLs; use explicit APP_URL and FRONTEND_URL when origins differ |
| MOBILE_APP_BASE_URL | Reserved optional installation/deep-link configuration; no unverified mobile route is generated |
| EMAIL_ENABLED | true only when ready for controlled sending |
| MESSAGING_TEST_MODE | true during controlled tests |
| MESSAGING_TEST_RECIPIENTS | Comma-separated authorized test mailboxes, exact matches |
| EMAIL_PER_MINUTE | Provider-wide application limit, default 30; keep below account limits |
| EMAIL_APPOINTMENT_EVENTS_ENABLED | Enables new appointment event emails; true by default, still subject to email switch and consent |
| MESSAGING_QUEUE_CONNECTION | database, with the existing notifications queue worker |

**Precedence:** existing MAIL_* values override SMTP_* aliases. Remove old MAIL_HOST=127.0.0.1, MAIL_PORT=2525 and empty MAIL_USERNAME/MAIL_PASSWORD placeholders when using SMTP_* names, or configure MAIL_* directly. MAIL_URL is rejected because it could override the explicit security policy. SMTP_SECURE=false means STARTTLS is mandatory, not plaintext. Do not disable certificate verification.

On an authorized environment, after backing up the database and APP_KEY:

1. Apply the two new migrations with `php artisan migrate`. They create patient_password_reset_tokens and protect existing invitation tokens. Test rollback against a backup first; rollback restores the previous plaintext token schema and must not be used casually.
2. Set provider credentials and verified sender via backend secret management, configure APP_URL and FRONTEND_URL, and allowlist only controlled mailboxes. Keep APP_DEBUG=false in production. Never include these secrets in the web/mobile bundles.
3. Refresh cached configuration using the normal deployment procedure (`php artisan config:clear` for local setup, `php artisan config:cache` for production) and restart long-running workers after configuration changes.
4. Run `php artisan email:diagnose`. It prints categories and switches only. Run `php artisan email:diagnose --connect` to verify TLS/authentication without sending mail. This is a shell-only diagnostic, not an unauthenticated web send endpoint. No SMTP debug transcript or password is printed.
5. Run the existing notifications worker (`php artisan queue:work database --queue=notifications --tries=1 --timeout=45`) and scheduler (`php artisan schedule:run` once per minute). Keep queue retry_after greater than the worker timeout. Use a shared supported cache/lock store on multi-process deployments; the test suite uses an array store only in isolated tests.
6. Use controlled clinic/staff/patient records with allowlisted email addresses. Submit staff and patient invitations, inspect activity and provider acceptance, then inspect the actual inbox and spam folder. Verify sender, role/name, link, code, expiry and one-use activation. Wait at least 60 seconds before an intentional resend.
7. Record explicit email consent on test patient records; test a new appointment, rescheduling, cancellation, tomorrow's existing appointment and an overdue existing appointment. Do not manufacture clinical schedules solely to trigger email.
8. Exercise mobile forgot-password and the web reset link; verify the old password and old sessions stop working. Check security notices independently of optional reminder preferences.
9. Only remove test-mode allowlisting after authorized receipt testing and clinic wording review. SMTP acceptance does not guarantee inbox placement.

### Provider-side prerequisites and authoritative references

Brevo documents its SMTP hostname and credentials in [SMTP integration](https://developers.brevo.com/docs/smtp-integration) and distinguishes SMTP keys from other credentials in [SMTP key management](https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys). Use a verified sender and the account's permitted sending volume/status. Domain setup uses the provider-issued verification, DKIM and DMARC records; follow the exact DNS values in the account, not copied example keys. See [Brevo domain authentication](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC). SPF/envelope alignment requirements depend on the chosen provider and custom return-path configuration; confirm them with that provider and existing DNS ownership rather than replacing an existing SPF record blindly. No sending domain was supplied, so SPF/DKIM/DMARC and sender verification are **Not Verified**. Account approval, sending limits, outbound-port reachability and mailbox filtering are likewise unverified.

[Symfony Mailer documentation](https://symfony.com/doc/current/mailer.html) defines transport success as acceptance for further delivery and documents require_tls. The installed transport was inspected and a test checks that Laravel actually passes mandatory TLS settings to it. The service does not claim delivery confirmations without authenticated provider evidence.

## Verification evidence

Tests use SQLite :memory:, test users/patients and a test-only Symfony NullTransport to exercise MIME rendering and submission handling without contacting a recipient. Transport exceptions and cancelled message events verify failures. This is not live SMTP acceptance or mailbox receipt evidence. The application never selects NullTransport through its configuration policy.

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| E01 | Local configuration diagnostic | Reject non-SMTP/disabled setup | smtp_required; channel disabled; allowlist-only | Pass |
| E02 | Missing auth, insecure TLS, incorrect 465/587 scheme, MAIL_URL | Reject before contact | Safe categories asserted | Pass |
| E03 | Native Symfony SMTP settings | Mandatory TLS and certificate validation | Real transport constructed without connecting; settings asserted | Pass |
| E04 | Invalid sender/recipient and cancelled MessageSending event | Never report accepted | Rejected/null send detected | Pass |
| E05 | 451 temporary rejection / 535 auth rejection / uncertain timeout | Bounded retry / no retry / unknown | Three / one / unknown asserted | Pass |
| E06 | Staff invite, exact recipient, role, activation, duplicate and expired tokens | Correct mapping, single-use account | Existing invitation tests plus resend/reuse tests | Pass |
| E07 | Patient send, missing email, bulk failures, failed resend | Accurate statuses; old token retained | Feature and characterization tests | Pass |
| E08 | Cross-clinic patient/bulk access and non-admin diagnostics | Reject unauthorized access | 404/403 asserted | Pass |
| E09 | Patient token encryption, email binding, changed contact, replay | No plaintext storage; reject invalid activation | Hash/ciphertext and account-count assertions | Pass |
| E10 | Existing token migration round trip | Existing links preserved | Down/up tested in isolated SQLite | Pass |
| E11 | HTML/plain text, escaping, actual recipient, real activation URL | Safe multipart message | Rendered MIME assertions; web GET/POST tested | Pass |
| E12 | Password reset valid/expired/reused/failure | Single use; session revocation; no change on failure | Hash, password and revoked-token assertions | Pass |
| E13 | Appointment scheduled/rescheduled/cancelled; stale event; consent | Persisted dates; suppress obsolete/opted-out mail | Event/queue assertions | Pass |
| E14 | Advance/overdue reminders, retries, stale contact and consent | Existing queue behavior preserved | Messaging integration suite | Pass |
| E15 | Staff UI TypeScript and production bundle | Build succeeds | npm run build passed; existing large-chunk advisory | Pass |
| E16 | Real provider TLS/login and test SMTP submission | Provider accepts configured test send | Credentials/provider absent; not attempted | Blocked |
| E17 | Staff/patient invitations received; inbox/spam/sender inspection | Actual receipt and working links | Mailbox access absent | Not Tested / Not Verified |
| E18 | Real reminder/appointment/security email receipt and email-client appearance | Actual receipt and readable rendering | No controlled mailboxes/provider access | Not Tested / Not Verified |
| E19 | Provider DNS, approval, limits and delivery callbacks | Verified provider configuration | No domain/account access; no callbacks added | Not Tested / Not Verified |
| E20 | Production MySQL migration, concurrent multi-process sending and worker deployment | Safe rollout under deployment conditions | SQLite tests only; no deployment authorized | Not Tested |

No actual test email was sent to any patient, staff member or other recipient.

### Final automated results

- Focused command: `php artisan test --filter='SmtpEmailSecurity|PatientInvitation|StaffInvitation|MessagingIntegration|MobilePatientAccountAuth|RateLimiters|AdminUserManagement|ClinicModuleConfigPerson1' --compact`: **94 passed, 554 assertions**. Evidence: `backend/storage/logs/smtp-focused-tests.txt`.
- Latest full regression: `php -d extension=gd vendor/phpunit/phpunit/phpunit --no-progress`: **523 tests, 505 passed, 5 errors, 12 failures, 1 skipped, 3509 assertions**. The last two added focused tests were run afterward in the 94-test focused suite. Evidence: `backend/storage/logs/smtp-regression-tests.txt`.
- Unchanged HEAD comparison in an isolated archive with the same installed dependencies and GD enabled: **509 tests, 490 passed, 5 errors, 13 failures, 1 skipped**. All 17 remaining full-suite failure/error names exactly match this baseline. They concern Announcement controller binding, MobileHistory responses and a TriageDoctorAndReExposure animal-type assertion. The additional baseline failure was a clinic migration test that assumed its migration was the newest; it now targets its own migration explicitly. Clinical implementation files were not changed to address these unrelated failures.
- Initial full run without GD had additional image-test failures; loading the installed GD extension for the test process resolved that environment issue without modifying php.ini.
- Frontend `npm run build`: passed TypeScript and production bundling. Initial sandbox subprocess restriction was resolved by running the same local build with authorized execution. Existing large-chunk advisory remains.
- `git diff --check`: passed. Central messaging files passed Pint verification. The shell-only diagnostic correctly rejects the actual local configuration. No provider connection or send was attempted.
- Model-level SQL concurrency and real mail-client rendering remain deployment verification items; isolated SQLite tests do not establish multi-server locking or Gmail/Outlook/Yahoo layout fidelity.

### Modified and added files

Paths are relative to the repository root. The list includes tests and the configuration example; no dependency lockfile or real secret file changed.

- `backend/.env.smtp.example`
- `backend/app/Console/Commands/DiagnoseEmail.php`
- `backend/app/Http/Controllers/Auth/PatientInvitationController.php`
- `backend/app/Http/Controllers/Auth/PortalEmailActionController.php`
- `backend/app/Http/Controllers/Auth/StaffInvitationController.php`
- `backend/app/Http/Controllers/Mobile/PatientAccountAuthController.php`
- `backend/app/Http/Middleware/SecurityHeaders.php`
- `backend/app/Http/Requests/Staff/SendStaffInvitationRequest.php`
- `backend/app/Mail/ClinicEmail.php`
- `backend/app/Mail/StaffInvitationMail.php`
- `backend/app/Models/Concerns/ProtectsInvitationToken.php`
- `backend/app/Models/PatientInvitation.php`
- `backend/app/Models/StaffInvitation.php`
- `backend/app/Observers/AppointmentEmailObserver.php`
- `backend/app/Providers/AppServiceProvider.php`
- `backend/app/Services/AppointmentReminderService.php`
- `backend/app/Services/Messaging/AccountSecurityEmail.php`
- `backend/app/Services/Messaging/AppointmentEmailEvents.php`
- `backend/app/Services/Messaging/DeliveryPolicy.php`
- `backend/app/Services/Messaging/InvitationDelivery.php`
- `backend/app/Services/Messaging/OutboundDelivery.php`
- `backend/app/Services/Messaging/SmtpEmailService.php`
- `backend/app/Services/Mobile/PatientAccountAuthService.php`
- `backend/app/Services/Mobile/PatientPasswordRecovery.php`
- `backend/app/Services/Patient/PatientInvitationService.php`
- `backend/app/Services/Staff/StaffInvitationService.php`
- `backend/bootstrap/app.php`
- `backend/config/app.php`
- `backend/config/mail.php`
- `backend/config/messaging.php`
- `backend/database/migrations/2026_11_14_000001_create_patient_password_reset_tokens.php`
- `backend/database/migrations/2026_11_14_000002_protect_invitation_tokens.php`
- `backend/public/js/email-action.js`
- `backend/resources/views/auth/email-action.blade.php`
- `backend/resources/views/emails/clinic-text.blade.php`
- `backend/resources/views/emails/clinic.blade.php`
- `backend/routes/api.php`
- `backend/routes/web.php`
- `backend/tests/ConfiguresTestEmail.php`
- `backend/tests/Feature/AdminUserManagementTest.php`
- `backend/tests/Feature/Auth/MobilePatientAccountAuthCharacterizationTest.php`
- `backend/tests/Feature/Auth/PatientInvitationCharacterizationTest.php`
- `backend/tests/Feature/Auth/StaffInvitationCharacterizationTest.php`
- `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`
- `backend/tests/Feature/MessagingIntegrationTest.php`
- `backend/tests/Feature/PatientInvitationEmailTest.php`
- `backend/tests/Feature/SmtpEmailSecurityTest.php`
- `docs/tasks/06-deployment-and-audits/sms_gateway_and_email_integration_audit_plan.md`
- `docs/tasks/06-deployment-and-audits/smtp_email_audit_and_implementation.md`
- `frontend/src/features/patients/components/InvitePatientModal.tsx`
- `frontend/src/features/users/pages/UserListPage.tsx`


## Local schema repair after invitation screenshot (2026-11-14)

The running local MySQL database (`localhost`, `animal_bite_db`) had all three messaging migrations pending. The `encrypted_token` insert error occurred before any SMTP submission. Applied only those three migrations locally after saving an APP_KEY-encrypted backup of both invitation tables under `backend/storage/app/private/smtp-schema-backup-*.encrypted`. Existing row counts and all token hash/decryption pairs were verified after migration. No production deployment or email send occurred. This supersedes the earlier note that application-database migrations had not been applied.

API database failures now return a generic 503 even when debug is enabled. Invitation database exceptions log only a safe SQLSTATE category, excluding SQL and token bindings. The staff invite UI masks server-error details, and its validation/error snackbar now consistently uses error styling rather than guessing success from message wording.

SMTP remains unconfigured: the local diagnostic reports `smtp_required`, email disabled, and allowlist-only mode. Applying the schema does not enable sending or establish receipt.
