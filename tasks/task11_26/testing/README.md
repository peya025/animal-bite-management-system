# Community awareness implementation evidence

Updated: 2026-11-27 (Asia/Manila).

## First milestone: guarded in-app advisory workflow

Implementation has started; the complete nine-phase plan is **not complete**. Milestone 1 closes the automatic public warning paths and provides a tested review foundation. Milestone 2 adds the internal surveillance dataset/signal lifecycle, staff insights panel, Playwright UI tests, and a local MySQL migration rehearsal. No production database migration, deployment, commit, push or real notification send was performed.

### Implemented

- Public overview no longer reads the geographical detector. Existing clients without `X-Community-Awareness-Version: 2` receive 204 to hide the hardcoded Normal card. New clients receive neutral education and, when enabled, only approved current advisories.
- Additive advisory/event tables; clinic-scoped draft/edit/submit/return/approve/publish/withdraw endpoints; immutable event snapshots; expected-version conflict checks; transaction/row lock; independent assigned-doctor review; admin publication; date limits; approval hash and reviewer revalidation.
- Publication defaults off through `COMMUNITY_AWARENESS_PUBLICATION_ENABLED`. This milestone has **no community push sender**. Do not enable publication until the remaining release gates are met.
- Web draft creation and review panel, explicit approval attestation, reason-required return/withdrawal, history and pagination. Direct targeted announcement publication is rejected; legacy targeted announcements are hidden from public feeds. Pending targeted announcement pushes are suppressed at execution time.
- Mobile neutral card ignores all legacy elevated-area data, visibly explains limitations, displays approved review/expiry metadata, refreshes on resume and every minute, and clears previous content on refresh failure. No persistent advisory cache. Withdrawal visibility on an already-open device is bounded by refresh/network availability, not instantaneous recall.
- Legacy memo visibly marked draft/internal-only. Existing internal clinical detector and personal reminder logic remain separate.

### Deliberate initial limits

Only clinic-wide, in-app awareness is supported. There is no official-advisory type, named-area targeting, scheduled publication, push opt-in/outbox, independent surveillance signal persistence, canonical geography redesign or configurable new threshold engine in this milestone. Revision snapshots are stored in the append-only event table; published content cannot be edited. Corrections require withdrawal and a new draft. Return-to-draft is available before approval; a replacement draft is required if approved content needs correction.

The current overview transport selects a default clinic only when exactly one exists. Multiple clinics require an explicit clinic ID; the current mobile caller has no selector yet, so it safely shows unavailable in that case. This is a remaining compatibility task, not an all-clear.

The existing assigned `doctor` role is used; the primary users.role database enum does not include doctor. Governance must still confirm designated reviewers and medical authority. Ordinary free-text announcements remain available; rejecting `target_barangay` closes the structured legacy bypass, but semantic misuse of generic announcement wording requires the planned content-kind/governance work before release.

## Second milestone: internal surveillance engine, staff insights, and local MySQL rehearsal

### Implemented

- Additive surveillance tables (`surveillance_runs`, `surveillance_signals`, `surveillance_signal_events`), config (`backend/config/surveillance.php`), models (`SurveillanceRun`, `SurveillanceSignal`), and services (`ExposureDatasetBuilder`, `ExposureGeographyResolver`, `SurveillanceThresholdEvaluator`, `SurveillanceSignalService`).
- Clinic-scoped staff endpoints under `/api/reports/surveillance/*` (`signals`, `evaluate`, `signals/{signal}/reviews`, `history`, `evidence`) with policy/gate checks on patient evidence and `no-store` responses; daily scheduled evaluation (`surveillance:evaluate`) at `07:20` Asia/Manila with overlap protection and `onOneServer()`.
- Canonical `province|municipality|barangay` geography keys and exact alias matching applied across surveillance buckets, `ClinicalRiskAlertService::geographyKey()`, `BiteCaseService`, and `NotificationService` (`SB-06`). Active staff `high_risk_area` notifications now refresh title, neutral internal-review wording, and metadata on subsequent runs (`SB-07`).
- Staff web `SurveillanceInsightsPanel.tsx` mounted in `BiteCaseRiskDashboard.tsx`, displaying period boundaries, baseline-adequacy/unknown-location/duplicate limitations, versioned review actions, and incident evidence drill-down without publishing.
- Dedicated Playwright harness (`frontend/playwright.community-awareness.config.ts`, `frontend/tests/community-awareness/surveillance.spec.ts`) and guarded local MySQL migration helper (`tasks/task11_26/testing/migrate-local-community-awareness.php`).

### Deliberate milestone-2 limits

- Thresholds live in `backend/config/surveillance.php` (`rule_version: community-surveillance-v1`) rather than a database-backed `surveillance_rule_configs` table; `coverage_start_by_clinic` defaults empty so ratio-based review is suppressed until clinic coverage is explicitly confirmed.
- Evidence incident IDs are stored in run/signal metrics JSON (stripped from list/review responses and gated per-patient on `/evidence`) rather than a separate `surveillance_signal_evidence` join table.
- Historical shadow-mode calibration against real clinic data, official-source advisories, scheduled publishing, mobile multi-clinic selection, and controlled community push delivery remain pending.

## Third milestone (Phase 4): official-source advisories, scheduled publication, public detail tombstones, and patient preview

### Implemented

- Additive migration (`2026_11_27_000300_extend_community_advisories_for_phase4.php`) adding `advisory_type` (`routine_education`, `community_awareness`, `official_health_advisory`), official-source fields (`source_authority`, `source_reference`, `source_issued_on`, `source_geography_note`, `source_verified_by`, `source_verified_at`), and scheduling columns (`scheduled_for`, `scheduled_by`).
- `CommunityAdvisory::contentHash()` now binds `advisory_type` and all official-source fields; any post-approval tamper invalidates approval and hides the advisory from public feeds.
- `AdvisoryWorkflowService` enforces official-source metadata + explicit `source_verified` attestation on approval, adds `schedule` (admin-only, future Manila time on/before `expires_on`), allows `withdraw` on `scheduled` advisories, and provides `publishDueScheduled()` invoked by `advisories:publish-scheduled` (scheduled every 5 minutes in `console.php`) with full revalidation of release flag, expiry, approval hash, reviewer, and publisher (cancelling to `withdrawn` with audit event if revalidation fails).
- Dedicated public endpoints (`PublicCommunityAdvisoryController`): `GET /api/public/community-advisories?clinic_id=…` and `GET /api/public/community-advisories/{advisory}` (`404` on drafts/scheduled to prevent enumeration, `200` on active published with sanitized `source`, `410` neutral tombstone on withdrawn/expired/unavailable, `Cache-Control: no-store`).
- Generic `/api/announcements` now rejects advisory-specific fields (`advisory_type`, `source_authority`, `approved_by`, `approved_hash`) in addition to `target_barangay`.
- Staff web `AdvisoryPatientPreview.tsx` and updated `AdvisoryReviewPanel.tsx` add New Draft, advisory-type + official-source inputs, live patient preview in dialogs, official source-verification checkbox on approve, and scheduling/withdrawal UI.

## Fourth milestone (Phase 5): mobile multi-clinic support, advisory detail/tombstone view, and safe deep links

### Implemented

- Extended `mobile/lib/models/community_bite_overview.dart` with `PublicClinicOption`, `CommunityAdvisorySource`, `CommunityAdvisoryDetailResult`, and full advisory metadata (`id`, `revision`, `advisoryType`, `scopeLabel`, `publishedAt`, `source`).
- Updated `MobileApi::fetchCommunityBiteOverview({int? clinicId})` (and `MockMobileApi`) to send explicit `clinic_id` (`clinicId ?? MobileApi.clinicId`) with `X-Community-Awareness-Version: 2`, and added `fetchCommunityAdvisoryDetail(int advisoryId)` handling `200` active, `410` withdrawn/expired tombstone, and `404` not found.
- Added `mobile/lib/views/community_advisory_view.dart` for live-revalidated advisory detail display (revalidates on open, app resume, and manual refresh; shows neutral tombstone on `410` or local expiry and safe unavailable state on fetch failure).
- Updated `CommunityBiteWatchCard` with optional multi-clinic selector (`clinics` + `clinicId` switching that clears previous clinic state immediately), official source attribution summary, and **Read full advisory** navigation.
- Added allowlisted `AppRoutes.communityAdvisory` (`/community-advisory`) in `AppRouter` and `PushNotificationService` (`category: 'community_advisory'` with positive integer `advisory_id`, safely falling back to `/menu` if invalid).

## Fifth milestone (Phase 6): controlled opt-in community push notifications

### Implemented

- Added independent push release gate (`COMMUNITY_AWARENESS_PUSH_ENABLED=false`), configurable daily/weekly caps (`1` per 24h, `2` per 7 days), Asia/Manila quiet hours (`20:00–08:00`), and chunk size (`100`) in `backend/config/community_awareness.php`.
- Added opt-in `community_advisories` preference (default `false`) in `PatientAccount` and `PatientDeviceTokenController` without altering existing clinical/appointment reminder preferences.
- Added additive delivery outbox/ledger migration (`2026_11_27_000400_create_community_advisory_deliveries_table.php`) and `CommunityAdvisoryDelivery` model with unique logical delivery constraint `(advisory_id, advisory_version, patient_account_id, channel, delivery_purpose)`.
- Added `AdvisoryAudienceResolver` (chunked `chunkById` recipient selection replacing any 50-account limit, multi-patient deduplication, clinic scoping, opt-in check, and FCM allowlist preservation), `AdvisoryDeliveryService`, and `DeliverCommunityAdvisory` (`afterCommit()` on the dedicated `fcm` queue).
- Wired `AdvisoryWorkflowService` to enqueue after commit on `publish` / `publishDueScheduled()` only when both `publication_enabled` and `push_enabled` are true, and to cancel pending outbox rows immediately on `withdraw`.
- Enforced last-moment pre-send revalidation (flags, advisory state/hash/expiry, recipient eligibility/opt-in, daily/weekly caps, quiet-hours deferral/expiry cancellation) and generic lock-screen payloads (`Community Bite Awareness` / `A clinic community update is available. Open the app to read it.`) with allowlisted `/community-advisory` route data only.

## Sixth milestone (Phase 7 & 8 readiness): privacy disclosure audit, operational health check, runbook, and acceptance traceability

### Implemented

- Added `php artisan advisories:health-check` (`backend/app/Console/Commands/CommunityAwarenessHealthCheck.php`) for privacy-safe operational & approval-integrity reconciliation (no PII, creates no alerts; exits non-zero if any published advisory fails approval-hash or independent-reviewer integrity checks).
- Added `backend/tests/Feature/CommunityAwareness/AdvisoryPrivacyAndAccessTest.php` covering `P7-T01` (end-to-end synthetic marker disclosure audit across public overview, public feed, active/tombstone detail, `Cache-Control: no-store`, and generic FCM push payload) and `P7-T03` (withdrawal + flag-rollback drill preserving audit history and personal clinical reminders without ever calling `detectBarangaySurges`).
- Added `tasks/task11_26/testing/operational-runbook.md` (feature flags, scheduled jobs, withdrawal & non-destructive rollback steps, ownership/retention checklist) and `tasks/task11_26/testing/test-matrix.md` (Phase 8 §15 acceptance traceability matrix).

## Verification commands and outcomes

All automated backend tests used SQLite `:memory:` with faked queues. The local MySQL migration rehearsal ran only the three additive feature migrations against local `127.0.0.1 / animalbitecenter` with `publication_enabled=false` and without reading patient records. No production data was used.

| Check | Result |
| --- | --- |
| Backend: `php artisan test --compact --filter='AdvisoryPrivacyAndAccessTest\|AdvisoryDeliveryTest\|SurveillanceTest\|AdvisoryWorkflowTest\|ClinicalRiskAlertServiceTest\|AnnouncementTest\|MobileNotificationCharacterizationTest\|PatientDeviceTokenApiTest\|SendFcmPushNotificationTest\|AutomatedFcmNotificationTriggersTest'` | Passed: 83 tests, 685 assertions (14.11s) |
| Operational health check: `php artisan advisories:health-check` | Passed (exit `0`, `integrity_mismatches: 0`, `stale: false`, both release flags `false`) |
| Web Playwright: `npx playwright test -c playwright.community-awareness.config.ts` | Passed: 5 tests (21.4s, headless Chrome: 3 surveillance + 2 advisory review) |
| Web: `npm.cmd run build` | Passed TypeScript/Vite build (5.89s); bundle-size warning remains |
| Web: targeted ESLint on `AdvisoryPatientPreview.tsx`, `AdvisoryReviewPanel.tsx`, `SurveillanceInsightsPanel.tsx`, `ClinicalRiskAlertsStrip.tsx` | Passed (0 errors; note: `BiteCaseRiskDashboard.tsx` has 6 pre-existing errors / 1 warning unrelated to mounting the panel) |
| Local MySQL migration rehearsal: `php tasks/task11_26/testing/migrate-local-community-awareness.php --apply` + inspect | Passed on local `127.0.0.1 / animalbitecenter` (`publication_enabled=false`); all 4 migrations applied and all 6 tables + 4 Phase 4 columns verified present |
| Mobile: `flutter test --no-pub test/community_bite_watch_card_test.dart test/community_advisory_view_test.dart test/push_notification_service_test.dart` | Passed: 21 tests |
| Mobile: targeted `flutter analyze --no-pub` on all Phase 5 files | Passed: 0 issues in changed/new community-awareness code (4 pre-existing `use_null_aware_elements` infos in unrelated lines of `mobile_api.dart`) |
| UTF-8 check on edited public controller, memo, mobile card and web strip | Passed after correcting a newly introduced card encoding issue |
| `git diff --check` | No whitespace errors |
| Real-device FCM, production-database concurrency/rollback, full repository suites | Not run; not implied by unit/Playwright tests or local rehearsal |

Initial restricted execution could not read installed PHP dependencies and stalled Flutter startup. Normal-access execution completed; the stalled test process was stopped. This was a tooling-access issue, not an application test pass. Initial test failures (role model mismatch and approval attestation validation applying to every transition) were fixed before the passing backend run. The Flutter encoding warning was corrected and the final 15-test run completed without that warning.

## Phase-to-evidence matrix

| Plan phase | Current evidence | Remaining gate |
| --- | --- | --- |
| 0 | Source audit, legacy bypass fixtures, role-schema finding | Deployment consumer inventory and governance sign-off |
| 1 | `SurveillanceTest` (10 tests) covers unique episodes, exclusions, exact geography aliases, unrounded thresholds, window boundaries, leap day, hysteresis and stale/replay rejection; `SB-06`/`SB-07` fixed | DB-backed versioned rule config decision, historical shadow-mode calibration and clinical sign-off on thresholds |
| 2 | Both additive migrations rehearsed on local MySQL (`animalbitecenter`, 5 tables verified); SQLite tests pass cross-clinic, mass-assignment, stale-version, history and evidence-gate checks | Dedicated revision/audience/evidence schema decisions, full capability matrix, MySQL concurrency/race and rollback rehearsal |
| 3 | `SurveillanceInsightsPanel` + `AdvisoryReviewPanel` compile/lint cleanly; Playwright `surveillance.spec.ts` (3 tests) verifies limitations, read-only gating, versioned review without publishing, and unavailable error state | Full advisory UI browser/accessibility tests, clinical usability review and exact evidence drill-down reconciliation |
| 4 | Draft through withdrawal, official-source metadata/verification, scheduled publishing + revalidation/cancellation, public detail `404`/`410` tombstones, generic announcement field rejection, and Playwright patient preview/approval/schedule tests pass | Governance approval and free-text announcement policy review |
| 5 | Explicit `clinic_id` overview fetch, multi-clinic selector, `CommunityAdvisoryView` (`200`/`410`/`404`/local expiry/error), allowlisted `/community-advisory` push routing, and 21 Flutter widget/routing tests pass | Real installed-version device matrix, end-to-end logout/account-switch device verification, and screen-reader/large-text check |
| 6 | `AdvisoryDeliveryTest` (5 tests) covers opt-in default `false` + clinical preference isolation, `push_enabled` fail-closed gate, chunked >50 recipient resolution + deduplication, unique outbox ledger, generic lock-screen payload, last-moment withdrawal/opt-out cancellation, quiet-hours deferral/expiry cancellation, and daily/weekly caps; `community_advisory_deliveries` migrated on local MySQL | Mobile settings toggle UI for `community_advisories` and restricted allowlisted real-device FCM pilot (P6-T05) |
| 7 | `AdvisoryPrivacyAndAccessTest` (`P7-T01` synthetic-marker disclosure audit + `P7-T03` withdrawal/rollback drill), `php artisan advisories:health-check` (exit `0`), `no-store` headers, and `operational-runbook.md` complete | Privacy/retention owner sign-off and production scheduler/lock verification |
| 8 | `test-matrix.md` maps all 18 §15 acceptance criteria to automated evidence (`83` backend, `5` Playwright, `21` Flutter, local MySQL 4-migration rehearsal) | Clinic pilot observation window, clinician usability sign-off, allowlisted real-device push pilot (`P6-T05`), and explicit release decision |

No phase is signed off solely from automated evidence. All engineering phases (1–7) and Phase 8 traceability are complete in the working copy with both release flags (`COMMUNITY_AWARENESS_PUBLICATION_ENABLED`, `COMMUNITY_AWARENESS_PUSH_ENABLED`) safely disabled pending clinic governance and pilot sign-off.
