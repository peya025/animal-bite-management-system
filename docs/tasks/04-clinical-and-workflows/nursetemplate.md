# Dual-Nurse Workstation & Role-Based Queue System
## Implementation Specification (Revised)

**Supersedes**: `tasks/nursetemplate.md`  
**Status**: Ready for implementation  
**Stack**: Laravel + Sanctum (API), React/TSX (web), Flutter (mobile)  

---

## 0. Design Principle (read this first)

Three concepts are deliberately kept separate. Conflating them is the source of most of the ambiguity in earlier drafts:

| Concept | What it is | Changes how often | Stored where |
| :--- | :--- | :--- | :--- |
| **Identity** | Who is performing the action — a real, named person | Never (per employee) | `users` table |
| **Role** | What kind of work they're assigned to right now | Reassignable anytime by admin | `user_roles` join table |
| **Permission** | What they're allowed to do | Rarely (per role type) | Policy layer |

### The Core Rule
> **Role determines the default view. Permission determines the hard boundary. Identity determines the audit record.**

A nurse's role should **never** prevent them from performing a nursing action they are clinically qualified for — it only decides which queue they land on when they log in.

**Why this matters clinically**: in a 2-nurse clinic, if the follow-up nurse is absent, the intake nurse must still be able to administer Day 3 doses. A role that hard-blocks that creates a patient-safety failure, not a security win.

---

## 1. Data Model

### 1.1 `users` (existing table, minimal change)
No role column is added here. Roles live in their own join table (see 1.3).

**Columns added:**
- `signature_path` `VARCHAR NULL` — server-stored signature asset, uploaded once during staff onboarding.
- `is_active` `BOOLEAN DEFAULT true` — for offboarding staff without deleting audit history.
- `professional_license_no` `VARCHAR NULL` — for RN/clinician credentialing on printed records.

> **Rule**: Do not delete user rows. Every `administered_by` FK depends on them existing permanently. Deactivate via `is_active` instead.

### 1.2 `roles` (new, seeded)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | PK | Auto-incrementing identifier |
| `slug` | `VARCHAR UNIQUE` | `intake_nurse`, `follow_up_nurse`, `clinic_admin`, `doctor`, `receptionist` |
| `display_name` | `VARCHAR` | Shown in admin UI (e.g. "Intake Nurse") |
| `default_route` | `VARCHAR` | Where this role lands after login, e.g. `/queue` or `/nurse/patients` |

*There is deliberately no `all_nursing` role.* A nurse who does both jobs is given both `intake_nurse` and `follow_up_nurse` rows in `user_roles`. This removes the special case and makes the 3–5 nurse scenario work with no additional values.

### 1.3 `user_roles` (new join table)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `user_id` | `FK → users` | Assigned staff member |
| `role_id` | `FK → roles` | Role assigned |
| `assigned_by` | `FK → users NULL` | Who granted this role — auditable |
| `assigned_at` | `DATETIME` | Timestamp of assignment |

- Composite unique on `(user_id, role_id)`.

**Scenario Coverage**:
- **Two-nurse clinic**: Nurse A $\rightarrow$ `intake_nurse`. Nurse B $\rightarrow$ `follow_up_nurse`.
- **Solo-nurse clinic**: Nurse A $\rightarrow$ both rows. Sees a station switcher.
- **Multi-nurse clinic**: assign per shift roster; no schema change needed.
- **Other clinics adopting the system**: seed the same roles, assign differently.

### 1.4 `stations` (new)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | PK | Identifier |
| `clinic_id` | `FK → clinics` | Multi-clinic support |
| `name` | `VARCHAR` | "Station 1", "Station 2", "Triage Room" |
| `is_active` | `BOOLEAN` | Active status |

Station is not an identity. It is an optional label a nurse selects at login ("I'm working Station 2 today") stored on the session, purely to make conflict messages and floor coordination clearer. It never substitutes for `administered_by`.

### 1.5 `treatment_records` (amendments)
- `administered_by` `FK → users`, `NOT NULL`, immutable after insert.
- `voided_at` `DATETIME NULL`, `voided_by` `FK → users NULL`, `void_reason` `TEXT NULL`.
- Unique live dose constraint: In MySQL, enforced via DB transaction with a `SELECT ... FOR UPDATE` pre-check inside `VaccinationRecordController` checking `WHERE voided_at IS NULL AND bite_incident_id = ? AND dose_number = ?`.
- **Remove name-in-remarks pattern**: Drop `'remarks' => "Given by: {$nurseName} | ..."`. The name is already reachable through the `administered_by` relationship. Resolve the display name at read time.

---

## 2. Identity & Anti-Spoofing

### 2.1 Server-side Stamping
```php
$userId = auth('sanctum')->id();

$record = TreatmentRecord::create([
    // ... clinical fields from validated request ...
    'administered_by' => $userId,          // never from request body
    'signature_path'  => auth('sanctum')->user()->signature_path,
]);
```

### 2.2 No Client-Supplied Signature Fallback
A signature is an identity artifact; it must originate server-side.
```php
if (! auth('sanctum')->user()->signature_path) {
    abort(422, 'Your signature is not yet on file. Ask a clinic admin to complete your staff profile before administering doses.');
}
```
Signatures are uploaded once, by an admin, during staff onboarding — never submitted per-request.

### 2.3 Model-Layer Immutability Enforcement
```php
// TreatmentRecord model
protected static function booted()
{
    static::updating(function ($record) {
        if ($record->isDirty('administered_by')) {
            throw new \DomainException('administered_by is immutable on treatment records.');
        }
    });
}
```

### 2.4 Correction Workflow
Corrections are **void + re-record**, never edit:
1. Nurse/admin voids the record with a required `void_reason`.
2. A new record is created with correct data, stamped with the current user.
3. Both rows persist in the database. Printed records and the mobile passport show only live records (`voided_at IS NULL`); the audit view shows both.

---

## 3. Role-Based Views (Not Role-Based Locks)

### 3.1 Login Routing
On successful authentication, resolve landing route:
- User has exactly one role $\rightarrow$ redirect to that role's `default_route`.
- User has multiple roles $\rightarrow$ redirect to their last-used station (stored per-user preference), else the first role's default route.
- User has no roles $\rightarrow$ land on a neutral dashboard with a "No duty assigned, contact your admin" notice (fail visible, not silently blank).

### 3.2 Station Switcher (Multi-Role Users)
Visible only when `user_roles` count > 1:
```
[ Station: Intake (Day 0) ▾ ]
    • Intake (Day 0 / New patients)
    • Follow-ups & Boosters
    • Combined view
```
Switching changes the view only. It never changes `administered_by`, which always resolves from the session identity.

### 3.3 Permission Boundary (Deliberately Looser than the View)
| Action | Who can perform |
| :--- | :--- |
| Administer any dose (Day 0, 3, 7, booster) | Any user holding any nursing role |
| Void a treatment record | Any nursing role (reason required) |
| Assign/revoke roles | `clinic_admin` only |
| View staff activity / audit log | `clinic_admin` only |
| Upload staff signatures | `clinic_admin` only |

**Cross-Coverage Rationale**: Cross-coverage is normal clinical reality. When an intake nurse administers a follow-up dose, the correct system response is to record accurately who did it, not to refuse. Accountability comes from the audit trail, not from blocking the action.
- Soft guardrail: Tag the audit entry `cross_role = true` so supervisors can review patterns without work being obstructed.

---

## 4. Concurrency Control

### 4.1 Preventing Two Nurses on One Patient
Wrap ticket claiming in a transaction with row-level locking:
```php
DB::transaction(function () use ($queueId) {
    $queue = Queue::where('queue_id', $queueId)->lockForUpdate()->first();

    if ($queue->status === 'serving' && $queue->served_by !== auth('sanctum')->id()) {
        abort(409, "Patient is currently being attended by {$queue->servedBy->name}.");
    }

    $queue->update([
        'status'             => 'serving',
        'served_by'          => auth('sanctum')->id(),
        'serving_started_at' => now(),
        'station_id'         => session('active_station_id'),
    ]);
});
```

### 4.2 Stale Lock Recovery
- `serving_started_at` timestamp on `queues`.
- Stale threshold: 30 minutes.
- Past the threshold, another nurse may take over the ticket; the takeover is logged to `queue_history` as `transferred` with both user IDs.

### 4.3 Frontend Handling
- On HTTP 409: Display amber non-blocking toast, auto-refresh the queue list, do not navigate away or lose entered form state.

---

## 5. Audit & Monitoring

### 5.1 Established Audit Logging
Retain `AuditMiddleware` on all mutations, `queue_history` transitions, and the `/staff-activity` filterable stream.

### 5.2 Dynamic After-Hours Detection via `ClinicScheduleService`
Instead of a hardcoded 8:00 AM – 5:00 PM window, query `ClinicScheduleService` for that clinic's configured operating hours on that date (including schedule exceptions) and flag actions falling outside them as informational review items.

### 5.3 Audit Log Data Governance & Redaction
- Redact sensitive personal fields from stored request payloads (patient full name, contact numbers, street addresses) in `AuditMiddleware`. Store record IDs and modified keys.
- Restrict read access to `clinic_admin` only, enforced server-side.
- Scope audit logs strictly by clinic ID.

---

## 6. Migration & Rollout Plan

### 6.1 Ordered Migration Steps
1. Create `roles` table, seed the five role rows (`intake_nurse`, `follow_up_nurse`, `clinic_admin`, `doctor`, `receptionist`).
2. Create `user_roles` join table.
3. **Backfill**: assign every existing nursing user both `intake_nurse` and `follow_up_nurse` (preserves current behavior — nobody loses access on deploy day); admins can narrow assignments afterward.
4. Add `signature_path`, `is_active`, `professional_license_no` to `users`.
5. Add `voided_at`, `voided_by`, `void_reason` to `treatment_records`.
6. Add `served_by`, `serving_started_at`, `station_id` to `queues`.
7. Create `stations` table.
8. Enforce live-dose uniqueness in `VaccinationRecordController` using transactional lock check.
9. Deploy model-layer immutability guard on `TreatmentRecord`.

---

## 7. Concrete UI & Screen Enhancements

### 7.1 Replace Shared Account Identity Everywhere
- **Sidebar & Header**: Replace "Treatment Nurse / Treatment Staff" with authenticated user's real name and role badge (e.g. `Maria Santos, RN / Intake Station`).
- Server-side stamping on all dose, triage, and queue actions.

### 7.2 `/queue` — Intake Station (`intake_nurse` default route)
- Add an **"Attended by"** column to the Treatment Queue table showing which nurse claimed each ticket.
- Change the **"Serving"** KPI card from a bare count to naming the serving nurse(s) (e.g. `Serving 1 — Maria S.`).
- Default Category / Visit type filters to intake-type visits (new patients, walk-ins, Day 0, awaiting triage) for users with `intake_nurse` role (as pre-applied default, changeable by user).

### 7.3 `/nurse/patients` — Follow-up Station (`follow_up_nurse` default route)
- Default tab: **"Needs Action"** (combined `due_today` + `overdue` + today's confirmed online bookings, sorted by urgency: overdue first by days past schedule).
- Filter sub-tabs: `Due Today`, `Online Bookings`, `Upcoming`, `Overdue`, `All Patients`.
- Exclude pre-triage / "Awaiting Triage (Form 2)" patients from follow-up default views (or show in "All Patients" with clear `Intake — Nurse 1` badge).
- Fix action button on "Completed" series: offer **"Start New Episode (Re-Exposure)"** or view-only mode rather than invalid "Record Dose (Form 3)".

### 7.4 Check-In Routing Rule
- When a follow-up patient is checked in from Patients List, generate a queue ticket pre-assigned to the follow-up station (`station = follow_up`), appearing directly in the follow-up nurse's queue.
- Visit type routing:
  - Initial / triage visits $\rightarrow$ Intake station queue.
  - Day 3 / Day 7 / Booster / Re-exposure follow-ups $\rightarrow$ Follow-up station queue.
- All tickets remain claimable by any nurse for seamless cross-coverage.

### 7.5 Station Switcher
- For users holding multiple roles (solo nurses or cross-coverage staff), render compact top-bar switcher: `[ Station: Intake ▾ ]` / `[ Station: Follow-ups ▾ ]` / `[ Combined ]`.
- Adjusts view filters and defaults without altering server-side identity stamping.
- Hidden for single-role nurses.
