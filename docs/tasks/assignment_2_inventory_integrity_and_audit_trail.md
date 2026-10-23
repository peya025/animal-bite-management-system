# Assignment 2 — Vaccine Inventory Integrity & Audit Trail

**System:** Animal Bite Management System  
**Branch:** `security-fix/inventory-integrity`  
**Audit source:** `tasks/pre_deployment_system_change_audit.md`  
**Priority items:** P0-6 · P0-7 (+ supporting P1-5, P1-6)  
**Estimated complexity:** High — requires database transactions, row locking, audit log integration, and MySQL-level testing  

---

## Objective

Make vaccine inventory operations **concurrency-safe, FIFO-enforced, permanently auditable, and protected against unauthorized deletion**. All inventory mutations must be atomic (wrapped in a database transaction), write-locked on MySQL, and emit an immutable audit log entry. Hard deletion of inventory records must be prevented; only soft archival with a mandatory reason is permitted.

All work must be done on a dedicated `security-fix/inventory-integrity` branch. **Do not push directly to `main`.**

---

## Scope

| Area | Files / Concepts |
|---|---|
| Vaccine deduction service | `backend/app/Services/VaccineInventoryUsageService.php` |
| Inventory controller | `backend/app/Http/Controllers/VaccineInventoryController.php` |
| Inventory model | `backend/app/Models/VaccineInventory.php` |
| Inventory transaction model | `backend/app/Models/InventoryTransaction.php` |
| Audit log model | `backend/app/Models/AuditLog.php` |
| Database migrations | `backend/database/migrations/` |
| Automated tests | `backend/tests/Feature/Inventory/` |

---

## Step-by-Step Tasks

### TASK 1 — Wrap all inventory mutations in a database transaction with row locking (P0-6)

**Goal:** Concurrent administration cannot overspend stock or generate inconsistent open-vial state.

#### 1a. Fix `deductForTreatment()` in `VaccineInventoryUsageService`

1. Open `VaccineInventoryUsageService.php` and locate `deductForTreatment()`.
2. Wrap the entire method body in `DB::transaction()`:

```php
return DB::transaction(function () use ($treatmentId, $vaccineId, $doses, $forceBatchId) {
    // All reads, locks, calculations, updates, and inserts go here
});
```

3. Inside the transaction, change the query that selects the eligible batch to use `lockForUpdate()`:

```php
$batch = VaccineInventory::where('clinic_id', $clinicId)
    ->where('vaccine_id', $vaccineId)
    ->where('status', 'active')
    ->orderBy('expiry_date') // FIFO: earliest expiry first
    ->lockForUpdate()
    ->first();
```

4. **Re-check stock after the lock is acquired** (the value may have changed since the first read):

```php
if (!$batch || $batch->current_quantity < $doses) {
    throw new InsufficientStockException("Insufficient stock after lock.");
}
```

5. Only then perform the update and insert the transaction record.

#### 1b. Fix the open-vial path

1. Locate the `openVial()` method (in the service or controller).
2. Apply the same `DB::transaction()` + `lockForUpdate()` pattern.
3. Re-verify stock and open-vial state after acquiring the lock before making changes.

#### 1c. Enforce FIFO for `force_batch_id` (P0-6)

1. When a request supplies `force_batch_id`, do **not** simply use that batch blindly.
2. Inside the transaction, after locking, verify it is the FIFO batch:

```php
if ($forceBatchId) {
    $fifoExpiry = VaccineInventory::where('clinic_id', $clinicId)
        ->where('vaccine_id', $vaccineId)
        ->where('status', 'active')
        ->min('expiry_date');

    if ($batch->expiry_date > $fifoExpiry) {
        throw new FifoViolationException(
            "Requested batch is not the earliest-expiring batch. FIFO policy requires batch {$fifoId}."
        );
    }
}
```

3. Return HTTP 422 to the client when a FIFO violation is detected.
4. If an authorized override is ever needed (e.g., a batch was physically exhausted), require a separate, administrator-only `force_override` flag with a mandatory reason string that is audit-logged.

---

### TASK 2 — Prevent hard deletion and enforce soft archival (P0-7)

**Goal:** No inventory record or its transaction history can be permanently erased. Only administrators can archive (soft-delete) records, with a mandatory reason.

1. Add soft deletes to the `VaccineInventory` model if not already present:

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class VaccineInventory extends Model
{
    use SoftDeletes;
    // ...
}
```

2. Create a migration to add `deleted_at`, `archived_reason`, and `archived_by` columns:

```php
$table->softDeletes();
$table->text('archived_reason')->nullable();
$table->unsignedBigInteger('archived_by')->nullable();
$table->foreign('archived_by')->references('id')->on('users')->nullOnDelete();
```

3. In `VaccineInventoryController::destroy()`:
   - Change the method to perform a soft-delete (archival), **not** `$inventory->forceDelete()` or `$inventory->delete()` in a way that triggers cascades.
   - Require a non-empty `reason` in the request:

```php
$request->validate(['reason' => 'required|string|min:5|max:500']);

$inventory->update([
    'archived_reason' => $request->input('reason'),
    'archived_by' => auth()->id(),
]);
$inventory->delete(); // soft delete only — sets deleted_at
```

4. Restrict the route to `admin` only (remove `developer` from the allowed roles):

```php
Route::middleware(['auth:sanctum', 'role:admin'])->delete('/inventory/{id}', [VaccineInventoryController::class, 'destroy']);
```

5. Update the database foreign key on `inventory_transactions` to **not cascade on delete** — transactions must persist even if the parent inventory is soft-deleted:

```php
// In a new migration:
$table->dropForeign(['vaccine_inventory_id']);
$table->foreign('vaccine_inventory_id')
      ->references('id')
      ->on('vaccine_inventories')
      ->onDelete('restrict'); // Prevent cascade deletion
```

---

### TASK 3 — Add audit log events to every inventory mutation (P0-7)

**Goal:** Every create, update, open-vial, discard, adjust, use, and delete event is written atomically to the `AuditLog` table including actor, timestamp, before/after values, and a correlation ID.

1. Open `backend/app/Models/AuditLog.php` and confirm its schema. Ensure it has at minimum:
   - `user_id` (actor)
   - `action` (string: `inventory.create`, `inventory.update`, `inventory.delete`, `inventory.deduct`, `inventory.open_vial`, etc.)
   - `subject_type` and `subject_id` (polymorphic)
   - `before` (JSON — state before the change)
   - `after` (JSON — state after the change)
   - `reason` (nullable string)
   - `ip_address`
   - `created_at` (server-set, not fillable)

2. Create or update the `AuditLog` migration if any of the above columns are missing.

3. Create an `AuditLogger` helper class or trait (`backend/app/Services/AuditLogger.php`):

```php
class AuditLogger
{
    public static function log(string $action, Model $subject, array $before, array $after, ?string $reason = null): void
    {
        AuditLog::create([
            'user_id'      => auth()->id(),
            'action'       => $action,
            'subject_type' => get_class($subject),
            'subject_id'   => $subject->getKey(),
            'before'       => $before,
            'after'        => $after,
            'reason'       => $reason,
            'ip_address'   => request()->ip(),
        ]);
    }
}
```

4. Call `AuditLogger::log()` **inside the same `DB::transaction()`** for every inventory mutation:
   - In `VaccineInventoryUsageService::deductForTreatment()` — log `inventory.deduct` with before/after `current_quantity`.
   - In `openVial()` — log `inventory.open_vial`.
   - In `VaccineInventoryController::store()` — log `inventory.create`.
   - In `VaccineInventoryController::update()` — log `inventory.update` with before/after.
   - In `VaccineInventoryController::destroy()` — log `inventory.archive` with before state and the reason.
   - In any adjust/discard/write-off actions — log accordingly.

5. Make `created_at` on `AuditLog` **server-set only** — remove it from `$fillable` and set `$timestamps = true` with a custom `CREATED_AT` if needed. The `transaction_date` on `InventoryTransaction` must also be set server-side; remove it from `$fillable` on `InventoryTransaction` model (P1-5).

---

### TASK 4 — Add database-level integrity constraints (P1-5)

**Goal:** The database itself enforces integrity rules, not just application code.

1. Create a new migration to add the following to the `vaccine_inventories` table:
   - **Unique constraint** on `(clinic_id, batch_number)` to prevent duplicate batches:
     ```php
     $table->unique(['clinic_id', 'batch_number']);
     ```
   - **Check constraint** to prevent negative stock (MySQL 8 supports `CHECK`):
     ```php
     $table->rawIndex('(current_quantity >= 0)', 'chk_non_negative_quantity');
     // Or use DB::statement in the migration:
     // DB::statement('ALTER TABLE vaccine_inventories ADD CONSTRAINT chk_non_negative_quantity CHECK (current_quantity >= 0)');
     ```

2. Remove `transaction_date` from `InventoryTransaction::$fillable`. Set it server-side in the service:

```php
// In VaccineInventoryUsageService, when creating the transaction:
InventoryTransaction::create([
    // ... other fields ...
    'transaction_date' => now(), // Always server-side
]);
```

3. Prevent direct external creation of `InventoryTransaction` records — they should only be created through the service methods. Add a comment to the model indicating this constraint.

---

### TASK 5 — Enforce server-side open-vial hour limits (P1-6)

**Goal:** `openVial()` cannot accept a request-provided hour value that exceeds the approved per-vaccine maximum.

1. Define the approved maximum in `backend/config/inventory.php` (create the file if it does not exist):

```php
return [
    'open_vial_max_hours' => env('OPEN_VIAL_MAX_HOURS', 8),
    'open_vial_allowed_overrides' => false, // Require clinical approval to change
];
```

2. In `openVial()`, validate the request-provided hours against this config:

```php
$maxHours = config('inventory.open_vial_max_hours', 8);
$requestedHours = $request->input('open_vial_hours');

if ($requestedHours > $maxHours) {
    return response()->json([
        'message' => "Open-vial hours cannot exceed {$maxHours} hours per policy.",
    ], 422);
}
```

3. Do not hard-code a medical policy — the config value must be set by the clinic's authorized clinical authority, not by the developer. Add a note in `.env.example`:
   ```
   # Open vial maximum hours — must be approved by the clinic's clinical authority before changing
   OPEN_VIAL_MAX_HOURS=8
   ```

---

## Verification Plan

### Automated Tests (required before PR merge)

Create test files in `backend/tests/Feature/Inventory/`:

#### `ConcurrencyTest.php`
- `test_concurrent_deductions_do_not_exceed_stock()` — Simulate two simultaneous deductions of the same batch; total deducted must not exceed available stock.
- `test_stock_cannot_go_negative()` — Attempt to deduct more than available; expect exception and stock unchanged.

#### `FifoTest.php`
- `test_deduction_uses_earliest_expiry_batch()` — Given two batches with different expiry dates, deduction should consume the earlier one.
- `test_non_fifo_force_batch_id_returns_422()` — Supplying a `force_batch_id` that is not the earliest expiry returns 422.

#### `AuditLogTest.php`
- `test_inventory_create_generates_audit_log()` — After creating an inventory record, an `inventory.create` audit event exists.
- `test_inventory_deduct_generates_audit_log()` — After deduction, an `inventory.deduct` audit event exists with correct before/after quantities.
- `test_inventory_archive_generates_audit_log_with_reason()` — After soft-deleting, an `inventory.archive` event with a reason exists.

#### `AuthorizationTest.php`
- `test_nurse_cannot_delete_inventory()` — DELETE by a nurse role returns 403.
- `test_developer_cannot_delete_inventory()` — DELETE by a developer role returns 403.
- `test_admin_can_archive_inventory_with_reason()` — DELETE by admin with a reason returns 200 and soft-deletes.
- `test_admin_delete_without_reason_returns_422()` — DELETE by admin without a reason returns 422.

#### `OpenVialTest.php`
- `test_open_vial_hours_cannot_exceed_configured_max()` — Supplying hours > `OPEN_VIAL_MAX_HOURS` returns 422.
- `test_open_vial_within_limit_succeeds()` — Valid hours within limit returns 200.

### Run Commands

```bash
cd backend
php artisan test --filter=ConcurrencyTest
php artisan test --filter=FifoTest
php artisan test --filter=AuditLogTest
php artisan test --filter=AuthorizationTest
php artisan test --filter=OpenVialTest
php artisan test  # Full suite — 0 failures required
```

> **Important:** Concurrency tests must be run against a **MySQL 8** database, not SQLite. SQLite does not support `lockForUpdate()`. Configure a MySQL test environment in `phpunit.xml` for these tests.

### Manual Verification

| Check | Action | Expected |
|---|---|---|
| FIFO enforced | Use the UI to record a treatment when two batches exist | Earlier-expiring batch is consumed |
| Concurrent race condition | Open two browser tabs, deduct same batch simultaneously | No negative stock, no duplicate transaction |
| Nurse delete blocked | Log in as nurse, attempt to delete inventory via API | 403 |
| Admin delete requires reason | Admin DELETE without reason body | 422 |
| Audit log populated | Admin creates/updates/archives inventory record | AuditLog row exists with correct action, before/after |
| Transactions survive archive | Archive a batch, then query its transactions | Transactions still present |

---

## Success Criteria

- [x] All inventory mutations are wrapped in `DB::transaction()` with `lockForUpdate()`
- [x] Stock is re-verified inside the transaction after acquiring the lock
- [x] A non-FIFO `force_batch_id` returns 422 without changing stock
- [x] Hard deletion is replaced by soft archival with a mandatory reason
- [x] Only `admin` role can archive inventory records (developer removed)
- [x] Every inventory mutation emits an audit log event in the same transaction
- [x] `InventoryTransaction` cannot be created directly outside service methods
- [x] `transaction_date` is set server-side and removed from `$fillable`
- [x] Unique `(clinic_id, batch_number)` constraint added to migration
- [x] `open_vial_hours` is validated against config-controlled maximum
- [x] All new PHPUnit tests pass
- [x] `php artisan test` exits with 0 failures

---

## Implemented Changes & Verification Summary (Step-by-Step)

1. **Database Transactions & Concurrency Safety (Task 1 / P0-6)**:
   - Wrapped `deductForTreatment()`, `administerDoseAutomated()`, and `openVial()` in `DB::transaction()` with pessimistic `lockForUpdate()`.
   - Re-verified stock post-lock to prevent concurrent overspending.
   - Enforced strict FIFO; non-FIFO batch overrides return `422 Unprocessable Entity`.

2. **Soft Archival & Admin-Only Deletion (Task 2 / P0-7)**:
   - Added `SoftDeletes` (`deleted_at`, `archived_reason`, `archived_by`) to `VaccineInventory`.
   - Set foreign key on `inventory_transactions` to `onDelete('restrict')` so ledger history is preserved.
   - Restricted deletion route to `role:admin` only (`User::isAdmin()` now strictly returns true for admins only).
   - Replaced trash can icon with **Archive Icon (📦)** on frontend table, and added a mandatory reason input modal (min 5 characters).

3. **Atomic Audit Logging (Task 3 / P0-7)**:
   - Created `backend/app/Services/AuditLogger.php` helper service.
   - Recorded audit log entries (`inventory.create`, `inventory.update`, `inventory.archive`, `inventory.deduct`, `inventory.open_vial`, `inventory.adjust`) atomically inside transactions.
   - Guarded `created_at` and `transaction_date` as immutable server-set fields.

4. **Database-Level Integrity Constraints (Task 4 / P1-5)**:
   - Added `unique(['clinic_id', 'batch_number'])` composite index constraint.
   - Added MySQL `CHECK (current_quantity >= 0)` non-negative stock constraint.
   - Added model-level constraints and documentation to `InventoryTransaction`.

5. **Server-Side Open-Vial Hour Limits (Task 5 / P1-6)**:
   - Configured `backend/config/inventory.php` with `open_vial_max_hours = 8` and `open_vial_allowed_overrides = false`.
   - Added `.env.example` clinical authority documentation for `OPEN_VIAL_MAX_HOURS=8`.
   - Enforced 1-8 hour limits across all backend APIs and frontend input dialogs with clean clinical policy helper text.

6. **Automated Test Suites Organized**:
   - `ConcurrencyTest.php` (2 tests: concurrent deduction limit, non-negative stock)
   - `FifoTest.php` (2 tests: earliest expiry batch FIFO, non-FIFO rejection)
   - `AuditLogTest.php` (3 tests: create, deduct, archive audit logging)
   - `AuthorizationTest.php` (4 tests: nurse 403, dev 403, admin 200 with reason, admin 422 without reason)
   - `OpenVialTest.php` (2 tests: exceed limit 422, valid limit 200)
   - **Full test suite passed: 58 tests, 226 assertions, 0 failures.**
