# 📋 Implementation Plan: Case Continuity & Lifetime Re-Exposure / Booster Protocol

This document outlines the clinical architecture, data models, UI wireframes, and HCI affordance design for:
1. **Case Continuity & Late Check-in for Missed/Overdue Intakes** (Ultra-efficient 1-click reception check-in + doctor wound verification + 7-day auto-archive).
2. **Lifetime Re-Exposure & Booster Protocol (1, 2, 5+ Years Later)** (Multi-episode patient records, automatic DOH/WHO 2-dose booster regimen without RIG, external vaccine certificate support, and multi-episode mobile vaccination passport).

---

## 🧭 Executive Summary & Clinical Background

### DOH AO 2018-0013 / WHO Rabies Guidelines
* **First-Time Exposure (Naive Patient)**: Requires full PEP (Day 0, Day 3, Day 7, Day 28) + RIG for Category III.
* **Re-Exposure (Previously Vaccinated Patient, Any Interval $\ge 3$ months)**:
  * **Immunological Memory**: Rabies memory B-cells and neutralizing antibodies persist for decades.
  * **RIG**: **NEVER indicated** for previously vaccinated patients (even for severe Category III exposures).
  * **Booster Regimen**: Requires only **2 clinic visits (Day 0 and Day 3)**.
* **Medical Record Continuity**: A single patient must have **one unified medical identifier (`patient_id`)** with multiple sequential **Bite Incident Episodes (`bite_id`)** across their lifetime.

---

## 🏗️ Part 1: Unified High-Efficiency Case Continuity (Missed / Late Check-In)

### Architecture: The "Zero-Friction" 3-Layer Workflow
Instead of choosing between speed and clinical precision, we combine Solutions 1A, 1B, and 1C into a progressive flow:

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
                    │  • is_previously_vaccinated (BOOLEAN)        │
                    │  • external_vaccine_proof_path (VARCHAR NULL)│
                    │  • status ('in_progress' | 'completed')      │
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

---

### 2. UI Wireframe: Reception — Starting a New Episode
When searching a returning patient in **Patient Management**:
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PATIENT DETAILS: Juan Dela Cruz (#104)                                                            │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 📜 Medical History:                                                                               │
│ • Episode #1 (Aug 15, 2024): Dog bite · Category III · Completed 4 doses PEP (PVRV)              │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ + New Bite Incident (Re-Exposure / Booster) ]   [ Print Lifetime Summary ]                      │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. UI Wireframe: Doctor Station (Form 2 Smart Decision Support)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FORM 2: PHYSICAL EXAMINATION & CATEGORY ASSESSMENT                                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚡ IMMUNIZATION HISTORY DETECTED:                                                                 │
│ Patient completed Rabies PEP in Aug 2024 (2 years ago).                                           │
│                                                                                                   │
│ Exposure Protocol:                                                                                │
│ ( ) Primary PEP (First time / Naive — 4 Doses + RIG)                                              │
│ (●) Re-Exposure Booster (Previously Vaccinated — Day 0 & Day 3 ONLY) [RECOMMENDED]               │
│ ( ) External Proof (Patient vaccinated at another facility — [ Upload Certificate / Card ])       │
│                                                                                                   │
│ 🛡️ RIG Administration:                                                                            │
│ [X] RIG NOT INDICATED (Patient has documented prior immunization per DOH AO 2018-0013)            │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. UI Wireframe: Nurse Treatment (Form 3 Automatic Booster Schedule)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FORM 3: VACCINE ADMINISTRATION (EPISODE #2: RE-EXPOSURE BOOSTER)                                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Regimen: 2-Dose Booster Protocol                                                                  │
│                                                                                                   │
│ [✓] DAY 0 (Today - Aug 26, 2026) • Administered (Speeda · Lot #SP-9921)                          │
│ [ ] DAY 3 (Scheduled: Aug 29, 2026) • Final Booster Dose                                          │
│ ───────────────────────────────────────────────────────────────────────────────────────────────── │
│ ℹ️ Doses 7 and 28 are not required for this re-exposure episode.                                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

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
2. **Frontend**:
   - Refine `Check In` button to pass late arrival tags.
   - In Doctor Form 2, render pre-filled online bite intake card with 1-click wound verification.

### Phase 3: Lifetime Multi-Episode & Re-Exposure Protocol (Upcoming)
1. **Database & API**:
   - Add `episode_number`, `episode_type`, and `is_previously_vaccinated` to `bite_incidents`.
   - Update `VaccinationRecordController.php` to calculate booster appointments (Day 0 & Day 3 only) when `episode_type === 're_exposure'`.
2. **Web Doctor & Nurse UI**:
   - Add "New Bite Episode" modal on Patient Management.
   - Add DOH re-exposure decision helper in Form 2.
   - Update Form 3 schedule matrix to dynamically render 2 doses for boosters.
3. **Mobile App**:
   - Add multi-episode tab switcher in `mobile_vaccination_card.dart`.
   - Update QR code verification payload with active episode context.
