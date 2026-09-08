# System Architecture & Vulnerability Map

**Date:** September 4, 2026  
**Purpose:** Visual representation of data flow and security gaps

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + TypeScript)                      │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  Inventory Page  │  │ Treatment Flow   │  │  Reports Module  │         │
│  │                  │  │                  │  │                  │         │
│  │ - Add Batch      │  │ - Use Vaccine    │  │ - Stock Card     │         │
│  │ - View Stock     │  │ - FIFO Selection │  │ - Audit Trail    │         │
│  │ - Adjust Qty     │  │ - Open Vial      │  │ - DOH Reports    │         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                      │                    │
│           │ HTTP + JWT Token    │                      │                    │
└───────────┼─────────────────────┼──────────────────────┼────────────────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Laravel)                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                      MIDDLEWARE STACK                            │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │       │
│  │  │   CORS       │→ │ Sanctum Auth │→ │  Role Check  │          │       │
│  │  │ ⚠️ Too open  │  │   ✅ OK      │  │   ✅ OK      │          │       │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                   ROUTES (api.php)                               │       │
│  │                                                                  │       │
│  │  POST   /inventory              ✅ Protected                    │       │
│  │  GET    /inventory/{id}         ✅ Protected                    │       │
│  │  PUT    /inventory/{id}         ✅ Protected                    │       │
│  │  DELETE /inventory/{id}         🔴 TOO PERMISSIVE (Vuln #3)    │       │
│  │  POST   /inventory/use-vaccine  🔴 NO FIFO CHECK (Vuln #2)     │       │
│  │  POST   /inventory/{id}/adjust  ✅ Protected                    │       │
│  │  POST   /login                  🟠 NO RATE LIMIT (Vuln #8)     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              CONTROLLERS (VaccineInventoryController)            │       │
│  │                                                                  │       │
│  │  index()         → Fetch inventory with FIFO ranks              │       │
│  │  store()         → Create new batch                             │       │
│  │  update()        → Edit batch details                           │       │
│  │  destroy()       → 🔴 Delete batch (NO AUDIT LOG - Vuln #4)    │       │
│  │  useVaccine()    → 🔴 Deduct stock (RACE CONDITION - Vuln #1)  │       │
│  │  adjustStock()   → Manual stock correction                      │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │          SERVICES (VaccineInventoryUsageService)                 │       │
│  │                                                                  │       │
│  │  deductForTreatment()                                            │       │
│  │    1. SELECT batch WHERE qty >= needed                           │       │
│  │       🔴 NO LOCK (Race Condition - Vuln #1)                     │       │
│  │    2. Calculate new_qty = current - deducted                     │       │
│  │    3. UPDATE batch SET qty = new_qty                             │       │
│  │       🔴 Another request can overwrite! (Vuln #1)               │       │
│  │                                                                  │       │
│  │  validateFifoBatch()                                             │       │
│  │    🟠 Only client-side check (Vuln #2)                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER (MySQL Database)                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  TABLE: vaccine_inventory                                        │       │
│  │  ┌───────────────┬──────────────┬────────────────┐              │       │
│  │  │ inventory_id  │ vaccine_type │ batch_number   │              │       │
│  │  │ clinic_id     │ current_qty  │ expiration_date│              │       │
│  │  │ status        │ created_at   │ updated_at     │              │       │
│  │  └───────────────┴──────────────┴────────────────┘              │       │
│  │  🟡 Missing unique constraint on (clinic_id, batch_number)       │       │
│  │  🟡 No CHECK constraint for qty >= 0                             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  TABLE: inventory_transactions                                   │       │
│  │  ┌───────────────┬──────────────┬────────────────┐              │       │
│  │  │ id            │ inventory_id │ transaction_type│              │       │
│  │  │ quantity      │ staff_id     │ transaction_date│              │       │
│  │  │ remarks       │ dispensed    │ received_from  │              │       │
│  │  └───────────────┴──────────────┴────────────────┘              │       │
│  │  🟠 All fields fillable (Can be backdated - Vuln #9)             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  TABLE: audit_logs                                               │       │
│  │  ✅ Exists but not integrated with inventory operations          │       │
│  │  🔴 Missing logs for: create, update, delete, FIFO bypass        │       │
│  └─────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 CRITICAL VULNERABILITY FLOW DIAGRAMS

### Vulnerability #1: Race Condition

```
┌───────────────────────────────────────────────────────────────────────┐
│                    RACE CONDITION SCENARIO                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Time  │  Request A (Nurse 1)          │  Request B (Nurse 2)         │
│  ──────┼───────────────────────────────┼──────────────────────────── │
│   T1   │  GET inventory (qty = 10)     │                              │
│   T2   │                               │  GET inventory (qty = 10)    │
│   T3   │  Calculate: 10 - 5 = 5        │                              │
│   T4   │                               │  Calculate: 10 - 5 = 5       │
│   T5   │  UPDATE qty = 5               │                              │
│   T6   │                               │  UPDATE qty = 5 (overwrites!)│
│  ──────┼───────────────────────────────┼──────────────────────────── │
│  Result: 10 doses allocated, but only 5 actually deducted!            │
│                                                                        │
│  Physical Stock: 0 vials (10 used)                                    │
│  System Stock: 5 vials (shows wrong qty)                              │
│  Patient Risk: Next patient gets "phantom" vaccine                    │
└───────────────────────────────────────────────────────────────────────┘

FIX:
┌───────────────────────────────────────────────────────────────────────┐
│  DB::transaction(function() {                                         │
│    $batch = VaccineInventory::where(...)                              │
│              ->lockForUpdate()  // ← Prevents concurrent access       │
│              ->first();                                                │
│    $batch->update(['current_quantity' => $new_qty]);                  │
│  });                                                                   │
└───────────────────────────────────────────────────────────────────────┘
```

---

### Vulnerability #2: FIFO Bypass

```
┌───────────────────────────────────────────────────────────────────────┐
│                         FIFO BYPASS FLOW                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CURRENT STATE:                                                        │
│  ┌──────────┬─────────────┬────────────┬──────────────┐              │
│  │ Batch ID │ Expires     │ Quantity   │ FIFO Rank    │              │
│  ├──────────┼─────────────┼────────────┼──────────────┤              │
│  │   123    │ 2026-10-01  │    50      │  #1 (oldest) │ ← Should use │
│  │   456    │ 2026-11-15  │   100      │  #2          │              │
│  │   789    │ 2027-03-20  │   200      │  #3 (newest) │              │
│  └──────────┴─────────────┴────────────┴──────────────┘              │
│                                                                        │
│  ATTACK:                                                               │
│  POST /inventory/use-vaccine                                           │
│  {                                                                     │
│    "vaccine_type": "Anti-Rabies",                                     │
│    "quantity": 1,                                                      │
│    "force_batch_id": 789  // ← Skips batches #1 and #2!              │
│  }                                                                     │
│                                                                        │
│  CURRENT BEHAVIOR:                                                     │
│  ✅ Request succeeds (backend only checks if batch exists)             │
│  ❌ Batch #123 expires unused (waste)                                  │
│  ❌ DOH audit violation (FIFO not followed)                            │
│  ❌ No audit log of bypass                                             │
│                                                                        │
│  FIXED BEHAVIOR:                                                       │
│  ❌ Request fails with 422 error                                       │
│  ✅ Error: "FIFO violation: Batch #123 must be used first"            │
│  ✅ Audit log: "FIFO bypass attempt by User #45"                      │
└───────────────────────────────────────────────────────────────────────┘
```

---

### Vulnerability #3: Unauthorized Deletion

```
┌───────────────────────────────────────────────────────────────────────┐
│                    UNAUTHORIZED DELETION FLOW                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CURRENT ACCESS CONTROL:                                               │
│  ┌────────────────┬──────────┬────────┬────────┬────────┐            │
│  │ Role           │ Create   │ Read   │ Update │ Delete │            │
│  ├────────────────┼──────────┼────────┼────────┼────────┤            │
│  │ Admin          │    ✅    │   ✅   │   ✅   │   ✅   │            │
│  │ Treatment      │    ✅    │   ✅   │   ✅   │   ✅   │ ← WRONG!   │
│  │ Nurse          │    ✅    │   ✅   │   ✅   │   ✅   │ ← WRONG!   │
│  │ Doctor         │    ✅    │   ✅   │   ✅   │   ✅   │ ← WRONG!   │
│  │ Registration   │    ✅    │   ✅   │   ✅   │   ✅   │ ← WRONG!   │
│  └────────────────┴──────────┴────────┴────────┴────────┘            │
│                                                                        │
│  ATTACK SCENARIO:                                                      │
│  1. Nurse steals 20 vaccine vials                                     │
│  2. DELETE /inventory/123 (batch record)                              │
│  3. System shows: "Inventory record deleted"                          │
│  4. No audit log created                                               │
│  5. Physical count: 30 vials                                           │
│     System count: Missing record = no discrepancy shown!              │
│                                                                        │
│  FIXED ACCESS CONTROL:                                                 │
│  ┌────────────────┬──────────┬────────┬────────┬────────┐            │
│  │ Role           │ Create   │ Read   │ Update │ Delete │            │
│  ├────────────────┼──────────┼────────┼────────┼────────┤            │
│  │ Admin          │    ✅    │   ✅   │   ✅   │   ✅   │            │
│  │ Developer      │    ✅    │   ✅   │   ✅   │   ✅   │            │
│  │ Treatment      │    ✅    │   ✅   │   ✅   │   ❌   │ ← FIXED    │
│  │ Nurse          │    ✅    │   ✅   │   ✅   │   ❌   │ ← FIXED    │
│  │ All Others     │    ✅    │   ✅   │   ✅   │   ❌   │ ← FIXED    │
│  └────────────────┴──────────┴────────┴────────┴────────┘            │
│                                                                        │
│  PLUS: Soft delete (deleted_at) instead of hard delete                │
│  PLUS: Audit log on every delete operation                            │
└───────────────────────────────────────────────────────────────────────┘
```

---

### Vulnerability #4: Missing Audit Logs

```
┌───────────────────────────────────────────────────────────────────────┐
│                      AUDIT LOG COVERAGE GAP                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CURRENT STATE:                                                        │
│  ┌─────────────────────────────┬──────────────┐                      │
│  │ Operation                   │ Logged?      │                      │
│  ├─────────────────────────────┼──────────────┤                      │
│  │ User login                  │     ✅       │                      │
│  │ User logout                 │     ✅       │                      │
│  │ Patient created             │     ✅       │                      │
│  │ Treatment record created    │     ✅       │                      │
│  │ ────────────────────────────┼──────────────┤                      │
│  │ Inventory batch created     │     ❌       │ ← MISSING!          │
│  │ Inventory batch updated     │     ❌       │ ← MISSING!          │
│  │ Inventory batch deleted     │     ❌       │ ← MISSING!          │
│  │ Stock adjusted              │     ❌       │ ← MISSING!          │
│  │ Vaccine used (FIFO)         │     ❌       │ ← MISSING!          │
│  │ FIFO bypassed               │     ❌       │ ← MISSING!          │
│  │ Open vial timer started     │     ❌       │ ← MISSING!          │
│  │ Vial discarded              │     ❌       │ ← MISSING!          │
│  └─────────────────────────────┴──────────────┘                      │
│                                                                        │
│  DOH REQUIREMENT: ALL inventory operations must be logged for 7 years │
│                                                                        │
│  IMPACT:                                                               │
│  ❌ Cannot prove FIFO compliance during audit                          │
│  ❌ Cannot investigate vaccine theft or loss                           │
│  ❌ Cannot generate complete DOH stock card reports                    │
│  ❌ Cannot trace who modified expiration dates                         │
│                                                                        │
│  FIXED: Add audit logs for all 8 inventory operations above           │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW WITH VULNERABILITY POINTS

### Normal Vaccine Usage Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                   VACCINE ADMINISTRATION FLOW                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. Patient arrives for treatment                                     │
│     └──> Queue system registers visit                                 │
│          ✅ Logged in queue_history                                    │
│                                                                        │
│  2. Nurse opens treatment form                                        │
│     └──> Frontend: TreatmentRecordForm.tsx                            │
│          └──> Calls: GET /inventory/fifo-recommendations              │
│               🟢 Gets FIFO priority batch                             │
│                                                                        │
│  3. Nurse selects vaccine                                             │
│     └──> VaccineSelector component                                    │
│          └──> Shows: "Batch ARV-2026-001 🟢 USE FIRST"               │
│               🟠 Client-side FIFO check only (Vuln #2)                │
│                                                                        │
│  4. Nurse submits treatment                                           │
│     └──> POST /inventory/use-vaccine                                  │
│          {                                                             │
│            "vaccine_type": "Anti-Rabies",                             │
│            "quantity": 1,                                              │
│            "treatment_id": 456,                                        │
│            "force_batch_id": null  // ← Could be manipulated          │
│          }                                                             │
│          │                                                             │
│          ├──> Controller: useVaccine()                                │
│          │    └──> Service: deductForTreatment()                      │
│          │         │                                                   │
│          │         ├──> SELECT * FROM vaccine_inventory               │
│          │         │    WHERE qty >= 1                                 │
│          │         │    ORDER BY expiration ASC                        │
│          │         │    🔴 NO LOCK (Race condition - Vuln #1)         │
│          │         │                                                   │
│          │         ├──> Calculate: new_qty = current_qty - 1          │
│          │         │                                                   │
│          │         ├──> UPDATE vaccine_inventory                       │
│          │         │    SET current_quantity = new_qty                 │
│          │         │    🔴 Can be overwritten by concurrent request!   │
│          │         │                                                   │
│          │         └──> INSERT INTO inventory_transactions             │
│          │              🟡 Transaction logged, but inventory operation │
│          │                  not logged in audit_logs (Vuln #4)        │
│          │                                                             │
│          └──> Response: { "message": "Vaccine used successfully" }    │
│                                                                        │
│  5. Treatment record saved                                            │
│     └──> Database: treatment_records table                            │
│          ✅ Logged in audit_logs                                       │
│                                                                        │
│  6. Patient receives vaccine                                          │
│     └──> Vaccination card updated                                     │
│          ✅ Logged in vaccination_schedules                            │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ SECURITY CONTROL LAYERS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEFENSE IN DEPTH ANALYSIS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: Network Security                                              │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ HTTPS/TLS encryption                                │            │
│  │ 🟡 CORS (too permissive - Vuln #11)                   │            │
│  │ ❌ No WAF (Web Application Firewall)                   │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 2: Authentication                                                │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ Laravel Sanctum (JWT tokens)                        │            │
│  │ ✅ Bcrypt password hashing                             │            │
│  │ 🟠 No rate limiting (Vuln #8)                          │            │
│  │ 🟡 Tokens never expire (Vuln #13)                      │            │
│  │ 🟠 Weak default passwords (Vuln #7)                    │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 3: Authorization                                                 │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ Role-Based Access Control (RBAC)                    │            │
│  │ ✅ CheckRole middleware                                │            │
│  │ 🔴 Delete endpoint too permissive (Vuln #3)            │            │
│  │ 🟠 No CSRF protection (Vuln #10)                       │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 4: Input Validation                                              │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ Laravel Request validation                          │            │
│  │ ✅ Eloquent ORM (SQL injection protection)             │            │
│  │ 🟠 Mass assignment vulnerability (Vuln #6)             │            │
│  │ 🟠 Open vial hours not validated (Vuln #5)             │            │
│  │ 🟡 XSS in reports (Vuln #12)                           │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 5: Business Logic                                                │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ FIFO algorithm implemented                          │            │
│  │ 🔴 FIFO not enforced on backend (Vuln #2)              │            │
│  │ 🔴 Race condition in deduction (Vuln #1)               │            │
│  │ 🟠 Transactions can be faked (Vuln #9)                 │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 6: Data Integrity                                                │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ Foreign key constraints                             │            │
│  │ ✅ Database indexes                                    │            │
│  │ 🟡 Missing unique constraints (Vuln #14)               │            │
│  │ 🟡 No CHECK constraint on qty >= 0 (Vuln #14)          │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Layer 7: Audit & Monitoring                                            │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ ✅ AuditLog model exists                               │            │
│  │ ✅ User activity logging                               │            │
│  │ 🔴 No inventory operation logs (Vuln #4)               │            │
│  │ ❌ No real-time alerting                               │            │
│  │ ❌ No intrusion detection                              │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Overall Security Posture: 🟡 MODERATE (needs improvement)             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 VULNERABILITY HEAT MAP

```
┌────────────────────────────────────────────────────────────────────────┐
│                    VULNERABILITY SEVERITY MATRIX                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   IMPACT                                                                │
│   ↑                                                                     │
│   │                                                                     │
│ H │  [Vuln #3]         [Vuln #1] [Vuln #2]      [Vuln #4]             │
│ I │  Delete Auth       Race Cond  FIFO Bypass   No Audit              │
│ G │     🔴                🔴         🔴             🔴                  │
│ H │                                                                     │
│   ├────────────────────────────────────────────────────────────────────┤
│   │                                                                     │
│ M │  [Vuln #7]         [Vuln #5] [Vuln #6]      [Vuln #8]             │
│ E │  Weak Pwd          Timer Mnp  Mass Assign   No Rate Lmt            │
│ D │     🟠                🟠         🟠             🟠                  │
│ I │                                                                     │
│ U │  [Vuln #9]         [Vuln #10]                                      │
│ M │  Fake Txns         No CSRF                                         │
│   │     🟠                🟠                                            │
│   ├────────────────────────────────────────────────────────────────────┤
│   │                                                                     │
│ L │  [Vuln #11]        [Vuln #12] [Vuln #13]    [Vuln #14]            │
│ O │  CORS Open         XSS Rept   Token Exp     DB Constrt            │
│ W │     🟡                🟡         🟡             🟡                  │
│   │                                                                     │
│   └──────────────────────────────────────────────────────────────────→ │
│          LOW            MEDIUM          HIGH           CRITICAL         │
│                         EXPLOITABILITY                                  │
└────────────────────────────────────────────────────────────────────────┘

Legend:
🔴 Critical - Fix within 24 hours
🟠 High     - Fix within 1 week  
🟡 Medium   - Fix within 2 weeks
```

---

## 🚨 ATTACK SCENARIOS

### Scenario 1: Inventory Theft Cover-Up

```
ATTACKER: Nurse with "treatment" role
GOAL: Steal 50 vaccine vials and erase evidence

Step 1: Physical theft
  └──> Take 50 vials from refrigerator

Step 2: Delete inventory record
  └──> DELETE /inventory/123
       ✅ Succeeds (Vuln #3: Delete not restricted)
       ❌ No audit log created (Vuln #4)

Step 3: Or create fake "expired" transaction
  └──> POST /inventory/123/transactions
       {"type": "expired", "quantity": 50, "date": "2026-08-01"}
       ✅ Succeeds (Vuln #9: Transactions can be backdated)

Result:
  Physical stock: Missing 50 vials
  System stock: Shows correct (deleted or "expired")
  Audit trail: None
  Detection chance: Low
```

---

### Scenario 2: FIFO Bypass for Profit

```
ATTACKER: Corrupt staff member
GOAL: Keep newest batches, let old ones expire, then resell "expired" stock

Step 1: Always use newest batches
  └──> POST /inventory/use-vaccine
       {"force_batch_id": 999}  // Newest batch
       ✅ Succeeds (Vuln #2: FIFO not enforced on backend)

Step 2: Old batches expire
  └──> Batch #1 (expires 2026-10-01) goes unused
       System marks as "expired" automatically

Step 3: Steal "expired" batches
  └──> Take physical vials (still good if properly stored)
       Resell on black market

Step 4: Cover tracks
  └──> DELETE /inventory/1
       ✅ Succeeds (Vuln #3)
       ❌ No audit log (Vuln #4)

Result:
  DOH compliance: Failed
  Financial loss: Government paid for wasted vaccines
  Public health risk: Untracked vaccines in circulation
```

---

### Scenario 3: Race Condition Exploitation

```
ATTACKER: Two colluding staff members
GOAL: Deplete inventory and create ghost doses

Step 1: Find batch with 10 remaining vials
  └──> GET /inventory
       Response: Batch #456 has qty=10

Step 2: Both submit at exact same time
  └──> Terminal 1: POST /use-vaccine {"qty": 10}
       Terminal 2: POST /use-vaccine {"qty": 10}
       
       Both read qty=10 (no lock - Vuln #1)
       Both calculate new_qty=0
       Both update qty=0 (second overwrites first)

Result:
  Physical stock: 0 vials (20 treatments given)
  System stock: 0 vials (shows 10 treatments)
  Ghost treatments: 10 vaccine doses unaccounted for
  Patient safety: Future patients may receive diluted/fake vaccines
```

---

## 📈 REMEDIATION ROADMAP

```
Week 1 (Critical Fixes)
├── Day 1-2: Race Condition (Vuln #1)
│   ├── Add DB::transaction()
│   ├── Add lockForUpdate()
│   └── Test with 100 concurrent requests
│
├── Day 3-4: FIFO Enforcement (Vuln #2)
│   ├── Add backend FIFO validation
│   ├── Require admin approval for overrides
│   └── Add audit logs for bypasses
│
├── Day 5: Authorization Fix (Vuln #3)
│   ├── Restrict delete to admin-only
│   ├── Implement soft delete
│   └── Test with nurse/doctor roles
│
└── Day 6-7: Audit Logging (Vuln #4)
    ├── Add Auditable trait
    ├── Log all inventory operations
    └── Create audit report UI

Week 2 (High Priority)
├── Rate limiting (Vuln #8)
├── Open vial validation (Vuln #5)
├── Mass assignment fix (Vuln #6)
└── Token expiration (Vuln #13)

Week 3-4 (Medium Priority)
├── Database constraints (Vuln #14)
├── XSS sanitization (Vuln #12)
├── CORS lockdown (Vuln #11)
└── Transaction integrity (Vuln #9)

Week 5+ (Long-term)
├── Password policies (Vuln #7)
├── CSRF protection (Vuln #10)
├── Penetration testing
└── DOH compliance certification
```

---

## 📞 INCIDENT RESPONSE PLAN

**If you discover active exploitation:**

1. **Immediate Actions** (within 1 hour)
   - Lock affected user accounts
   - Take database snapshot backup
   - Enable query logging
   - Contact: security@clinic.example.com

2. **Investigation** (within 4 hours)
   - Review audit logs for suspicious activity
   - Check inventory transaction history
   - Identify compromised batches
   - Document timeline of events

3. **Containment** (within 24 hours)
   - Deploy critical fixes (Vuln #1-4)
   - Reset all user passwords
   - Revoke all active tokens
   - Notify DOH if patient safety affected

4. **Recovery** (within 1 week)
   - Perform physical inventory count
   - Reconcile with system records
   - Update all security controls
   - Retrain staff on proper procedures

5. **Post-Incident** (within 2 weeks)
   - Complete security audit
   - Update incident response plan
   - Submit compliance reports to DOH
   - Implement long-term fixes

---

**Document Version:** 1.0  
**Last Updated:** September 4, 2026  
**Classification:** CONFIDENTIAL  
**Distribution:** Development Team, Security Officer, Management
