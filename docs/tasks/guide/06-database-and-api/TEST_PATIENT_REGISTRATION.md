# 🧪 Test Patient Registration - Quick Guide

**Time**: 5 minutes  
**Purpose**: Verify Form 1 is the only form showing and backend connection works

---

## 🚀 Quick Test (2 minutes)

### 1. Start Backend
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Login
- Go to `http://localhost:5173/login`
- Click **"Registration Staff"** quick login button
- Credentials: `registration@clinic.local` / `password123`

### 4. Open Patient Registration
- Click "Patient Registration (Form 1)" in sidebar
- Click **"Add Patient"** button (green, top right)

### 5. Verify Form
**Expected**:
- ✅ Modal opens
- ✅ Title: "Patient Registration"
- ✅ Subtitle: "Form 1 — Patient Enrolment"
- ✅ **NO TABS** (no Form 2, Form 3 buttons)
- ✅ Only one form visible (Patient Information sections)

### 6. Quick Add Patient
Fill these required fields:
- **Last Name**: Cruz
- **First Name**: Juan
- **Sex**: Male ● (click radio button)
- **Date of Birth**: 1990-01-01
- **Municipality**: Select "Tagoloan" from dropdown
- **Barangay**: Select "Poblacion" from dropdown

### 7. Save
- Click **"Save Patient Record"** button (green, bottom right)
- **Expected**:
  - Button shows "Saving…"
  - Modal closes
  - Patient appears in table: "Juan Cruz"
  - Success!

---

## ✅ Success Criteria

**PASS if**:
1. ✅ Only Form 1 shows (no tabs)
2. ✅ Can fill required fields
3. ✅ Municipality dropdown works
4. ✅ Barangay dropdown populates
5. ✅ Save button works
6. ✅ Modal closes
7. ✅ Patient appears in list
8. ✅ Total count increases

**FAIL if**:
1. ❌ Tabs visible (Form 2, Form 3 buttons)
2. ❌ Multiple forms showing
3. ❌ Dropdown errors
4. ❌ Save button fails
5. ❌ Console errors

---

## 📊 Visual Check

### ✅ CORRECT (What you should see):
```
┌─────────────────────────────────────────────┐
│  Patient Registration              [×]      │
│  Form 1 — Patient Enrolment                 │
├─────────────────────────────────────────────┤
│                                             │
│  I. Patient Information                     │
│                                             │
│  Last Name*    First Name*   Middle  Suffix │
│  [_______]     [_______]     [____]  [___]  │
│                                             │
│  Sex*          Date of Birth*   Blood Type  │
│  ○Female       [__________]     [Select]    │
│  ●Male                                      │
│                                             │
│  ... more fields ...                        │
│                                             │
│  Residential Address — Misamis Oriental     │
│  Municipality*     Barangay*    Purok       │
│  [Select▾]         [Select▾]    [_____]     │
│                                             │
│  ... more sections ...                      │
│                                             │
├─────────────────────────────────────────────┤
│                     [Cancel] [Save Patient] │
└─────────────────────────────────────────────┘
```

### ❌ INCORRECT (Should NOT see):
```
┌─────────────────────────────────────────────┐
│  Patient Record                    [×]      │
│  ┌────────┬────────┬────────┐              │  ← TABS (wrong!)
│  │Form 1  │Form 2  │Form 3  │              │
│  └────────┴────────┴────────┘              │
├─────────────────────────────────────────────┤
│  ... multiple forms ...                     │
└─────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Tabs Still Showing
**Fix**: Clear browser cache
```bash
# Chrome: Ctrl+Shift+Delete → Clear cached images
# Or: Hard refresh (Ctrl+F5)
```

### Issue: Municipality Dropdown Empty
**Check**: Internet connection (PSGC API needs internet)
```
Loading... → Wait a moment
Still empty → Check console for errors
```

### Issue: Save Button Disabled
**Check**:
- Fill Last Name ✓
- Fill First Name ✓
- Select Sex (click radio) ✓
- Fill Date of Birth ✓
- Select Municipality ✓
- Select Barangay ✓

### Issue: Backend Error
**Check backend terminal**:
```bash
# Should see:
POST /api/patients → 201 Created

# If 500 error:
php artisan migrate  # Run migrations
php artisan db:seed  # Seed users if needed
```

### Issue: "Unauthenticated" Error
**Re-login**:
- Logout (bottom of sidebar)
- Login again with Registration Staff

---

## 📸 Screenshot Test

Take screenshots of:
1. Modal with Form 1 (no tabs)
2. Filled form (before save)
3. Patient list after save (shows new patient)

---

## 🎯 Full Feature Test (5 minutes)

### Test All Fields

**Section I: Patient Information**
- [x] Last Name: "Dela Cruz"
- [x] First Name: "Juan"
- [x] Middle Name: "Santos"
- [x] Suffix: "Jr."
- [x] Sex: Male
- [x] DOB: 1990-01-01
- [x] Blood Type: O+
- [x] Mother's Maiden: "Santos, Maria"
- [x] Civil Status: Married
- [x] Spouse Name: "Ana Dela Cruz" (appears when married selected)

**Address**:
- [x] Municipality: Tagoloan
- [x] Barangay: Poblacion
- [x] Purok: "Purok 3"
- [x] Full address preview appears

**Contact**:
- [x] Contact Number: "09123456789"
- [x] Emergency Contact: "Maria Santos"
- [x] Emergency Phone: "09987654321"

**Socioeconomic**:
- [x] Education: College
- [x] Employment: Employed
- [x] Family Member: Father

**Section II: Government Programs**:
- [x] PhilHealth: Yes
  - [x] Status: Member
  - [x] No.: "12-345678901-2"
  - [x] Category: FE – Private
- [x] 4Ps: No
- [x] DSWD NHTS: No

**Save**:
- [x] Click "Save Patient Record"
- [x] Modal closes
- [x] Patient "Juan Santos Dela Cruz Jr." appears in table

---

## 🎉 Expected Result

After successful save:

**Patient List Table**:
```
┌──────────────────────────────────────────────────────────┐
│  Patient Management                    [Add Patient]     │
├──────────────────────────────────────────────────────────┤
│  Patient No.  │ Patient Name              │ Date Reg     │
│───────────────┼───────────────────────────┼──────────────│
│  P-2024-001   │ Juan Santos Dela Cruz Jr. │ Aug 1, 2026  │
│               │                           │              │
└──────────────────────────────────────────────────────────┘
```

**Stats Cards Update**:
- Total Patients: 1 (increased)
- Active Patients: 1 (increased)

---

## ✅ Final Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Logged in as registration staff
- [ ] Patient Registration page accessible
- [ ] Add Patient button works
- [ ] Modal shows Form 1 ONLY (no tabs)
- [ ] Required fields validated
- [ ] Municipality dropdown works
- [ ] Barangay dropdown works
- [ ] Conditional fields work (spouse, PhilHealth)
- [ ] Save creates patient successfully
- [ ] Patient appears in table
- [ ] Stats update correctly

---

**Testing Time**: ~5 minutes  
**Pass Criteria**: All checkboxes checked ✅

🎉 **Happy Testing!**
