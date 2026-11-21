# SMS and Email Integration: Implementation and Deployment Runbook

Date: 2026-11-13

Status: Local implementation complete; production enablement and live delivery verification pending.

## Implemented scope and decisions

- System-wide provider configuration. Per-clinic provider accounts are not introduced.
- SMS adapters: Twilio, Semaphore, and an explicitly simulated fake provider. Business workflows use `SmsProvider` through `SmsManager`.
- Provider and email mailer names are captured when the message is created. Configuration changes affect new messages; existing messages retain their provider. Keep old credentials available until their backlog is resolved. Changing credentials under the same provider name is not account versioning.
- Appointment SMS/email delivery is asynchronous through a durable outbox and database queue. In-app notifications remain immediate and independent of external outcomes.
- Invitations remain synchronous to preserve existing failed-resend and token-rotation behavior. They use the common delivery policy and outbound audit ledger. Invitation tokens and bodies are omitted from this ledger.
- Delivery receipts use authenticated Twilio status queries. No public callback endpoint is exposed. Future callback adapters must authenticate requests, correlate provider/account/message IDs, and enforce monotonic transitions before activation.
- No automatic provider failover. Ambiguous outcomes require provider-console investigation and cannot be retried from the UI.
- External reminders use the patient's direct recorded contact with explicit communication preferences. Guardian contact routing is not inferred. In-app recipients must be active, verified linked accounts: the booking account, or a primary self account.
- SMS invitations and password recovery remain outside this release. Mobile password recovery is still a placeholder.

## Workflow inventory

| Trigger | Service / endpoint | Processing and recipient rules |
|---|---|---|
| Single missed recall | `POST /api/appointments/{id}/recall` | Clinic-scoped; scheduled appointment before today; optional message limited to 1000 characters |
| Bulk missed recall | `POST /api/appointments/bulk-recall` | Up to 200 distinct IDs, all validated against the staff clinic; per-appointment/channel outcomes |
| Scheduled sweep | `appointments:auto-recall` | 08:00 application timezone; tomorrow's scheduled appointments and preceding 14 days; batches of 100 |
| Manual sweep | `POST /api/appointments/trigger-auto-recall` | Same eligibility, restricted to the staff clinic |
| In-app | `OutboundDelivery` | Verified account only; database notification and delivery outcome saved transactionally |
| Patient invitation | `PatientInvitationService` | Valid direct email; seven-day token behavior preserved; failed resends preserve old token |
| Staff invitation | `StaffInvitationService` | Invitation address; log/array transport cannot claim delivery |
| Queue recovery / receipts | `messaging:dispatch` | Every minute, overlap protection; requeues durable pending work and checks supported receipt status |

Existing reminder routes retain admin/treatment/registration role restrictions. New preferences, history, and retry routes are in the same role group. Invalid channels and cross-clinic IDs are rejected before dispatch.

## Findings and resolution register

| Priority | Original finding | Resolution / evidence |
|---|---|---|
| High | SMS recorded as sent without provider call | Provider adapter called by `OutboundDelivery`; acceptance recorded only after response |
| High | Reminder email never sent; recipient omitted | Mail transport invoked by worker; recipient persisted and tested |
| High | Staff log mailer could claim success | Shared `DeliveryPolicy` rejects non-delivery transports; regression test |
| High | Manual sweep and history lacked explicit clinic scoping | Controller filters and bulk validation; cross-clinic API tests |
| High | Shared timestamp suppressed channel-specific attempts | Daily per-channel/purpose/appointment-date idempotency key; timestamp no longer filters eligibility |
| High | Concurrent jobs or timeouts could duplicate messages | Atomic database claim; bounded retry only for explicit rate-limit rejection; unknown outcomes never automatically resent |
| Medium | No recipient preference record | Consent-confirmed staff settings with change history; worker rechecks consent and contact |
| Medium | No provider identity or attempt trail | Encrypted outbox payload, captured provider, provider message ID, append-only attempt records |
| Medium | Unverified historical sent records | History displays legacy external records as `legacy_unverified`; originals unchanged |
| Medium | No worker instructions | Dedicated worker script and updated Railway instructions |
| Medium | Hardcoded hotline and arbitrary account fallback | Actual clinic contact only; direct external contact and verified in-app linkage |
| Medium | Misleading UI and invitation walkthrough | Processed/queued wording, per-message history, disabled unavailable channels, email-only invitation walkthrough |
| Pending | Actual delivery, sender/domain ownership, provider quotas | Deployment gates; not verified by mocked tests |

## Provider contract and capabilities

`SmsProvider` exposes `configured()`, `capabilities()`, `send(recipient, body, reference)`, and `status(messageId)`. `SmsResult` normalizes outcome, provider message ID, and sanitized error code. Sender identity and credentials belong to adapter configuration. Register additional adapter classes in `config/messaging.php`; no controller changes are required.

| Adapter | Configuration | Receipt support in this release | Idempotency / limits |
|---|---|---|---|
| Twilio | Account SID, token, sender | Authenticated message lookup; confirmed delivery or failure | Application deduplication; no assumed provider-side send idempotency |
| Semaphore | API key, optional registered sender | Acceptance only; network acceptance is not handset confirmation | Philippine mobile destinations; application deduplication |
| Fake | None | Simulated, never delivered | Development/test only; rejected in production |

SMS segment estimates account for GSM-7 extension characters and UTF-16 multipart messages. Estimates are displayed in history and operational status; they are not billing totals. Actual rates, registration, sender support, and account quotas must be checked with the selected provider.

Official references checked during implementation: [Semaphore API](https://www.semaphore.co/docs), [Twilio Message API](https://www.twilio.com/docs/messaging/api/message-resource), [Laravel queue transactions](https://laravel.com/docs/12.x/queues#jobs-and-database-transactions).

## Email compatibility

- Existing Laravel Mail API remains in use. SMTP and sendmail use existing dependencies. Other configured transport names may require their Laravel/Symfony provider packages; verify those before selection.
- `messaging.delivery_transports` is an explicit allowlist. Log, array, and composite fallback mailers are rejected. A custom transport must be registered, installed, and deliberately added to this list after testing.
- SMTP timeout is 15 seconds. Provider acceptance is not inbox delivery.
- No email bounce/complaint webhook is implemented because no email provider was selected. Confirm bounces through the selected provider's dashboard until an authenticated event adapter is added.
- Both reminders and invitations obey `EMAIL_ENABLED` and the test-recipient allowlist. Appointment consent does not apply to staff-requested transactional invitations.

## Database and status contract

Migration: `backend/database/migrations/2026_11_13_180000_create_outbound_messages.php`.

New tables:

- `outbound_messages`: clinic, patient/appointment/reminder references, channel, purpose, captured provider, unique idempotency key, encrypted recipient/subject/body, context, status, provider ID, timestamps, retry metadata.
- `outbound_message_attempts`: provider, outcome, provider ID, sanitized error, timestamps. A manual retry is also recorded with its staff ID.
- `communication_preferences`: current SMS/email opt-in and staff recorder.
- `communication_preference_events`: timestamped preference changes.

States:

| Status | Meaning |
|---|---|
| queued | Durable request awaiting worker |
| processing | Atomically claimed; provider operation may be in progress |
| accepted | Provider/transport accepted the request; receipt unconfirmed |
| delivered | Provider confirmed receipt, or in-app notification was created; does not mean read |
| failed | Explicit rejection/failure; eligible for a controlled same-day retry |
| skipped | Disabled channel, changed appointment/contact, revoked consent, or another pre-send condition |
| unknown | Timeout, server ambiguity, or interrupted worker; cannot safely retry automatically |
| simulated | Fake provider result; no real message sent |
| legacy_unverified | Display-only label for external reminder rows predating this ledger |

The existing reminder enum remains a compatibility field; history uses the linked outbox's authoritative status. Counters increase per accepted/delivered channel, not per queued request or receipt recheck. Historical counter semantics remain unchanged for historical rows.

Pre-enqueue validation skips appear in the request's `channel_results` and `errors`; they do not create an outbound record. Historical reminder payloads remain in their existing table. New outbox encryption requires a stable, shared application key. No historical deletion or retention policy change is performed; clinic-approved retention/archival remains a deployment decision.

## Queue, retry, and reconciliation rules

- Unique key: clinic + appointment + scheduled date + purpose + channel + occurrence date. Different custom messages do not bypass the daily limit.
- Jobs dispatch after commit and contain only the message ID.
- Workers atomically change queued to processing before making a network call. Duplicate jobs do not duplicate the send.
- Shared-cache rate limit per provider/channel; defaults to 30 sends/minute. Configure below purchased provider quotas.
- Only explicit HTTP 429 rejections retry automatically: at most three attempts with exponential backoff. Provider 5xx, invalid responses, connection failures, and mail exceptions remain unknown to avoid duplicate sending.
- Worker checks current appointment status/date, clinic ownership, recipient, and preference. Messages expire after their occurrence date.
- Processing records older than five minutes become unknown after worker interruption.
- Twilio receipts are queried at most once per message per ten minutes, within three days of creation, with up to 20 lookups per dispatcher run. Results only advance accepted messages to terminal states and do not increase send counters.
- Staff can retry a confirmed failed/skipped external message from today's history. Unknown, accepted, delivered, simulated, and expired messages cannot be retried through that endpoint. Manual retry starts a new bounded attempt budget; prior attempts are preserved.
- Do not change the credentials of a provider account while unresolved records rely on it. Resolve unknown messages in its dashboard before deciding whether a new clinical reminder is appropriate.

## Staff UI and API

The vaccination schedule provides Reminder Settings for upcoming appointments and Send Recall for overdue appointments. Staff can confirm/save preferences, see the latest 25 delivery records, refresh status, inspect estimated SMS segments, and retry eligible failures.

New/updated endpoints:

```text
GET  /api/messaging/channels
GET  /api/appointments/{id}/messaging
PUT  /api/appointments/{id}/messaging
GET  /api/appointments/{id}/reminders?page=1
POST /api/appointments/{id}/reminders/{messageId}/retry
```

Preferences payload: `sms` and `email` booleans plus `consent_confirmed: true`. The UI records confirmation by authorized staff; it is not an independent identity-verification flow.

Reminder history response now contains `logs.data` and Laravel pagination metadata. Each reminder includes `delivery_status`, `sms_estimate`, and its linked delivery/attempt records. Bulk responses use `total_processed` rather than claiming `total_sent`; detailed channel results remain available.

## Deployment procedure

1. Review templates, guardian/direct-contact policy, desired volumes, costs, and retention with the clinic.
2. Back up the deployment database. Apply the new migration using the project's normal deployment process. No non-test database migration was run during this implementation.
3. Configure backend secrets using `.env.example` or `.env.railway.example`. Do not put credentials in web/mobile assets.
4. Start with `SMS_ENABLED=false`, `EMAIL_ENABLED=false`, `MESSAGING_TEST_MODE=true`. Set `MESSAGING_TEST_RECIPIENTS` to comma-separated exact email addresses and normalized international mobile numbers.
5. Choose `SMS_PROVIDER=twilio` or `semaphore`, configure credentials/sender, and verify the provider account. Fake is never valid for production delivery.
6. Configure a delivery `MAIL_MAILER` and verified sender/domain. Confirm required transport dependencies and hosting connectivity; do not assume the log mailer sends email.
7. Set `MESSAGING_QUEUE_CONNECTION=database`. Start `sh railway/run-worker.sh` in a separately supervised service and `sh railway/run-cron.sh` in the scheduler service. Share database, APP_KEY, provider settings, and a lock-capable shared cache such as the configured database cache. Configure automatic service restart; the worker recycles after one hour.
8. Rebuild configuration cache and restart workers after configuration changes. Keep worker timeout (45 seconds) below the database queue retry interval (default 90 seconds).
9. Enable one external channel at a time while test mode remains on. Record patient preferences before testing reminders. Test invitations separately.
10. Confirm actual receipt and invitation activation with clinic-owned accounts/numbers, including failures and pause behavior. Do not interpret accepted as delivered.
11. Enable manual reminders, then controlled bulk delivery, then automated production delivery. Remove test-mode restrictions only after the clinic approves templates, recipients, sender identities, and budget.

Pause: disable the relevant channel, refresh configuration, and restart workers. Waiting messages are checked again before transport and skipped; already accepted messages cannot be recalled. Preserve migrations and audit records when rolling back application enablement.

Operational commands from `backend`:

```sh
php artisan messaging:status
php artisan messaging:status --clinic=1
php artisan messaging:dispatch
php artisan queue:work database --queue=notifications --sleep=3 --tries=1 --timeout=45 --max-time=3600
```

`messaging:dispatch` can send queued work through workers and query providers; use only with the intended environment configuration. Status reporting is read-only and omits patient details. Monitor unknown/failed counts, oldest queued age, worker health, provider credits, and provider billing dashboards.

## Verification and remaining release gates

Automated verification: 71 tests / 324 assertions passed across new messaging integration tests and existing patient/staff invitation and notification suites. Frontend TypeScript and production build passed; existing large-chunk warning remains. Tests use in-memory SQLite, fake queues/mail, and mocked HTTP, with stray HTTP disabled in the messaging suite.

Coverage includes provider switching, provider pinning, duplicate requests/jobs, explicit rate limits, ambiguous timeout handling, consent/allowlist validation, cancellation/contact checks, email recipient persistence, encrypted payloads, independent in-app delivery, receipt reconciliation, clinic isolation, input validation, simulated delivery, controlled retries, preference audit records, staff log-mailer rejection, worker interruption, and SMS encoding estimates.

Remaining release gates (not represented as completed):

- Real account/sender/domain verification, cost/volume selection, and clinic template approval.
- MySQL deployment migration and multi-worker concurrency/load verification in staging.
- Interactive UI acceptance by clinic staff; build verification is not a browser walkthrough.
- Production scheduler/worker verification, pause/recovery drill, and controlled real delivery/activation.
- Chosen email provider's bounce/complaint integration, if required for launch.
- Optional per-clinic provider accounts, guardian routing, multilingual templates, SMS invitations, and full password-reset implementation require separate scoped work.
