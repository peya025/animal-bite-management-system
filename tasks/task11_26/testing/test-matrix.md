# Community Bite Awareness — Acceptance Traceability Matrix (Phase 8)

Updated: 2026-11-27 (Asia/Manila).

Maps every §15 acceptance criterion in `community-bite-awareness-and-surveillance-alerts-plan.md` to executed automated tests, manual/governance evidence, and remaining pilot sign-off gates.

## §15 Acceptance Criteria Traceability

| # | Acceptance Criterion | Automated Evidence | Status | Remaining Pilot / Governance Gate |
| --- | --- | --- | --- | --- |
| 1 | Creating one or many same-location incidents never directly changes public advisory content or queues community push | `AdvisoryWorkflowTest::test_legacy_clients_hide_card_and_current_feed_never_calls_detector`, `SurveillanceTest`, `AdvisoryPrivacyAndAccessTest::test_p7_t01_end_to_end_disclosure_audit_never_leaks_synthetic_markers` | **Automated pass** | Pilot observation (`P8-T04`) |
| 2 | Internal trends use unique eligible exposures, explicit windows, canonical exposure geography, exclusions and versioned thresholds | `SurveillanceTest` (10 tests: unique episodes, exact geography aliases, exclusions, window boundaries, unrounded thresholds, leap day) | **Automated pass** | Clinical threshold calibration (`P1`) |
| 3 | Staff see review priority and data limitations without an outbreak or infection claim | Playwright `surveillance.spec.ts` (3 tests), `SurveillanceInsightsPanel.tsx` | **Automated pass** | Clinician usability walkthrough (`P8-T03`) |
| 4 | Only authorized same-clinic actors can transition a revision; approval is independent by default and bound to exact content/scope/channels | `AdvisoryWorkflowTest` (14 tests: cross-clinic, developer denied, self-approval denied, hash binding on content & official source, revoked reviewer) | **Automated pass** | Small-clinic role & absence coverage sign-off (§16) |
| 5 | No old announcement, print, public overview or queue route can bypass approval | `AdvisoryWorkflowTest` (targeted announcement rejected, generic advisory fields rejected, legacy push suppressed, draft memo label) | **Automated pass** | Governance policy for generic free-text announcements |
| 6 | Public/mobile responses contain only current approved fields; no raw counts, patient evidence or internal risk scores | `AdvisoryPrivacyAndAccessTest::test_p7_t01_end_to_end_disclosure_audit_never_leaks_synthetic_markers`, `AdvisoryWorkflowTest` | **Automated pass** | Independent privacy sign-off (`P7`) |
| 7 | Mobile removes danger/near-you/all-clear inference and visibly shows clinic review context, expiry and disclaimer | Flutter `community_bite_watch_card_test.dart`, `community_advisory_view_test.dart` (21 tests total with `push_notification_service_test.dart`) | **Automated pass** | Screen-reader / large-text device check (`P5-T04`) |
| 8 | Unknown location, incomplete baseline, stale data and failed fetches never become false reassurance | `SurveillanceTest`, Playwright `surveillance.spec.ts`, Flutter `community_bite_watch_card_test.dart` & `community_advisory_view_test.dart` | **Automated pass** | None (covered across backend, web & mobile) |
| 9 | Optional community push honors preferences, audience, quiet hours, caps, deduplication and cancellation without changing personal reminder behavior | `AdvisoryDeliveryTest` (5 tests) + existing FCM/notification regression suites (`SendFcmPushNotificationTest`, `AutomatedFcmNotificationTriggersTest`, `PatientDeviceTokenApiTest`) | **Automated pass** | Mobile settings UI toggle + allowlisted device pilot (`P6-T05`) |
| 10 | Withdrawal stops new delivery and current feed access; old push links show a safe state | `AdvisoryDeliveryTest`, `AdvisoryWorkflowTest`, `AdvisoryPrivacyAndAccessTest::test_p7_t03`, Flutter `community_advisory_view_test.dart` (`410` tombstone) | **Automated pass** | Live pilot withdrawal drill (`P8-T01`) |
| 11 | Mixed old/new client behavior is explicitly tested; unsupported clients cannot continue receiving computed danger signals | `AdvisoryWorkflowTest` (`204` for legacy clients without `X-Community-Awareness-Version: 2`), Flutter widget tests | **Automated pass** | Installed-version matrix on physical devices (`P5-T01`) |
| 12 | Audit history answers who reviewed, approved, published, changed and withdrew each revision, and why | `AdvisoryWorkflowTest::test_return_edit_and_stale_version_preserve_history`, `community_advisory_events`, `surveillance_signal_events` | **Automated pass** | Retention & audit-access owner sign-off (§16) |
| 13 | Synthetic threshold/privacy/access/concurrency tests, relevant clinical regressions and clinician usability review pass before rollout | Backend (`83 passed`), Playwright (`5 passed`), Flutter (`21 passed`), local MySQL 4-migration rehearsal | **Automated pass** | Clinician usability review (`P8-T03`) |
| 14 | Rollback is rehearsed and cannot restore automatic public area warnings | `AdvisoryPrivacyAndAccessTest::test_p7_t03`, `operational-runbook.md` | **Automated pass** | Production ops rollback owner sign-off |
| 15 | Every phase has executed test evidence and an owner-reviewed gate; failed, blocked and not-run cases remain explicit | `tasks/task11_26/testing/README.md`, `test-matrix.md`, `suspicious-behavior-register.md` | **In progress** | Phase owner sign-offs before enabling flags |
| 16 | Observed source gaps and suspected runtime behavior are tracked separately; no claim of compromise is made without evidence | `tasks/task11_26/testing/suspicious-behavior-register.md` (`SB-01`–`SB-07`, `IMPL-01`–`IMPL-03`, `LIMIT-01`) | **Tracked** | Independent closure review |
| 17 | Critical/high findings affecting a release are contained, corrected and independently retested before that feature is enabled | All observed gaps (`SB-01`–`SB-07`) fixed and regression-tested; release flags remain `false` | **Implementer-verified** | Independent reviewer closure |
| 18 | Approval/publication/delivery reconciliation and suspicious-behavior escalation are exercised without generating public alerts or exposing patient data | `php artisan advisories:health-check` (verified exit `0` locally and in `AdvisoryPrivacyAndAccessTest`) | **Automated pass** | Production monitoring & escalation contacts (§16) |

## Pre-Release Gate Status

- `COMMUNITY_AWARENESS_PUBLICATION_ENABLED`: **`false`** *(keep disabled until clinic governance & pilot gates are signed off)*
- `COMMUNITY_AWARENESS_PUSH_ENABLED`: **`false`** *(keep disabled until in-app pilot passes and allowlisted device pilot `P6-T05` completes)*
