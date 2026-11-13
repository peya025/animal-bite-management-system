# Person 4 — Station Workflow Decisions & Operation Inventory

**Document Version:** 1.0.0  
**Effective Date:** 13 November 2026  
**Owner:** Person 4 (Workflow Implementer & Release Verification Coordinator)  
**Inputs:** [Module Configuration Contract](configuration_contract.md), [Person 4 Brief](person_4_workflow_and_verification.md), [Implementation Plan](implementation_plan.md)

---

## 1. Core Clinical & Operational Principles

1. **No Unapproved Triage Bypass:** In an Animal Bite Treatment Center (ABTC), Day 0 exposures, new exposures, and booster requests require Doctor assessment (`Form 2`: WHO Exposure Category I/II/III, `TreatmentPlan`, prophylaxis orders) before Treatment nurses can administer PEP/RIG/ATS. Disabling `triage_module_enabled` MUST NOT bypass Doctor assessment or relax `exposure_category` / `TreatmentPlan` safeguards.
2. **Operational Capability != Role Authorization:** Role middleware (`CheckRole`) and clinic scoping remain strictly enforced first (401/403). Station capability enforcement (`StationCapabilityPolicy`) is an additional operational gate returning **HTTP 422** (`code: "station_disabled"`) when an operation targets a disabled station. Staff `assigned_module` never overrides role checks or grants access to a disabled station.
3. **No Stranded Patients or Vanished History:**
   - Read-only views (patient registry, patient history, bite cases, vaccination records, printouts, reports, and queue monitoring) remain accessible when a station is disabled.
   - Scheduled follow-up appointments and already-queued active tickets are preserved in the database rather than deleted.
   - When Doctor completes `Form 2` (`TreatmentRecordService` / `QueueController::complete`) while `treatment_module_enabled = false`, the triage queue ticket is completed cleanly instead of being transferred into a disabled `vaccination` queue.

---

## 2. Three-Station Combination Policy Matrix (`R / T / Tx`)

Format: `(Registration, Triage, Treatment)` where `1 = enabled`, `0 = disabled`.

| Code | Reg (`R`) | Triage (`T`) | Treatment (`Tx`) | Policy Result | Operational Mode & Behavior |
| --- | :---: | :---: | :---: | --- | --- |
| **`111`** | 1 | 1 | 1 | **Accepted** | **Full Standard ABTC Workflow.** Registration → Doctor Triage (Form 2) → Treatment / Follow-ups (Form 3). |
| **`011`** | 0 | 1 | 1 | **Accepted** | **Registration Closed / Existing & Follow-up Mode.** New walk-in patient registration, mobile intake check-ins, and registration returning-patient check-ins are blocked (`422`). Active queued patients in Triage/Treatment and scheduled follow-up dose check-ins (`POST /api/appointments/{id}/check-in`) continue normally. |
| **`110`** | 1 | 1 | 0 | **Accepted** | **Intake & Triage / Referral Mode.** Registration and Doctor Triage (Form 2, addendums, external referrals/transfer-out, scheduling) operate normally. Treatment administration (`Form 3` vaccination records, treatment cards, dose administration, follow-up treatment check-ins, calling/serving treatment queue tickets) is blocked (`422`). Completing Form 2 marks the triage ticket `completed` instead of queuing to Treatment. |
| **`010`** | 0 | 1 | 0 | **Accepted** | **Triage Consultation Only Mode.** Doctors can assess already-queued/existing patients, complete Form 2, write addendums, and manage referrals/schedules. New registration intake and Treatment dose operations are blocked (`422`). |
| **`001`** | 0 | 0 | 1 | **Accepted (Conditional)** | **Follow-up Treatment Only Mode.** Allowed **only when 0 active Triage queue entries** exist today (`waiting`, `called`, `in_consultation`, `serving`, `second_chance`, `final_recall` for `new_case`/`consultation`/`booster`). Scheduled follow-up doses with an already-approved `TreatmentPlan` can check in and receive doses at Station 2. Registration, Triage, and unassessed Day 0 treatment remain blocked (`422`). |
| **`101`** | 1 | 0 | 1 | **Rejected (`422`)** | **Unsafe Triage Bypass Prohibited.** Registration cannot remain enabled with Treatment enabled while Triage is disabled, because newly registered Day 0 patients require Doctor assessment before treatment. Rejects the config update and retains previous configuration. |
| **`100`** | 1 | 0 | 0 | **Rejected (`422`)** | **Unsupported Registration-Only Stranding.** Registration automatically routes new intakes to Doctor Triage; keeping Registration enabled without Triage would strand newly registered patients. Rejects the config update. |
| **`000`** | 0 | 0 | 0 | **Rejected (`422`)** | **All Stations Disabled Prohibited.** At least one operational station must remain enabled for the clinic. Rejects the config update. |

---

## 3. Active Work & Mid-Visit Transition Policy

1. **Active Triage Queue Protection (`001` transition):** Disabling `triage_module_enabled` (`001`) is rejected with `422` (`errors.triage_module_enabled`) if the clinic has any active triage queue ticket for today (`new_case`, `consultation`, `booster` in `waiting`, `called`, `in_consultation`, `serving`, `second_chance`, `final_recall`).
2. **Disabling Registration (`011`, `010`, `001`):** Allowed immediately. Patients already checked into Triage or Treatment queues continue uninterrupted.
3. **Disabling Treatment (`110`, `010`):** Allowed even when scheduled follow-up appointments exist (appointments are preserved intact for when Treatment re-enables).
   - New Treatment check-ins, new Treatment queue creations, calling/serving waiting Treatment tickets, and all Form 3 dose/card mutations (`POST /api/vaccination-records`, `POST /api/tagoloan-treatment-cards`, `POST /api/vaccinations/{id}/administer`) are **immediately rejected (`422`)**, even from stale browser tabs.
   - Already-`serving` or `waiting` tickets may still be `cancelled` or `soft-deleted` for queue cleanup, or `completed` only for cleanup without recording doses, and resume normally when Treatment is re-enabled.
4. **Re-enabling a Station:** Restores endpoint & UI capabilities immediately using existing preserved records/appointments without duplicating queue entries or altering revisions silently.

---

## 4. Complete Station-Sensitive Operation Inventory

| Area | Endpoint / Operation | Required Station(s) | Role Scope | Denied Response when Disabled |
| --- | --- | --- | --- | --- |
| **Config Update** | `PUT /api/clinic-module-config` (& `/setup/module-config`) | Validated via `StationCapabilityPolicy::validateConfigTransition()` | `admin` | `422` (`triage_module_enabled` / `registration_module_enabled`) |
| **Registration** | `POST /api/patients` | `registration` | `admin, registration` | `422` `station_disabled` (`registration`) |
| **Registration** | `POST /api/patients/{id}/check-in` (returning triage check-in) | `registration` + `triage` | `admin, registration, developer` | `422` `station_disabled` |
| **Registration / Intake** | `POST /api/bite-intakes/{intake}/check-in` | `registration` + `triage` | `admin, registration, triage` | `422` `station_disabled` |
| **Re-exposure** | `POST /api/cases/new-exposure` | `triage` (and `registration` if called by `registration` role) | `admin, registration, triage, doctor` | `422` `station_disabled` |
| **Triage / Form 2** | `POST /api/treatment-records` | `triage` | `admin, triage, doctor` | `422` `station_disabled` (`triage`) |
| **Triage / Form 2** | `POST /api/treatment-records/patient/{id}/addendum` | `triage` | `admin, triage, doctor` | `422` `station_disabled` (`triage`) |
| **Triage / Bite Case** | `POST /api/cases`, `PUT /api/cases/{id}`, `POST /api/cases/{id}/transfer-out` | `triage` | `admin, triage` | `422` `station_disabled` (`triage`) |
| **Triage / Schedule** | `PUT /api/vaccinations/{id}`, `POST /api/vaccinations/{id}/reschedule` | `triage` | `admin, triage` | `422` `station_disabled` (`triage`) |
| **Treatment / Nurse Check-in** | `POST /api/patients/{id}/check-in-nurse` | `treatment` (and `registration` if called by `registration` role) | `admin, registration, developer, treatment, nurse` | `422` `station_disabled` |
| **Appointment Check-in** | `POST /api/appointments/{id}/check-in`, `POST /api/appointments/patient/{id}/check-in` | `triage` (if consultation) or `treatment` (if follow-up) | Authenticated clinical staff | `422` `station_disabled` |
| **Treatment / Form 3** | `POST /api/vaccination-records` | `treatment` | `admin, treatment, nurse` | `422` `station_disabled` (`treatment`) |
| **Treatment / Card** | `POST /api/tagoloan-treatment-cards` | `treatment` | `admin, treatment, nurse` | `422` `station_disabled` (`treatment`) |
| **Treatment / Dose** | `POST /api/vaccinations/{id}/administer`, `POST /api/vaccinations/{id}/missed` | `treatment` | `admin, treatment` | `422` `station_disabled` (`treatment`) |
| **Queue Entry** | `POST /api/queue` | `triage` (+ `registration` for `registration` role) if `new_case`/`consultation`/`booster`; `treatment` if `vaccination`/`follow_up`/`observation` | `admin, registration, treatment, nurse, triage, doctor, staff` | `422` `station_disabled` |
| **Queue Call / Serve** | `POST /api/queue/call-next`, `POST /api/queue/{id}/call`, `POST /api/queue/{id}/serve`, `POST /api/queue/{id}/recall` | Resolved ticket station (`triage` or `treatment`) | `admin, triage, treatment` | `422` `station_disabled` |
| **Queue Complete** | `POST /api/queue/{id}/complete` | Resolves active ticket cleanly; skips Triage → Treatment transfer (completes locally) when `treatment` is disabled | `admin, triage, treatment` | No strand (`200`) |
| **Queue Cleanup / Read** | `GET /api/queue*`, `POST /api/queue/{id}/cancel`, `DELETE /api/queue/{id}`, `POST /api/queue/{id}/restore` | **Always allowed** (preserves visibility and cleanup of existing tickets) | Authorized clinic staff | N/A |

---

## 5. Historical UI Misrepresentation Corrected

The previous `ModuleConfigPage.tsx` help text for `triage_module_enabled` stated:
> *"Triage skipped. Workflow: Registration → Treatment"*

This text promised an unapproved clinical bypass that never existed in backend safeguards. It is replaced with accurate policy text explaining that Triage can only be disabled in Follow-up Treatment Only mode (`001`, when Registration is also off and no active Triage queue entries exist), and that invalid combinations (`000`, `101`, `100`) are rejected.
