# 🧪 Queue Workflow - Quick Testing Guide

**Purpose**: Test the new clinical forms integration in Patient Queue  
**Time Required**: 10-15 minutes  
**Prerequisites**: Database seeded with test patients in queue

---

## 🚀 Quick Start

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Access the Queue
- Open: `http://localhost:5173/queue`
- Or: Dashboard → Click "Patient Queue" in sidebar

---

## 👨‍⚕️ Test as Doctor (Triage Role)

### Step 1: Login
Use the quick login button on login page:
- Click **"Triage Doctor"** button
- Credentials: `doctor@clinic.local` / `password123`

### Step 2: Navigate to Queue
- You should see the queue dashboard
- Look for the **"CLINICAL FORMS"** column (second to last)

### Step 3: Verify Form 2 Button
**What to look for**:
- ✅ Green "Edit" button with icon in "CLINICAL FORMS" column
- ✅ Tooltip on hover: "Edit Form 2 (Individual Treatment)"
- ✅ Only shows for active patients (waiting/in_consultation)
- ✅ Completed patients show "—"

### Step 4: Open Form 2
- Click the green Edit button on any patient
- **Expected**: Modal opens with title "Form 2: Individual Treatment Record"

### Step 5: Verify Form 2 Contents
**Check these sections**:

✅ **Alert Banner at Top**:
- Shows patient name
- Shows queue number

✅ **Section 1: Patient & Registration**:
- Date field (pre-filled with today)
- Registry No. (pre-filled with patient number)
- Hospital No. (optional)
- Referred by (optional)
- PhilHealth PIN (optional)

✅ **Section 2: Exposure Details**:
- Exposure Category: I, II, III (radio buttons) ⭐ IMPORTANT
- Date of Exposure
- Date Treatment Started
- Place of Exposure

✅ **Section 3: Exposure Details (Detailed)**:
- Mode of Exposure (5 checkboxes)
- Body Part Affected (3 radio options)
- Type of Animal (Dog or Others with text field)
- Past History (Yes/No with nested question)

### Step 6: Fill the Form
**Try this**:
1. Select **Category II**
2. Set Date of Exposure: Today's date
3. Set Place of Exposure: "Patient's Home"
4. Check "Transdermal Bite"
5. Select "Other parts of the body"
6. Select "Dog"
7. Select "No" for past history

### Step 7: Save
- Click **"Save Form 2"** button (green)
- **Expected**: 
  - Toast message: "Treatment record saved successfully"
  - Modal closes
  - Queue table refreshes

### Step 8: Cancel Test
- Open Form 2 again
- Fill some fields
- Click **"Cancel"**
- **Expected**: Modal closes without saving (no toast)

---

## 👩‍⚕️ Test as Nurse (Treatment Role)

### Step 1: Logout and Login
- Click logout button (bottom of sidebar)
- Use quick login: Click **"Treatment Nurse"** button
- Credentials: `nurse@clinic.local` / `password123`

### Step 2: Navigate to Queue
- Go to Patient Queue again
- Look for the **"CLINICAL FORMS"** column

### Step 3: Verify Form 3 Button
**What to look for**:
- ✅ Blue "Edit" button with icon in "CLINICAL FORMS" column
- ✅ Tooltip on hover: "Edit Form 3 (Vaccination Record)"
- ✅ Only shows for active patients
- ❌ NO green Form 2 button (doctor only)

### Step 4: Open Form 3
- Click the blue Edit button on any patient
- **Expected**: Modal opens with title "Form 3: Vaccination Record"

### Step 5: Verify Form 3 Contents
**Check these sections**:

✅ **Alert Banner**:
- Patient name
- Queue number

✅ **Vaccination Record Table**:
- 6 rows: Day 0, Day 3, Day 7, Day 28, Booster 1, Booster 2
- Columns: Period | Route | Date | Given by | Signature
- Route has ID/IM radio buttons

✅ **Info Alert Below Table**:
- Explains ID = Intradermal, IM = Intramuscular
- Note about filling only administered doses

✅ **Additional Medications**:
- ERIG checkbox (with description)
- TT checkbox (with description)
- ATS checkbox (with description)

✅ **Diagnosis**:
- ICD 10 Code text field
- Helper text explaining the code

### Step 6: Fill the Vaccination Table
**Try this**:
1. **Day 0 row**:
   - Route: Select **IM**
   - Date: Today's date
   - Given by: Your name (e.g., "Nurse Maria")
   - Signature: "M. Santos"

2. Leave Day 3, 7, 28, Boosters blank (not yet given)

3. **Additional Medications**:
   - Check "TT" (Tetanus Toxoid)

4. **ICD 10 Code**:
   - Enter "W54.0" (Dog bite)

### Step 7: Save
- Click **"Save Form 3"** button (blue)
- **Expected**:
  - Toast message: "Vaccination record saved successfully"
  - Modal closes
  - Queue refreshes

### Step 8: Cancel Test
- Open Form 3 again
- Fill Day 3 row
- Click **"Cancel"**
- **Expected**: Modal closes without saving

---

## 👔 Test as Admin

### Step 1: Login as Admin
- Use quick login: Click **"Administrator"** button
- Credentials: `admin@clinic.local` / `password123`

### Step 2: Verify Both Buttons
- Go to Patient Queue
- **Expected**: 
  - ✅ GREEN button (Form 2)
  - ✅ BLUE button (Form 3)
  - ✅ Both have tooltips
  - ✅ Both are clickable

### Step 3: Test Both Forms
- Click green button → Form 2 opens ✅
- Close it
- Click blue button → Form 3 opens ✅
- Close it

---

## 📋 Registration Staff Test

### Step 1: Login as Registration
- Use quick login: Click **"Registration Staff"** button
- Credentials: `registration@clinic.local` / `password123`

### Step 2: Verify NO Clinical Buttons
- Go to Patient Queue
- **Expected**:
  - ❌ NO green Form 2 button
  - ❌ NO blue Form 3 button
  - ✅ "CLINICAL FORMS" column shows "—"
  - ✅ "QUEUE ACTIONS" column still works (Call/Cancel buttons)

---

## ✅ Visual Verification Checklist

### Queue Table
- [ ] "CLINICAL FORMS" column exists (2nd to last)
- [ ] "QUEUE ACTIONS" column exists (last)
- [ ] Buttons only show for active patients
- [ ] Completed/cancelled patients show "—"

### Doctor View
- [ ] Green Edit button appears
- [ ] Tooltip says "Edit Form 2 (Individual Treatment)"
- [ ] Button hover changes to darker green

### Nurse View
- [ ] Blue Edit button appears
- [ ] Tooltip says "Edit Form 3 (Vaccination Record)"
- [ ] Button hover changes to darker blue

### Admin View
- [ ] Both buttons appear (green + blue)
- [ ] Both tooltips work
- [ ] Both forms open correctly

### Registration View
- [ ] No clinical form buttons
- [ ] Queue management buttons still work

---

## 🎨 Visual Design Check

### Form 2 (Doctor)
- [ ] Title bar is GREEN (#f0fdf4 background)
- [ ] Title says "Form 2: Individual Treatment Record"
- [ ] Alert banner is blue with patient info
- [ ] Section headers are green with bold text
- [ ] Save button is green with save icon
- [ ] Cancel button is gray

### Form 3 (Nurse)
- [ ] Title bar is BLUE (#eff6ff background)
- [ ] Title says "Form 3: Vaccination Record"
- [ ] Alert banner is blue with patient info
- [ ] Section headers are blue with bold text
- [ ] Table has clean bordered layout
- [ ] Info alert below table (blue)
- [ ] Save button is blue with save icon
- [ ] Cancel button is gray

---

## 🐛 Common Issues to Check

### Button Not Showing
- ✅ Check user role in localStorage (F12 → Application → Local Storage → userData)
- ✅ Verify patient status is "waiting" or "in_consultation"
- ✅ Refresh the page

### Modal Not Opening
- ✅ Check browser console for errors (F12 → Console)
- ✅ Verify imports are correct
- ✅ Check that form components exist

### Save Button Not Working
- ✅ Check console for errors
- ✅ Toast message should still appear (frontend works, backend TODO)
- ✅ Modal should close

### Forms Look Broken
- ✅ Check Material-UI is installed
- ✅ Verify all imports
- ✅ Check for CSS conflicts

---

## 📸 Screenshot Checklist

### Queue Table Screenshot
Should show:
- All columns including "CLINICAL FORMS"
- Edit button (green or blue based on role)
- Proper spacing and alignment

### Form 2 Screenshot
Should show:
- Green title bar
- All 3 sections visible
- Patient alert at top
- Clean form layout with proper spacing
- Save/Cancel buttons at bottom

### Form 3 Screenshot
Should show:
- Blue title bar
- Vaccination table with 6 rows
- Additional medications checkboxes
- ICD 10 code field
- Info alert below table
- Save/Cancel buttons at bottom

---

## ⚡ Quick Test Script (2 minutes)

```bash
# 1. Login as doctor
# 2. Go to queue
# 3. Click green Edit button
# 4. Verify Form 2 opens
# 5. Close modal
# 6. Logout
# 7. Login as nurse
# 8. Click blue Edit button
# 9. Verify Form 3 opens
# 10. Fill Day 0 vaccine
# 11. Click Save
# 12. Verify toast appears
# 13. Done!
```

---

## 🎯 Success Criteria

### ✅ Test Passes If:
1. Role-based buttons appear correctly
2. Forms open without errors
3. Forms look clean and organized
4. All fields are accessible
5. Save shows success toast
6. Cancel closes without saving
7. Queue refreshes after save

### ❌ Test Fails If:
1. Wrong buttons show for roles
2. Forms don't open
3. Console shows errors
4. Fields are missing
5. Save button doesn't work
6. Layout is broken
7. Buttons overlap or misaligned

---

## 📝 Report Template

After testing, report:

```
✅ PASSED / ❌ FAILED

Role Tested: [Doctor / Nurse / Admin / Registration]
Browser: [Chrome / Firefox / Edge]

What Worked:
- [List things that worked]

What Failed:
- [List things that failed]

Console Errors:
- [Copy any errors from console]

Screenshots:
- [Attach if possible]

Additional Notes:
- [Any other observations]
```

---

**Testing Time**: ~10-15 minutes for all roles  
**Ready**: Yes ✅  
**Backend**: Forms work but don't save to database yet (expected)

🎉 **Happy Testing!**
