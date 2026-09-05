# Security Fix Checklist - Action Items

**Priority:** 🔴 IMMEDIATE  
**Target:** Fix within 24-48 hours  
**Date:** September 4, 2026

---

## ✅ TASK CHECKLIST

### 🔴 CRITICAL - Fix Today (4 items)

#### [ ] 1. Fix Race Condition in Vaccine Deduction
**File:** `backend/app/Services/VaccineInventoryUsageService.php`  
**Lines:** 158-230

```php
// BEFORE:
public function deductForTreatment(...) {
    $batch = VaccineInventory::where('clinic_id', $clinicId)
        ->where('vaccine_type', $vaccineType)
        ->where('current_quantity', '>=', $quantity)
        ->orderBy('expiration_date', 'asc')
        ->first();
    
    $batch->update(['current_quantity' => $newQuantity]);
}

// AFTER:
public function deductForTreatment(...) {
    return DB::transaction(function() use (...) {
        $batch = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('current_quantity', '>=', $quantity)
            ->lockForUpdate() // ← ADD THIS LINE
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->first();
        
        // ... rest of logic
    });
}
```

**Test:**
```bash
# Run 50 concurrent requests
ab -n 50 -c 50 -T "application/json" \
   -H "Authorization: Bearer $TOKEN" \
   -p vaccine_use.json \
   http://localhost:8000/api/inventory/use-vaccine

# Verify no negative quantities
php artisan tinker
>>> VaccineInventory::where('current_quantity', '<', 0)->count();
// Should be 0
```

---

#### [ ] 2. Enforce FIFO on Backend
**File:** `backend/app/Services/VaccineInventoryUsageService.php`  
**Lines:** 187-196

```php
// ADD THIS CODE BLOCK after line 187:
if ($forceBatchId) {
    // Get the FIFO-compliant batch
    $fifoBatch = VaccineInventory::where('clinic_id', $clinicId)
        ->where('vaccine_type', $vaccineType)
        ->where('status', 'active')
        ->where('current_quantity', '>=', $quantity)
        ->lockForUpdate()
        ->orderBy('expiration_date', 'asc')
        ->orderBy('created_at', 'asc')
        ->first();

    // ENFORCE: Selected batch must match FIFO batch
    if ($fifoBatch && $fifoBatch->inventory_id !== $forceBatchId) {
        // Log the violation attempt
        \App\Models\AuditLog::create([
            'action' => 'fifo_violation_attempt',
            'user_id' => $staffId,
            'model' => 'VaccineInventory',
            'description' => "Attempted to bypass FIFO. Requested batch #{$forceBatchId}, FIFO requires #{$fifoBatch->inventory_id}",
            'severity' => 'warning',
        ]);

        throw ValidationException::withMessages([
            'force_batch_id' => "FIFO violation: Batch #{$fifoBatch->batch_number} (expires {$fifoBatch->expiration_date}) must be used first.",
        ]);
    }

    $batch = VaccineInventory::where('inventory_id', $forceBatchId)
        ->lockForUpdate()
        ->first();
} else {
    // ... existing FIFO selection logic
}
```

**Test:**
```bash
# Test 1: Try to use non-FIFO batch
curl -X POST http://localhost:8000/api/inventory/use-vaccine \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vaccine_type": "Anti-Rabies Vaccine",
    "quantity": 1,
    "treatment_id": 100,
    "force_batch_id": 999
  }'

# Expected: 422 error with "FIFO violation" message

# Test 2: Verify audit log was created
mysql> SELECT * FROM audit_logs WHERE action='fifo_violation_attempt' ORDER BY id DESC LIMIT 1;
```

---

#### [ ] 3. Restrict Inventory Deletion to Admin Only
**File:** `backend/routes/api.php`  
**Line:** 279

```php
// BEFORE:
Route::prefix('inventory')
    ->middleware('role:admin,treatment,nurse,doctor,staff,developer,triage,registration')
    ->group(function () {
        Route::delete('/{id}', [VaccineInventoryController::class, 'destroy']);
    });

// AFTER:
Route::prefix('inventory')->group(function () {
    // General staff access (read/write)
    Route::middleware('role:admin,treatment,nurse,doctor,staff,developer,triage,registration')
        ->group(function () {
            Route::get('/', [VaccineInventoryController::class, 'index']);
            Route::post('/', [VaccineInventoryController::class, 'store']);
            Route::get('/{id}', [VaccineInventoryController::class, 'show']);
            Route::put('/{id}', [VaccineInventoryController::class, 'update']);
            Route::post('/{id}/adjust', [VaccineInventoryController::class, 'adjustStock']);
            // ... other endpoints
        });

    // Admin-only destructive operations
    Route::middleware('role:admin,developer')->group(function () {
        Route::delete('/{id}', [VaccineInventoryController::class, 'destroy']);
    });
});
```

**Test:**
```bash
# Test 1: Nurse cannot delete (should fail)
curl -X DELETE http://localhost:8000/api/inventory/1 \
  -H "Authorization: Bearer $NURSE_TOKEN"
# Expected: 403 Forbidden

# Test 2: Admin can delete (should succeed)
curl -X DELETE http://localhost:8000/api/inventory/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK
```

---

#### [ ] 4. Add Audit Logging for All Inventory Operations
**File:** `backend/app/Models/VaccineInventory.php`  
**Add Trait:**

```php
// Create new file: app/Traits/Auditable.php
<?php
namespace App\Traits;

use App\Models\AuditLog;

trait Auditable
{
    protected static function bootAuditable()
    {
        static::created(function ($model) {
            self::logAudit('created', $model);
        });

        static::updated(function ($model) {
            self::logAudit('updated', $model, $model->getOriginal());
        });

        static::deleted(function ($model) {
            self::logAudit('deleted', $model, $model->getAttributes());
        });
    }

    protected static function logAudit($action, $model, $oldValues = null)
    {
        $changes = [];
        if ($action === 'updated' && $oldValues) {
            $changes = array_diff_assoc($model->getAttributes(), $oldValues);
        }

        AuditLog::create([
            'action' => $action,
            'model' => get_class($model),
            'model_id' => $model->getKey(),
            'user_id' => auth()->id(),
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => json_encode($model->getAttributes()),
            'changes' => $changes ? json_encode($changes) : null,
            'description' => self::generateDescription($action, $model, $changes),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    protected static function generateDescription($action, $model, $changes = [])
    {
        $user = auth()->user() ? auth()->user()->name : 'System';
        
        if (get_class($model) === 'App\Models\VaccineInventory') {
            $batchInfo = "batch {$model->batch_number} ({$model->vaccine_type})";
            
            switch ($action) {
                case 'created':
                    return "{$user} created new inventory {$batchInfo} with {$model->current_quantity} vials";
                case 'updated':
                    if (isset($changes['current_quantity'])) {
                        $oldQty = $model->getOriginal('current_quantity');
                        $newQty = $model->current_quantity;
                        $diff = $newQty - $oldQty;
                        return "{$user} adjusted stock for {$batchInfo}: {$oldQty} → {$newQty} (diff: {$diff})";
                    }
                    return "{$user} updated inventory {$batchInfo}";
                case 'deleted':
                    return "{$user} deleted inventory {$batchInfo}";
            }
        }
        
        return "{$user} {$action} " . get_class($model) . " #{$model->getKey()}";
    }
}
```

**Apply to VaccineInventory:**
```php
// backend/app/Models/VaccineInventory.php
<?php
namespace App\Models;

use App\Traits\Auditable; // ← ADD THIS
use Illuminate\Database\Eloquent\Model;

class VaccineInventory extends Model
{
    use Auditable; // ← ADD THIS

    protected $table = 'vaccine_inventory';
    protected $primaryKey = 'inventory_id';
    
    // ... rest of model
}
```

**Test:**
```bash
# Test audit logging
php artisan tinker

>>> $inv = VaccineInventory::find(1);
>>> $inv->update(['current_quantity' => 50]);
>>> AuditLog::latest()->first();
# Should show: "Admin adjusted stock for batch ARV-001: 100 → 50"

>>> $inv->delete();
>>> AuditLog::latest()->first();
# Should show: "Admin deleted inventory batch ARV-001"
```

---

### 🟠 HIGH PRIORITY - Fix This Week (6 items)

#### [ ] 5. Add Rate Limiting to Login Endpoint
**File:** `backend/routes/api.php`  
**Lines:** 38-40

```php
// BEFORE:
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// AFTER:
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1'); // 5 attempts per minute

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:3,60'); // 3 attempts per hour

Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:3,60');
```

**Test:**
```bash
# Attempt 6 logins rapidly
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/login \
    -d '{"email":"admin@clinic.com","password":"wrong"}'
done

# Expected: 6th request returns 429 Too Many Requests
```

---

#### [ ] 6. Validate Open Vial Hours Max Limit
**File:** `backend/app/Http/Controllers/VaccineInventoryController.php`  
**Line:** 396

```php
// BEFORE:
$hours = $inventory->open_vial_hours ?: ($request->input('open_vial_hours') ?: 6);

// AFTER:
$request->validate([
    'open_vial_hours' => 'nullable|integer|min:1|max:48',
]);

$requestedHours = $request->input('open_vial_hours');
$hours = $inventory->open_vial_hours ?: ($requestedHours ?: 6);

// Enforce WHO maximum (6 hours for most vaccines)
$maxSafeHours = 6;
if ($hours > $maxSafeHours && !$request->user()->hasRole('admin')) {
    return response()->json([
        'error' => "Open-vial timer cannot exceed {$maxSafeHours} hours per WHO guidelines. Admin override required.",
        'max_hours' => $maxSafeHours,
        'requested_hours' => $hours,
    ], 422);
}

// Log admin overrides
if ($hours > $maxSafeHours) {
    AuditLog::create([
        'action' => 'open_vial_timer_override',
        'user_id' => $request->user()->id,
        'description' => "Admin extended open-vial timer to {$hours} hours (exceeds WHO limit) for batch {$inventory->batch_number}",
        'severity' => 'warning',
    ]);
}
```

---

#### [ ] 7. Fix Mass Assignment Vulnerability
**File:** `backend/app/Models/VaccineInventory.php`  
**Lines:** 16-30

```php
// BEFORE:
protected $fillable = [
    'clinic_id',
    'current_quantity',
    'status',
    // ... all fields
];

// AFTER:
protected $fillable = [
    // Only allow safe fields
    'vaccine_type',
    'batch_number',
    'received_from',
    'manufactured_date',
    'shelf_life_months',
    'open_vial_hours',
    'doses_per_vial',
    'cold_chain_notes',
    'expiration_date',
];

protected $guarded = [
    // Protect critical fields
    'inventory_id',
    'clinic_id',        // Cannot change ownership
    'current_quantity',  // Cannot directly modify stock
    'status',           // Cannot bypass FIFO
    'open_vial_status',
    'opened_at',
    'open_vial_discard_at',
];
```

---

#### [ ] 8. Set Token Expiration
**File:** `backend/config/sanctum.php`  
**Line:** 50

```php
// BEFORE:
'expiration' => null,

// AFTER:
'expiration' => 60 * 24, // 24 hours (in minutes)
```

---

#### [ ] 9. Prevent Manual Transaction Creation
**File:** `backend/app/Models/InventoryTransaction.php`  
**Lines:** 16-28

```php
// REMOVE transaction_date from fillable
protected $fillable = [
    'inventory_id',
    'staff_id',
    'transaction_type',
    'quantity',
    // REMOVE: 'transaction_date',
    'quantity_received',
    'received_from',
    'dispensed',
    'balanced',
    'remarks',
    'reference_id',
];

// Auto-set transaction_date
protected static function boot()
{
    parent::boot();

    static::creating(function ($transaction) {
        $transaction->transaction_date = $transaction->transaction_date ?? now();
        $transaction->staff_id = $transaction->staff_id ?? auth()->id();
    });
}
```

---

#### [ ] 10. Add CSRF Protection
**File:** `backend/config/sanctum.php`  
**Line:** 76

```php
// BEFORE:
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')),

// AFTER:
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1')),
```

**File:** `.env`
```env
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,clinic.example.com
```

---

### 🟡 MEDIUM PRIORITY - Fix Within 2 Weeks (4 items)

#### [ ] 11. Lock Down CORS Configuration
**File:** `backend/config/cors.php`  
**Lines:** 23-28

```php
// BEFORE:
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
],

// AFTER:
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    // Remove hardcoded origins in production
],
```

---

#### [ ] 12. Sanitize HTML in Reports Module
**File:** `frontend/src/features/reports/pages/ReportsDashboardPage.tsx`  
**Line:** 190

```bash
# Install DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify
```

```tsx
// Add import
import DOMPurify from 'dompurify';

// BEFORE:
<div dangerouslySetInnerHTML={{ __html: html }} />

// AFTER:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
```

---

#### [ ] 13. Add Database Constraints
**Create Migration:**

```bash
php artisan make:migration add_inventory_constraints
```

```php
// database/migrations/XXXX_add_inventory_constraints.php
public function up()
{
    Schema::table('vaccine_inventory', function (Blueprint $table) {
        // Add unique constraint
        $table->unique(['clinic_id', 'batch_number'], 'unique_clinic_batch');
    });

    // Add check constraint for non-negative quantity
    DB::statement('
        ALTER TABLE vaccine_inventory 
        ADD CONSTRAINT check_quantity_non_negative 
        CHECK (current_quantity >= 0)
    ');
}

public function down()
{
    Schema::table('vaccine_inventory', function (Blueprint $table) {
        $table->dropUnique('unique_clinic_batch');
    });

    DB::statement('
        ALTER TABLE vaccine_inventory 
        DROP CONSTRAINT IF EXISTS check_quantity_non_negative
    ');
}
```

```bash
php artisan migrate
```

---

#### [ ] 14. Implement Password Complexity
**File:** `backend/app/Http/Controllers/AuthController.php`

```php
public function register(Request $request)
{
    $request->validate([
        'email' => 'required|email|unique:users',
        'password' => [
            'required',
            'confirmed',
            'min:12',
            'regex:/[a-z]/',      // At least one lowercase
            'regex:/[A-Z]/',      // At least one uppercase
            'regex:/[0-9]/',      // At least one number
            'regex:/[@$!%*#?&]/', // At least one special char
        ],
        'name' => 'required|string|max:255',
        'role' => 'required|in:admin,treatment,registration,triage',
    ], [
        'password.regex' => 'Password must contain uppercase, lowercase, number, and special character.',
        'password.min' => 'Password must be at least 12 characters.',
    ]);
    
    // ... rest of method
}
```

---

## 📝 VERIFICATION CHECKLIST

After implementing all fixes, verify:

```bash
# 1. Run all tests
php artisan test

# 2. Check for vulnerabilities
php artisan audit:security

# 3. Test race condition fix
ab -n 100 -c 50 http://localhost:8000/api/inventory/use-vaccine

# 4. Verify FIFO enforcement
curl -X POST .../use-vaccine -d '{"force_batch_id": 999}'
# Expected: 422 error

# 5. Check audit logs
mysql> SELECT COUNT(*) FROM audit_logs WHERE action LIKE 'inventory%';
# Should be > 0

# 6. Test rate limiting
for i in {1..6}; do curl -X POST .../login; done
# Expected: 6th request returns 429

# 7. Verify authorization
curl -X DELETE .../inventory/1 -H "Authorization: Bearer $NURSE_TOKEN"
# Expected: 403 Forbidden

# 8. Check database constraints
mysql> INSERT INTO vaccine_inventory (clinic_id, batch_number) VALUES (1, 'DUPLICATE');
mysql> INSERT INTO vaccine_inventory (clinic_id, batch_number) VALUES (1, 'DUPLICATE');
# Expected: Duplicate entry error

# 9. Verify token expiration
php artisan tinker
>>> $token = auth()->user()->createToken('test');
>>> $token->accessToken->expires_at;
# Should show: 24 hours from now

# 10. Test password complexity
curl -X POST .../register -d '{"password":"simple"}'
# Expected: Validation error
```

---

## 🚀 DEPLOYMENT STEPS

### 1. Create Feature Branch
```bash
git checkout -b fix/security-vulnerabilities-sept-2026
```

### 2. Implement Fixes (in order)
- Day 1: Critical items #1-4
- Day 2-3: High priority items #5-10
- Week 2: Medium priority items #11-14

### 3. Test Each Fix
```bash
php artisan test --filter=SecurityTest
```

### 4. Code Review
- Request peer review from 2+ developers
- Security officer approval required

### 5. Deploy to Staging
```bash
git push origin fix/security-vulnerabilities-sept-2026
# Deploy to staging.clinic.example.com
```

### 6. Run Penetration Tests
```bash
# Load testing
ab -n 1000 -c 100 https://staging.clinic.example.com/api/inventory/use-vaccine

# SQL injection testing
sqlmap -u "https://staging.clinic.example.com/api/inventory/1"

# XSS testing
# ... manual testing
```

### 7. Deploy to Production
```bash
# Backup database first!
mysqldump -u root -p abts_db > backup_sept_4_2026.sql

# Deploy
git merge fix/security-vulnerabilities-sept-2026
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

### 8. Monitor for Issues
```bash
# Watch logs
tail -f storage/logs/laravel.log

# Monitor failed logins
mysql> SELECT COUNT(*) FROM audit_logs WHERE action='login_failed' AND created_at > NOW() - INTERVAL 1 HOUR;

# Check inventory consistency
mysql> SELECT * FROM vaccine_inventory WHERE current_quantity < 0;
```

---

## 📊 PROGRESS TRACKING

| # | Issue | Priority | Status | Assigned To | Due Date |
|---|-------|----------|--------|-------------|----------|
| 1 | Race Condition | 🔴 Critical | ⬜ TODO | Developer | Sept 5 |
| 2 | FIFO Bypass | 🔴 Critical | ⬜ TODO | Developer | Sept 5 |
| 3 | Delete Auth | 🔴 Critical | ⬜ TODO | Developer | Sept 5 |
| 4 | Audit Logging | 🔴 Critical | ⬜ TODO | Developer | Sept 5 |
| 5 | Rate Limiting | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 6 | Vial Hours | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 7 | Mass Assignment | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 8 | Token Expiry | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 9 | Txn Integrity | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 10 | CSRF | 🟠 High | ⬜ TODO | Developer | Sept 11 |
| 11 | CORS | 🟡 Medium | ⬜ TODO | Developer | Sept 18 |
| 12 | XSS | 🟡 Medium | ⬜ TODO | Frontend | Sept 18 |
| 13 | DB Constraints | 🟡 Medium | ⬜ TODO | Developer | Sept 18 |
| 14 | Passwords | 🟡 Medium | ⬜ TODO | Developer | Sept 18 |

---

## 📞 SUPPORT

**Questions?** security@clinic.example.com  
**Urgent Issues?** Call: +63-XXX-XXX-XXXX  
**Full Report:** See `SECURITY_AUDIT_REPORT.md`

---

**Last Updated:** September 4, 2026  
**Next Review:** September 18, 2026  
**Status:** 🔴 IN PROGRESS
