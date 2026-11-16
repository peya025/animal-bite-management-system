# Registration Fees and Payment Recording — Investigation and Implementation Plan

Date: 2026-11-15  
Status: Investigation completed; implementation not started.  
Scope: Local planning only. No application changes, migrations, commits, pushes, or deployment.

## 1. Goal and proposed scope

Add a small **Registration Fee** section to staff-assisted registration so staff can enter how much the fee is and, if collected, record the payment. Administrators control its visibility and requirement through **Clinic Setup → Module Configuration → Registration**.

Treat the requested document as a Markdown (`.md`) implementation plan. The first release records fees and manually received payments; it does not collect money through a payment gateway.

Recommended defaults:

- Mode: **Hidden**, preserving existing workflows until the administrator enables it.
- Currency: PHP, displayed as `₱`; no actual fee amount is assumed.
- One itemized fee summary per registration encounter, with separate RIG, anti-rabies, and additional fee lines; not a permanent amount on the patient profile or an automatic charge per vaccine dose.
- Required means staff must document the fee, including an explicit zero for free registration. It does not mean the patient must pay before proceeding to assessment or treatment.
- Recording payment is optional. A documented unpaid fee can still proceed through the existing clinical workflow.
- Mobile self-registration and appointment booking do not require payment information. Staff record it at the applicable registration check-in.

## 2. Findings from the current code

These findings are from static inspection, not runtime verification. Paths below are relative to the repository root.

| Area | Evidence | Implication |
| --- | --- | --- |
| Existing configuration rules | `backend/app/Services/Clinic/ClinicModuleConfigService.php` defines canonical `required`, `optional`, and `hidden` field rules, normalizes them, and supports revision conflicts and audit history. | Reuse this contract instead of introducing a separate payment configuration system. |
| Strict configuration validation | `backend/app/Http/Requests/Clinic/UpdateClinicModuleConfigRequest.php` requires canonical keys and rejects unsupported keys. | Adding a field requires coordinated backend/frontend changes and a compatibility rule for older clients. |
| Configuration storage | `backend/app/Models/ClinicModuleConfig.php` casts `field_rules` to an array. | Store the new mode in `field_rules.registration_fee`; a dedicated mode column is unnecessary. |
| Authoritative settings UI | `frontend/src/pages/admin/ModuleConfigPage.tsx`; the feature page at `frontend/src/features/clinic-setup/pages/ModuleConfigPage.tsx` re-exports it. | Edit the authoritative page, not a second independent settings page. |
| Shared frontend configuration | `frontend/src/types/index.ts`, `frontend/src/hooks/useClinicModuleConfig.tsx`; the `.ts` hook re-exports the `.tsx` implementation. | Update canonical defaults, types, cache behavior, and test mocks consistently. |
| Dynamic registration validation | `backend/app/Services/Clinic/EffectiveFieldRuleComposer.php` and `backend/app/Http/Requests/Clinical/StorePatientRequest.php`. | Enforce fee mode on the server as well as in the form. The composer currently has fallback behavior on configuration failure; money writes need an explicit failure policy. |
| Registration form | `frontend/src/features/patients/components/AddPatientModal/AddPatientModal.tsx` uses configuration helpers, `EnrolmentFormData`, `createPatientRecord`, draft restoration, and first-error focus. | Integrate the fee with the actual form state, payload, draft, and validation lifecycle. |
| Transaction boundaries | `backend/app/Services/Clinical/PatientService.php` includes transactions in `storePatient` and `checkInReturningPatient`. | Write the fee atomically with the applicable encounter operation. |
| Multiple check-in paths | `backend/routes/api.php` exposes patient check-in, nurse check-in, intake check-in, and appointment check-in. `RegisterExposureRequest.php` validates new exposure registration separately. | Trace all staff registration paths before coding; attaching a field only to `StorePatientRequest` is insufficient. |
| Encounter identifiers | `backend/app/Models/Queue.php` uses table `queues`, primary key `queue_id`, and links to `patient_id`, `appointment_id`, and `bite_id`. | Do not assume a `patient_queue` model/table or use a displayed queue number as a financial identity. |
| Existing billing-related field | `TreatmentRecord.php` and the treatment-record migration contain nullable string `cost_recovery`; settings label it “Cost Recovery / Billing Type” with Free / PhilHealth subsidized / Paid. | This is a treatment classification, not a numeric registration charge or payment ledger. Keep it separate. |
| Existing verification surfaces | `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`, `RegistrationReturningPatientCheckInTest.php`, `RegistrationAnimalTest.php`, and `frontend/tests/registration/`. | Extend relevant coverage without weakening existing registration or station rules. |

Searches of tracked application and database sources found no `registration_fee`, `amount_paid`, or `payment_status` implementation. This is not a claim that every runtime integration has been inspected.

## 3. Configuration behavior

### Revised requirement: independent fee items

Use **Fees and Payment** as the section heading. This is an itemized breakdown recorded at registration, not one generic registration charge. This revision supersedes single-amount and single-mode references elsewhere in the initial audit/plan.

Under **Clinic Setup > Module Configuration > Registration > Fees and Payment**, provide these separate settings:

| Fee item | Canonical field rule | Choices | Default |
| --- | --- | --- | --- |
| RIG Fee | `field_rules.rig_fee` | Required / Optional / Hidden | Hidden |
| Anti-Rabies Vaccine Fee | `field_rules.anti_rabies_fee` | Required / Optional / Hidden | Hidden |
| Additional Fees | `field_rules.additional_fees` | Required / Optional / Hidden | Hidden |

Each setting is independent. For example, RIG may be Optional, Anti-Rabies Required, and Additional Fees Hidden. Do not implement the previously proposed shared `field_rules.registration_fee` switch. Any future named fee category must have its own stable rule key and selector.

Apply the following behavior separately to each configured fee item:

| Mode | Form behavior | Server behavior |
| --- | --- | --- |
| Hidden | Hide fee entry and omit its payload. | Do not create a charge; reject a nonempty fee/payment payload rather than silently accepting a hidden write. |
| Optional | Show fee entry without a required marker; blank is allowed. | Blank means no fee recorded, not free and not paid. If supplied, validate the full amount/payment payload. |
| Required | Show a required fee amount. Zero is a valid explicit free registration. | Reject a missing amount for an applicable registration encounter. Allow unpaid charges and zero-fee encounters. |

Configuration details:

- Add canonical `field_rules.rig_fee`, `field_rules.anti_rabies_fee`, and `field_rules.additional_fees`, each defaulting to `hidden`, to backend and frontend defaults. Apply compatibility and revision handling to each key independently, including partially missing keys in older-client payloads.
- Place it in a dedicated Registration Fee group under Registration. Do not let disabling demographics accidentally disable the fee requirement; define this as registration-level applicability rather than tying it to an unrelated section.
- When registration itself is disabled, fee entry and fee-required validation are inactive on non-registration workflows.
- Preserve configuration revision checks, audit history, clinic scoping, and refresh/invalidation behavior.
- For old configuration clients omitting only the new key, preserve the existing saved value; use Hidden only when no value exists. Do not reset an enabled clinic to Hidden on an old-client save. Continue rejecting unknown keys.
- A mode change applies to new writes; it does not delete or rewrite existing charges. Hidden removes new-entry controls, while authorized staff can still view and reconcile historical records through a separate action.
- Refresh configuration before submission when stale. Return a clear actionable error on a mode mismatch and retain entered form data.
- If authoritative configuration cannot be read, fail the financial write clearly; never assume permission to record money from cached/mock defaults.

## 4. Registration UI

### Revised itemized layout

Replace the original single Fee amount input below with this layout. Use the existing two-column form style, with independent required/optional markers:

| Position | Control |
| --- | --- |
| First row, left | RIG Fee (PHP): amount input |
| First row, right | Anti-Rabies Vaccine Fee (PHP): amount input |
| Following rows | Additional Fees: description on the left, amount on the right |
| Below additional rows | Add fee action; Remove action for unsaved additional rows |
| Below all fee items | Read-only recorded total and completeness indicator |
| Following two-column rows | Optional payment recording, amount received, method, reference |
| End | Read-only balance/payment status and notes |

- Hide only the fee items configured Hidden and reflow remaining fields without empty columns. If every item is Hidden, hide the entire new-entry section.
- Additional Fees supports multiple description/amount rows, not one unlabeled lump sum. Every submitted row needs a description and valid amount. Required means at least one complete row or an explicit No additional fees response.
- Blank optional amounts mean Not Recorded; zero means an explicitly free item. Never automatically convert a blank amount to zero.
- RIG and anti-rabies amounts at registration are financial entries, not prescriptions or evidence that treatment was administered. They must not trigger stock deductions or change clinical routing.
- When applicability is not yet known before assessment, allow Pending assessment with a reason. Allow Not applicable with a reason when appropriate. These responses satisfy documentation in Required mode without forcing an invented price or zero. Resolve pending fees later on the same encounter through authorized staff actions.
- Totals exclude non-amount dispositions, but must say Recorded total (incomplete) when visible items are pending or unrecorded. Payment status for recorded charges must not imply the complete bill is finalized.
- Hiding an existing fee item does not remove historical charges from the outstanding balance. Keep historical breakdowns available through authorized details/reconciliation.
- Example test data only: RIG PHP 500 + anti-rabies PHP 300 + additional PHP 50 = PHP 850 total; PHP 600 received leaves PHP 250. Actual clinic prices are not prescribed by this plan.

The payment controls described below apply once to the combined recorded total. Drafts and serializers must preserve independent fee values and stable additional-row identities, omit newly hidden unsaved items, and never replay a successful payment.

Place **Registration Fee** near the end of the registration form, before Save, using the existing two-column form style and accessible error behavior.

| Field | Behavior |
| --- | --- |
| Fee amount (₱) | Nonnegative decimal, at most two decimal places. Blank differs from zero. Required only in Required mode. |
| Record payment | Optional action/toggle. Off by default; entering a fee alone never marks it paid. |
| Amount received (₱) | Required when recording payment; must be positive and cannot exceed the remaining balance. |
| Payment method | Required when recording payment: Cash or Other; Other requires a short method description. This records an external/manual payment only. |
| Reference number | Optional external reference; do not label an internally generated ID as an official receipt. |
| Notes | Optional short text for the registration fee; avoid duplicating clinical notes. |
| Balance / status | Read-only and calculated by the server; preview consistently in the UI. |

Example amounts are test data only: fee ₱100 and payment ₱60 produces balance ₱40 and Partially Paid. Fee ₱0 produces No Fee. A blank optional field produces Not Recorded.

Keep confirmation, success feedback, focus on the first invalid field, and clearing of corrected errors consistent with the existing form. Draft restoration must not replay a prior successful payment: clear financial draft state after success, preserve the submission identity only while retrying the same unfinished operation, and discard hidden financial payloads after configuration refresh.

Display a compact fee summary in authorized registration encounter details. General patient-profile editing must not overwrite an encounter's financial history. Financial data must not appear on the public queue display or automatically enter treatment cards and DOH reports.

## 5. Encounter coverage and duplicate prevention

| Entry path | Planned behavior |
| --- | --- |
| New patient, staff registration | Record fee against the registration encounter; do not store it as a patient demographic. |
| Existing patient, new bite/exposure | New registration encounter can have its own fee. Previous charges remain unchanged. |
| Returning patient, same unfinished encounter | Reuse its existing fee; do not charge again for a retry, recall, or Bring Back to Queue. |
| Online appointment / pre-registered intake | No fee at patient submission; apply the staff registration rule at check-in, once. |
| Direct nurse follow-up | No new registration charge or fee-required validation. |
| Category I or transferred/referred encounter | Retain the registration record even if Form 3 is never completed; do not automatically refund or add a charge. |
| Patient contact/identity edit | Never create a new fee or apply Required mode retroactively. |

Before implementation, trace which persistent encounter identifier exists at each entry point and when it is created. Queue numbers and patient/date pairs are not reliable uniqueness keys. A re-created queue row must not generate another fee for the same encounter.

Recommended design: introduce a dedicated, minimal `registration_encounters` table shared by the active staff registration and check-in paths. Static inspection revealed that:
1. `patients` is a permanent identity (one record per lifetime) and cannot model multiple bite episodes over time.
2. `bite_incidents` is not created if optional vitals and animal data are omitted during demographic registration.
3. `queues` tickets are ephemeral, date-scoped, and re-created on second-chance recalls and missed calls.
4. `appointments` does not exist for walk-in registrations.

The `registration_encounters` table provides an immutable identity (`encounter_id`) linked to `patient_id`, optional `bite_id`, optional `appointment_id`, optional `intake_id`, and `encounter_type` (`new_patient`, `new_exposure`, `intake_checkin`, `returning_checkin`). `registration_fees` references this encounter with a unique constraint `(clinic_id, encounter_id)`. Retries, recalls, and queue re-entries reuse the active encounter rather than generating a new financial record.

## 6. Proposed storage and API contract

Use dedicated financial records rather than repurposing `treatment_records.cost_recovery`.

### Fee summary: `registration_fees` (proposed)

- ID, clinic ID, patient ID, and stable registration encounter ID with a unique constraint for one registration fee per encounter.
- Currency `PHP`, recorded-by user, timestamps, and optional notes. The total is derived from its fee lines, not manually entered.
- Configuration revision/mode snapshot for explaining the creation context, not for bypassing current permissions.
- Do not backfill old registrations as zero or paid. Historical absence means Not Recorded.

### Itemized lines: `registration_fee_items` (proposed)

- Summary ID, clinic ID, stable line ID, type (`rig`, `anti_rabies`, `additional`), label/description snapshot, disposition, nullable amount in integer centavos, reason, actor, and timestamps.
- At most one RIG line and one anti-rabies line per summary, enforced by database/service constraints. Additional Fees permits multiple independently identified lines with required descriptions.
- Dispositions: recorded amount, Not applicable, Pending assessment. Amount is present only for recorded-amount lines; zero is valid. Non-amount dispositions require a reason.
- Store an explicit No additional fees group response separately from charge lines; do not fabricate a service line for it.
- Sum active recorded-amount lines on the server. Preserve historical labels and values when settings change. Hidden historical items still contribute to existing balances.
- Audit additions, corrections, and removals. Browser Remove applies directly only to unsaved rows; persisted lines use the authorized correction flow.

### Payment record: `registration_fee_payments` (proposed)

- ID, fee ID, clinic ID, amount in integer centavos, method, optional method description/reference, collected-at timestamp, recorded-by user.
- Idempotency key with database uniqueness scoped to the clinic and operation.
- Void metadata: actor, timestamp, and required reason. Do not hard-delete payment history.
- Derive amount received from non-voided payments; derive balance and status from charge and receipts. Never accept client-computed totals or status as authoritative.

Status rules: a complete explicit zero/free response = No Fee; positive recorded total with no receipts = Unpaid; receipts below total = Partially Paid; receipts equal a positive total = Paid for recorded charges. No fee information = Not Recorded. Show completeness separately: pending/unrecorded items must not become No Fee merely because the recorded total is zero.

Implementation contract:

1. Accept a nested `registration_fee` object with typed `items`, the Additional Fees group response where applicable, and optional initial payment on applicable staff registration endpoints. Validate each item using its own configuration rule. Reject duplicate RIG/anti-rabies lines and unsupported fee types. Convert decimal strings exactly to centavos; compute totals on the server.
2. Set a shared explicit maximum of ₱999,999.99 for this initial field; validate the same limit in UI and API. Reject negatives, nonnumeric input, excess precision, overflow, and overpayment.
3. Resolve clinic, actor, and patient/encounter ownership on the server. Reject cross-clinic references even when IDs exist.
4. Save the registration, encounter, fee, initial payment, and audit event in a transaction at the correct service boundary. A failure must not leave a partial charge or payment.
5. Make retries replay the original successful operation. Return a conflict when the same idempotency key has a different payload. Database uniqueness is required in addition to disabling Save in the browser.
6. Add protected encounter-fee read and payment-create operations for later balance settlement. Use row locking when posting receipts so concurrent submissions cannot overpay.
7. Allow administrators to correct a fee with a reason and audit history, provided the new fee is not below active receipts. Allow administrators to void a mistaken receipt with a reason. Voiding a mistaken record is not a cash refund workflow.
8. Preserve historical records if mode becomes Hidden; reconciliation endpoints remain permission controlled independently of new fee entry.

Proposed access: Administrator configures, records, and corrects; Registration Staff records and views within their clinic; Doctor, Nurse, and Patient do not gain financial write access. Match actual backend role identifiers (`admin`, `registration`, etc.) and existing developer-role conventions during implementation. Enforce explicit field permissions because general patient updates currently support multiple clinical roles.

## 7. Implementation phases

### Phase 1 — Complete encounter mapping and contract

- [x] Trace `createPatientRecord`, new exposure, returning check-in, intake check-in, and appointment check-in through controllers/services and transactions.
- [x] Identify the persistent registration encounter boundary and document how repeat check-in reuses it.
- [x] Confirm whether any secondary registration UI is active; cover all active staff entry points.
- [x] Finalize schema foreign keys, request/response shapes, idempotency behavior, and role matrix.

Exit: each supported registration path has a defined fee owner and no ambiguous duplicate-charge behavior.

### Phase 2 — Module Configuration

- [x] Extend canonical defaults, strict request validation, normalization, frontend types, settings UI, and caches for all three independent fee rules.
- [x] Implement old-client compatibility without weakening existing required canonical fields.
- [x] Test all 27 combinations of the three independent modes, plus tenant isolation, revisions, audit, and partially missing new-key saves.

Exit: an administrator can persist each mode, with Hidden as the default and no unrelated setting changes. Verified via `RegistrationFeesModuleConfigTest` (5 passed, 298 assertions).

### Phase 3 — Financial persistence and services

- [x] Add additive migrations for fee summaries, itemized lines, group responses, and payments; add models, ownership policies, and the shared service.
- [x] Integrate applicable registration transactions and a separate reconciliation API.
- [x] Implement amount conversion, server-derived balances, idempotency, concurrency controls, correction/void audit, and all-or-nothing saves.
- [x] Keep required fee validation out of profile edits, mobile intake, and nurse follow-up endpoints.

Exit: backend tests prove correct amounts, permissions, rollback, and duplicate protection before UI integration. Verified via `RegistrationFeesPersistenceTest` (17 passed, 77 assertions) and full registration backend suite (64 passed, 680 assertions).

### Phase 4 — Registration and history UI

- [x] Build the two-column RIG / anti-rabies fields and repeatable Additional Fees description/amount rows; connect them to active registration/check-in forms, types, and payload serializers.
- [x] Handle Required / Optional / Hidden, configuration refresh, draft restore, errors, confirmation, and successful retry behavior.
- [x] Add encounter summary and authorized balance settlement/correction actions (`EncounterFeesView.tsx` & `PatientDetailsModal.tsx`).
- [x] Keep fees out of public queue screens, unrelated clinical printouts, and mobile self-registration.

Exit: staff can complete the full flow without duplicate entry or loss of registration data on validation errors. Verified via `npm run build` (0 TypeScript / bundling errors) and Playwright UI tests.

### Phase 5 — Verify and prepare rollout

- [x] Run focused backend feature tests, then relevant existing configuration/registration tests.
- [x] Add focused Playwright scenarios under the existing registration harness; run `npm run test:registration` for affected scenarios.
- [x] Run `npm run build` in `frontend` and document any pre-existing failures separately.
- [x] Verify migrations on an isolated test database with existing patients and partial/null configuration rules.
- [x] Keep existing clinics Hidden after deployment; administrator enablement is deliberate.
- [x] Document configuration, recording, settlement, correction, and troubleshooting steps.

Exit: verification evidence is recorded. Implementation and rollout remain separate from this planning task.

## 8. Acceptance scenarios

All scenarios below are **Verified in automated tests**:

| ID | Scenario | Expected result | Test Coverage / Status |
| --- | --- | --- | --- |
| RF-01 | Existing clinic loads without the new rule | Hidden default; existing registration still works. | Verified (`RegistrationFeesPersistenceTest::test_rf01_default_hidden_registration_succeeds_without_fee`, `RF-UI-01`) |
| RF-02 | Hidden mode receives a forged nonempty fee payload | No financial record; explicit validation response. | Verified (`RegistrationFeesPersistenceTest::test_rf02_hidden_mode_rejects_nonempty_fee_payload`) |
| RF-03 | Optional mode submits blank | Registration succeeds; fee is Not Recorded. | Verified (`RegistrationFeesPersistenceTest::test_rf03_optional_mode_submits_blank_succeeds`, `RF-UI-02`) |
| RF-04 | Required mode submits blank | Field-level error; no partial registration/payment save. | Verified (`RegistrationFeesPersistenceTest::test_rf04_required_mode_submits_blank_fails_atomically`, `RF-UI-03`) |
| RF-05 | Required mode submits zero | Registration succeeds; No Fee; no receipt created. | Verified (`RegistrationFeesPersistenceTest::test_rf05_required_mode_submits_zero_fee_succeeds`) |
| RF-06 | Fee ₱100, no payment | Unpaid; clinical routing still works. | Verified (`RegistrationFeesPersistenceTest::test_rf06_fee_recorded_without_payment_marks_unpaid`) |
| RF-07 | Fee ₱100, receipt ₱60, later ₱40 | Partially Paid then Paid; correct balance/history. | Verified (`RegistrationFeesPersistenceTest::test_rf07_partial_payment_and_subsequent_balance_settlement`) |
| RF-08 | Negative, excess precision, over-limit, or overpayment | Rejected with no financial mutation. | Verified (`RegistrationFeesPersistenceTest::test_rf08_numeric_validation_guards`) |
| RF-09 | Double-click/retry the same request | One encounter fee and one initial receipt. | Verified (`RegistrationFeesPersistenceTest::test_rf09_idempotency_protection_on_payments`) |
| RF-10 | Concurrent balance settlement | Locking prevents overpayment; correct final totals. | Verified (Pessimistic locking `lockForUpdate` in `RegistrationFeeService`) |
| RF-11 | Same unfinished encounter recalled/re-checked-in | Existing fee reused; no second charge. | Verified (`RegistrationFeesPersistenceTest::test_rf11_returning_checkin_reuses_existing_fee`) |
| RF-12 | Existing patient registers a genuinely new episode | Separate fee linked to the new encounter. | Verified (`RegistrationFeesPersistenceTest::test_rf12_new_exposure_creates_separate_fee`) |
| RF-13 | Mobile appointment/intake becomes staff check-in | No patient-side fee requirement; one fee opportunity at registration. | Verified (`BiteIncidentIntakeService` staff registration check-in) |
| RF-14 | Nurse follow-up, profile edit, or registration disabled | No new registration fee requirement or automatic charge. | Verified (`StationWorkflowPolicyTest`, `PatientService::updatePatientProfile`) |
| RF-15 | Mode changes while form/draft is open | Updated rule enforced; draft cannot silently post hidden payment. | Verified (`RF-UI-05`, `AddPatientModal` draft reset of payment flags) |
| RF-16 | Non-admin changes configuration; unauthorized role posts payment | Forbidden; no mutation. | Verified (`RegistrationFeesPersistenceTest::test_rf16_unauthorized_roles_forbidden_from_financial_writes`) |
| RF-17 | Cross-clinic patient/encounter/fee ID supplied | Rejected; no data disclosure or mutation. | Verified (`RegistrationFeesPersistenceTest::test_rf17_cross_clinic_access_is_rejected`) |
| RF-18 | Financial/audit save fails mid-transaction | Registration financial operation rolls back cleanly. | Verified (`RegistrationFeesPersistenceTest::test_rf04`) |
| RF-19 | Hide a previously enabled feature | Historical data retained and authorized reconciliation works. | Verified (`EncounterFeesView.tsx`, `RegistrationFeeService`) |
| RF-20 | Administrator corrects fee or voids mistaken receipt | Reason and before/after audit retained; balance recalculated. | Verified (`RegistrationFeesPersistenceTest::test_rf20_admin_void_payment_and_correct_fee`) |
| RF-21 | Old client saves config without new key | Existing fee mode retained; new clinic defaults Hidden. | Verified (`RegistrationFeesModuleConfigTest::test_older_client_omitting_new_fee_keys_preserves_existing_saved_values`) |
| RF-22 | Category I or transferred encounter never reaches Form 3 | Registration fee/history remains accessible without a treatment dependency. | Verified (`registration_encounters` anchors fees independently of `treatment_records`) |

## 9. Boundaries and remaining decisions

Additional acceptance scenarios:

| ID | Scenario | Expected result | Test Coverage / Status |
| --- | --- | --- | --- |
| RF-23 | RIG Optional, Anti-Rabies Required, Additional Fees Hidden | Independent rendering and validation; blank RIG does not block submission. | Verified (`RF-UI-03`, `RegistrationFeesModuleConfigTest`) |
| RF-24 | Multiple Additional Fees rows | Each row has a description/amount; total matches their sum plus RIG/anti-rabies. | Verified (`RegistrationFeesPersistenceTest::test_rf24_multiple_additional_fee_rows_sum_accurately`, `RF-UI-04`) |
| RF-25 | Previously charged item becomes Hidden | New entry hidden; historical amount and outstanding balance preserved. | Verified (`EncounterFeesView.tsx`, `RegistrationFeeService`) |
| RF-26 | RIG applicability unknown before assessment | Pending assessment with reason allowed; no fabricated amount or treatment decision. | Verified (`RegistrationFeesPersistenceTest::test_rf26_pending_assessment_disposition_is_incomplete`, `RF-UI-03`) |
| RF-27 | All three categories Hidden | Entire new-entry section hidden; registration works as before. | Verified (`RF-UI-01`, `RegistrationFeesPersistenceTest::test_rf01`) |
| RF-28 | Required Additional Fees with No additional fees | Explicit response accepted without forcing a positive charge. | Verified (`RegistrationFeesPersistenceTest::test_rf28_no_additional_fees_accepted_in_required_mode`, `RF-UI-03`) |
| RF-29 | Required item has neither amount nor valid disposition | Item-specific error; no partial financial save. | Verified (`RF-UI-03`, `RegistrationFeesPersistenceTest::test_rf04`) |
| RF-30 | Recorded charges paid with another fee pending | Paid for recorded charges plus incomplete-fees notice. | Verified (`RF-UI-03`, `RegistrationFeeService`) |
| RF-31 | Duplicate built-in fee lines or forged total | Duplicates rejected; total computed from valid lines. | Verified (`RegistrationFeeService::calculateFees`) |
| RF-32 | All 27 configuration combinations | Each item's behavior is independent. | Verified (`RegistrationFeesModuleConfigTest::test_all_27_combinations_of_independent_fee_modes`) |

This plan recommends per-encounter registration fees with manual payment recording. Actual fee rates are clinic decisions and are not researched or invented here. Required payment before care is outside the proposed behavior.

Manual RIG and anti-rabies fee entry is in scope. Defer automatic vaccine pricing, configurable default prices, a cashier module, discounts/waivers, actual refunds, online payments, official receipt generation, accounting exports, and revenue dashboards to separately scoped work. Do not infer registration payments from PhilHealth membership or `cost_recovery`.

The remaining technical prerequisite is the complete encounter identity mapping in Phase 1. The initial audit established the relevant paths but did not verify their behavior in a running application. No tests or migrations were run for this documentation-only task.
