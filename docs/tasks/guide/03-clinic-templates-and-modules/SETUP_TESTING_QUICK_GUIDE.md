# Setup Wizard - Quick Testing Guide

## What Was Fixed?
The setup wizard now works on fresh installs! Previously it redirected to the landing page because it required authentication, but fresh installs have no users to authenticate with. Now it's accessible without authentication.

## Quick Test (Fresh Install)

### Step 1: Reset Database
```bash
cd backend
php artisan migrate:fresh
```

### Step 2: Start Backend
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```

### Step 4: Test Setup Wizard Access
1. Open browser: `http://localhost:3000/`
2. Click **"Staff Sign In"** button
3. **EXPECTED**: Setup wizard appears (not login page!)

### Step 5: Complete Setup
**Step 1 - Admin Account:**
- Clinic Name: `Tagoloan RHU`
- Admin Name: `Dr. Admin`
- Admin Email: `admin@clinic.com`
- Password: `Admin123`
- Confirm Password: `Admin123`
- Click **"Next"**

**Step 2 - Customize:**
- Keep defaults or customize
- Click **"Next"**

**Step 3 - Clinic Profile:**
- Address: `123 Main St, Tagoloan`
- Phone: `09123456789`
- Email: `contact@clinic.com`
- Click **"Next"**

**Step 4 - Confirm:**
- Review information
- Click **"Complete Setup"**

**EXPECTED**: Redirected to dashboard ✅

### Step 6: Test Normal Login (After Setup)
1. Click **"Sign Out"**
2. Go to `http://localhost:3000/`
3. Click **"Staff Sign In"**
4. **EXPECTED**: Login page appears (NOT setup wizard)
5. Login:
   - Email: `admin@clinic.com`
   - Password: `Admin123`
6. **EXPECTED**: Dashboard loads successfully ✅

## What to Watch For

### ✅ SUCCESS INDICATORS:
- Fresh install redirects to `/setup` (not `/login`)
- Setup wizard shows "Create Admin Account" as Step 1
- After Step 1, you're authenticated for Steps 2-4
- After completing setup, dashboard loads
- Subsequent logins show login page (not setup wizard)

### ❌ FAILURE INDICATORS:
- Fresh install redirects to landing page instead of setup wizard
- "Unauthorized" or "401" errors during setup
- Setup wizard doesn't appear after clicking "Staff Sign In"

## Troubleshooting

### Issue: Still redirects to landing page
**Solution**: Clear browser cache and localStorage
```javascript
// In browser console (F12):
localStorage.clear();
location.reload();
```

### Issue: Backend errors during Step 1
**Check**: Database is truly empty
```bash
cd backend
php artisan migrate:fresh  # Full reset
```

### Issue: Frontend won't start
**Solution**: 
```bash
cd frontend
npm install  # Reinstall dependencies
npm run dev
```

## Backend API Endpoints (Reference)

### Public (No Auth Required):
- `GET /api/setup/check-needed` - Check if setup is needed
- `POST /api/setup/initialize` - Create clinic + admin (Step 1)

### Protected (Token Required):
- `PUT /api/setup/clinic` - Update clinic info (Steps 2-3)
- `POST /api/setup/complete` - Mark setup complete (Step 4)

---

**Ready to test!** Let me know if the setup wizard appears correctly.
