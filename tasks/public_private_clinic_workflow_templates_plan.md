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

## Current focus: Predefined Templates workflow preview UI

Keep the existing public workflow and let the admin coordinate multiple desks for now. The page explains how each preset would guide a visit and provides a local-only staffing coverage example. It does not change queues, user roles, or patient records. Backend activation and named staff assignment come later.

### What the current workflow actually does

| Visit | Current path | Repository evidence |
| --- | --- | --- |
| New bite case | Register/find patient and exposure → new-case queue → Form 2 consultation and treatment plan → treatment/vaccination queue → Form 3 administration → next appointment. | `PatientController`, `BiteCaseController`, `QueueController`, `TreatmentRecordController`, `VaccinationRecordController`; Form 2 transfers to treatment in `TreatmentRecordController::store`. |
| Return dose | Find existing patient and episode → check in scheduled appointment → treatment/follow-up queue → record dose against the existing plan → schedule next visit if needed. | `AppointmentController::checkInByPatient`, `NursePatientListPage`, `VaccinationRecordForm`, `VaccinationRecordController`. |
| No vaccine or referral | After assessment, document the decision and close/refer the visit; no automatic injection step. | `TreatmentRecordController::store` branches on referral, `no_vaccine`, and `continue_existing_schedule`. |

The current queue uses `visit_type` to distinguish new/consultation work from vaccination/follow-up work. `QueueController` and `TreatmentRecordController` contain the handoffs directly. A template card cannot change those handoffs today.

### Recommended page layout

```text
Predefined Templates                                      [Preview only]
Choose a workflow to inspect. The current clinic keeps its public flow.

[ Public ABTC · Current workflow ]  [ Private ABC · Proposed workflow ]

Private ABC workflow
[ New bite visit ] [ Return dose visit ]
Registration  →  Vitals & assessment  →  Payment  →  Injection & next visit
    click any step to view its screen and what happens next

┌ Selected step: Vitals & assessment ────────────────────────────────────┐
│ Screen preview: existing field groups shown in the order staff uses.  │
│ Key action: document assessment and treatment decision.              │
│ Next: payment if treatment is ordered; otherwise close or refer.      │
└───────────────────────────────────────────────────────────────────────┘

Uses existing records: patient · bite episode · treatment plan · doses
Needs implementation: manual payment record · private visit routing
Staff coverage: [ One admin desk ] [ Separate desks ]
Show each stage's desk owner and any clinical qualification needed.

Form sections: patient/exposure/assessment/treatment are always included.
[ Socioeconomic information  on/off ] [ Government programs  on/off ]
Private payment: separate planned step, not a form-field switch.
[ Save & apply preview ] stores the choice on this page only.
```

**Visual hierarchy:** Two equal template cards, one compact horizontal stepper, one selected-step preview card, then two setup cards for staff coverage and optional form sections. The private preset adds one compact planned-payment card. Use the current Clinic Setup styling and responsive cards; on narrow screens the stepper becomes a two-column grid and the setup cards stack. Keep secondary labels short. Avoid a full role matrix, duplicate report controls, or long explanations inside every step.

### Final UI behavior for field choices and payment

| Area | Public ABTC default | Private ABC default | Interaction on this page |
| --- | --- | --- | --- |
| Core clinical fields | Included | Included | Patient/contact/address, bite exposure, assessment, treatment, and follow-up are shown as fixed groups. There is no switch that removes them. |
| Socioeconomic Information | On | Off | Switch changes the Registration step preview. Reset restores the selected template's default. |
| Government Programs | On | Off | Switch changes the Registration step preview. This group includes PhilHealth details, so the private page points out that clinics using coverage can turn it on. |
| Staff coverage | One admin desk | One admin desk | Compare one coordinating admin desk with separate desks. This is a desk example, not a named staff assignment or a permission grant. |
| Payment | No payment step | Planned step after assessment | Show charge, amount paid, method, status, and receipt/reference in the Payment step preview. Do not offer a misleading payment on/off switch. |

The two optional switches represent the existing Module Configuration sections `socioeconomic_section_enabled` and `gov_programs_section_enabled`. Their state is local to the template preview for now; changing them does not call the Module Configuration API or alter live forms. The advanced link opens Module Configuration for its separate field rules. If a future backend applies a template, it should map only supported optional section rules and validate the resulting form behavior. It must preserve clinical and reporting data.

The existing `cost_recovery` treatment field is a text note. It cannot record a charge, amount received, balance, or receipt. Payment therefore stays a visibly planned workflow step, with a future manual payment record and an audited urgent-care exception when payment is pending. Selecting Private ABC or turning on a module field must not be presented as enabling billing.

### What each clickable step previews

| Private step | Show in the preview | "What happens next" line |
| --- | --- | --- |
| Registration | Search existing patient or register; name, birth date, sex, contact, address; exposure date/place, animal, bite/scratch, prior vaccination. For a return dose, find the existing episode rather than starting another bite case. | New bite → assessment. Return dose → confirm existing plan and due dose. |
| Vitals & assessment | Existing pertinent-history note; blood pressure, temperature, height, weight; wound/body site, animal status, category, diagnosis, and treatment decision. Indicate that pulse, oxygen saturation, and respiratory rate from the private card are not stored as separate fields yet. | Treatment ordered → payment handling. No vaccine/referral → documented closure or referral. |
| Payment | Show a simple **planned** manual-charge screen mockup: amount, received amount, method, receipt/reference, and status. Label it clearly as unimplemented; the existing `cost_recovery` text field is not a payment record. | Recorded or permitted pending payment → injection; do not display "dose given" here. |
| Injection & next visit | Existing ordered dose, date, route, vaccine, batch, vaccinator, RIG/TT summary, remarks, and next appointment. Use the clinician's plan for dose rows, not a fixed schedule copied from the paper card. | Dose recorded → next appointment or visit complete. |

Show only one step's details at a time. The public card uses the same layout with its current stages: Registration → Doctor assessment → Nurse treatment → Follow-up. Both cards should open immediately on click. The **New bite / Return dose** switch changes the path preview without saving anything. A small inline branch note covers referral/no-vaccine, so the page does not need a third full scenario.

### Staff Assignments, in plain terms

There are three separate concepts in the existing app:

| Page/setting | What it currently changes | Role in this preview |
| --- | --- | --- |
| User Management | Creates an account and sets its legacy role and workstation role. | No editing from the template page. |
| Staff Assignments | Saves one `assigned_module` value on a user: all, registration, triage, treatment, or inventory. | **No dependency.** It does not route patients or grant permissions, so the template preview should not ask the admin to select real staff accounts. |
| Predefined Templates | Changes only which workflow, desk coverage example, and form groups are displayed on screen. | Show **One admin desk** by default and **Separate desks** as another local preview. List who would cover each step and the clinical qualification required. No staff names or readiness warning about missing assignments. |

The `StaffAssignmentPage` calls `PUT /users/{id}/assigned-module`; `UserController::updateAssignedModule` updates only `assigned_module`. The queue and role middleware use visit type and roles, not that module value. Thus assigning a user to Treatment there does not move a patient to Treatment and does not enable an injection action. Keep the page as a separate staff-organization tool for now. Its shortcut on Predefined Templates is for review, not part of template application. If it remains in Clinic Setup, label it **Preferred module** in a later UI cleanup so admins do not mistake it for workflow configuration.

### Preview interaction and acceptance checks

1. Default to **Public ABTC · Current workflow** so opening the page reflects the clinic's real starting point. Selecting Private ABC changes the preview and clearly says **Proposed**; selection is not activation.
2. Clicking a template card or step updates the preview immediately. Clicking New bite or Return dose updates the route and field summary. The optional section switches update the Registration preview; their defaults follow the selected preset. The Save & apply preview button confirms and marks the selected template, desk coverage, and section choices on this page only; it makes no API call or clinic setting change.
3. The active step shows: a short screen title, only the field groups used there, one main action, and one next-step sentence. The user can understand the whole visit without reading database field names.
4. Admin can compare one admin desk with separate desks for every step. The preview does not claim that an admin title alone proves clinical qualification; it labels assessment and injection as qualified clinical work. Actual clinical actions remain governed by the existing system until a later authorization change.
5. Billing is marked **Planned** throughout. It appears as a separate workflow step and explanatory card, never as a Module Configuration field toggle. The page never implies that a payment was saved or a receipt issued.
6. The public path and new/return branching match the current controllers; the private path is labelled as proposed. No reports or DOH form data change from preview interactions.

**Implemented UI:** `PredefinedTemplatesPage.tsx` opens on Public ABTC, offers New bite / Return dose previews, and shows one compact step at a time with its main action and next step. A staff coverage card compares one admin desk with separate desks, lists each stage's suggested owner and clinical requirement, and links to Staff Assignments and User Management. A form-sections card keeps core clinical groups visible and provides local switches for Socioeconomic Information and Government Programs, with per-preset defaults and reset. The private preset shows a separate Planned payment card. Save & apply preview confirms the template, desk coverage, and optional sections in local page state until the page is left or reloaded; it does not change the live clinic workflow, module configuration, or real staff assignment.

**Module Configuration relationship:** The optional switches correspond to the existing Socioeconomic Information and Government Programs section settings. The advanced shortcut opens Module Configuration for separate field rules; the template preview does not write to that page. Some existing module controls are not wired to live forms. The preset must never silently change other modules or imply that a form setting changes queue routing. When real activation is built, keep workflow selection, optional field rules, and payment as separate explicit decisions.

### Later, when activation is requested

Only after the preview is accepted, add a clinic-scoped saved template/version, private visit routing, manual payment records, and a separate staff/capability design. At that point the admin may still cover multiple desks; the choice of who works each desk can be optional for small clinics. Keep this later phase separate from the current UI preview task.

## Research and clinical boundary

- A DOH regional certification guide distinguishes government-operated ABTCs from privately operated ABCs and describes both as places where trained doctors and nurses evaluate and manage rabies exposure. Therefore `private_abc` is a clinic-operation preset, not a different standard of clinical care. [DOH ABTC/ABC certification guide](https://ro11.doh.gov.ph/images/transparent/2024/2024DCHDv2.pdf)
- WHO's PEP protocol includes wound assessment, PEP risk assessment, wound care, vaccine, and immunoglobulin when indicated. Registration plus vital signs alone cannot authorize an injection. [WHO PEP protocol](https://www.who.int/publications/i/item/B09018), [WHO rabies fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies%EF%BB%BF)
- PhilHealth lists an Animal Bite Treatment Package for accredited providers. A private clinic's bill may therefore be self-pay, covered, partly covered, waived, or unresolved. The application must not assume that every private patient pays cash. Package eligibility and claim rules must be checked for the participating clinic before launch. [PhilHealth benefits](https://www.philhealth.gov.ph/benefits/), [PhilHealth accreditation requirements](https://www.philhealth.gov.ph/about_us/transparency/PCC_Handbook2024_2ndEdition.pdf)
- **Product inference from the prompt-treatment guidance:** billing should normally occur before injection in the private clinic's chosen process, but a clinician must be able to proceed with urgent indicated care while payment is pending, with an audited reason. Payment state must never substitute for clinical authorization.
- Keep the three existing DOH form generators available to clinics that need them. Confirm the participating private ABC's exact submission forms, signatories, and regional reporting instructions before claiming that all three forms are mandatory for every ABC.

## Current repository findings

| Area | Current behavior | Implementation consequence |
| --- | --- | --- |
| Template navigation | **Predefined Templates** now has a `/setup/templates` route with a read-only public/private preview. | Keep activation unavailable until the backend workflow, billing, and role prerequisites are in place. |
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

### UI-first field and role mapping (2026-09-27)

The Clinic Setup > Predefined Templates page now previews the private layout. Selecting a card changes only the preview. It does **not** activate a clinic workflow, change a user role, or save a patient record.

| Private step | Existing records and fields to reuse | Current gap |
| --- | --- | --- |
| Registration | `patients`: name parts, birth date, gender, contact, address. `bite_incident_intakes`: exposure date/time/place, animal, exposure type, prior rabies vaccination. | Reuse an existing patient and bite episode on return visits; do not create a duplicate case. |
| Vitals and assessment | `treatment_records`: pertinent history, blood pressure, temperature, height, weight, diagnosis, treatment decision. `bite_incidents` and intakes: body site, wound, animal condition, category/severity. | Allergies, medical conditions, and maintenance medicines share the current history note. Pulse, oxygen saturation, and respiratory rate have no dedicated stored fields. A shared room must still preserve who made the clinical decision. |
| Billing | `treatment_records.cost_recovery` is a nullable string in the schema. | No current payment-entry API or screen uses that field, and it is not a bill. Add amount, payment status, method, receipt/reference, and cashier records before this stage can go live. |
| Injection and follow-up | `treatment_records`: prescribed dose/date, administered date, route, vaccine, batch, vaccinator, medication given, TT status, remarks. `appointments`: next visit. | The paper card's separate RIG and tetanus brand/dose/date fields are not fully structured in the current data model. Do not infer an administered dose from a scheduled row. |

**User Management versus Staff Assignments:** User Management creates the account and sets its current role (`registration`, `triage`, `treatment`, or `admin`); role checks control access to existing clinical actions. Staff Assignments stores one `assigned_module` (`registration`, `triage`, `treatment`, `inventory`, or `all`), but that value is not used by the current role middleware to grant permissions. Assigning a receptionist to the treatment module must not authorize assessment or injection. The private preset needs a separate cashier permission and a clear mapping of named staff to the four steps. One person may cover multiple desks if authorized, but the system should record which role they used for each action. Admin status alone is not evidence of a clinical qualification.

**Activation boundary:** Once the backend workflow and billing records exist, applying the private preset would change the routing of **new visits** only: registration → clinical assessment → payment handling → authorized treatment and follow-up. The patient, bite episode, treatment records, inventory, and DOH reporting sources remain shared. Existing visits keep their original path. The current template page is a reviewable UI preview until those prerequisites are implemented and tested.

### Admin-led clinic: repository audit and solution

**Recommendation:** Let the clinic admin configure and supervise the entire operation. Let the same person perform a clinical step only when that account also has the appropriate verified clinical capability. A small clinic can use one room and one signed-in person for several steps; the system must still distinguish registration, assessment, cashier, and administration actions. DOH describes private ABCs as facilities staffed by trained doctors and nurses, and WHO's PEP protocol includes wound and exposure-risk assessment (sources in [Research and clinical boundary](#research-and-clinical-boundary)).

#### What `admin` means in the current code

| Finding | Evidence in repository | Consequence for a private preset |
| --- | --- | --- |
| Admin owns setup and users | `frontend/src/App.tsx` protects Clinic Setup and User Management for admin/developer; `backend/routes/api.php` has admin setup/user groups. `UserController::index`, `store`, and `updateAssignedModule` scope records to `clinic_id` and require `isAdmin()`. | Reuse admin as the clinic's configuration owner; do not add a separate `private_admin` account type. |
| Admin is also allowed through several clinical API routes | `backend/routes/api.php` includes admin on case creation, Form 2 save, vaccination administration, and schedule changes. `TreatmentRecordPolicy` also treats admin as a creator/updater. | The current `admin` role conflates management authority with clinical authority. Template activation must not inherit this shortcut. |
| The admin UI does not show every clinical station | `frontend/src/shared/config/navigationConfig.ts` omits admin from the follow-up nurse station and vaccination schedule, although backend routes include admin for some related actions. | A single admin would see an incomplete operational path. Make the visible worklist depend on actual capabilities and clinic workflow, not just the legacy role label. |
| Account role and workstation role are coupled | `UserController::determineLegacyRole()` converts `workstation_role=doctor` to `role=triage`, or nurse roles to `role=treatment`; `syncWorkstationRoles()` replaces the role pivot. The User Management edit form selects one workstation role. | Editing an admin into a doctor/nurse can remove their admin identity. Add a separate capability-assignment UI/API that preserves `role=admin`; do not use the existing single-role dropdown for dual-duty admins. |
| Staff Assignment is not authorization | `users.assigned_module` is a single enum (`all`, registration, triage, treatment, inventory). `updateAssignedModule()` changes only this field; `CheckRole` and `ProtectedRoute` use role data, not `assigned_module`. | Treat module assignment as a work-area preference until a real stage assignment and authorization model is added. `all` cannot mean permission to assess, bill, or inject. |
| Clinic Module Configuration is not a workflow engine | The frontend submits `registration_module_enabled` and `treatment_module_enabled`, but `ClinicModuleConfigController::update()` and the model do not persist them. Queue and treatment controllers directly transfer a completed assessment to treatment. | Do not activate private mode by toggling modules or hiding triage. Add a dedicated, versioned workflow setting and stage transitions. |
| Billing is not implemented | `treatment_records.cost_recovery` is a nullable string, but no payment controller uses it; there is no cashier role in the seeded `roles` table. | Add a small manual bill/payment record and cashier capability before putting patients into a payment queue. |
| Role input needs tightening | `UserController` accepts role strings and `determineLegacyRole()` can map `developer` from submitted role data. The normal create-user UI does not offer developer. | Before template rollout, allowlist role/capability changes on the server and reserve developer provisioning for a separate trusted process. |

#### Proposed permissions and assignments

| Action | Admin can configure or monitor | Who may perform the action | Implementation rule |
| --- | --- | --- | --- |
| Select template, assign staff, set clinic prices, review reports | Yes | `clinic_admin` | Require a clinic-scoped admin permission and an audit event for each settings change. |
| Register patient and collect bite history | Yes | `receptionist` or admin with registration capability | Use existing patient/intake records. |
| Record vitals | Yes | Assigned trained clinical staff | Save actor and timestamp; a shared station does not imply authority to approve a plan. |
| Approve exposure assessment and treatment plan | View and coordinate | Verified clinician with assessment capability | Check capability server-side at the Form 2/plan action. An admin title alone does not satisfy it. |
| Record manual charge/payment | Yes | New `cashier` capability; may be held by the receptionist/admin | Keep payment ledger separate from the clinical record. A payment does not prove a dose was given. |
| Administer vaccine/RIG/tetanus | View and coordinate | Authorized treatment clinician with administration capability | Check capability and prescribed plan, then record product/batch, actor, time, and stock movement. |

`professional_license_no` already exists on users, but it is an optional string and no current clinical route verifies it. A number entered into that field is not proof of qualification. The clinic must verify the person's training and professional scope, then an admin (or designated authorized approver) grants the operational capability. Do not let users self-assign clinical capabilities.

#### How the admin would apply a template

1. **Choose:** In Clinic Setup > Predefined Templates, compare Public ABTC and Private ABC. Show the current active preset separately from the card being previewed.
2. **Map people:** Use User Management for named accounts and verified capabilities. Allow one account to hold admin + receptionist/cashier or admin + clinical capability when appropriate. Use Staff Assignments for preferred station/worklist placement; never infer permissions from that field.
3. **Check readiness:** The server checks for a clinician who can approve plans, an authorized vaccinator, a cashier/payment-entry capability, a manual charge and receipt process, and required clinic/report information. A preset price list is optional because the pilot clinic plans to enter charges manually. Show specific missing items on the template page. Keep **Activate** unavailable while checks fail.
4. **Preview impact:** Show the exact new-visit path, affected worklists, form sections, and reports. State that open visits remain on their current template. The admin confirms a versioned change; save the actor, time, previous preset, and new preset.
5. **Operate:** Each new visit stores its preset/version. A stage-transition service routes it to the next permitted task. One person may complete consecutive steps without a physical queue handoff, but each action records its actual capability and actor. Urgent clinically indicated care has a documented authorized path when payment is unresolved.
6. **Revert default:** Admin may restore Public ABTC for future visits. This must not rewrite existing visits, payments, treatment records, or audit events.

#### Build order and minimum tests

1. **Permissions first:** Define capabilities such as `workflow.manage`, `patient.register`, `vitals.record`, `assessment.approve`, `payment.record`, and `dose.administer`. Preserve the legacy role for compatibility, but enforce these capabilities on the new workflow's server actions. Remove the assumption that `admin` automatically performs clinical actions when migrating those endpoints. Lock down role/capability assignment and developer creation.
2. **Template setting:** Seed immutable `public_abtc@1` and `private_abc@1`; store a clinic-scoped active preset/version and expose read/validate/activate endpoints. Existing clinics default to public.
3. **Staff and billing:** Add per-step staff assignments and the manual payment ledger. Keep `assigned_module` as a display preference or migrate it explicitly; do not use it as a hidden authorization switch.
4. **Visit routing:** Link each new visit to one patient/bite episode and pinned template version. Replace hard-coded Form 2 → treatment handoffs with a transition service. Return visits reuse their existing episode and plan.
5. **Tests:** Cover a nonclinical admin who can configure but cannot assess/inject, a qualified dual-duty admin who can perform permitted steps, a receptionist/cashier who cannot perform clinical steps, cross-clinic isolation, activation readiness, existing public visits, urgent unpaid treatment, duplicate retries, and immutable treatment audit fields.

**Do not make the current preview card save the private preset yet.** The codebase cannot safely honor that selection end-to-end while clinical admin access, billing, and queue handoffs remain as described above.

### Future activation UI for Clinic Setup > Predefined Templates

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
- [x] Add the `/setup/templates` React route and a read-only comparison/preview page. The admin selection form and activation remain future work.
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
