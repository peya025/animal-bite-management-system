# Setup Wizard Flow Diagram

## BEFORE FIX (BROKEN) ❌

```
Fresh Install → Landing Page → "Staff Sign In" Clicked
                                        ↓
                               App.tsx loads
                                        ↓
                          Check: isAuthenticated()?
                                        ↓
                                      NO ❌
                                        ↓
                         Redirect to /login
                                        ↓
                            Login Page Loads
                                        ↓
                      User enters credentials... 
                                        ↓
                          NO USERS EXIST! ❌
                                        ↓
                            Login FAILS
                                        ↓
                    DEADLOCK: Can't access setup wizard
```

**Problem**: Authentication check happens BEFORE setup check, but there are no users to authenticate with.

---

## AFTER FIX (WORKING) ✅

### Fresh Install (No Users)

```
Fresh Install → Landing Page → "Staff Sign In" Clicked
                                        ↓
                               App.tsx loads
                                        ↓
                    PUBLIC CHECK: /api/setup/check-needed
                                        ↓
                      Backend: clinics table empty?
                                        ↓
                                     YES ✅
                                        ↓
                     Return: { needs_setup: true }
                                        ↓
                  Redirect to /setup (PUBLIC ROUTE)
                                        ↓
                        Setup Wizard Loads ✅
                                        ↓
                         ┌─────────────────────┐
                         │  Step 1: Admin      │
                         │  - Clinic Name      │
                         │  - Admin Email      │
                         │  - Password         │
                         └─────────────────────┘
                                        ↓
                    POST /api/setup/initialize
                                        ↓
                  Backend creates: Clinic + Admin User
                                        ↓
                    Returns: JWT Token + User Data ✅
                                        ↓
                    Store token in localStorage
                                        ↓
                         ┌─────────────────────┐
                         │  Step 2-4:          │
                         │  (Authenticated)    │
                         │  - Customize        │
                         │  - Clinic Profile   │
                         │  - Confirm          │
                         └─────────────────────┘
                                        ↓
                        Setup Complete ✅
                                        ↓
                     Redirect to Dashboard
```

### Normal Operation (After Setup)

```
User Visit → Landing Page → "Staff Sign In" Clicked
                                        ↓
                               App.tsx loads
                                        ↓
                    PUBLIC CHECK: /api/setup/check-needed
                                        ↓
                      Backend: clinics table has data?
                                        ↓
                                     YES ✅
                                        ↓
                    Return: { needs_setup: false }
                                        ↓
                     Proceed to normal auth flow
                                        ↓
                    Check: isAuthenticated()?
                                        ↓
                                      NO
                                        ↓
                         Redirect to /login
                                        ↓
                            Login Page Loads ✅
                                        ↓
                          User enters credentials
                                        ↓
                          Backend validates login
                                        ↓
                        Returns: JWT Token + User Data
                                        ↓
                            Dashboard Loads ✅
```

---

## Key Changes Summary

### 1. Setup Check Order
**Before**: Auth Check → Setup Check (WRONG - deadlock!)
**After**: Setup Check → Auth Check (RIGHT - works!)

### 2. Setup Route Access
**Before**: `/setup` requires authentication (ProtectedRoute)
**After**: `/setup` is PUBLIC (no authentication required)

### 3. API Call Sequence
**Before**:
```
1. Check auth → FAIL (no users)
2. Never reaches setup check
```

**After**:
```
1. Check if setup needed (PUBLIC API) → YES
2. Redirect to setup wizard (PUBLIC route)
3. Create admin account
4. Get auth token
5. Continue with authenticated steps
```

---

## State Management

### App.tsx State Flow

```typescript
// NEW: Track setup check completion
const [setupCheckDone, setSetupCheckDone] = useState(false);

// Effect 1: PUBLIC setup check (NO AUTH)
useEffect(() => {
  fetch('/api/setup/check-needed')  // PUBLIC endpoint
    .then(data => {
      if (data.needs_setup) {
        redirect('/setup');  // PUBLIC route
      }
      setSetupCheckDone(true);
    });
}, []);

// Effect 2: User authentication (AFTER setup check)
useEffect(() => {
  if (!setupCheckDone) return;  // ← WAIT for setup check
  
  if (!isAuthenticated()) {
    redirect('/login');
  }
  // ... load user data
}, [setupCheckDone]);  // ← Depends on setup check
```

---

## Security Model

### Public Endpoints (No Token)
```
GET  /api/setup/check-needed    → { needs_setup: boolean }
POST /api/setup/initialize      → { token, user, clinic }
     ↑
     └── Only works if clinics table is empty
     └── Rate limited: 5 requests / 60 minutes
     └── Validates password strength
```

### Protected Endpoints (Token Required)
```
PUT  /api/setup/clinic     → Update clinic info
POST /api/setup/complete   → Mark setup done
     ↑
     └── Requires: Authorization: Bearer {token}
     └── Token from /api/setup/initialize
```

---

## Testing Flow

### Test 1: Fresh Install
```
START → migrate:fresh
     ↓
Empty database (0 clinics, 0 users)
     ↓
Visit landing page
     ↓
Click "Staff Sign In"
     ↓
EXPECTED: Setup wizard (NOT login page) ✅
```

### Test 2: Complete Setup
```
Setup wizard Step 1
     ↓
Fill in: clinic name, admin email, password
     ↓
Click "Next"
     ↓
EXPECTED: Step 2 loads (authenticated) ✅
     ↓
Complete Steps 2-4
     ↓
EXPECTED: Dashboard loads ✅
```

### Test 3: Normal Login
```
Sign out
     ↓
Visit landing page
     ↓
Click "Staff Sign In"
     ↓
EXPECTED: Login page (NOT setup wizard) ✅
     ↓
Enter: admin@clinic.com / Admin123
     ↓
EXPECTED: Dashboard loads ✅
```

---

## Diagram Legend

```
✅ = Success / Expected behavior
❌ = Error / Broken behavior
→  = Flow direction
↓  = Next step
┌─┐
│ │ = Process/Component box
└─┘
```

---

**Read this diagram to understand how the fix works!**
