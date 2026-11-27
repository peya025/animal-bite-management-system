# Suspicious-behavior findings

Updated 2026-11-27. These are source gaps or synthetic test findings, not evidence of malicious activity or production compromise.

| Finding | Evidence / impact | Action and status |
| --- | --- | --- |
| SB-01 | Public overview derived area warnings directly from internal counts | Removed detector dependency; test asserts detector is never called. Legacy/new-client paths tested. Fixed in working copy. |
| SB-02 | Direct urgent targeted announcement could bypass advisory review | Replaced web action with draft creation; target field rejected and legacy targeted feed entries hidden. Tested. Generic free-text announcement misuse remains a release-review item. |
| SB-03 | Already queued area announcement could send after disabling its UI | Delivery-time guard suppresses targeted/unpublished/expired/missing announcements. Dedicated mock transport test plus existing notification regressions pass. |
| SB-05 | Red Near you and Normal labels could imply personal danger or safety | Removed from new card; legacy card receives 204. Failed refresh clears content. Widget/contract tests pass. Real installed-version matrix pending. |
| SB-06 | Text-based internal geography keys could collide across same-named barangays | Fixed in Milestone 2 working copy: canonical `province\|municipality\|barangay` keys and exact alias matching added in `ExposureGeographyResolver`, `ClinicalRiskAlertService::geographyKey()`, `BiteCaseService`, and `NotificationService`. Covered by `SurveillanceTest` and `ClinicalRiskAlertServiceTest`. |
| SB-07 | Existing active staff area notifications were not refreshed with updated counts/reason | Fixed in Milestone 2 working copy: `NotificationService::syncHighRiskAreaAlerts()` now refreshes existing active notification title, neutral internal-review wording, and metadata; persisted `SurveillanceSignal` tracks versioned runs and audit history. Covered by `SurveillanceTest` and `ClinicalRiskAlertServiceTest`. |
| IMPL-01 | Test setup exposed primary-role enum mismatch with assumed doctor value | Reviewer checks now use assigned doctor role; developers remain excluded. Fixed; backend and frontend checks pass. |
| IMPL-02 | Required approval attestation initially blocked non-approval actions | Validation restricted to approve; full transition tests pass after correction. |
| IMPL-03 | New card text initially had a Windows-encoding warning | Converted to UTF-8, formatted and reran mobile tests successfully. |
| LIMIT-01 | Existing old mobile cache/queued OS messages cannot be recalled server-side | No-store feed and periodic/resume refresh implemented; old messages and disconnected devices remain a documented deployment limitation. |

Release gate: do not enable community publication while phase-specific rollout, privacy, governance and compatibility gates remain open. Findings above are implementer-verified only; independent closure review is pending. No automatic public advisory is generated from this register.
