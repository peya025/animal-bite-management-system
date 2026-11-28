# Community Bite Awareness and Surveillance Alerts

**Status:** Implementation plan only — no application changes authorized by this document.  
**Prepared:** 2026-11-26, Asia/Manila.  
**Repository:** `animal-bite-management-system`. Paths below are repository-relative.  
**Basis:** “Mobile Bite Alert Approach” conversation and a read-only source audit of this checkout.

## 1. Outcome and boundaries

Replace automatic patient-facing geographical warnings with calm, clinic-approved Community Bite Awareness advisories. Keep automated detection inside the staff Bite Cases Summary, where staff can examine reporting trends and data quality before deciding whether communication is appropriate.

The core flow is **record → internal surveillance → human verification → approved revision → publication → optional controlled delivery**. A threshold crossing must never publish, declare an outbreak, label an individual as at risk, or send a community push by itself.

Separate three products:

| Product | Audience | Purpose | Publication rule |
| --- | --- | --- | --- |
| Personal clinical and appointment notifications | Relevant patient and authorized treating staff | Existing treatment, appointment and follow-up workflows | Preserve existing clinical workflows and preferences |
| Bite Cases Summary surveillance insights | Authorized clinic staff | Review facility-recorded exposure patterns and incomplete data | Internal; automated detection allowed |
| Community Bite Awareness | Community/mobile readers | Reviewed prevention and service information | Explicit approval of exact content and publication scope |

Ordinary bite reports, Category III exposure classification, animal illness/death, and statistical increases are not confirmation of rabies. Internal priority labels are workflow priorities, not clinical diagnoses or official outbreak levels. Official health advisories require independently verified authority information; the software cannot confer official status.

Out of scope: changing clinical treatment rules; diagnosing rabies; implementing this plan; rewriting unrelated reporting or inventory modules; collecting background GPS; committing, pushing, or deploying.

## 2. Audit method and limitations

The Laravel, React, and Flutter directories were accessible. Source files, routes, manifests, existing tests and earlier plans were inspected. No application server, database, migration, test suite, notification sender or deployment was run. Findings describe source behavior, not verified production behavior, data quality, scheduler health or delivery success. No patient records or environment secrets were read. No repository `AGENTS.md` was found by the file search.

Manifests declare Laravel `^12.0` with Sanctum, React `^19.2.6` with TypeScript/Vite, and Dart SDK `^3.12.1` for Flutter; these are declared constraints, not verified installed versions. Git's initial fsmonitor query reported an error; a read-only status check with fsmonitor disabled succeeded and showed no pre-existing changes.

### 2.1 Verified backend paths and behavior

| Existing path | Observed behavior | Implementation implication |
| --- | --- | --- |
| `backend/routes/api.php` | Public community overview and announcement feeds; patient-account notification/preferences routes; broad staff reporting role group | Apply separate advisory policies; reporting access must not imply publishing authority |
| `backend/app/Http/Controllers/Support/PublicCommunityOverviewController.php` | Calls `detectBarangaySurges()` directly, publishes qualitative area warnings, caches for 15 minutes; accepts clinic ID or chooses first clinic | Main automatic public exposure path. Replace its data source with approved publications; validate clinic context |
| `backend/app/Services/Reporting/ClinicalRiskAlertService.php` | Combines clinical alert summaries and 7-day geographical detection; excludes provisional dates and void/voided/duplicate status; normalizes exposure geography | Extract surveillance responsibility without changing clinical reminder logic |
| `backend/app/Services/Reporting/ExposureReportingQuery.php` | Separate exposure and residence normalization methods; exposure normalization does not substitute residence | Reuse this distinction; strengthen canonical geographical identity |
| `backend/app/Services/Reporting/EpisodeReportingStateResolver.php` and `TreatmentOutcomeResolver.php` | Existing episode/treatment state infrastructure used by alert engine | Reuse finalized-assessment semantics, do not derive them separately in clients |
| `backend/app/Services/NotificationService.php` | `syncHighRiskAreaAlerts()` creates internal `high_risk_area` notifications, keyed by clinic and barangay slug; resolves dropped signals | Preserve staff channel; replace ambiguous keys and stale metadata behavior |
| `backend/app/Console/Commands/SyncClinicAlerts.php`, `backend/routes/console.php` | Scheduled clinic alert sync at 07:30 using configured timezone, overlap protection and single-server execution | Extend existing orchestration; verify deployment locks/scheduler separately |
| `backend/app/Http/Controllers/Reports/ReportController.php` | Existing Bite Summary, cases, snapshots and action endpoints | Add a dedicated surveillance contract alongside existing summary fields |
| `backend/app/Models/BiteReportSnapshot.php`, `BiteReportAction.php` | Existing reporting snapshot/action models | Link review actions where useful; do not treat report finalization as advisory approval |
| `backend/app/Http/Controllers/Settings/AnnouncementController.php` | Admin check for management, clinic checks for mutations; direct published flag; public feed without clinic filtering in `published()` | Existing announcement publishing is not an advisory review lifecycle |
| `backend/app/Models/Announcement.php` | General announcement content with publication/urgency flags | Keep general notices distinct; block this path from bypassing advisory governance |
| `backend/database/migrations/2026_11_22_120000_add_target_barangay_to_announcements_table.php` | Existing announcement geographical target field | Text target alone is insufficient for precise audience selection |
| `backend/app/Jobs/SendFcmPushNotification.php` | Account allowlist and backend preference checks | Preserve these gates and add advisory-specific gates |
| `backend/app/Models/PatientAccount.php`, `backend/app/Http/Controllers/Mobile/PatientDeviceTokenController.php` | Existing push, appointment, reminder, digital-card and announcement preferences | Add community preference without resetting existing settings |
| `backend/app/Services/Mobile/MobileNotificationService.php`, `backend/app/Services/Messaging/FcmService.php` | Existing mobile notification and transport integration points | Reuse transport, not generic announcement publication semantics |

The public overview suppresses raw counts, but still publishes a named barangay when an internal threshold is reached. Its comment about hiding small counts is not a complete disclosure safeguard: qualitative location signals can reveal small groups. Its no-clinic fallback says “No unusual bite spikes reported this week,” which should not be used as evidence of safety or complete surveillance.

The announcement save path queues a generic push on initial publication or a changed published flag. It selects up to 50 active accounts linked to the clinic and applies the FCM allowlist; the inspected selection does not filter `target_barangay`. This is an observed limit and targeting gap, not proof of how many devices receive messages in production. Publishing an existing announcement repeatedly could also retrigger delivery. Internal area notification creation does not refresh the existing active notification's counts/reason in the inspected branch.

### 2.2 Verified React paths and behavior

| Existing path | Observed role / required change |
| --- | --- |
| `frontend/src/features/bite-cases/pages/BiteCaseRiskDashboard.tsx` | Existing Bite Cases Summary page; retain it as integration point |
| `frontend/src/features/bite-cases/components/ClinicalRiskAlertsStrip.tsx` | Mixes clinical and geographical signals; admin/developer UI offers direct advisory publication via `/announcements` with `is_published: true`, `is_urgent: true`; replace with “Create draft for review” |
| `frontend/src/features/bite-cases/components/BiteCasesOverviewTab.tsx` | Existing summary composition; host separate surveillance panel |
| `frontend/src/features/bite-cases/types/biteCasesSummary.types.ts` | Extend typed contracts rather than passing arbitrary JSON |
| `frontend/src/features/bite-cases/pages/BiteMapPage.tsx` | Existing map integration; staff-only drill-down must retain authorization |
| `frontend/src/features/announcements/AnnouncementsPage.tsx`, `publishedAnnouncements.ts`, `DashboardAnnouncements.tsx`, `AnnouncementHero.tsx` | Existing announcement management/display surfaces; prevent duplicate or bypass advisory rendering |
| `frontend/src/shared/contexts/NotificationContext.tsx`, `frontend/src/shared/utils/notificationNavigation.ts` | Existing notification integration; add internal signal links without leaking clinical content |

The strip also opens `/print/reports/barangay-advisory-memo`. Printed documents are a publication-like surface: proposed unapproved exports must say “Draft — internal review only,” and external advisory exports must use the approved revision.

### 2.3 Verified Flutter paths and behavior

| Existing path | Observed role / required change |
| --- | --- |
| `mobile/lib/widgets/menu/community_bite_watch_card.dart` | Direct overview card; uses `Normal` / `Stay Cautious`; substring comparison of user barangay adds red “Near you” chip; remove danger inference and fuzzy matching |
| `mobile/lib/models/community_bite_overview.dart` | Parses `caution` / `normal`, elevated areas and disclaimer; fallback headline implies no unusual spike |
| `mobile/lib/services/mobile_api.dart` | Fetches public announcements and `/public/community-bite-overview` |
| `mobile/lib/services/api.dart`, `mock_mobile_api.dart` | Existing API access/mock integration points |
| `mobile/lib/views/menu_view.dart` | Mounts community card and announcement carousel |
| `mobile/lib/widgets/menu/announcement_carousel.dart`, `mobile/lib/models/announcement.dart` | Separate announcement presentation surface; include in compatibility review |
| `mobile/lib/services/push_notification_service.dart`, `mobile/lib/views/notifications_view.dart` | Existing push routing and notification presentation; advisory links must revalidate current status |

The overview model contains a disclaimer but the inspected card does not render it. A calm backend disclaimer alone therefore does not ensure the patient sees context. The inspected flow is an automatically derived in-app card plus a separate manual announcement/push path; no automatic single-case community push was established by this audit.

### 2.4 Existing tests and related plans

Extend or deliberately revise these existing tests when implementation begins:

- `backend/tests/Feature/Reports/ClinicalRiskAlertServiceTest.php` (includes current public/announcement expectations).
- `backend/tests/Feature/Landing/AnnouncementTest.php`.
- `backend/tests/Feature/Notification/NotificationCharacterizationTest.php` and `backend/tests/Feature/NotificationBellTest.php`.
- `backend/tests/Feature/Mobile/MobileNotificationCharacterizationTest.php` and `PatientDeviceTokenApiTest.php`.
- `backend/tests/Feature/Notifications/AutomatedFcmNotificationTriggersTest.php` and `backend/tests/Unit/Jobs/SendFcmPushNotificationTest.php`.
- `mobile/test/community_bite_watch_card_test.dart` and `mobile/test/push_notification_service_test.dart`.

Related historical plans: `tasks/bite_cases_summary_alerts_cleanup_and_automation_plan.md`, `tasks/bite_cases_summary_enhancement_plan.md`, and `docs/tasks/bite_cases_summary_reporting_redesign_plan.md`. Their descriptions are not evidence that every proposal shipped. For this feature, replace their public automatic area-warning/direct-publish assumptions with the review gate here; preserve unrelated clinical work.

## 3. Non-negotiable safeguards

1. No public output sourced directly from detector results, raw risk scores, case lists, or patient matching.
2. Public queries return only approved, published, currently effective revisions for the intended clinic/scope.
3. No patient names, IDs, exact exposure addresses, coordinates, ages, individual dates, animal-owner identities, raw case counts or clinical categories in public advisory DTOs or push payloads.
4. A named location itself needs disclosure review. Broaden to municipality or use generic education when a small community could infer an individual. No fixed count alone proves anonymity.
5. Do not infer exposure from residence. Residence/subscribed area may select an audience, but is not evidence of where an incident occurred or a person's risk.
6. Approval covers content, scope, sources, dates, channels and language. Changing any of these invalidates approval for the new revision.
7. No “all clear,” “safe area,” “high-risk resident,” outbreak declaration, or infection probability generated from facility reports.
8. Failure, missing data or a stale feed produces an unavailable/limited-data state, never a reassuring surveillance conclusion.
9. Preserve personal reminders, appointment updates, clinical escalation and vaccine workflows. Community opt-out must not silently alter their preferences.
10. Withdrawal/expiry must stop future delivery and remove content from current feeds even if a scheduled cleanup job fails.

## 4. Internal surveillance definitions and threshold logic

### 4.1 Counting contract

Count distinct canonical bite incidents/episodes, not vaccination visits, appointments, doses, intake submissions or notifications. Retain source incident IDs only in restricted evidence storage. A second genuine exposure in the same patient can count separately; repeated visits for one exposure cannot. A suspected duplicate is reviewed, not silently merged based on similar name/date/address. Once duplicates are resolved, recount and retain the revision history.

Use exposure date and canonical exposure geography. Exclude voided/duplicate records, provisional/unknown dates, future dates and unknown/ambiguous exposure geography from geographical thresholds; report exclusion totals internally. Awaiting-assessment registered episodes can contribute to volume but must be separately labeled; only finalized assessments contribute to category-specific counts. “Verified” in current code is not proof of laboratory-confirmed disease or manual epidemiological verification.

Key geography by province + municipality + barangay canonical identifier, scoped by clinic. Current detector buckets by barangay text and notification keys use its slug, so same-named barangays can collide. Resolve aliases with an explicit mapping and manual exception queue; never use substring matches. Do not silently inherit the clinic's geography for ambiguous outside-clinic locations. Cross-clinic consolidation requires a separate authorized deduplication design; this plan defaults to clinic-scoped facility reports.

### 4.2 Existing rules versus proposed policy

Current source rules: current 7 inclusive calendar days; preceding non-overlapping 30 days; weekly baseline `B * 7 / 30`; cluster if `N >= 3 OR finalized_Category_III >= 2`; otherwise surge if `N >= 2 AND ratio >= 2`. Zero baseline yields null ratio and does not trigger the ratio branch. These are application constants, not validated public-health thresholds.

Proposed initial shadow-mode configuration preserves these numbers for comparison but changes meanings:

| Condition | Internal outcome | Patient outcome |
| --- | --- | --- |
| Single eligible exposure | Routine analytics; individual care handled separately | No generated community advisory or push |
| `N >= 2`, positive adequate baseline, ratio `>= 2` | Trend for review | None automatically |
| `N >= 3` or finalized Category III count `>= 2` | Priority review queue; not a confirmed cluster/outbreak | None automatically |
| Zero baseline or incomplete historical coverage | Ratio unavailable; absolute-count rules may still create review item with limited-data flag | None automatically |
| Official source reports a relevant health concern | Human verification and authority-source workflow | Only a specifically approved advisory |

Clinic/public-health reviewers must calibrate numeric values against representative historical data before activation. Category III volume remains an internal prioritization input and must not be described as confirmed animal infection. Consider removing that geographical rule after review; do not change treatment care rules as a side effect.

Define the analysis cutoff explicitly in Asia/Manila. Prefer completed days for scheduled detection: for cutoff date D, current window D−6 through D and baseline D−36 through D−7; a morning job uses yesterday as D. If staff view a partial current day, label it provisional and do not compare it silently with complete periods. Store UTC execution timestamps plus local date boundaries. Compare unrounded numbers; round only display values. Return null rather than infinity or percentage growth when baseline is zero.

Proposed adequacy gate: require all 30 baseline days within known collection coverage; flag imports, clinic closures, backfills and reporting interruptions. Unknown-location percentage uses a documented denominator of otherwise date-eligible current-period episodes, including unknown geography; empty denominator is “not available.” Keep existing `20%`/minimum `3` unknown-location warning values as shadow defaults, subject to review. Missing data cannot suppress a clinician's independent concern or justify an all-clear statement.

Optionally offer a 30-day versus preceding 30-day trend view with its own labels. Do not mix its counts with the 7-day detector or present facility attendance counts as population incidence without a defensible denominator.

### 4.3 Recalculation and signal lifecycle

Persist immutable analysis runs with cutoff, rule version, configuration hash, exclusions, baseline coverage, totals and restricted evidence references. Upsert one open signal for `(clinic, canonical geography, rule family)`; attach new run evidence to it. A repeated unchanged run must not create another staff notification. New evidence updates counts and last-seen time; notify assigned staff only on first creation or material escalation.

Proposed stabilization: two consecutive completed daily runs below threshold resolve an automatic signal; manual dismissal requires a reason. New material evidence can reopen it. This hysteresis is configurable and must not delay personal clinical tasks. Resolve internal signals independently of advisory expiry: a public advisory requires deliberate withdrawal/revision or its approved expiry, not silent rewording after a recount.

## 5. Review, approval and publishing lifecycle

Keep signal state and advisory state separate.

**Signal:** `new → in_review → verified / dismissed → resolved`; reopening records actor/reason and new evidence. Verification means data/context reviewed, not infection confirmed.

**Advisory revision:** `draft → submitted → approved → scheduled / published → expired / withdrawn / superseded`. A reviewer can return a submission to draft with reasons. Submitted content is locked; revisions are new versioned records. Approved scheduling cannot alter approved content or audience.

1. Reviewer validates duplicate resolution, exposure location/date, data completeness, reporting changes and denominator limitations.
2. Reviewer records whether communication is needed. Dismissal or monitoring without publication is a valid outcome.
3. Author selects routine education, community awareness, or sourced official health advisory. Official type requires authority name, reference/URL, issue date, geographical relevance, verification actor/time and expiry/recheck policy. Do not fetch arbitrary URLs from the server without network protections.
4. Author prepares content, audience, language, start/end time, proposed channels and disclosure checklist. Evidence and internal notes remain private.
5. An authorized independent approver reviews the exact revision and patient preview. Default: author cannot approve their own work. If staffing requires an exception, clinic governance must explicitly define an audited alternative before enabling it; no implicit admin bypass.
6. Publisher publishes only that approved revision. Use transaction locks, expected revision/ETag and idempotency key. Approval and publication events are auditable.
7. Publication transaction writes a durable delivery outbox. Queue work starts after commit. Scheduled publishing rechecks approval, permission validity and dates.
8. Withdraw immediately with a reason; invalidate feeds/caches, cancel pending delivery and show a neutral withdrawn state on old deep links. Sent OS pushes cannot be recalled; generic push text reduces residual harm. A substantive correction needs a new approval and a controlled correction delivery decision.

Default proposed validity: seven days for routine awareness, explicitly reviewed per advisory; official-source guidance follows its source and clinic review. Expiry is mandatory, timezone-visible and bounded by configuration. Archive immutable revisions rather than deleting publication history.

## 6. Permissions and clinic isolation

Proposed capabilities must be enforced server-side using Laravel policies/gates plus existing authentication. Do not trust UI role checks or client-supplied clinic IDs.

| Capability | Proposed grant |
| --- | --- |
| View internal aggregate surveillance | Designated clinic reporting staff |
| Open patient evidence | Existing clinical record permission AND same-clinic access |
| Assign/review/dismiss a signal | Designated surveillance reviewer (doctor or trained authorized staff) |
| Draft/submit awareness | Designated clinic author |
| Approve clinical/public-health wording | Designated doctor/medical reviewer with approval capability |
| Publish/schedule | Designated clinic publisher, only for approved revisions |
| Withdraw | Authorized reviewer/publisher; record reason and notify owner |
| Change thresholds/capabilities | Authorized clinic administrator with audit record and review |
| Patient/public reader | Only current sanitized publications; no internal API access |

Existing roles include admin, doctor, nurse, triage, treatment, registration, staff and developer. Define a migration mapping with clinic owners; do not automatically grant every reporting role publication rights. Developer access must not imply clinical approval. Scope list, detail, transition, export and evidence routes, including route model binding. Return 404 for inaccessible tenant objects where appropriate. Revoked/inactive accounts cannot publish via old sessions or queued jobs. Audit failed privileged actions without logging sensitive request bodies.

## 7. Proposed data model

All tables below are **new proposals**, except references to existing clinic/user/incident/account tables. Confirm actual key names and types against migrations before implementation. Use foreign keys consistent with the repository, UTC timestamps, clinic indexes, and explicit retention policies.

| Proposed table | Core fields / constraints |
| --- | --- |
| `surveillance_rule_configs` | clinic, version, parameters JSON, effective time, approved_by; immutable effective versions |
| `surveillance_runs` | clinic, local cutoff/window boundaries, rule/config version, coverage/exclusion metrics, execution status; unique clinic + cutoff + config + source revision/hash |
| `surveillance_signals` | clinic, canonical geo, rule family, priority, state, first/last seen, latest run, assignee, lock version; one open logical signal per scoped key |
| `surveillance_signal_evidence` | signal/run, incident reference and inclusion/exclusion reason; restricted access, unique run + signal + incident |
| `community_advisories` | stable ID, clinic, optional originating signal, current published revision pointer, owner |
| `community_advisory_revisions` | advisory/version, state, type, title/body/actions/language, public scope, source metadata, start/end, approval content hash, author/reviewer/publisher and transition times; unique advisory/version |
| `community_advisory_audiences` | revision, canonical geo/subscription scope, channel policy; unique revision + scope; no free-text fuzzy matching |
| `community_advisory_events` | append-only transition/audit events, actor, revision, reason, timestamp; restricted before/after metadata |
| `community_advisory_deliveries` | outbox + ledger: revision, account, channel, status, attempts, next attempt, provider ID, error class, cancellation reason; unique revision + account + channel + delivery purpose |

Use existing patient-account preferences JSON for `community_advisories` (proposed boolean default false for push) and explicit audience subscriptions if needed. Store subscription geography separately from exposure evidence. If canonical geography is not already available, add a small controlled geography/alias registry after auditing existing address catalogs; do not introduce a competing free-text list.

Public projection contains clinic identity, advisory ID/version, safe scope label, title/body/actions, official-source attribution where applicable, reviewed/published/expiry timestamps, and status. Exclude internal notes, approval staff personal details, incident links, counts, scores, delivery recipients and evidence. Public “Reviewed by clinic” requires recorded approval for that exact revision.

Retention periods, legal basis, audit-access roles, deletion/anonymization policy and backup retention require local privacy/governance review before rollout. This plan makes no claim of legal compliance and does not prescribe legal retention periods. Keep identifiable delivery ledgers only as long as operationally justified; retain de-identified audit outcomes where policy permits.

## 8. Proposed API contracts

Routes below are proposals relative to the existing `/api` prefix. Use Form Requests, policies and explicit resource serializers. Pagination, validation, rate limits and bounded filter ranges are required.

| Method / route | Purpose |
| --- | --- |
| `GET /reports/surveillance/signals` | Clinic-scoped filters, priority, status, geography, date range, data freshness |
| `GET /reports/surveillance/signals/{id}` | Counts/baseline/reasons/quality; evidence links only for permitted staff |
| `POST /reports/surveillance/signals/{id}/reviews` | Assignment, verification, dismissal, reopening with expected version and reason |
| `POST /community-advisories` | Create draft, optionally linked to signal |
| `GET /community-advisories` and `GET /community-advisories/{id}` | Authorized management list/detail and history |
| `PATCH /community-advisories/{id}/revisions/{version}` | Edit draft only; expected version required |
| `POST /community-advisories/{id}/submit` | Validate and freeze revision for review |
| `POST /community-advisories/{id}/approve` | Approve exact revision/hash; separate actor |
| `POST /community-advisories/{id}/return` | Return for changes with reason |
| `POST /community-advisories/{id}/publish` | Immediate/scheduled publication of approved revision, idempotency key |
| `POST /community-advisories/{id}/withdraw` | Cancel publication/delivery, preserve history |
| `GET /public/community-advisories?clinic_id=…` | Explicit clinic-scoped sanitized active feed |
| `GET /public/community-advisories/{id}` | Current published detail or safe expired/withdrawn/unavailable status |
| Existing patient notification-preference routes | Add community preference, preserving unrelated keys |

Internal example: `{id, version, priority:"trend_for_review", period:{start,end}, baseline:{start,end,count,weekly_average,adequacy}, current_count, ratio, exclusions, rule_version, state, latest_run_at}`. Public example: `{id, revision:2, title:"Community Bite Safety Update", scope_label:"Municipality-wide", reviewed_at, published_at, expires_at, body, actions, source:null}`. These are illustrative schemas, not real case data.

Use 401 for unauthenticated management access, 403/404 for forbidden scope, 422 for invalid content/dates, 409 for stale revisions or invalid transitions, and 429 for rate limits. Unknown public draft IDs return 404 without confirming their existence; known formerly published IDs may return a sanitized 410/tombstone. Repeated publish with the same key returns the same publication result; different payload with the same key conflicts. Never accept `approved_by`, clinic ownership, internal state or evidence from mass-assigned public inputs.

Public feed availability must not depend on authentication, but target preferences are not access control for public information. Fetching another published clinic feed reveals only intentionally public content. Internal and personalized APIs require authentication and clinic/account scope. Avoid caching personalized feed results under shared public keys.

## 9. Proposed clean file structure

The following paths are **proposed new files**, not audited existing files. Existing integration paths are listed separately in section 2. Keep controllers thin, calculations independent of publishing, and transport independent of content approval.

```text
backend/
  config/community_awareness.php
  app/
    Models/
      SurveillanceRun.php
      SurveillanceSignal.php
      CommunityAdvisory.php
      CommunityAdvisoryRevision.php
      CommunityAdvisoryDelivery.php
    Policies/
      SurveillanceSignalPolicy.php
      CommunityAdvisoryPolicy.php
    Services/
      Surveillance/
        ExposureDatasetBuilder.php
        SurveillanceThresholdEvaluator.php
        SurveillanceSignalService.php
      CommunityAwareness/
        AdvisoryWorkflowService.php
        AdvisoryPublicationService.php
        AdvisoryAudienceResolver.php
        AdvisoryDeliveryService.php
    Http/
      Controllers/Reports/SurveillanceSignalController.php
      Controllers/CommunityAwareness/CommunityAdvisoryController.php
      Controllers/Support/PublicCommunityAdvisoryController.php
      Requests/CommunityAwareness/
        StoreAdvisoryRequest.php
        UpdateAdvisoryRevisionRequest.php
        TransitionAdvisoryRequest.php
      Resources/CommunityAwareness/
        PublicAdvisoryResource.php
        StaffAdvisoryResource.php
    Jobs/
      EvaluateSurveillanceSignals.php
      PublishScheduledAdvisories.php
      DeliverCommunityAdvisory.php
  database/migrations/<new_timestamp>_create_surveillance_tables.php
  database/migrations/<new_timestamp>_create_community_advisory_tables.php
  tests/Unit/Surveillance/SurveillanceThresholdEvaluatorTest.php
  tests/Feature/CommunityAwareness/
    AdvisoryWorkflowTest.php
    AdvisoryPrivacyAndAccessTest.php
    AdvisoryDeliveryTest.php
    LegacyCommunityOverviewCompatibilityTest.php
frontend/
  src/features/community-awareness/
    api/communityAwarenessApi.ts
    types/communityAwareness.types.ts
    components/SurveillanceInsightsPanel.tsx
    components/SignalReviewDrawer.tsx
    components/AdvisoryEditor.tsx
    components/AdvisoryPatientPreview.tsx
    components/AdvisoryHistory.tsx
    pages/AdvisoryReviewPage.tsx
  tests/community-awareness.spec.ts
  playwright.community-awareness.config.ts
mobile/
  lib/models/community_advisory.dart
  lib/services/community_awareness_service.dart
  lib/widgets/menu/community_awareness_card.dart
  lib/views/community_advisory_view.dart
  test/community_awareness_card_test.dart
  test/community_advisory_contract_test.dart
```

Add small supporting models/resources/requests for the remaining proposed tables as implementation requires; do not create empty scaffolding in advance. Reuse the existing API client, auth context, UI components, geography normalizer, state resolver, FCM transport and notification preference UI. Keep any compatibility adapter in `PublicCommunityOverviewController.php` thin. Temporarily delegate `ClinicalRiskAlertService::detectBarangaySurges()` to the extracted evaluator so existing staff consumers continue working; remove the wrapper only after all consumers migrate.

## 10. Web and mobile experience

### 10.1 Staff web

Retain clinical care alerts in their existing treatment context. Add “Surveillance Insights” with recorded incident count, comparison period, rule explanation, assessment completeness, excluded records, last successful run, review status and assigned owner. Label the panel “Facility-recorded bite reports; not an outbreak declaration.” Do not blend internal clinical urgency and geographical volume into a single public danger score.

Provide Review records, Assign, Verify, Dismiss with reason, and Create awareness draft. Replace direct Publish buttons with the gated workflow. Use exact evidence-based drill-down filters (canonical geography + period + episode eligibility), not only a text search. Export patient data only under existing clinical/report permissions. Show approval history, mobile preview, source checks and disclosure checks before publishing; hide unauthorized actions but also enforce policies on the backend. Charts and status labels must not depend on color alone.

### 10.2 Patient mobile

Rename the card “Community Bite Awareness.” Use neutral information styling, no red near-you chips, danger ranking, raw thresholds, risk percentages or “Normal” badge. Show title, clinic, safe scope, review date, expiry, short action and detail link. Review attribution is factual metadata, not a decorative trust badge. Generic education can remain available without suggesting it was generated by a local case.

Example content for later clinic review:

> Community Bite Safety Update  
> The clinic has shared a bite-prevention update for this community. Reports of animal bites do not by themselves confirm rabies infection. Read the clinic's guidance and contact the clinic if you need help.

No-publication empty state: “No current clinic advisory. Bite-prevention information is available.” Fetch failure: “Community updates are temporarily unavailable.” Do not substitute “No cases” or “Your area is safe.” Show cached publication timestamp and never display an expired revision as current. Revalidate on resume and before opening deep links; clear account-specific cache on logout/account switch.

Clinical first-aid content, translations and care-seeking wording must be reviewed against current official clinical guidance before implementation. Booking must not imply that a person should wait for an appointment or community alert before seeking needed assessment. This planning document intentionally does not establish treatment guidance.

Keep vaccine availability distinct from community surveillance and mark its freshness; it is not a guarantee of stock or an assessment of community safety. Render the contextual disclaimer visibly rather than only storing it in a model. Test screen readers, large text, contrast, slow networks and localized date/time display.

## 11. Notification and privacy controls

- Routine awareness is in-app by default. Optional community push requires explicit preference, approved channel and relevant audience. No global bypass for “urgent” or official labels.
- Proposed starting limits: no more than one routine community push per account in 24 hours and two in seven days; quiet hours 20:00–08:00 Asia/Manila. These are configurable product defaults requiring clinic review, not medical rules. Delay within approved validity or skip if expired; never delay personal clinical messages by these community caps.
- Resolve recipients server-side from canonical subscriptions/authorized clinic links; do not use fuzzy residential substring matches or unrestricted client IDs. Unknown location receives generic opted-in clinic information only, not inferred targeting. Deduplicate an account linked to multiple patients and devices.
- Replace the existing fixed first-50 announcement pattern for advisories with chunked recipient selection and a unique delivery ledger. Preserve any test allowlist; expanding beyond it is a separately reviewed rollout step.
- Each queued delivery rechecks active publication, exact approved revision, expiry, withdrawal, active account, current preferences, audience, quiet hours and rate limits immediately before send.
- Use after-commit outbox processing, bounded retries with backoff, dead-letter/error status, token cleanup, and retry deduplication. Provider success means accepted by provider, not proof that a patient read it. Network timeouts can produce uncertain delivery; do not promise exactly-once push transport.
- Generic lock-screen message: “A clinic community update is available. Open the app to read it.” Payload includes advisory ID/version and route only; no patient information, exact target address, case counts or internal review reason.
- Do not embed untrusted HTML, images with patient information, arbitrary push routes or unsafe source links. Sanitize text, restrict attachments, strip metadata where supported, and use allowlisted navigation destinations.
- Public serialization uses an allowlist; tests must inspect nested fields and error payloads. Public cache keys include clinic, publication version and safe scope; no internal data in CDN/browser caches. Purge on withdrawal and revision; enforce effective dates at query/serialization time as a second gate.
- Avoid small-cell/complementary disclosure through location labels, dates, public exports and repeated updates. Default public counts to omitted rather than “0” or “<5.” Staff exports remain authorized and auditable.
- Logs/analytics must not contain patient identities, device tokens, exact addresses or full internal evidence. Keep approval and delivery audit access restricted. Public advisory engagement tracking should be aggregate and optional where appropriate.

## 12. Migration and backward compatibility

1. Inventory consumers of the old overview, public announcements, printed memos, staff notification types, and mobile cache/deep links. Capture sanitized contract fixtures and installed-client minimum versions before development.
2. Add schema and feature flags with new publication/delivery disabled. Suggested independent flags: internal surveillance evaluation, advisory authoring, public approved feed, community push, legacy overview adapter. Flags must fail closed for public publication; they must not disable personal reminders.
3. Do not convert historical announcements, computed areas or finalized report snapshots into approved advisories automatically. Identify legacy advisory-like announcements for manual classification; they need new review before entering the governed feed.
4. Run new surveillance in shadow mode and compare counts, exclusions and windows with the existing engine. Reconcile differences before replacing staff detector results. Avoid running two notification emitters for the same signals.
5. Backend-first safety release: stop deriving public elevated areas directly from detector results. Preserve legacy response keys and types while returning neutral content or an approved compatibility projection. No historical approval may be invented.
6. Important old-client limit: its hardcoded `Normal` badge cannot be corrected solely by a new headline. If that remains misleading, use a tested hide-card/unavailable response for obsolete clients and require the mobile update. Do not return `normal` with reassuring text as a safety workaround. New status enum values must not silently activate old-client fallbacks.
7. Migrate mobile to the approved advisory feed and revised card. Keep endpoint compatibility until adoption is measured. Validate anonymous/pre-login access and old announcement carousel behavior. No generic announcement entry may carry an advisory projection without the same approval gate and current-status filtering.
8. Remove direct advisory creation via generic `/announcements`, including the old strip action. Introduce an explicit content kind/reference or reject advisory-specific fields on generic writes; reclassify existing `target_barangay` notices manually. Avoid relying solely on keyword detection. General clinic announcements continue under their existing scope, but cannot impersonate approved community advisories.
9. Enable authoring/review, then a limited approved in-app pilot. Enable optional push only after withdrawal, preference and retry tests pass. Reconcile delivery ledger outcomes before widening rollout.
10. Rollback by disabling community publishing/push and retaining neutral/static education. Preserve additive tables and audit history; do not roll back to automatic public warnings. Retain a tested compatibility backend for deployed clients; defer destructive schema cleanup until retention and adoption gates pass.

Cache handling is part of rollout: invalidate old 15-minute overview caches and public announcement projections, version mobile cache keys and refresh on resume. Previously delivered notifications remain outside server control; their links must resolve safely to current approved content or withdrawal notice.

## 13. Phased implementation and exit gates

| Phase | Work | Exit gate |
| --- | --- | --- |
| 0 — Confirm contracts and governance | Audit deployment consumers, actual keys/geography catalog, scheduler, notification routes, legacy content; clinic/privacy owners agree capabilities and review accountability | Signed decisions, sanitized fixtures, acceptance scenarios; no assumptions promoted to production facts |
| 1 — Rules and source quality | Extract episode dataset/evaluator; canonical geography; configuration/versioning; boundary and duplicate cases | Historical shadow results reviewed; numeric defaults approved for internal review only |
| 2 — Persistence and APIs | Add tables, policies, resources, transition services, outbox and API contracts | Cross-clinic, revision race and public-field tests pass; migrations rehearsed on isolated data |
| 3 — Internal web surveillance | Separate clinical and surveillance UI, review queue, quality indicators, exact drill-down | Staff can verify/dismiss without publishing; clinical workflows unchanged |
| 4 — Advisory workflow | Draft, independent approval, patient preview, scheduling, source checks, withdrawal/history | No direct announcement/API/export bypass; every publication tied to approved hash |
| 5 — Public/mobile compatibility | Backend safety adapter, new feed/card/detail, disclaimer, offline/expiry states | Old and new client matrix passes; no misleading computed location alerts |
| 6 — Controlled notifications | Opt-in, audience, caps, quiet hours, ledger, retry/cancellation, safe deep links | FCM mocked tests plus restricted device pilot; no duplicates or unintended recipients |
| 7 — Privacy and operational readiness | Disclosure review, access/export checks, retention, dashboards/runbook and rollback rehearsal | Named owner, complete withdrawal drill, safe failure behavior |
| 8 — Pilot and acceptance | Small clinic pilot; collect usability and signal review feedback; tune versioned configuration | All acceptance criteria met; explicit implementation release decision outside this planning task |

Suggested ownership: clinical/public-health reviewer owns wording/threshold calibration; clinic admin owns staff assignments; backend lead owns lifecycle/security/delivery; web/mobile leads own patient preview and compatibility; privacy owner owns disclosure/retention review; QA owns independent negative-path tests. No phase requires a public advisory merely to demonstrate activity.

### 13.1 Testing required within every phase

Testing is part of each phase, not work deferred until Phase 8. For every phase, record the test IDs, synthetic fixtures, expected and actual results, environment, source revision, tester, evidence links and unresolved findings. Use `not run`, `passed`, `failed` or `blocked`; a proposed test is never a passed test. A blocked prerequisite blocks its dependent release gate. After a fix, rerun the failing scenario and relevant adjacent regressions; preserve the original failure evidence.

All tests below are **future implementation requirements**. This documentation update does not execute application tests or approve a rollout. Phase 0 establishes the current baseline; it must not describe known unsafe legacy behavior as acceptable merely because a characterization test reproduces it.

#### Phase 0 — Audit and governance tests

- **P0-T01 — Contract inventory:** Trace synthetic case input through the detector, staff summary, public overview, announcements, printed memo and mobile card. Record which paths compute, publish, cache or deliver content. Confirm endpoint/middleware mappings against source and isolated runtime behavior.
- **P0-T02 — Baseline characterization:** Capture sanitized fixtures for a single exposure, threshold crossing, no clinic, unknown location and repeated announcement publication. Record current output separately from required future output.
- **P0-T03 — Access and environment checks:** Build a role/capability matrix using test accounts from two clinics and a patient account. Verify test queues/providers cannot contact real recipients; inspect scheduler/cache configuration without copying secrets.
- **P0-T04 — Governance walkthrough:** Have proposed author, reviewer and publisher walk through draft, correction and withdrawal scenarios, including absence of an independent approver. Record unresolved ownership decisions.
- **Suspicious behavior to inspect:** An unlisted publication route, claimed review without an approval record, globally mixed clinic content, an unexpected real recipient or disagreement between documented and actual access.
- **Evidence and gate:** Backend lead and QA deliver a consumer/contract inventory and gap register; clinic owner confirms responsibilities. Known legacy gaps may proceed to remediation phases with owners, but must block enabling affected public features.

#### Phase 1 — Rules and data-quality tests

- **P1-T01 — Threshold boundaries:** Assert exact counts and review levels for 0/1/2/3 unique exposures, finalized versus unassessed categories, ratio just below/at/above threshold, zero baseline and incomplete coverage.
- **P1-T02 — Time and identity:** Test local midnight, completed/partial days, late imports, duplicate resolution, repeated vaccination visits, genuine repeat exposures and same-named barangays in different municipalities.
- **P1-T03 — Data exclusions:** Assert unknown locations, provisional/future dates and voided records produce the documented exclusion totals and never fall back to residence.
- **P1-T04 — Repeatability:** Repeat and concurrently run the same input/configuration; compare with independently calculated fixture totals. A changed source/configuration produces traceable new evidence, not unexplained overwriting.
- **Suspicious behavior to inspect:** Impossible growth, a sudden baseline collapse, large location reassignment, duplicate inflation, unapproved threshold changes or different results for identical inputs. Investigate imports and corrections before attributing intent.
- **Evidence and gate:** QA stores expected/actual calculations; clinical reviewer accepts shadow-mode discrepancies and threshold meanings. No unexplained count mismatch or automatic public side effect remains.

#### Phase 2 — Persistence and API tests

- **P2-T01 — Migrations:** Apply additive migrations to an isolated representative database; verify existing records/preferences survive, constraints/indexes work and interrupted deployment recovery is documented. Rehearse the planned non-destructive rollback.
- **P2-T02 — Authorization:** Exercise every list/detail/mutation/export endpoint with each capability, cross-clinic IDs, patient credentials, inactive staff and forged ownership/state fields. UI hiding must not be the enforcement mechanism.
- **P2-T03 — Atomicity and concurrency:** Race duplicate creates, publish requests and stale revisions; force a transaction failure before outbox commit. Assert one logical publication/delivery intent and no delivery from rolled-back work.
- **P2-T04 — Contract/privacy:** Validate pagination limits, invalid dates, status codes and explicit public resource fields, including nested/error responses. Draft IDs cannot be enumerated through public detail routes.
- **Suspicious behavior to inspect:** Successful unauthorized mutations, mass-assigned approval fields, missing audit events, duplicate outbox rows or private attributes in a public response.
- **Evidence and gate:** Backend lead and QA provide migration/API/concurrency results. Authorization failures, disclosure or broken atomicity block progression of dependent features.

#### Phase 3 — Staff web tests

- **P3-T01 — Workflow:** Use browser tests to review, assign, verify and dismiss synthetic signals; assert these actions neither publish nor send community push.
- **P3-T02 — Drill-down reconciliation:** Compare displayed counts and evidence lists using the same period, eligibility and canonical geography. Verify unauthorized users cannot open patient details through direct URLs.
- **P3-T03 — Presentation and failure states:** Test loading, missing data, stale analysis, server errors, keyboard navigation and non-color status labels. Distinguish clinical care urgency from surveillance review priority.
- **P3-T04 — Regression:** Check existing clinical alert links, treatment follow-up and summary filters after adding the surveillance panel.
- **Suspicious behavior to inspect:** A hidden but callable publish action, cross-clinic evidence, mismatched counts, stale values labeled current or a signal displayed as confirmed rabies.
- **Evidence and gate:** Web lead and QA retain browser assertions and sanitized screenshots; clinical reviewer confirms staff can interpret the panel without a public danger inference.

#### Phase 4 — Review and publication tests

- **P4-T01 — Transition matrix:** Exercise every allowed transition and representative forbidden transitions, including self-approval, direct draft publication, expired approval context and reviewer permission revocation.
- **P4-T02 — Approval binding:** Change title, body, geography, language, validity or channel after approval. Assert the changed revision cannot publish using the previous approval/hash.
- **P4-T03 — Bypass and race tests:** Attempt publication through generic announcements, old UI requests, scheduled jobs and print exports. Race publish/withdraw and double-click publish; verify resulting history and exact public revision.
- **P4-T04 — Source and disclosure review:** Reject an official advisory without verified source metadata; test draft watermarks and patient preview. Review small-community examples where a location label alone could identify someone.
- **Suspicious behavior to inspect:** Approval actor equals author without an explicitly governed exception, altered approved content, forged official attribution, review badge without evidence or unexplained publication history gaps.
- **Evidence and gate:** Clinical reviewer, backend lead and QA sign off the transition matrix and bypass results. Every public revision must map to an authorized approval of its exact content and scope.

#### Phase 5 — Public and mobile tests

- **P5-T01 — Client matrix:** Test supported old/new mobile versions against compatibility and new feeds, including missing/unknown status fields, empty advisories and no-clinic responses. Explicitly inspect the old hardcoded `Normal` badge path.
- **P5-T02 — Lifecycle/cache:** Test scheduled, current, expired, withdrawn and superseded revisions through feed, detail, app resume, offline cache and old deep links. An offline client must not falsely claim its cached publication is currently verified; apply the documented freshness policy and local expiry.
- **P5-T03 — Privacy and matching:** Inspect serialized responses and rendered cards; test ambiguous/similar barangay names, clinic changes and account switching. No danger highlight, fuzzy location match or internal evidence may appear.
- **P5-T04 — Usability:** Test visible disclaimer, accurate review attribution, large text, screen reader, slow network, failed refresh and the separate vaccine-availability timestamp.
- **Suspicious behavior to inspect:** Withdrawn content reappears after cache refresh, one account sees another's personalized state, an error becomes “safe/normal,” or a patient sees a computed area warning without publication.
- **Evidence and gate:** Mobile lead and QA provide a version-by-state matrix and clinic-reviewed screenshots; unsafe obsolete-client behavior requires a tested hide/unavailable strategy before release.

#### Phase 6 — Notification tests

- **P6-T01 — Audience/preferences:** Use a fake provider to verify opt-out, global push disable, unknown geography, multiple linked patients/devices, changed subscription and recipient sets larger than 50 accounts.
- **P6-T02 — Scheduling/caps:** Advance a controlled clock through quiet hours, daily/weekly caps and advisory expiry. Verify deferred work expires safely and community limits do not affect personal reminders.
- **P6-T03 — Failure and replay:** Simulate provider timeout, duplicate job execution, worker restart, invalid token and retry exhaustion. Assert a unique logical delivery, recorded uncertain outcomes and no uncontrolled resend loop.
- **P6-T04 — Last-moment cancellation:** Change preference, audience membership, account activity or publication status after enqueue and before send. Assert revalidation suppresses delivery. Document the irreducible race once the provider has accepted a send; do not claim already-sent pushes can be recalled.
- **P6-T05 — Restricted device pilot:** Only after fake-provider tests pass, use explicitly approved test devices/allowlisted accounts to check generic lock-screen text and safe deep links. Record provider acceptance separately from observed device receipt.
- **Suspicious behavior to inspect:** Unexpected recipients, bursts, cap bypass, jobs after withdrawal, detailed location text in payloads or a test allowlist unexpectedly disabled.
- **Evidence and gate:** Backend/mobile leads and QA reconcile expected recipients against the ledger and provider results; no unexplained recipient, duplicate application delivery or reminder regression remains.

#### Phase 7 — Privacy and operational tests

- **P7-T01 — End-to-end disclosure audit:** Inspect feeds, exports, logs, analytics, cache keys and error responses using synthetic identifying markers; none may escape their authorized surface.
- **P7-T02 — Service failures:** Stop the test scheduler/worker, simulate lock contention/cache unavailability and recover. Assert stale-state visibility, bounded retries, no premature publication and no misleading all-clear.
- **P7-T03 — Withdrawal/rollback drill:** Withdraw during queued delivery, invalidate caches, exercise old links and disable community publication/delivery flags. Preserve audit history and personal reminder operation; do not restore the old automatic warning path.
- **P7-T04 — Audit/retention controls:** Verify restricted audit access, failed privileged-action logging, retention behavior on synthetic data and detection of missing transition records. Rehearse restoration according to the approved recovery procedure.
- **Suspicious behavior to inspect:** Missing/modified audit history, abnormal privileged denials, unexplained configuration changes, stalled outbox growth or private content in monitoring tools.
- **Evidence and gate:** Privacy owner, operations owner and QA retain drill timings/results and mitigation records. Uncontained disclosure, broken withdrawal or missing recovery ownership blocks pilot.

#### Phase 8 — Pilot and final acceptance tests

- **P8-T01 — Complete journey:** Demonstrate synthetic incident → internal review → approved revision → current mobile advisory → optional opted-in delivery → withdrawal. Also demonstrate a reviewed signal deliberately producing no advisory.
- **P8-T02 — Acceptance traceability:** Map every section 15 checkbox to passed test IDs and reviewer evidence. Carry forward all open findings; mark unexecuted scenarios blocked/not run rather than assuming success.
- **P8-T03 — Clinical regression and usability:** Confirm personal reminders, appointments, reporting and stock information still behave as expected. Ask staff/patient testers to explain what an advisory means; investigate interpretations that imply infection or guaranteed safety.
- **P8-T04 — Pilot monitoring:** Reconcile publication counts, approved revisions, intended recipients, delivery outcomes and review workload over a clinic-agreed observation window. Record the window and success targets before pilot, not after seeing results.
- **P8-T05 — Release/rollback decision:** Rehearse the decision with named owners and unresolved findings. Threshold tuning creates a new configuration version and reruns relevant Phase 1 tests; changed publication/delivery logic reruns its corresponding phase tests.
- **Suspicious behavior to inspect:** Real output outside the approved pilot scope, a growing gap between approvals and publications, repeated complaints about frightening wording, unexplained notification spikes or monitoring that cannot reconcile events.
- **Evidence and gate:** Clinic owner and QA approve the acceptance record only after release-blocking findings are resolved and retested. Pilot completion does not itself authorize deployment within this planning-only task.

### 13.2 Proposed testing evidence structure

Create these only during implementation; do not place patient records, device tokens, credentials or production payloads in repository evidence.

```text
tasks/task11_26/testing/
  README.md                    # Environments, commands, owners and status legend
  test-matrix.md               # Phase/test ID → requirement → result → evidence
  suspicious-behavior-register.md
  phase-0/results.md           # Same pattern for phase-1 through phase-8
  fixtures/                   # Synthetic inputs and expected outputs only
  evidence/                   # Sanitized screenshots/log extracts
```

Each result records: phase/test ID, requirement, setup/input, expected/actual output, status, run time/timezone, source/config version, tester, evidence reference, finding ID and retest result. Each phase owner reviews evidence before dependent work is enabled; a test matrix is not a substitute for actual test execution.

## 14. Test plan

Use synthetic data and isolated test databases. Never run reminder jobs against production accounts for testing. This plan does not report any implementation tests as passed.

| Layer/scenario | Required assertions |
| --- | --- |
| Threshold boundaries | 0/1/2/3 incidents; exactly/below ratio threshold; zero and sparse baseline; unrounded comparison; finalized versus pending Category III |
| Time windows | Midnight Manila, month/year boundaries, leap day, UTC conversion, completed versus partial day, no overlapping baseline/current dates |
| Counting | Multiple visits for one incident count once; distinct new exposure counts separately; void/duplicate exclusion; late entry/reassessment recount without history loss |
| Geography | Unknown/provisional/outside-area records, aliases, same-named barangays in different municipalities, no residence fallback or substring match |
| Signal lifecycle | Repeated run idempotency, worker concurrency, material escalation, two-run resolution, dismissal/reopening reason and preserved evidence |
| Authorization | Every capability and role; patient token on staff route; inactive user; guessed IDs; cross-clinic list/detail/export/action; developer is not automatically approver |
| Approval | Self-approval denied; draft/returned/unapproved publication denied; edited content invalidates approval; stale revision returns conflict; concurrent approve/publish/withdraw safe |
| Public privacy | No evidence IDs/counts/addresses/categories in feeds, push, exports, errors or logs; broad-area disclosure review; draft not enumerable |
| Timing/publication | Future publication hidden, expiry enforced without scheduler, withdrawal cache purge, superseded revision inaccessible as current |
| Notifications | Disabled preference, quiet hours, caps, changed audience, account with multiple patients/devices, invalid token, retries, timeout ambiguity, publish rollback, withdrawal during queue processing |
| Compatibility | Legacy overview parser, old hardcoded badge behavior, announcement carousel, cache invalidation, current new-client DTO and safe null defaults |
| Web/mobile UX | No red near-you warning, no automated all-clear, factual review badge, accessible text/keyboard/screen reader, offline/error states, stale deep link |
| Clinical regression | Personal appointment/reminder preferences, overdue PEP/internal clinical alerts, vaccine availability and report snapshots remain operational |
| Operational | Failed scheduler appears stale, lock contention/recovery, large-clinic recipient pagination, bounded memory/query volume, delivery audit completeness |

Future verification commands (run only during implementation with isolated configuration): backend `php artisan test` targeted to new CommunityAwareness and existing notification/report suites; frontend `npm run build`, `npm run lint`, and the proposed dedicated Playwright configuration; mobile `flutter analyze` and targeted `flutter test` suites. The current frontend manifest has no generic `npm test` script, so do not claim such a command exists. Define measurable performance targets from actual pilot data rather than inventing production capacity figures.

### 14.1 Suspicious-behavior register: observed gaps versus hypotheses

“Suspicious” means behavior needing investigation; it does not establish malicious activity, compromise or a confirmed production incident. The observed entries below come from the source audit in section 2, not a live security test. Additional entries are negative scenarios to test. Do not silently fix these during a planning task.

| ID | Evidence status | Behavior / risk | Required investigation and linked tests |
| --- | --- | --- | --- |
| SB-01 | Observed source path | Public overview exposes computed barangay warnings without a recorded approval gate | Trace detector-to-public responses; replace source with approved projection; P0-T01, P4-T03, P5-T03 |
| SB-02 | Observed source path | Web strip submits directly published, urgent announcements | Test legacy/direct API bypass and require exact-revision approval; P2-T02, P4-T01–T03 |
| SB-03 | Observed source path | Announcement push selection has a 50-account limit and no target-barangay filter in the inspected branch | Compare intended/actual synthetic recipients, preserving allowlist controls; P6-T01, P6-T05 |
| SB-04 | Observed source path | Public announcement feed is not clinic-filtered in the inspected method | Determine intended public scope; test that advisory projections cannot mix clinic contexts or reveal internal content; P0-T01, P2-T04, P5-T03 |
| SB-05 | Observed source path | Mobile substring matching adds red “Near you”; missing-data defaults can imply normality; disclaimer is not rendered in inspected card | Reproduce similar names, no-clinic and failure states; verify replacement wording and visible context; P5-T01–T04 |
| SB-06 | Observed source path | Detector buckets and staff notification keys depend on barangay text/slug | Test same-named locations in different municipalities and migrate to canonical scoped identity; P1-T02 |
| SB-07 | Observed source path | Existing active staff area notification is not refreshed by the inspected create-only branch | Change counts/reason without resolving signal and check freshness/version; P1-T04, P3-T02–T03 |
| SB-08 | Hypothesis to test | Editing approved content, self-approval or a forged request publishes unreviewed material | Exercise all policy/transition/concurrency checks; P2-T02–T03, P4-T01–T03 |
| SB-09 | Hypothesis to test | Queue replay, republishing, stale preferences or withdrawal causes unintended delivery | Compare unique logical delivery records and provider outcomes; P6-T01–T04 |
| SB-10 | Hypothesis to test | Cache, export, telemetry or error response discloses private data or revives withdrawn material | Use synthetic markers and withdrawal drills across surfaces; P5-T02–T03, P7-T01–T03 |
| SB-11 | Hypothesis to test | Unexplained volume/threshold changes distort internal priority | Reconcile input history, imports, exclusions and authorized config changes; P1-T01–T04, P8-T04 |
| SB-12 | Hypothesis to test | Privilege changes, audit gaps or repeated cross-clinic probes go unnoticed | Test denied requests, permission revocation and audit reconciliation; P2-T02, P4-T01, P7-T04 |

### 14.2 Investigation and response rules

1. **Record before concluding:** Assign a finding ID with phase/test ID, environment, time, source/config version, expected versus actual behavior, sanitized reproduction, affected scope and owner. Classify as observed source gap, reproduced defect, hypothesis or confirmed operational event. Do not label a hypothesis as exploitation.
2. **Contain the affected path:** If testing reveals real-recipient delivery, unauthorized publication or disclosure, stop that test and disable the affected community delivery/publication path through the approved operational procedure. Preserve personal clinical workflows. Do not delete evidence, issue automatic public warnings or make blanket account lockouts from an anomaly alone.
3. **Triage by impact:** Critical findings include unauthorized public content, patient-data exposure, cross-clinic write access or unintended real-recipient delivery. High findings include approval bypass, ineffective withdrawal, repeated delivery and misleading danger/all-clear behavior. Both block enabling the affected feature. Other defects receive a documented severity, owner and deadline; reclassify if impact grows.
4. **Investigate safely:** Reproduce using synthetic data and a fake provider; inspect correlation IDs, revision hashes, run versions, policy decisions and delivery states. Redact sensitive information from shared records. A denied unauthorized request is evidence of a working guard, not automatically a breach; unusual repeated attempts deserve internal review.
5. **Correct and retest:** Link the fix to the finding and add a meaningful regression test. Rerun the originating phase tests and affected downstream contracts, including old clients. Close only with actual retest evidence and owner verification; do not close because the behavior stopped appearing once.
6. **Escalate internally:** Route publication wording issues to the clinical reviewer, access/disclosure issues to the responsible security/privacy owner, and queue/cache issues to operations. Public corrections need the normal approval process. Confirmed privacy incidents follow the organization's established response process; this plan invents no legal reporting deadlines.
7. **Monitor without leaking:** Reconcile approved revisions against publications, unique delivery intents against provider attempts, and successful analysis runs against displayed freshness. Establish investigation thresholds from the pilot baseline. These monitors create internal operational tasks only, never patient advisories.

Required finding fields: `finding_id`, `phase/test_id`, `evidence_status`, `severity`, `environment`, `observed_at`, `source/config_version`, `expected`, `actual`, `sanitized_evidence`, `affected_scope`, `owner`, `containment`, `root_cause`, `fix_reference`, `retest_result`, `release_gate`, `closure_approver`. For critical/high findings, closure requires an independent reviewer in addition to the implementer.

## 15. Acceptance criteria

- [ ] Creating one or many same-location incidents never directly changes public advisory content or queues community push.
- [ ] Internal trends use unique eligible exposures, explicit windows, canonical exposure geography, exclusions and versioned thresholds.
- [ ] Staff see review priority and data limitations without an outbreak or infection claim.
- [ ] Only authorized same-clinic actors can transition a revision; approval is independent by default and bound to exact content/scope/channels.
- [ ] No old announcement, print, public overview or queue route can bypass approval.
- [ ] Public/mobile responses contain only current approved fields; no raw counts, patient evidence or internal risk scores.
- [ ] Mobile removes danger/near-you/all-clear inference and visibly shows clinic review context, expiry and disclaimer.
- [ ] Unknown location, incomplete baseline, stale data and failed fetches never become false reassurance.
- [ ] Optional community push honors preferences, audience, quiet hours, caps, deduplication and cancellation without changing personal reminder behavior.
- [ ] Withdrawal stops new delivery and current feed access; old push links show a safe state.
- [ ] Mixed old/new client behavior is explicitly tested; unsupported clients cannot continue receiving computed danger signals.
- [ ] Audit history answers who reviewed, approved, published, changed and withdrew each revision, and why.
- [ ] Synthetic threshold/privacy/access/concurrency tests, relevant clinical regressions and clinician usability review pass before rollout.
- [ ] Rollback is rehearsed and cannot restore automatic public area warnings.
- [ ] Every phase has executed test evidence and an owner-reviewed gate; failed, blocked and not-run cases remain explicit.
- [ ] Observed source gaps and suspected runtime behavior are tracked separately; no claim of compromise is made without evidence.
- [ ] Critical/high findings affecting a release are contained, corrected and independently retested before that feature is enabled.
- [ ] Approval/publication/delivery reconciliation and suspicious-behavior escalation are exercised without generating public alerts or exposing patient data.

## 16. Remaining decisions and pre-implementation checklist

- [ ] Confirm who can author, independently approve, publish and withdraw in a small clinic, including absence coverage.
- [ ] Verify canonical geography sources, database key types, indexes and existing duplicate-resolution semantics.
- [ ] Decide whether anonymous advisory feed is clinic-wide or broader, and how users choose clinic and subscribed community.
- [ ] Approve baseline coverage rules, internal threshold calibration, review service expectations and signal resolution hysteresis.
- [ ] Approve copy/translations and official-source verification procedure; verify current medical guidance when writing clinical educational text.
- [ ] Review retention/legal basis and disclosure risk with local responsible owners; no compliance certification is implied here.
- [ ] Inventory legacy announcements and mobile versions, including cached content and external print consumers.
- [ ] Verify actual scheduler timezone, cache/lock driver, queue workers, FCM allowlist, delivery credentials and deployment notification controls without exposing secrets.
- [ ] Assign monitoring for last successful analysis, pending-review age, approval/withdrawal events, outbox age, failure/retry counts and unexpected publication attempts.
- [ ] Define escalation contacts and rollback owner; internal operational monitoring must not itself create public advisories.

**Planning deliverable:** this Markdown file only. All schema, route, service, UI and rollout changes above remain proposals requiring a later implementation task.
