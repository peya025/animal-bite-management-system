# Vaccine Inventory System - Testing & Deployment Guide

## 🧪 Complete Testing Checklist

### Pre-Deployment Tests

#### 1. Database Setup ✓
```bash
# Verify migrations are applied
cd backend
php artisan migrate:status

# Expected output should show:
✓ 2026_06_19_100004_create_vaccine_inventory_table
✓ 2026_06_19_100006_create_inventory_transactions_table
```

#### 2. Backend API Tests

**Test Inventory Endpoints:**
```bash
# Test 1: Get inventory list (should return empty array initially)
curl -X GET "http://localhost:8000/api/inventory" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"data":[],"total":0}

# Test 2: Get statistics
curl -X GET "http://localhost:8000/api/inventory/statistics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {
#   "total_batches":0,
#   "active_batches":0,
#   "depleted_batches":0,
#   "expired_batches":0,
#   "total_stock":0,
#   "expiring_soon":0,
#   "low_stock":0
# }

# Test 3: Get vaccine names
curl -X GET "http://localhost:8000/api/inventory/vaccine-names" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"vaccine_names":[]}

# Test 4: Get FIFO recommendations
curl -X GET "http://localhost:8000/api/inventory/fifo-recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"fifo_recommendations":{}}
```

#### 3. Frontend Build Tests

```bash
cd frontend

# Test 1: Check for TypeScript errors
npm run type-check
# OR
npx tsc --noEmit

# Test 2: Build for production
npm run build

# Expected: No errors, dist/ folder created
```

---

## 📝 Manual Testing Scenarios

### Scenario 1: Add First Vaccine Batch

**Steps:**
1. Login as Admin/Inventory Manager
2. Navigate to **Vaccine Inventory** page
3. Click **"+ Add Stock"** button
4. Fill in the form:
   - Vaccine Type: `Anti-Rabies Vaccine (Verorab)`
   - Batch Number: `ARV-2026-0823`
   - Quantity: `100`
   - Expiration Date: `2027-03-15`
   - Remarks: `Received from DOH - Regional Stock`
5. Click **Save**

**Expected Results:**
- ✅ Success message: "Stock added successfully"
- ✅ New batch appears in inventory table
- ✅ Statistics update: Total Batches = 1, Active Batches = 1, Total Stock = 100
- ✅ FIFO badge shows "🟢 FIFO: USE FIRST" on the new batch
- ✅ Stock Card tab shows the batch with initial transaction

**Database Verification:**
```sql
-- Should show 1 inventory record
SELECT * FROM vaccine_inventory WHERE vaccine_type LIKE '%Anti-Rabies%';

-- Should show 1 transaction record (type='received')
SELECT * FROM inventory_transactions WHERE transaction_type = 'received';
```

---

### Scenario 2: Add Multiple Batches (Test FIFO Ranking)

**Steps:**
1. Add Batch #2:
   - Vaccine Type: `Anti-Rabies Vaccine (Verorab)` (same type)
   - Batch Number: `ARV-2026-0901`
   - Quantity: `75`
   - Expiration Date: `2026-12-01` (earlier than Batch #1!)
   - Remarks: `Emergency procurement`

2. Add Batch #3:
   - Vaccine Type: `Anti-Rabies Vaccine (Verorab)`
   - Batch Number: `ARV-2026-0915`
   - Quantity: `50`
   - Expiration Date: `2027-06-20`

**Expected Results:**
- ✅ FIFO Priority Order:
  - **Rank #1 (🟢 USE FIRST)**: Batch ARV-2026-0901 (expires Dec 2026)
  - **Rank #2**: Batch ARV-2026-0823 (expires Mar 2027)
  - **Rank #3**: Batch ARV-2026-0915 (expires Jun 2027)
- ✅ Statistics: Total Batches = 3, Total Stock = 225 (100+75+50)
- ✅ FIFO Compliance tab shows all 3 batches in correct order

**Navigate to "✓ FIFO Compliance" Tab:**
```
Anti-Rabies Vaccine (Verorab)                [3 Batches] [225 Vials]

┌─────────────┬──────────────┬─────┬──────────────┬────────────┐
│FIFO Priority│ Batch Number │ Qty │ Expiration   │   Status   │
├─────────────┼──────────────┼─────┼──────────────┼────────────┤
│🟢 USE FIRST │ ARV-2026-0901│  75 │ Dec 1, 2026  │ 🟢 Good    │
│  Rank #2    │ ARV-2026-0823│ 100 │ Mar 15, 2027 │ 🟢 Good    │
│  Rank #3    │ ARV-2026-0915│  50 │ Jun 20, 2027 │ 🟢 Good    │
└─────────────┴──────────────┴─────┴──────────────┴────────────┘
```

---

### Scenario 3: Use Vaccine (FIFO Enforcement)

**Steps:**
1. Open patient treatment form (Form 3: Vaccination Record)
2. Click **"Use Vaccine from Inventory"** button
3. Select Vaccine Type: `Anti-Rabies Vaccine (Verorab)`
4. System auto-displays FIFO batch:
   ```
   🟢 FIFO: USE THIS BATCH FIRST
   Batch Number: ARV-2026-0901
   Available Quantity: 75 vials
   Expiration Date: Dec 1, 2026
   ```
5. Enter Quantity: `1`
6. Click **"Use Vaccine"**

**Expected Results:**
- ✅ Success message: "Vaccine used successfully (FIFO enforced)"
- ✅ Batch ARV-2026-0901 quantity: 75 → 74
- ✅ New transaction created (type='used', dispensed=1)
- ✅ Statistics: Total Stock = 224 (225-1)
- ✅ Stock Card for ARV-2026-0901 shows:
  ```
  DATE   | DISPENSED | BALANCE
  8/23   |     1     |   74
  ```

**Try to Use Wrong Batch (Should Fail):**
- System should NOT allow manually selecting Batch #2 or #3
- FIFO batch (ARV-2026-0901) is locked and enforced

---

### Scenario 4: Deplete FIFO Batch (Auto-Rotation)

**Steps:**
1. Use all 74 remaining vials from Batch ARV-2026-0901
2. Use vaccine API call 74 times OR adjust stock to 0

**Expected Results:**
- ✅ Batch ARV-2026-0901 status changes to `depleted`
- ✅ **New FIFO Priority**: Batch ARV-2026-0823 becomes Rank #1 with 🟢 badge
- ✅ Next vaccine usage automatically selects ARV-2026-0823
- ✅ FIFO Compliance Report updates rankings

---

### Scenario 5: Expiring Soon Warning

**Steps:**
1. Add a batch with near expiration:
   - Vaccine Type: `Tetanus Toxoid`
   - Batch Number: `TT-2026-0823`
   - Quantity: `30`
   - Expiration Date: `2026-09-15` (23 days from now)

**Expected Results:**
- ✅ Batch shows "🟠 Expires Soon" warning
- ✅ Days countdown: "(23d)" displayed
- ✅ Statistics: "Expiring Soon" counter increments
- ✅ FIFO Compliance Report shows orange status badge

---

### Scenario 6: Adjust Stock (Admin)

**Steps:**
1. Select a batch in inventory table
2. Click **Actions → Adjust Stock**
3. Select Transaction Type: `expired`
4. Enter Quantity: `10`
5. Enter Remarks: `Batch damaged during storage`
6. Click **Submit**

**Expected Results:**
- ✅ Quantity decreases by 10
- ✅ Transaction created (type='expired', expired=10)
- ✅ Stock Card shows:
  ```
  DATE   | EXPIRED | BALANCE
  8/23   |   10    |  [new balance]
  ```
- ✅ Running balance recalculates correctly

---

### Scenario 7: Stock Card View & Print

**Steps:**
1. Navigate to **"📄 Stock Card"** tab
2. Select a batch from dropdown
3. Review stock card header:
   ```
   Republic of the Philippines
   PROVINCE OF MISAMIS ORIENTAL
   Office of the Provincial Health Officer
   MUNICIPAL HEALTH OFFICE
   
   STOCK CARD
   Name of vaccine/medicine: Anti-Rabies Vaccine (Verorab)
   Lot number: ARV-2026-0901
   Month & Year: August 2026
   Expiry Date: Dec 1, 2026
   ```
4. Review transaction table (matches DOH format)
5. Click **🖨️ Print Stock Card**

**Expected Results:**
- ✅ Header shows clinic name from auth context
- ✅ All transactions display in correct columns
- ✅ Running balance calculates correctly
- ✅ Print preview matches DOH format (A4 size)
- ✅ No demo data visible

---

### Scenario 8: Empty State Handling

**Steps:**
1. Delete all vaccine inventory (fresh database)
2. Navigate to Vaccine Inventory page

**Expected Results:**
- ✅ Statistics show all zeros
- ✅ Empty state message: "No vaccine inventory found. Click 'Add Stock' to begin."
- ✅ No errors or crashes
- ✅ "Add Stock" button prominently displayed

---

### Scenario 9: Multiple Vaccine Types

**Steps:**
1. Add batches for different vaccine types:
   - Anti-Rabies Vaccine (3 batches)
   - Tetanus Toxoid (2 batches)
   - ERIG (1 batch)

**Expected Results:**
- ✅ FIFO Compliance Report shows 3 separate sections
- ✅ Each vaccine type has independent FIFO rankings
- ✅ Using Anti-Rabies doesn't affect Tetanus FIFO order
- ✅ Statistics aggregate all types correctly

---

### Scenario 10: Clinic-Specific Isolation

**Steps:**
1. Login as Clinic A user
2. Add vaccine batch
3. Logout
4. Login as Clinic B user
5. View vaccine inventory

**Expected Results:**
- ✅ Clinic B sees ONLY their own inventory
- ✅ Clinic A's batches are NOT visible to Clinic B
- ✅ Statistics are clinic-specific
- ✅ FIFO rankings are per-clinic

---

## 🔍 Error Handling Tests

### Test 1: API Failure
```bash
# Stop backend server
# Open frontend Vaccine Inventory page
```
**Expected:** Error snackbar appears, empty state shown, no crash

### Test 2: Invalid Batch Number
```bash
# Add batch with duplicate batch_number
```
**Expected:** Backend validation error, user-friendly message

### Test 3: Insufficient Stock
```bash
# Try to use 100 vials when only 50 available
```
**Expected:** Error message: "Insufficient stock for the selected vaccine type"

### Test 4: Missing Required Fields
```bash
# Submit Add Stock form with empty vaccine type
```
**Expected:** Form validation error highlights field in red

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (see above scenarios)
- [ ] TypeScript compilation: `npm run type-check` (no errors)
- [ ] Production build: `npm run build` (success)
- [ ] Database migrations applied: `php artisan migrate:status`
- [ ] No demo/mock data remaining in code
- [ ] Environment variables configured (.env)
- [ ] API endpoints tested with Postman/curl

### Deployment Steps

#### Backend Deployment
```bash
cd backend

# 1. Backup database
php artisan backup:run

# 2. Run migrations
php artisan migrate --force

# 3. Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# 4. Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Restart services
sudo systemctl restart php-fpm
sudo systemctl restart nginx
```

#### Frontend Deployment
```bash
cd frontend

# 1. Build for production
npm run build

# 2. Copy dist/ to web server
scp -r dist/* user@server:/var/www/html/

# OR deploy to static hosting (Netlify, Vercel, etc.)
```

### Post-Deployment Verification

- [ ] Login successful
- [ ] Vaccine Inventory page loads
- [ ] Add Stock button works
- [ ] FIFO Compliance tab loads
- [ ] Stock Card tab loads
- [ ] No console errors in browser DevTools
- [ ] API calls return 200 status codes
- [ ] Clinic name displays correctly (not "Loading...")

---

## 📊 Performance Benchmarks

### Expected Load Times
| Operation | Target | Acceptable | Action Needed |
|-----------|--------|------------|---------------|
| Inventory Page Load | <500ms | <1s | Optimize if >1s |
| Add Stock | <300ms | <500ms | Investigate if >500ms |
| FIFO Compliance Report | <800ms | <1.5s | Add pagination if >1.5s |
| Stock Card Load | <600ms | <1s | Optimize queries if >1s |
| Statistics API | <200ms | <400ms | Add caching if >400ms |

### Database Query Optimization
```sql
-- Verify indexes exist
SHOW INDEX FROM vaccine_inventory;

-- Expected indexes:
-- - PRIMARY KEY (inventory_id)
-- - INDEX (vaccine_type)
-- - INDEX (expiration_date)
-- - INDEX (status)
-- - INDEX (clinic_id)
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: FIFO batch not auto-selecting
**Symptoms:** Dropdown shows vaccine type but batch details don't load

**Solutions:**
```bash
# Check backend logs
tail -f backend/storage/logs/laravel.log

# Test FIFO endpoint directly
curl -X GET "http://localhost:8000/api/inventory/next-fifo-batch?vaccine_type=Anti-Rabies" \
  -H "Authorization: Bearer TOKEN"

# Verify batch status
SELECT * FROM vaccine_inventory WHERE status = 'active' AND current_quantity > 0;
```

### Issue 2: Stock Card shows no transactions
**Symptoms:** Stock card table is empty even after adding stock

**Solutions:**
```sql
-- Check if transactions were created
SELECT * FROM inventory_transactions WHERE inventory_id = [ID];

-- Verify transaction endpoint
curl -X GET "http://localhost:8000/api/inventory/[ID]/transactions" \
  -H "Authorization: Bearer TOKEN"
```

### Issue 3: Clinic name shows "Loading..."
**Symptoms:** Clinic name doesn't display after login

**Solutions:**
```typescript
// Check AuthContext
console.log('Auth Context:', useAuth());

// Verify clinic data in localStorage
console.log('Clinic Data:', localStorage.getItem('clinicData'));
```

### Issue 4: FIFO rankings incorrect
**Symptoms:** Batch with later expiry date shows as Rank #1

**Solutions:**
```sql
-- Check expiration dates and FIFO query
SELECT vaccine_type, batch_number, expiration_date, created_at
FROM vaccine_inventory
WHERE status = 'active' AND current_quantity > 0
ORDER BY expiration_date ASC, created_at ASC;
```

---

## 📞 Support Resources

### Documentation
- Technical Docs: `VACCINE_MANAGEMENT_FIFO_SYSTEM.md`
- User Guide: `VACCINE_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- Backend Alignment: `INVENTORY_BACKEND_ALIGNMENT.md`
- Visual Diagrams: `FIFO_SYSTEM_DIAGRAM.md`

### Quick Reference
```bash
# View Laravel logs
tail -f backend/storage/logs/laravel.log

# Check API response
curl -X GET "http://localhost:8000/api/inventory" -H "Authorization: Bearer TOKEN" | jq

# Restart development server
cd backend && php artisan serve
cd frontend && npm run dev
```

---

## ✅ Final Checklist Before Go-Live

### Code Quality
- [ ] No `console.log()` statements in production code
- [ ] No `TODO` or `FIXME` comments for critical features
- [ ] All TypeScript `any` types have been reviewed
- [ ] Error messages are user-friendly
- [ ] Loading states implemented for all async operations

### Security
- [ ] API endpoints require authentication
- [ ] Clinic isolation enforced (users see only their clinic's data)
- [ ] Input validation on both frontend and backend
- [ ] SQL injection prevention (using Eloquent ORM)
- [ ] XSS protection (React automatic escaping)

### User Experience
- [ ] Empty states guide users to next action
- [ ] Error messages are clear and actionable
- [ ] Success messages confirm completed actions
- [ ] Loading spinners prevent multiple submissions
- [ ] FIFO badges are visually distinct and clear

### Data Integrity
- [ ] FIFO enforcement cannot be bypassed
- [ ] Running balance calculates correctly
- [ ] Transactions are atomic (no partial updates)
- [ ] Audit trail is complete (all changes logged)
- [ ] Batch depletion triggers status change

---

**Testing Date:** August 23, 2026  
**Status:** Ready for UAT (User Acceptance Testing)  
**Next Phase:** Train staff, conduct pilot testing, collect feedback
