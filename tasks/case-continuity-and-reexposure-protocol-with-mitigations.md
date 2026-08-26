# 📋 Implementation Plan: Case Continuity & Lifetime Re-Exposure / Booster Protocol
### (Revised with Risk Mitigations)

This document outlines the clinical architecture, data models, UI wireframes, and HCI affordance design for:
1. **Case Continuity & Late Check-in for Missed/Overdue Intakes**
2. **Lifetime Re-Exposure & Booster Protocol (1, 2, 5+ Years Later)**

Each section below includes the original design plus **⚠️ Mitigation** notes addressing clinical safety, data integrity, and HCI risk — added after design review.

---

## 🧭 Executive Summary & Clinical Background

### DOH AO 2018-0013 / WHO Rabies Guidelines
* **First-Time Exposure (Naive Patient)**: Requires full PEP (Day 0, Day 3, Day 7, Day 28) + RIG for Category III.
* **Re-Exposure (Previously Vaccinated Patient)**:
  * **Immunological Memory**: Rabies memory B-cells and neutralizing antibodies persist for extended periods after a completed series.
  * **RIG**: **Not indicated** for previously vaccinated patients who completed a prior full course — confirmed by DOH AO 164 guidance and current ABTC protocol references.
  * **Booster Regimen**: Requires only **2 clinic visits (Day 0 and Day 3)**, when eligibility criteria are met.
* **Medical Record Continuity**: A single patient must have **one unified medical identifier (`patient_id`)** with multiple sequential **Bite Incident Episodes (`bite_id`)** across their lifetime.

> ⚠️ **Mitigation — Verify the interval rule before building it.** The original plan states the booster protocol applies for "Any Interval ≥ 3 months" since last complete PEP. This specific cutoff could not be independently confirmed against current DOH circular text during review. **Before this is coded as a hard rule, confirm the exact interval (if any) with the current DOH AO or with clinical staff.** A wrong interval baked into decision-support software is worse than no interval, because staff will trust the system default without double-checking. If no clear cutoff exists in current guidance, don't invent one — default to requiring explicit clinician judgment instead of a system-computed cutoff.

---

## 🏗️ Part 1: Unified High-Efficiency Case Continuity (Missed / Late Check-In)

### Architecture: The "Zero-Friction" 3-Layer Workflow

```
[ Reception / Front Desk ] ──► 1-Click "Check In (Late Walk-In)" (< 1 sec)
                                              │
                                              ▼
[ Queue System ] ─────────────► Issues ticket for Today (Status: Waiting)
                                              │
                                              ▼
[ Doctor Station (Form 2) ] ──► Non-blocking Alert: "Booked 3d ago — Review wound changes"
                                              │
                                              ▼
[ Background Maintenance ] ──► Auto-archives unfulfilled bookings > 7 days (Reactivable in 1-click)
```

> ⚠️ **Mitigation — Triage branch for infection signs.** The doctor-station wound reassessment includes a checkbox for "signs of secondary infection / pus," but the original plan doesn't specify what happens next if it's checked. **Add an explicit escalation path**: if infection signs are present, or if the case is a late-arriving Category III bite, reroute the patient to a priority/urgent queue rather than continuing through the standard late-arrival path at normal pace. Don't let "late check-in" and "infected wound" collapse into the same low-urgency lane.

> ⚠️ **Mitigation — Archive/reactivation date math.** When an auto-archived booking (>7 days unfulfilled) is reactivated, **recalculate Day 0 from the actual date of first dose administration**, not the original booking date. Otherwise the Day 3/7/28 schedule silently drifts and appointment reminders will be wrong.

### UI Wireframe: Reception & Patient Management Check-In
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PATIENT #  │ NAME & SOURCE       │ STATUS / SCHEDULE                │ ACTIONS                     │
├────────────┼─────────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ #104       │ Dela Cruz, Juan     │ 🕒 Queue #12 (Waiting · 3d Late)  │ [ View ]                    │
│ #105       │ Garcia, Hazel       │ 🔴 Missed Booking (3d ago)        │ [ ⚡ Check In (Late) ] [ View]│
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### UI Wireframe: Doctor Station (Form 2 Review of Late Arrival)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ℹ️ Late Walk-in Notice: Patient booked online 3 days ago (Aug 23, 2026).                          │
│ Initial Bite Intake: Left Hand · Category II · Washed with soap: Yes                              │
│ ───────────────────────────────────────────────────────────────────────────────────────────────── │
│ Current Wound Assessment (Today):                                                                 │
│ [x] Wound clean / healing normally     [ ] Signs of secondary infection / pus                     │
│ 🔴 If infection signs checked → route to Priority Queue (auto-flagged, non-blocking alert to MD)  │
│ Doctor Notes: [ Patient arrived 3 days post-bite. Wound cleaned. Proceeding with Day 0 PEP.   ]   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💉 Part 2: Lifetime Multi-Episode Re-Exposure & Booster Protocol

### 1. Database Schema Evolution

```
                    ┌──────────────────────────────────────────────┐
                    │               patients Table                 │
                    │  • patient_id (PK)                           │
                    │  • patient_number, name, dob, gender, phone  │
                    └──────────────────────┬───────────────────────┘
                                           │ 1
                                           │
                                           │ N
                    ┌──────────────────────▼───────────────────────┐
                    │            bite_incidents Table              │
                    │  • bite_id (PK), patient_id (FK)             │
                    │  • episode_number (1, 2, 3...)               │
                    │  • episode_type ('primary' | 're_exposure')  │
                    │  • bite_date, animal_type, exposure_category │
                    │  • is_previously_vaccinated (COMPUTED*)      │
                    │  • verification_source (ENUM**)              │
                    │  • external_vaccine_proof_path (VARCHAR NULL)│
                    │  • external_proof_reviewed_by (FK NULL)***   │
                    │  • external_proof_reviewed_at (DATETIME NULL)│
                    │  • status ('in_progress' | 'completed')      │
                    │  • rig_decision_reason (TEXT NULL)****       │
                    └──────────────────────┬───────────────────────┘
                                           │ 1
                                           │
                                           │ N
                    ┌──────────────────────▼───────────────────────┐
                    │          vaccination_records Table           │
                    │  • record_id (PK), bite_id (FK), patient_id  │
                    │  • dose_number (0, 3, 7, 28, 90, 365)        │
                    │  • treatment_date, vaccine_brand, lot_number │
                    │  • rig_administered (BOOLEAN)                │
                    └──────────────────────────────────────────────┘
```

**Schema changes from original plan, with rationale:**

| Field | Change | Why |
|---|---|---|
| `is_previously_vaccinated` | Changed from manually-set BOOLEAN to **computed** | Should be derived from whether a prior `completed` episode exists for this `patient_id` — manual toggles drift from reality over time and are a single point of clinician error. |
| `verification_source` (**new**) | ENUM: `system_record` \| `external_certificate_reviewed` \| `patient_self_report_unverified` | The original plan treated all "previously vaccinated" claims as equally trustworthy. These three sources carry very different confidence levels and should drive different UI defaults (see Form 2 mitigation below). |
| `external_proof_reviewed_by` / `external_proof_reviewed_at` (**new**) | Adds a review step to uploaded certificates | An uploaded file shouldn't be treated as verified just because it exists — a staff member should explicitly confirm they reviewed it before it counts as `external_certificate_reviewed`. |
| `rig_decision_reason` (**new**) | Free-text justification field | Captures the clinician's reasoning whenever RIG is withheld, for audit/QA and medico-legal traceability. |

> ⚠️ **Mitigation — Migration plan for existing data.** Adding these columns means every existing `bite_incidents` row needs backfilling: `episode_number = 1`, `episode_type = 'primary'`, `verification_source = NULL` (or a sensible legacy default). This should be an explicit, tested migration step in Phase 3 — not an implicit assumption.

---

### 2. UI Wireframe: Reception — Starting a New Episode

When searching a returning patient in **Patient Management**:
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PATIENT DETAILS: Juan Dela Cruz (#104)                                                            │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 📜 Medical History:                                                                               │
│ • Episode #1 (Aug 15, 2024): Dog bite · Category III · ✅ Completed 4 doses PEP (PVRV)            │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ + New Bite Incident (Re-Exposure / Booster) ]   [ Print Lifetime Summary ]                      │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Mitigation — Surface completion status prominently, not just existence of a record.** The "✅ Completed" tag matters more than the mere presence of a prior episode. If Episode #1 status were `in_progress` (abandoned series), this should render as a clear ⚠️ warning tag ("Prior series incomplete — booster protocol may not apply"), since an incomplete series doesn't confer the immunological memory the booster protocol assumes.

---

### 3. UI Wireframe: Doctor Station (Form 2 Smart Decision Support)

**Case A — System-verified history (highest confidence):**
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FORM 2: PHYSICAL EXAMINATION & CATEGORY ASSESSMENT                                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚡ IMMUNIZATION HISTORY DETECTED (System Record — Verified):                                      │
│ Patient completed Rabies PEP in Aug 2024 (Episode #1, Status: Completed, 4/4 doses).               │
│                                                                                                     │
│ Exposure Protocol:                                                                                │
│ ( ) Primary PEP (First time / Naive — 4 Doses + RIG)                                              │
│ ( ) Re-Exposure Booster (Previously Vaccinated — Day 0 & Day 3 ONLY)                               │
│      ↳ No option is pre-selected. Physician must actively choose.                                  │
│                                                                                                     │
│ 🛡️ RIG Administration:                                                                            │
│ [ ] RIG NOT INDICATED — confirm after reviewing history above                                      │
│      ↳ Checkbox starts UNCHECKED. Requires active confirmation, not a pre-ticked default.          │
│      ↳ If checked: [ Reason / clinical note (required) ______________________ ]                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Case B — Self-reported or unreviewed external claim (lower confidence):**
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ PATIENT-REPORTED HISTORY (Not System-Verified):                                                 │
│ Patient states prior vaccination elsewhere. No matching system record found.                       │
│                                                                                                     │
│ Exposure Protocol:                                                                                 │
│ (●) Primary PEP (Default — recommended until verified) [DEFAULT]                                   │
│ ( ) Re-Exposure Booster — requires: [ Upload Certificate / Card ] AND staff review                 │
│                                                                                                     │
│ ℹ️ Per WHO guidance: when prior vaccination cannot be verified, treat as unvaccinated unless        │
│    documentation is reviewed and confirmed by staff.                                               │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Mitigation — This is the most important change in the whole document.** The original design showed "Re-Exposure Booster [RECOMMENDED]" pre-selected and "RIG NOT INDICATED" pre-checked, regardless of how the prior-vaccination claim was sourced. That creates real automation-bias risk on the single highest-consequence decision in the flow (withholding RIG). The revised design:
> - Never pre-selects the booster protocol or pre-checks "RIG not indicated" — the clinician must actively choose.
> - Shows a materially different, more cautious UI when the claim is self-reported vs. system-verified.
> - Requires a written reason whenever RIG is withheld, stored in `rig_decision_reason` for audit purposes.
> - Defaults to the conservative option (Primary PEP) when verification is weak, consistent with the general clinical principle of treating unverifiable history as unvaccinated.

---

### 4. UI Wireframe: Nurse Treatment (Form 3 Automatic Booster Schedule)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FORM 3: VACCINE ADMINISTRATION (EPISODE #2: RE-EXPOSURE BOOSTER)                                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Regimen: 2-Dose Booster Protocol                                                                  │
│ Protocol selected by: Dr. [Name] · [Date/time] · Basis: System-verified prior episode              │
│                                                                                                     │
│ [✓] DAY 0 (Today - Aug 26, 2026) • Administered (Speeda · Lot #SP-9921)                          │
│ [ ] DAY 3 (Scheduled: Aug 29, 2026) • Final Booster Dose                                          │
│ ───────────────────────────────────────────────────────────────────────────────────────────────── │
│ ℹ️ Doses 7 and 28 are not required for this re-exposure episode.                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Mitigation — Audit trail visible at point of care.** Added a line showing who made the protocol decision and on what basis, so the nurse administering doses has visibility into the clinical reasoning, and so there's a durable record for QA/medico-legal purposes. Also allows an escalation path: if the nurse notices something inconsistent (e.g., wound looks worse than a booster-only case would suggest), there's a clear record of who to flag it back to.

---

### 5. UI Wireframe: Mobile Digital Vaccination Passport

In the patient's mobile app under **Vaccination Card**:
```
┌──────────────────────────────────────────────────────────────────────┐
│                  ANIMAL BITE DIGITAL PASSPORT                        │
│                  Patient: Juan Dela Cruz (PT-104)                    │
├──────────────────────────────────────────────────────────────────────┤
│  [ Episode 2: Active (2026) ]  │  [ Episode 1: Completed (2024) ]    │
├──────────────────────────────────────────────────────────────────────┤
│  EPISODE #2 (Re-Exposure Booster)                                    │
│  Exposure: Cat Scratch (Category II) • Aug 26, 2026                  │
│                                                                      │
│  ● Day 0 (Aug 26, 2026) ─── COMPLETED                                │
│    Brand: Speeda (Lot #SP-9921) • Nurse: M. Santos, RN               │
│                                                                      │
│  ○ Day 3 (Aug 29, 2026) ─── UPCOMING (In 3 days)                     │
│    Location: RHU Main Animal Bite Center                             │
│                                                                      │
│  [ 📱 Show QR Verification Code ]                                    │
└──────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Mitigation — QR code must not embed PHI directly.** "Update QR code verification payload with active episode context" (from the original roadmap) should mean the QR encodes an **opaque token/reference ID only**, which requires an authenticated server-side lookup to resolve into actual medical data. Anyone who scans a QR code with a phone camera should not be able to read exposure category, bite history, or treatment details directly from the code's contents.

---

## 🛠️ Step-by-Step Implementation Roadmap

### Phase 1: Frontend UI & Filter Polish (Completed)
- [x] Fix JavaScript falsy Day 0 dose bug.
- [x] Complete past online booking appointments upon Day 0 submission.
- [x] Integrate Hugeicons across Patient Management and Nurse Treatment lists.
- [x] Implement Segmented Live-Count Category Tabs (Option 1).
- [x] Add Late Arrival In-Queue status tags (`Queue #... (Waiting · 2d Late)`).

### Phase 2: Case Continuity & Late Check-In Engine (Next Up)
1. **Backend**:
   - Add `is_late_arrival` and `booked_date` metadata to `queues` table.
   - Add 7-day auto-archive job for abandoned bookings with `status = 'missed'`.
   - **[Mitigation]** Ensure reactivation logic recalculates Day 0 from actual first-dose date, not original booking date.
2. **Frontend**:
   - Refine `Check In` button to pass late arrival tags.
   - In Doctor Form 2, render pre-filled online bite intake card with 1-click wound verification.
   - **[Mitigation]** Add infection-signs escalation branch that routes to a priority queue.

### Phase 3: Lifetime Multi-Episode & Re-Exposure Protocol (Upcoming)
1. **Database & API**:
   - Add `episode_number`, `episode_type` to `bite_incidents`.
   - **[Mitigation]** Add `verification_source` ENUM, `external_proof_reviewed_by`/`_at`, and `rig_decision_reason` fields (replacing the flat `is_previously_vaccinated` boolean with a computed field).
   - **[Mitigation]** Write and test a backfill migration for existing `bite_incidents` rows.
   - Update `VaccinationRecordController.php` to calculate booster appointments (Day 0 & Day 3 only) when `episode_type === 're_exposure'` **and** `verification_source` meets the confidence bar defined by clinical staff.
   - **[Mitigation]** Confirm the actual DOH-specified interval (if any) for booster eligibility with current circular text or clinical staff before hard-coding a cutoff.
2. **Web Doctor & Nurse UI**:
   - Add "New Bite Episode" modal on Patient Management, surfacing prior episode completion status prominently.
   - Add DOH re-exposure decision helper in Form 2.
   - **[Mitigation]** Remove pre-selected defaults on protocol choice and RIG checkbox; require active confirmation and a written reason when RIG is withheld.
   - **[Mitigation]** Differentiate UI treatment for system-verified vs. self-reported vs. externally-certified history.
   - Update Form 3 schedule matrix to dynamically render 2 doses for boosters, showing who made the protocol decision and why.
3. **Mobile App**:
   - Add multi-episode tab switcher in `mobile_vaccination_card.dart`.
   - **[Mitigation]** Update QR code verification payload to use an opaque token requiring authenticated server-side lookup — never embed medical/episode data directly in the QR contents.

---

## ✅ Pre-Launch Checklist (New)

Before this ships to production, confirm:

- [ ] The booster-eligibility interval (if any) is verified against current DOH AO text or clinical staff sign-off — not assumed from this document.
- [ ] No protocol-selection radio button or RIG checkbox is pre-selected/pre-checked by default anywhere in Form 2.
- [ ] `verification_source` is captured and visibly differentiated in the UI for every re-exposure episode.
- [ ] External certificate uploads require an explicit staff review step before being treated as verified.
- [ ] `rig_decision_reason` is required (not optional) whenever RIG is withheld.
- [ ] Infection-signs checkbox on late check-in triggers a real queue-priority change, not just a note.
- [ ] Archive/reactivation logic has a test case confirming Day 0 recalculates correctly.
- [ ] QR code payload has been reviewed for PHI exposure — confirmed to carry only an opaque token.
- [ ] A migration script exists and has been tested for backfilling `episode_number`/`episode_type` on existing records.
- [ ] Audit logging captures who made each primary-vs-booster decision, when, and the stated basis.
