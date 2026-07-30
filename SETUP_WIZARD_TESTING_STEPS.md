# Setup Wizard - Quick Testing Steps

**Ready to test?** Follow these steps:

---

## 🧪 Quick Test (5 minutes)

### Step 1: Reset Database (For Testing Only!)

```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
php artisan migrate:fresh
```

**⚠️ WARNING**: This deletes ALL data! Only for testing!

### Step 2: Start Backend

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### Step 3: Start Frontend

Open another terminal:
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
npm run dev
```

### Step 4: Open Browser

Visit: `http://localhost:5173/setup` (or your frontend URL)

### Step 5: Complete Setup Wizard

**Click "Start Setup"**

**Step 1 - Admin Account**:
- Clinic Name: `Tagoloan RHU`
- Admin Name: `Dr. Juan Dela Cruz`
- Admin Email: `admin@tagoloan.com`
- Password: `Admin123`
- Confirm Password: `Admin123`
- Click **"Next"**

**Step 2 - Customize** (optional, can skip):
- Just click **"Next"**

**Step 3 - Clinic Profile**:
- Address: `Main Street, Tagoloan`
- Phone: `09123456789`
- Email: `contact@tagoloan.com`
- Click **"Next"**

**Step 4 - Confirm**:
- Review information
- Click **"Complete Setup"**
- Confirm in modal

**Step 5 - Done**:
- Should show success
- Redirects to dashboard

### Step 6: Test Login

1. Log out (if not auto-redirected)
2. Go to login page
3. Email: `admin@tagoloan.com`
4. Password: `Admin123`
5. Click Login
6. ✅ Should log in successfully!

---

## ✅ Expected Results

After completing setup:

**In Database:**
```sql
-- Check clinic created
SELECT * FROM clinics;  
-- Should show: Tagoloan RHU

-- Check admin created
SELECT * FROM users;
-- Should show: Dr. Juan Dela Cruz, admin@tagoloan.com

-- Check module config created
SELECT * FROM clinic_module_configs;
-- Should show: triage_module_enabled = 1
```

**In Browser:**
- localStorage has 'authToken'
- localStorage has 'userData'
- localStorage has 'clinicData'

---

## 🚨 Troubleshooting

### "Setup already completed" message?
Database not empty. Run: `php artisan migrate:fresh`

### Step 1 submit doesn't work?
Check browser console for errors. Backend should be running on port 8000.

### Password validation error?
Password needs: 8+ chars, uppercase, lowercase, and number.
Example: `Admin123`

### Cannot login after setup?
Check if user was created:
```sql
SELECT * FROM users WHERE email = 'admin@tagoloan.com';
```

---

## 🎉 Success!

If you can complete setup AND log in with the created credentials, the implementation is working perfectly! ✅
