# Community Bite Awareness — Operational Runbook & Rollback Guide

Updated: 2026-11-27 (Asia/Manila).

## 1. Feature Flags (Fail-Closed Defaults)

Both flags default to `false` in `backend/config/community_awareness.php`:

| Environment Variable | Default | Effect when `false` |
| --- | --- | --- |
| `COMMUNITY_AWARENESS_PUBLICATION_ENABLED` | `false` | Blocks `publish` and `schedule` actions (`409`); public overview and `/api/public/community-advisories` return empty advisories (`[]`); public detail returns `410` unavailable for previously published items. |
| `COMMUNITY_AWARENESS_PUSH_ENABLED` | `false` | Prevents outbox enqueue on publish and cancels any queued/deferred community push at execution time (`feature_disabled`). Personal appointment and PEP dose reminders are **unaffected**. |

Additional configurable defaults (require clinic governance review before changing):
- `COMMUNITY_AWARENESS_PUSH_DAILY_CAP=1` (max routine community pushes per account in 24 hours)
- `COMMUNITY_AWARENESS_PUSH_WEEKLY_CAP=2` (max routine community pushes per account in 7 days)
- `COMMUNITY_AWARENESS_QUIET_START=20` / `COMMUNITY_AWARENESS_QUIET_END=8` (`20:00–08:00` Asia/Manila)
- `FCM_ALLOWED_PATIENT_ACCOUNT_IDS` (keep restricted during pilot; never clear without explicit release sign-off)

## 2. Scheduled Jobs & Health Check

- `surveillance:evaluate` — runs daily at `07:20` Asia/Manila (`withoutOverlapping(30)`, `onOneServer()`).
- `advisories:publish-scheduled` — runs every 5 minutes Asia/Manila (`withoutOverlapping(10)`, `onOneServer()`).
- Operational health & reconciliation check (privacy-safe JSON, zero PII, creates no alerts):
  ```powershell
  cd backend
  php artisan advisories:health-check
  ```
  - Exit code `0`: all published advisories pass approval-hash and independent-reviewer reconciliation.
  - Exit code `1`: `integrity_mismatches > 0` — immediately run the rollback procedure below and investigate `community_advisory_events`.
  - If `surveillance.stale === true`: check scheduler/cron health and lock driver; staff UI explicitly displays a stale warning and never substitutes an all-clear.

## 3. Emergency Withdrawal & Non-Destructive Rollback

### Immediate single-advisory withdrawal
1. In **Bite Cases Summary → Surveillance Insights → Surveillance advisory review queue**, click **Withdraw** on the affected advisory and record an internal reason.
2. Effect:
   - Advisory transitions to `withdrawn` with an immutable event snapshot.
   - Public feeds immediately stop serving it (`Cache-Control: no-store`); `/api/public/community-advisories/{id}` returns `410 Gone` neutral tombstone.
   - All `queued` and `deferred` rows in `community_advisory_deliveries` are immediately marked `cancelled` (`advisory_withdrawn`).
   - *Limitation:* Already-delivered OS push banners cannot be recalled server-side; generic lock-screen text minimizes residual risk, and tapping the notification revalidates live and shows the `410` neutral notice.

### Full feature rollback (non-destructive)
1. Set `COMMUNITY_AWARENESS_PUSH_ENABLED=false` and `COMMUNITY_AWARENESS_PUBLICATION_ENABLED=false` in `.env` and clear config cache (`php artisan config:clear`).
2. Verify with `php artisan advisories:health-check` that both flags report `false`.
3. **Never** revert `PublicCommunityOverviewController` to call `detectBarangaySurges()`, and **never** drop `community_advisory_events` or `surveillance_signal_events` audit tables.
4. Confirm personal clinical reminders (`SendFcmPushNotification` for appointments/PEP) remain operational.

## 4. Retention & Ownership Checklist (Complete Before Pilot)

- [ ] **Clinical / Public-Health Reviewer:** Named owner for wording, official-source verification, and threshold calibration.
- [ ] **Clinic Admin / Publisher:** Named owner for scheduling, publishing, and withdrawal drills.
- [ ] **Privacy / Governance Owner:** Confirm retention period for `community_advisory_deliveries` (identifiable delivery ledger) vs de-identified audit history.
- [ ] **Operations Owner:** Confirm production scheduler timezone (`Asia/Manila`), cache/lock driver, FCM worker queue (`fcm`), and escalation contacts.
