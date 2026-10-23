# Phase 2 Part 1 - Testing Guide

## 🧪 Quick Testing Instructions

**Time Required**: 5-10 minutes

---

## 🚀 Step 1: Start Dev Server

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 🔐 Step 2: Login

1. Open browser: http://localhost:5173
2. Login with test credentials:
   ```
   Email: admin@clinic.com
   Password: password123
   ```

---

## 📊 Step 3: Test Dashboard (Most Important)

### Admin Dashboard
- **Location**: Should load automatically after login
- **Check**: 4 stat cards at top:
  - Total Patients (blue/info)
  - Active Cases (red/error)
  - Pending Vaccinations (yellow/warning)
  - Today's Queue (green/success)

**Visual Check**:
- [ ] All 4 cards display with donut chart design
- [ ] Values show in center of donut (numbers)
- [ ] Labels show below donut
- [ ] Colors are correct
- [ ] No layout issues

### Other Dashboards (Quick Check)
Test by changing user role or using different accounts:

**Registration Dashboard** (`registration@clinic.com / password123`):
- [ ] 2 stat cards display correctly

**Triage Dashboard** (`triage@clinic.com / password123`):
- [ ] 4 stat cards display correctly

**Treatment Dashboard** (`treatment@clinic.com / password123`):
- [ ] 2 stat cards display correctly

---

## 💉 Step 4: Test Inventory Page

1. Navigate to: **Inventory** → **Vaccine Inventory**
2. Check top row: 5 stat cards
   - Active Batches (success/green)
   - Total Vials (info/blue)
   - Patients Coverable (success/green)
   - Expiring Soon (warning/yellow)
   - Depleted (error/red)

**Visual Check**:
- [ ] All 5 cards display
- [ ] Donut chart design
- [ ] Correct colors
- [ ] Values display properly

---

## 📋 Step 5: Test Queue Page

1. Navigate to: **Queue Management**
2. Check top row: 4 stat cards
   - Total in Queue (info)
   - Waiting (warning)
   - In Consultation (primary)
   - Completed (success)

**Visual Check**:
- [ ] All 4 cards display
- [ ] Donut chart design
- [ ] Consistent with other pages

---

## 🔍 Step 6: Check Browser Console

Press `F12` to open DevTools → Console tab

**Expected**:
- [ ] No errors (red messages)
- [ ] No warnings about missing components
- [ ] No import errors

**Common Issues to Ignore**:
- CORS warnings (if any) - normal in development
- React DevTools messages - normal

---

## ✅ Success Criteria

Part 1 passes if:
- ✅ All stat cards display with donut chart design
- ✅ No visual regressions (looks the same as before)
- ✅ Colors are correct on all pages
- ✅ Zero console errors
- ✅ All pages load without issues

---

## 🐛 If You Find Issues

### Issue: Cards don't display
**Check**: 
- Is dev server running?
- Any errors in console?
- Try refreshing the page

### Issue: Wrong colors
**Check**:
- Which page? (Dashboard, Inventory, Queue?)
- Screenshot the issue
- Check browser console for errors

### Issue: Layout broken
**Check**:
- Does it happen on all pages or just one?
- Try clearing browser cache (Ctrl+Shift+R)
- Check console for CSS errors

---

## 📸 Visual Reference

### Expected Donut Design:
```
   ┌─────────────┐
   │   ╭───╮     │
   │  ╱ 72% ╲    │
   │ │   42  │   │  ← Number in center
   │  ╲     ╱    │
   │   ╰───╯     │
   │             │
   │  Active     │  ← Label text
   │  Batches    │
   └─────────────┘
```

### Color Reference:
- **Blue** (info) - Total Patients, Total Vials
- **Green** (success) - Today's Queue, Active Batches
- **Yellow** (warning) - Pending Vaccinations, Expiring Soon
- **Red** (error) - Active Cases, Depleted
- **Purple** (primary) - In Consultation

---

## 🎯 After Testing

### If All Tests Pass ✅
1. Close dev server (Ctrl+C)
2. Ready to proceed to **Part 2: Modal Consolidation**
3. Or commit changes:
   ```bash
   git add .
   git commit -m "refactor(frontend): consolidate StatCard component (Phase 2 Part 1)"
   ```

### If Issues Found ❌
1. Document the issues
2. Take screenshots
3. Check console errors
4. Report back for fixes

---

## 📞 Need Help?

If you encounter issues:
1. Note which page has the problem
2. Check browser console for errors
3. Take a screenshot
4. Share the error message

---

**Quick Test (30 seconds)**:
```bash
# Start server
cd frontend && npm run dev

# Open browser, login
# Check Dashboard (4 cards)
# Check Inventory (5 cards)  
# Check console (no errors)
```

**That's it!** If those 3 things look good, Part 1 is successful! ✅
