# SMS Gateway and Email Integration Preparation Audit Plan

Date: 2026-11-13

Status: Implementation authorized by the user and completed locally on 2026-11-13. Live enablement remains pending. See [implementation findings and deployment runbook](sms_gateway_and_email_integration_implementation.md).

## Objective

Prepare the system for reliable SMS and email delivery. SMS must use a provider-independent interface so providers can be changed through configuration without rewriting appointment or recall workflows. Adding a new provider may require a new adapter, but must not require changes to business workflows.

This plan was based on repository inspection. The initial findings below are retained as the pre-implementation baseline. Production configuration, provider accounts, scheduler operation, and actual delivery remain unverified. Implementation tests use an isolated in-memory database and mocked delivery; see the linked runbook for results and release gates.

## Current findings

| Area | Observed implementation | Preparation gap |
|---|---|---|
| SMS reminders | Manual, bulk, and automated workflows create reminder records marked sent | No gateway call |
| Email reminders | Subjects and message bodies are generated | No mail delivery call; required recipient field omitted from reminder records |
| Patient invitations | Laravel Mail, email validation, transport allowlist, failure handling | Configure a delivery provider; review custom transport compatibility |
| Staff invitations | Laravel Mailable sent synchronously | Log mailer can produce misleading success |
| In-app notifications | Database notifications for mobile portal | Preserve independent behavior |
| Automation | Daily command at 08:00; default timezone Asia/Manila | Verify deployed scheduler and overlap protection |
| Password recovery | Mobile forgot-password service is a no-op | Separately scope complete reset workflow |
| Delivery history | appointment_reminders records channel, message, status, recipient, and errors | Provider IDs, receipts, attempt history, and reliable status semantics missing |
| Configuration | Local .env and Railway example use MAIL_MAILER=log | Not evidence of production delivery configuration |

### Evidence locations

Paths below are relative to the repository root:

- `backend/app/Services/AppointmentReminderService.php`
- `backend/app/Services/Patient/PatientInvitationService.php`
- `backend/app/Services/Staff/StaffInvitationService.php`
- `backend/app/Services/Mobile/PatientAccountAuthService.php`
- `backend/app/Http/Controllers/Operations/VaccinationJourneyController.php`
- `backend/app/Models/AppointmentReminder.php`
- `backend/database/migrations/2026_08_30_000001_add_missed_recall_and_reminders_table.php`
- `backend/config/mail.php`, `backend/config/services.php`, `backend/config/queue.php`
- `backend/routes/api.php`, `backend/routes/console.php`
- `backend/railway/README.md`, `backend/railway/run-cron.sh`
- `backend/tests/Feature/PatientInvitationEmailTest.php`
- `frontend/src/features/vaccinations/pages/VaccinationSchedulePage.tsx`
- `frontend/src/features/walkthrough/patientRegistrationWalkthroughSteps.ts`
- `docs/EMAIL_INVITATION_HANDOFF.md`

The existing email handoff mentions Brevo. Provider limits, pricing, and hosting restrictions in that dated document must be revalidated before selection; this plan does not select a provider.

## 1. Audit notification entry points

Trace each workflow from request or scheduler through recipient selection, delivery, and history.

| Workflow | Audit focus |
|---|---|
| Single appointment recall | Channel validation, clinic authorization, recipient selection |
| Bulk recall | Batch size, partial failures, duplicate requests |
| Automated reminders | Scheduling, eligibility, overlapping runs |
| Patient invitation email | Transport compatibility, expiry, resend behavior |
| Staff invitation email | False success with non-delivery mailers |
| In-app notifications | Independence from external-channel failures |
| Mobile password recovery | Document placeholder and scope completion separately |

Deliverable: workflow inventory identifying triggers, recipients, templates, permissions, delivery calls, and recorded statuses. SMS invitations and password recovery are separate scope decisions, not assumed initial features.

## 2. Audit SMS provider flexibility

Proposed structure:

```text
Appointment / Recall Workflow
            |
     Message Dispatcher
            |
     SMS Provider Interface
            |
     Configured Provider Adapter
            |
         Gateway API
```

- [x] Define a common send request: recipient, message, sender identity, internal message reference.
- [x] Define a normalized result: provider, provider message ID, acceptance status, categorized error.
- [x] Select providers through backend configuration.
- [x] Isolate provider credentials and options within each adapter.
- [x] Describe capabilities: delivery receipts, sender IDs, message limits, provider-side idempotency.
- [ ] Map provider callbacks into common delivery statuses.
- [x] Provide a fake adapter for development and automated tests.
- [x] Decide whether configuration is system-wide initially or per clinic.
- [x] Define behavior when a provider lacks a capability; do not invent delivery confirmation.
- [ ] Compare expected volume, budget, Philippine coverage, sender requirements, receipts, and hosting compatibility before provider selection.

Acceptance criterion: switching between two implemented adapters requires configuration changes only; appointment controllers, reminder rules, and frontend workflows remain unchanged.

Audit automatic failover separately. A timeout may occur after a provider accepts a message, so immediate retry through another provider can cause duplicates.

## 3. Audit email transport compatibility

- [x] Inventory supported transports and required dependencies.
- [x] Check whether a custom API transport would be rejected by the patient invitation transport allowlist.
- [ ] Verify sender address, sending domain, reply-to address, and environment configuration.
- [x] Define consistent rejection of non-delivery transports in real delivery workflows.
- [x] Assess acceptance, delivery failure, bounce, and complaint tracking.
- [x] Check queued invitation behavior when tokens expire, rotate, or are cancelled.
- [x] Preserve failed-resend token behavior while introducing asynchronous delivery.

Deliverable: email transport integration specification preserving existing invitation behavior. Reuse Laravel Mail through a compatible transport where appropriate.

## 4. Audit data integrity and delivery status

| Finding | Required preparation |
|---|---|
| SMS marked sent without gateway call | Replace placeholder success with explicit delivery states |
| Email reminders do not call a transport | Connect message generation to shared email delivery |
| Email reminder recipient omitted | Correct persistence requirements |
| Staff success depends on lack of exception | Apply consistent delivery-transport safeguards |
| Shared appointment timestamp governs channels | Track channel-specific eligibility and retries |
| Historical sent records may be placeholders | Preserve as legacy/unverified history |

- [x] Assess a shared outbound-message table linked to reminders and invitations.
- [x] Define queued, provider-accepted, delivered, failed, and skipped states, with pending/unknown outcomes where necessary.
- [x] Record clinic, related entity, channel, recipient, provider, internal reference, provider message ID, idempotency key, timestamps, and sanitized errors.
- [x] Define attempt records preserving which provider handled each attempt, attempt count, and retry schedule.
- [x] Define how reminder counters change and how partial success is represented.
- [x] Separate provider acceptance from confirmed delivery.
- [x] Plan migration and retention without reclassifying old sent records as verified delivery.

Acceptance criterion: every displayed delivery status has defined semantics and supporting evidence.

## 5. Audit recipient and message rules

- [x] Normalize existing 09-prefixed numbers and international-format input.
- [x] Handle invalid, missing, shared, and duplicate contact numbers.
- [x] Define patient versus authorized guardian recipient selection.
- [x] Review email fallback to linked accounts instead of assuming the first account is appropriate.
- [x] Define channel preferences and communication-consent handling.
- [x] Verify clinic-specific sender identity and hotline details; remove reliance on example hotline and clinic fallbacks before delivery.
- [x] Review SMS length, encoding, segmentation, and estimated cost.
- [x] Define template versions, languages, and custom-message limits.
- [x] Review sensitive information in messages, logs, and delivery history.
- [ ] Obtain clinic review of message wording and templates before live use.

Deliverable: recipient-resolution rules and approved templates that work across providers.

## 6. Audit queue, scheduler, and retry readiness

Review database queue configuration together with Railway instructions, which currently recommend no notification worker.

- [ ] Verify worker deployment and restart behavior.
- [x] Dispatch jobs after database transactions commit.
- [x] Define retry limits, backoff, rate limits, timeout handling, and permanent versus temporary errors.
- [x] Prevent duplicate sends across manual, bulk, and scheduled triggers.
- [x] Revalidate appointment status before delivery to suppress stale messages.
- [ ] Verify scheduler timezone and overlap protection.
- [x] Define batching for expected daily volume.
- [x] Handle outages, exhausted credits, and disabled channels.
- [x] Use channel-specific retry eligibility; in-app success must not suppress retries for failed external channels.

Acceptance criterion: repeated requests, worker restarts, and scheduler overlap do not produce uncontrolled duplicate messages.

## 7. Audit authorization and operational visibility

- [x] Verify clinic isolation and role permissions for send, history, retry, and manual sweep endpoints.
- [x] Validate channel inputs and custom messages consistently.
- [x] Define independent SMS and email enable switches.
- [x] Add a test-recipient allowlist for controlled verification.
- [x] Restrict configuration access and mask credentials.
- [ ] Authenticate callbacks and protect against replay and duplicate events.
- [x] Show per-channel history and partial failures in staff workflows.
- [x] Monitor queue backlog, provider errors, delivery rates, and SMS usage.
- [x] Define safe provider switching while messages are queued.
- [x] Correct walkthrough text describing patient invitations as SMS/email when the current flow is email-only.

Queued messages need an explicit provider-selection policy: preserve the provider selected at enqueue time, or resolve it at send time with an auditable record. Each delivery attempt must retain its actual provider identity.

## 8. Verification and release gates

- [ ] Run the same provider contract tests against the fake adapter and each SMS adapter.
- [x] Verify configuration-based provider switching.
- [x] Test acceptance, rejection, timeout, rate limiting, and exhausted credits.
- [ ] Test duplicate and out-of-order callbacks.
- [x] Verify independent channel outcomes and retries.
- [x] Test invitation expiry, queued-token validity, and resend behavior.
- [x] Test clinic isolation and stale appointment suppression.
- [ ] Verify UI status and history accuracy.
- [ ] Conduct controlled receipt tests with clinic-owned numbers and email accounts.
- [ ] Validate pause controls and recovery from outages.

Suggested rollout: mocked delivery and allowlisted recipients, invitation email, manual reminders, bulk delivery, then automation. Provider acceptance alone does not satisfy end-to-end receipt verification.

## Audit deliverables

1. Current workflow and configuration inventory.
2. Findings register with severity, affected files, evidence, and acceptance criteria.
3. Provider-independent SMS interface and adapter specification.
4. Email transport compatibility specification.
5. Delivery-status and database-change proposal.
6. Queue, scheduler, retry, and callback design.
7. Test matrix and staged rollout checklist.
8. Implementation backlog ordered by dependencies.

## Decisions before implementation

- Initial SMS and email providers; sender/domain ownership.
- Expected volume and budget.
- System-wide versus per-clinic provider configuration.
- Patient/guardian recipient rules and approved templates.
- Scope of SMS invitations and password recovery.
- Provider-selection policy for queued messages and whether automatic failover is required.

## Recommended implementation sequence after the audit

Correct delivery reporting -> define provider contracts -> prepare tracking and queues -> implement adapters -> update staff visibility -> controlled delivery testing -> enable automation.

## Implementation notes

Checked items indicate implemented code or documented audit decisions, not live provider verification. No public callbacks are exposed; authenticated Twilio polling replaces callback ingestion in this release. Invitations deliberately remain synchronous; their token behavior is preserved. External-channel switches default off and test mode defaults on. The implementation runbook records limitations, schema changes, test results, rollout steps, and the remaining staging/production gates.
