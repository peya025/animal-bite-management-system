# Queue System — Triage / Doctor (To Do)

## Pending Features

### 1. Queue Cannot Simply Be Stopped
- The queue stop action needs a proper flow — a queue in progress should not be abruptly halted without handling active/waiting patients first.
- Needs a confirmation step and a resolution path (e.g., transfer remaining patients or mark as deferred).

### 2. Segregate
- Add ability to separate/segregate patients within the queue (e.g., by priority, by module assignment, or by bite category).
- Could be a filter or a drag-to-bucket UI on the queue board.

### 3. Trash Bin
- Add a soft-delete / trash bin for removed queue entries so they can be recovered if removed by mistake.
- Entries in the trash should be recoverable within the same day's session.

### 4. Second Chance for No-Response Patients
- When a patient is called and does not respond, instead of removing them from the queue entirely, give them a "Second Chance" — re-queue them at a lower priority (e.g., move to end of queue or mark as "Re-called").
- Show a visual indicator on the queue board that the patient was already called once.
- After a second no-response, they can then be marked as Absent/Removed.
