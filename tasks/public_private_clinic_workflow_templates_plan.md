# Public and Private Clinic Workflow Templates

**Status:** Implementation plan; no workflow changes have been made by this document.  
**Prepared:** 2026-09-27  
**Scope:** Laravel API, React web app, shared clinic data, queue, treatment, reporting, and a small private-clinic billing capability.

## Goal

Let another clinic adopt the current animal-bite system without inheriting every handoff used by the public Tagoloan clinic. Provide two supported workflow presets:

| Preset | Intended use | Patient-facing path |
| --- | --- | --- |
| `public_abtc` | Current government clinic workflow; default for the existing clinic | Register and capture bite intake -> doctor assessment and plan -> treatment nurse -> follow-up |
| `private_abc` | Private Animal Bite Center with fewer stations | Register and capture bite intake -> combined vitals and clinical assessment -> billing or coverage -> injection -> follow-up |

The private preset reduces queues and repeated forms. It does **not** remove wound/exposure assessment, a documented treatment decision, an authorized vaccinator, dose and batch recording, follow-up scheduling, or the data needed for applicable DOH reports.

## Research and clinical boundary

- A DOH regional certification guide distinguishes government-operated ABTCs from privately operated ABCs and describes both as places where trained doctors and nurses evaluate and manage rabies exposure. Therefore `private_abc` is a clinic-operation preset, not a different standard of clinical care. [DOH ABTC/ABC certification guide](https://ro11.doh.gov.ph/images/transparent/2024/2024DCHDv2.pdf)
- WHO's PEP protocol includes wound assessment, PEP risk assessment, wound care, vaccine, and immunoglobulin when indicated. Registration plus vital signs alone cannot authorize an injection. [WHO PEP protocol](https://www.who.int/publications/i/item/B09018), [WHO rabies fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies%EF%BB%BF)
- PhilHealth lists an Animal Bite Treatment Package for accredited providers. A private clinic's bill may therefore be self-pay, covered, partly covered, waived, or unresolved. The application must not assume that every private patient pays cash. Package eligibility and claim rules must be checked for the participating clinic before launch. [PhilHealth benefits](https://www.philhealth.gov.ph/benefits/), [PhilHealth accreditation requirements](https://www.philhealth.gov.ph/about_us/transparency/PCC_Handbook2024_2ndEdition.pdf)
- **Product inference from the prompt-treatment guidance:** billing should normally occur before injection in the private clinic's chosen process, but a clinician must be able to proceed with urgent indicated care while payment is pending, with an audited reason. Payment state must never substitute for clinical authorization.
- Keep the three existing DOH form generators available to clinics that need them. Confirm the participating private ABC's exact submission forms, signatories, and regional reporting instructions before claiming that all three forms are mandatory for every ABC.

## Current repository findings

| Area | Current behavior | Implementation consequence |
| --- | --- | --- |
| Template navigation | `frontend/src/shared/config/navigationConfig.ts` links **Predefined Templates** to `/setup/templates`, but `frontend/src/App.tsx` has no route for that URL; the catch-all redirects to the dashboard. | Build the page and route before exposing template activation. |
| Module configuration | `ClinicModuleConfigController`, `ClinicModuleConfig`, and `ModuleConfigPage.tsx` mainly store field visibility/requirements and section toggles. The `useClinicModuleConfig` hook is not used by the patient/queue forms found in this audit. The UI also submits `registration_module_enabled` and `treatment_module_enabled`, which the backend update validator/model do not persist. | Do not treat the existing toggles as a workflow engine. Reconcile the config contract and wire only supported settings into real forms. |
| Handoff | `QueueController::complete` and `TreatmentRecordController` contain public-flow assumptions: doctor/Form 2 completion moves a queue ticket into vaccination/treatment. | Move next-stage selection into a backend workflow service. Preserve the existing public path as the first preset. |
| Clinical records | Patient, bite incident/intake, treatment plan, treatment records, appointment, queue, and stock already exist. | Reuse these as the clinical source of truth. A template chooses who does work and in what order; it does not create a second set of clinical records. |
| Payment | `TreatmentRecord.cost_recovery` is a field, and Module Configuration labels it for billing. This audit found no dedicated bill, payment, receipt, or cashier model/controller. | A usable private preset needs a small billing domain; a field toggle cannot create payment behavior. |
| Reporting | The registration-report service and DOH print endpoints already draw from clinic-scoped records. | Keep a common dataset and report pipeline across both presets. Review hard-coded public-clinic labels in print output. |

These findings are based on the current repository, not a claim that all private clinics use the same stations or prices.

## Decisions for version 1

1. Ship exactly two **seeded, versioned presets**. Do not ship an unrestricted drag-and-drop workflow designer yet. Allow limited clinic choices: staff/station mapping, whether cashier is a separate desk, permitted billing modes, and optional nonclinical form sections.
2. The existing clinic stays on `public_abtc`. Newly onboarded clinics select a preset during setup. A clinic admin may switch its default for **new visits** after reviewing the step preview. In-progress visits keep their original template version.
3. A **visit** is one check-in/attendance. A bite **episode** persists across D0 and return visits. Link multiple visits and administered doses to the same episode rather than opening a new bite case for each dose.
4. Separate `workflow_stage` (what task comes next) from queue `status` (waiting, called, serving, completed). A patient can be `waiting` at the clinical station or `waiting` for injection.
5. Stage transitions, prerequisites, clinic scope, and role permissions are enforced in Laravel. React displays allowed actions returned by the API; hiding a button is not authorization.
6. A clinician-approved treatment plan is the authority for vaccine/RIG work. Template configuration cannot calculate or silently change the medical regimen. Preserve the existing doctor-owned assessment and nurse-owned administration boundaries; the same physical station may host both staff members.
7. A paid bill is **not** evidence that a dose was administered. An administered dose is **not** evidence that a bill was paid. Reconcile them as distinct records.

## Detailed visit paths

### Public ABTC: preserve the current path

| Stage | Owner | Record/guard before advancement |
| --- | --- | --- |
| Registration | Registration staff | Identify or create patient; create/link bite episode, intake, appointment, and one visit ticket. |
| Clinical assessment | Doctor/triage staff | Confirm exposure details, wound findings, category, relevant history, and treatment decision; document referral or no-vaccine decision when applicable. |
| Treatment | Treatment nurse | Verify approved plan and intended dose; record product, dose, lot/batch, route/site, administration time, and vaccinator; decrement inventory through the existing stock workflow. |
| Follow-up | System and clinic staff | Create next dose appointment/card and reminder tasks from the prescribed schedule; mark visit complete. |

### Private ABC: fewer desks, same clinical authority

| Stage | Owner | Minimum data/action | Next step |
| --- | --- | --- | --- |
| Registration and intake | Reception | Identify patient, contact for follow-up, incident date/details, prior vaccination and visit type; link an existing episode for a return dose. | Combined clinical station |
| Vitals and clinical assessment | Nurse records vitals; authorized clinician assesses and approves plan | Vital signs; wound care and exposure/risk assessment; category and history; order/approval for vaccine, RIG, tetanus, referral, no vaccine, or continuing an existing schedule. Save the assessor and decision time. | Billing if treatment ordered; otherwise referral/complete |
| Billing or coverage | Cashier or authorized front desk | Present clinic price/line items; record self-pay, covered, waived, or pending/deferred; capture receipt/payment evidence when money is collected. | Injection when clinical and operational prerequisites are met |
| Injection and disposition | Authorized treatment staff | Recheck patient and plan; administer and record dose/RIG as ordered, batch and stock, adverse event if any, next appointment and instructions. | Visit complete |

**Critical exception:** A clinician may mark an urgent treatment override when indicated care cannot wait for payment. Store who authorized it, why, when, and the remaining balance. The workflow then allows treatment and leaves billing open for reconciliation. An ordinary cashier cannot create this override.

### Visit variants

- **Return dose:** identify the existing bite episode and treatment plan, check for changed symptoms/exposure or contraindication concerns, confirm due dose, handle that visit's charge/coverage, administer, and schedule the next dose. Do not repeat the full registration or invent a new D0.
- **No vaccine or referral:** complete the assessment and document the decision; skip billing/injection unless a separate billable service was actually provided. Record referral destination and handoff when needed.
- **Insufficient stock:** do not mark treatment complete. Show the shortage, record a referral/transfer or a clinician-approved alternative, and keep the patient action visible.
- **Cancelled, absent, or transferred:** close or transfer the visit with an auditable reason; do not count it as a completed dose.
- **PhilHealth candidate:** record eligibility/claim information separately from a payment receipt. Do not automatically set a claim to paid or mark the patient covered solely from a membership checkbox.

## Data and API design

### Preset and version

- Define immutable preset definitions in backend code or a seeded `workflow_templates` table: `key`, `version`, supported stages, allowed transitions, required capabilities, and UI label. Start with `public_abtc@1` and `private_abc@1`.
- Add a clinic-scoped `clinic_workflow_settings` record: `clinic_id`, `default_template_key`, `template_version`, permitted overrides, updated_by, and updated_at. Validate the override schema on the server; reject unknown stage IDs or an attempt to disable clinical guards.
- Add `GET /api/setup/workflow-templates` for preset previews, `GET /api/setup/workflow` for the clinic's current selection, and an admin-only `PUT /api/setup/workflow` for a validated change. Return the **effective** stage map so frontend and backend use the same description.
- Pin `template_key` and `template_version` when a visit starts. Changes to the clinic default affect only later visits. Define a clear migration path for future template versions.

### Visit progression

- Add a clinic-scoped `clinic_visits` (or equivalently named encounter) table with `clinic_id`, `patient_id`, nullable `bite_id` and `appointment_id`, selected template/version, `visit_type`, `current_stage`, `status`, created/closed timestamps, and an idempotency key. Link its queue ticket(s). Use a unique constraint or transaction to prevent duplicate active check-ins for the same appointment/visit.
- Add `visit_stage_events`: visit, from/to stage, action, actor, timestamp, and reason. Preserve the existing `queue_histories` for queue actions; do not overload them with billing or clinical decisions.
- Implement one `WorkflowTransitionService` with named actions such as `complete_registration`, `approve_assessment`, `record_billing`, `authorize_urgent_care`, and `record_administration`. It should load the visit and clinic under a transaction, check actor capabilities and required records, update stage/queue, and append an event atomically.
- Wrap or replace the hard-coded triage-to-treatment branches in `QueueController` and `TreatmentRecordController` so public behavior remains equivalent while the private preset can route to billing. Keep API actions idempotent; a retry must not create two queue handoffs, payments, doses, or stock deductions.
- Do not backfill a guessed stage for ambiguous historic visits. Existing active visits can finish under the legacy public path or be migrated through a reviewed mapping; keep their history intact.

### Small private billing capability

- Add a clinic-scoped bill linked to the visit/episode with service line items, quantity, clinic-set unit price, discounts/coverage, total, outstanding amount, and a status. Never hard-code a PhilHealth package amount as the clinic's selling price.
- Add append-only payment transactions with amount, method, receipt/reference, cashier user, timestamp, and reversal/refund link. Corrections reverse an entry; they do not erase the original payment.
- Keep `coverage_type` and, if later needed, a separate claim status. `pending`, `paid`, `waived`, `covered`, and `deferred` should be distinguishable in the workflow and reports. A claim submitted is not necessarily a claim paid.
- Authorize bill creation, payment, waiver, refund, and urgent override separately. Small clinics may assign more than one capability to the same named staff member; the actor remains traceable.
- Billing can be a simple internal ledger in v1. A payment gateway, tax invoicing integration, and direct PhilHealth electronic claims are later integrations, not prerequisites for the workflow pilot. Validate local receipt and tax requirements with the pilot clinic before production use.

### Clinical data, inventory, and reports

- Reuse `patients`, `bite_incidents`, `bite_incident_intakes`, `treatment_plans`, `treatment_records`, appointments, and inventory. Where the existing clinical form combines vitals and assessment, show a compact private layout at one station while maintaining separate authorship of vitals and the treatment decision.
- Reuse the same server-side dose eligibility, completion, overdue, and stock rules for both templates. The template must never create a dose from a paid bill or skip a clinical plan guard.
- Keep reports based on incident dates, D0 dates, administered doses, and stock transactions as already defined; template selection may be an optional operational filter, not a change to the clinical denominator.
- Check the Rabies Exposure Registry, ABTC Monthly Report, and Cohort Report labels/signatories for the private clinic. Make clinic header/type configurable while preserving the form data; confirm which printed formats the regional DOH office expects for that ABC.

## User interface

### Clinic Setup > Predefined Templates

1. Two clear cards: **Public ABTC** and **Private ABC**, each with a four-step preview, intended clinic type, included clinical tasks, and billing behavior.
2. Show **Current template** and **Applies to new visits**. Let the admin preview the resulting staff queue and form sections before saving.
3. After selecting a preset, provide only supported settings: station/staff mapping, separate or shared cashier desk, accepted payment/coverage modes, and optional nonclinical registration sections. Clinical assessment, treatment authorization, administration audit, and essential exposure data are locked.
4. Show any missing prerequisites before activation: no clinical assessor, no authorized vaccinator, no cashier capability when billing is enabled, or incomplete price list. Do not silently activate a partially configured private flow.
5. Keep Module Configuration for field display rules. Clearly separate it from the workflow preset; reconcile frontend/backend field names and ensure each displayed toggle has an actual effect.

### Staff experience

- Each role sees its own worklist and one primary next action: **Assess**, **Take payment**, or **Administer**. Use one visit progress strip with completed/current/upcoming stages, without repeating the full intake on every screen.
- The combined private clinical station shows vitals and the assessment/plan in one visit context, with the author of each section visible. A nurse who enters vitals does not gain treatment-plan approval merely by sharing a station.
- Show clinical alerts before injection: missing assessment/plan, wrong dose, prior dose already administered, unavailable stock, referral decision, and unresolved payment with the approved urgent-care path.
- At the cashier, show only information needed to charge and reconcile. Do not expose full clinical notes to cashier-only staff.
- For returning patients, show the existing episode, prescribed dose and last administered dose first. Mark any changed exposure or red flag for clinical reassessment.

## Delivery sequence and checklist

### Phase 0 - confirm the pilot workflow

- [ ] Walk through one public new case and follow-up with Tagoloan staff; document actual queue and Form 1/2/3 handoffs.
- [ ] Walk through one private ABC's new case, repeat dose, urgent case, no-vaccine decision, referral, payment, PhilHealth/coverage, and refund practices. Confirm who may assess, approve, administer, waive, and authorize urgent care.
- [ ] Confirm DOH certificate/reporting and clinic receipt requirements with the pilot ABC/appropriate office. Treat the sources above as design inputs, not a substitute for that local confirmation.
- [ ] Freeze the v1 stage names, clinical guards, and acceptance scenarios before database work.

### Phase 1 - foundation without changing current patients

- [ ] Add versioned preset definitions, clinic selection, and a backend validation endpoint.
- [ ] Add the `/setup/templates` React route and a read-only comparison/preview page, then the admin selection form.
- [ ] Add visit and stage-event records, with one-to-one/unique links that prevent duplicate check-in.
- [ ] Map existing public flow into the workflow service and verify its behavior against current registration, triage, queue, vaccination, appointment, inventory, and reporting tests.
- [ ] Reconcile Module Configuration's submitted fields with the API/model and connect its supported field rules to actual screens; remove or relabel ineffective toggles.

### Phase 2 - private clinical and billing pilot

- [ ] Implement private new and return-visit stage maps and the compact combined clinical screen.
- [ ] Add bill, line-item, payment/reversal, coverage, and price-list APIs with clinic scoping and role checks.
- [ ] Add a cashier worklist and receipt display/print path; add an audited urgent-care bypass that does not mark a bill paid.
- [ ] Route clinician plan decisions and vaccination records through the workflow service. Keep the existing clinical and stock integrity checks.
- [ ] Keep reporting and DOH print data sourced from the same records; configure clinic-specific headings only where verified.

### Phase 3 - verify and deploy

- [ ] Backend tests: clinic isolation; template/version pinning; valid/invalid transitions; authorization; urgent bypass; bill/payment/refund arithmetic; duplicate retries; dose and stock integrity.
- [ ] End-to-end scenarios: public new case, public follow-up, private self-pay, private covered/pending claim, unpaid urgent treatment, repeat dose, no-vaccine, referral, stockout, cancelled/absent, and concurrent staff actions.
- [ ] Compare report totals and three DOH previews before/after preset activation for equivalent clinical records.
- [ ] Pilot with one private ABC using test data, then a limited live rollout. Monitor stuck visits, bypasses, unpaid bills, failed handoffs, duplicate doses, and stock mismatches.
- [ ] Keep current public visits on their existing path. Rollback changes the clinic **default for new visits** only; it must not rewrite clinical, payment, or stage-event history.

## Acceptance criteria

- [ ] A clinic admin can compare, configure, and activate either preset; the current public clinic stays on its existing flow until explicitly switched.
- [ ] New private visits move from registration to combined clinical work, then billing/coverage, then authorized injection and follow-up without an unnecessary second clinical queue.
- [ ] No injection can be recorded without a valid patient/episode, appropriate authorized clinical plan and dose, authorized vaccinator, product/batch details, and a stock transaction when clinic inventory is used. Any permitted external supply has a documented source. An unpaid bill alone is not a clinical stop when an authorized urgent override exists.
- [ ] No payment or receipt is inferred from vaccination, and no vaccination is inferred from payment. Reversals are traceable.
- [ ] Follow-up visits reuse the episode and regimen, and cannot accidentally create a second D0 or duplicate a live dose.
- [ ] Existing public workflow, clinic isolation, reports, DOH form data, and inventory balances remain correct.
- [ ] Changing the clinic default does not alter in-progress visits or prior records; every transition shows who acted and when.
- [ ] Every setting offered on the template page has a tested backend effect. Unsupported arbitrary stage editing is not offered in v1.

## Decisions to confirm with the pilot clinic

1. Is its normal order clinical assessment -> cashier -> injection, and who can authorize treatment while payment is unresolved? receptionist, i guess
2. Does it collect per-visit payment, package payment, or both? Which services and return doses are charged, and what receipt system is already used? ans: im planning like they can only type it manually the payment for now.
3. Is it PhilHealth accredited for the Animal Bite Treatment Package, and who validates eligibility and manages claims? ans: no
4. Which staff member records vital signs, which licensed clinician approves the plan, and which staff administers each product? Can one person hold more than one operational assignment? ans: receptionist if possible
5. Which DOH/CHD forms and signatures does the private ABC actually submit, and which clinic labels must change in print output? ans: doh submissions.

These answers configure the **private preset**; they do not require a second patient database or a custom workflow builder for each clinic.


note focus only in ui for predefined templates in clinic setup. what will be the layout