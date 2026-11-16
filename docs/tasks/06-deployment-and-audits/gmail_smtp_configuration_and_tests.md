# Gmail SMTP configuration and verification

Date: 2026-11-16. Local changes only.

## Audit before configuration

Effective Laravel configuration: mailer log; host 127.0.0.1; port 2525; scheme null; SMTP username/password absent; sender hello@example.com / Laravel; EMAIL_ENABLED false; test mode true with no allowlisted recipients. Configuration was not cached. backend/.env is excluded from Git.

The log mailer is selected by MAIL_MAILER in .env (and is the safe default in config/mail.php). DeliveryPolicy separately blocks disabled email, disallowed test recipients and non-SMTP transports. These configuration gates, not Gmail authentication failures, explain the current failures: no Gmail connection has been attempted.

Existing Laravel/Symfony infrastructure is retained: SmtpEmailService enforces mandatory TLS and certificate verification; InvitationDelivery records accepted/failed/unknown results with rate limiting and bounded retries; OutboundDelivery handles queued reminders and appointment updates. Staff/patient invitations, password recovery and password-change notices all use the centralized service. Staff and patient tokens expire after seven days and use encrypted storage with hashed lookup; activation checks prevent reuse and duplicate accounts. Patient invitations enforce clinic scope and invited-email binding. Prior missing-schema issue was addressed by local migrations; this audit will recheck their status.

Appointment creation/cancellation/rescheduling/confirmation notifications and upcoming/overdue vaccination reminders use persisted appointments, preferences and the database notifications queue. Minute messaging dispatch and daily 08:00 reminder schedules already exist. Account activation is supported; standalone registration-verification and announcement-broadcast email workflows do not exist and are not being invented.

Configuration plan: select Gmail SMTP at smtp.gmail.com:587, MAIL_SCHEME=smtp with mandatory STARTTLS; set username/from to yezitsdansoy@gmail.com and clinic display name; enable EMAIL_ENABLED. Preserve the user's password entry and unrelated .env settings. Keep test-recipient restrictions until an authorized address is provided. No credential will be printed or added to tracked examples.

Reference: [Google SMTP settings](https://developers.google.com/workspace/gmail/imap/imap-smtp) specifies smtp.gmail.com and port 587 with STARTTLS. This Laravel version uses MAIL_SCHEME, not MAIL_ENCRYPTION.


## Configuration applied

Updated only mail-related settings in the ignored backend/.env: MAIL_MAILER=smtp, MAIL_HOST=smtp.gmail.com, MAIL_PORT=587, MAIL_SCHEME=smtp, MAIL_USERNAME=yezitsdansoy@gmail.com, MAIL_FROM_ADDRESS=yezitsdansoy@gmail.com, MAIL_FROM_NAME="Tagoloan Animal Bite Treatment Center", EMAIL_ENABLED=true. Existing MAIL_PASSWORD content was preserved. No password was printed. The explicitly authorized test mailbox is yezitsdansoy@gmail.com; MESSAGING_TEST_MODE=true and MESSAGING_TEST_RECIPIENTS contains that address. Other recipients remain blocked during verification.

Executed php artisan optimize:clear and php artisan queue:restart. These completed successfully. Rebootstrapped Laravel confirms the exact Gmail settings and required TLS/certificate validation. The three email-related migrations are applied. Three unrelated clinical migrations are pending and were not applied. The notifications queue had zero pending jobs at inspection. A restart signal is not evidence that a queue worker is running; scheduler/worker operation remains unverified.

The tracked configuration example backend/.env.smtp.example now uses Gmail without credentials. Existing mail service, templates, endpoints, token logic, clinical workflows and preferences were reused without new changes in this phase.

## Verification results

95 focused automated tests passed (557 assertions), including invitations, expiry/replay, email binding, resending, duplicate suppression, queued reminders, appointment events, recovery and sanitized failure reporting. Output: backend/storage/logs/gmail-smtp-focused-tests.txt. These tests are separate from the following live Gmail evidence.

After the user saved the App Password directly into backend/.env, `php artisan config:clear` and `php artisan email:diagnose --connect` succeeded. Gmail TLS/authentication is verified. No password was printed, logged or copied into a tracked file.

Six real messages were submitted through Gmail SMTP to the explicitly authorized mailbox yezitsdansoy@gmail.com:

1. ABTC Gmail SMTP Verification.
2. Invitation to Join Tagoloan ABTC (Follow Up Nurse).
3. Activate Your Tagoloan ABTC Patient Portal Account (SMTP Verification Test).
4. Clinic appointment update (test appointment scheduled).
5. Upcoming clinic appointment (recorded test appointment: 2026-11-17, 10:30).
6. Clinic appointment update (test appointment cancelled after testing).

The delivery ledger records acceptance and message IDs; delivered_at remains unset. The notification jobs were processed by the real database notifications worker and the queue was empty afterward. The synthetic test appointment was cancelled to prevent future scheduled reminders. No real patient record was used. Test references are stored locally in backend/storage/app/private/gmail-smtp-test-state.json; passwords and activation tokens are not in that reference file or this report.

The backend/frontend initially were not running. Started the local Laravel server on 127.0.0.1:8000 and Vite on 127.0.0.1:5173. Both the patient activation page and staff frontend returned HTTP 200. These are local development services, not a deployment. The worker ran until its queue was empty; an ongoing scheduler or permanent worker service has not been provisioned.

| Test ID | Expected | Actual result | Status |
|---|---|---|---|
| SMTP-001 | Gmail authentication succeeds | Laravel diagnostic confirmed TLS and authentication | Pass (live) |
| SMTP-002 | Basic test message accepted | Gmail accepted the authorized test message | Pass (live) |
| SMTP-003 | Recipient receives test message | User asked to check Inbox and Spam; confirmation pending | Not Verified |
| SMTP-004 | Staff receives invitation | SMTP accepted; mailbox receipt confirmation pending | Submission Pass; receipt Not Verified |
| SMTP-005 | Staff activation link works | Automated activation passes; local frontend reachable; live invitation pending activation | Not Verified live |
| SMTP-006 | Patient receives invitation | SMTP accepted; mailbox receipt confirmation pending | Submission Pass; receipt Not Verified |
| SMTP-007 | Patient activation succeeds | Automated activation passes; real form returns 200; live invitation pending activation | Not Verified live |
| SMTP-008 | Correct appointment email received | Scheduled and cancellation events accepted via real queue worker; receipt pending | Submission Pass; receipt Not Verified |
| SMTP-009 | Correct vaccination schedule received | Real queued reminder accepted using saved test date/time; receipt pending | Submission Pass; receipt Not Verified |
| SMTP-010 | Expired invitation rejected | Automated tests pass | Pass (automated) |
| SMTP-011 | Invalid recipient rejected | Automated tests pass | Pass (automated) |
| SMTP-012 | SMTP failure recorded accurately | Automated rejection/timeout tests pass; missing credentials were safely rejected before configuration | Pass (automated/configuration) |
| SMTP-013 | Safe resend without duplicate accounts | Automated tests pass; real invitations were not rotated while user is opening their links | Pass (automated), live Not Tested |
| SMTP-014 | Duplicate submissions prevented | Automated cooldown/replay tests pass | Pass (automated) |

## Outstanding verification and operation

Mailbox Inbox/Spam inspection, sender/display-name verification, appearance in actual email clients and the user's activation of both received invitations are pending. SMTP acceptance is not inbox delivery. No Delivered state has been asserted.

The authorized test-recipient restriction remains enabled: only yezitsdansoy@gmail.com can receive email. After controlled verification, set MESSAGING_TEST_MODE=false to allow legitimate invitations to other addresses, then clear config and restart workers. Reminder consent and role checks continue to apply. Do not add real patients merely to test sending.

APP_URL=http://localhost:8000 and FRONTEND_URL=http://localhost:5173 generate local-only activation links. Open them on this computer; another device's localhost points to that other device. Remote/mobile-device activation requires authorized reachable backend/frontend URLs. Keep the development servers running while testing links.

Gmail account/provider sending limits and recipient filtering apply. No new Gmail account or 2-Step Verification setup is needed. Authentication is now verified; no missing SMTP credentials remain. Three unrelated clinical migrations remain pending and were not changed by this task. No commit, push, merge or deployment was performed.

## Files changed this phase

- backend/.env (ignored local secret file; mail settings and authorized test-recipient policy only; the user entered MAIL_PASSWORD privately).
- backend/.env.smtp.example (Gmail reference settings, empty password).
- docs/tasks/06-deployment-and-audits/gmail_smtp_configuration_and_tests.md (this report).

Existing email services, APIs, templates and database structures were reused. Test-only patient/invitation/appointment/preferences and delivery activity were created in the local database with user authorization. Keep the invitations available for the user's activation check; the synthetic appointment is already cancelled.
