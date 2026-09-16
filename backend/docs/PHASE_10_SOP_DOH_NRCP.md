# Phase 10 Security, SOP and DOH/NRPCP Operating Standard

**Applies to:** Animal Bite Treatment Center Management System staff and patient-account workflows  
**Roles:** `developer`, `admin`, `registration`, `triage`, `treatment`  
**Data classification:** Confidential health and identity information

## Access control

- Access is least-privilege and clinic-scoped. A staff member may only access records belonging to their authenticated clinic.
- `developer` is reserved for system administration and diagnostics. It is not a clinical role.
- `admin` manages clinic setup, staff, inventory, reports and audit review.
- `registration` performs Form 1 intake, patient registration, invitations and Day 0 queue creation.
- `triage` performs doctor consultation, WHO exposure assessment and treatment planning.
- `treatment` performs follow-up check-in, vaccination administration and stock accountability.
- Deactivated staff accounts must be disabled immediately; active API tokens are revoked.

## Dual-stream workflow

### Stream A: new bite / Day 0

1. Registration verifies incident date, animal status, prior rabies immunization, PhilHealth and 4Ps details.
2. Registration creates the initial consultation queue ticket.
3. Triage completes Form 2 and assigns the clinical plan.
4. Treatment administers the prescribed Day 0 dose and records stock usage.

### Stream B: follow-up doses

1. Returning patients do not receive a new doctor queue ticket.
2. Treatment checks in the scheduled appointment.
3. Treatment records Form 3 only after the chronological dose prerequisite is satisfied.
4. Stock, batch, open-vial and discard details are recorded with the dose.

## Clinical protocol reference

The system workflow supports the configured clinic protocol and must be validated by the attending clinician and current DOH/NRPCP issuances before production use:

- Category I: no PEP when exposure is limited to touching/feeding or licks on intact skin.
- Category II: vaccine PEP for nibbling uncovered skin or minor non-bleeding scratches.
- Category III: vaccine PEP plus RIG for transdermal bites, bleeding scratches, broken-skin licks or bat exposure.
- RIG reference dosage: ERIG 40 IU/kg or HRIG 20 IU/kg, infiltrated in and around wounds, subject to current clinical guidance.
- ID two-site reference schedule: Days 0, 3 and 7.
- IM Essen reference schedule: Days 0, 3, 7, 14 and 28.
- Re-exposure after documented completed PEP: reference doses on Days 0 and 3.
- Day 3 and Day 7 administration are locked until the preceding required dose is verified.
- Reconstituted lyophilized vaccine is discarded after the configured 8-hour window; opened liquid RIG is discarded after the configured 48-hour window.

## Privacy, audit and workstation security

- Philippine Data Privacy Act (RA 10173) controls apply to patient identity and clinical data.
- Sensitive fields use Laravel encrypted casts; application keys must be protected and backed up through the approved deployment process.
- Patient access, clinical changes, print actions and exports are audit events. Audit records are append-only at the application layer and must be reviewed during the annual privacy audit.
- Clinical workstation sessions expire after 15 minutes of inactivity. Staff must lock or sign out when leaving a workstation.
- Production API traffic must use HTTPS. Never place tokens or health data in URLs, logs, screenshots or source control.

## Account lifecycle

1. Staff onboarding requires verified contact details, clinic association and approved role assignment.
2. Administrators review role assignments quarterly.
3. Resignation, transfer or suspension triggers immediate `is_active = false` and token revocation.
4. Audit logs and export activity are reviewed at least annually and after suspected unauthorized access.
