# Setup Wizard Fix - Add Admin Account Creation

**Date**: January 27, 2026  
**Issue**: Current wizard requires authentication, but no users exist on first install  
**Solution**: Add admin account creation as Step 1 (before authentication required)

---

## 🎯 The Fix: Two-Phase Setup

### Phase A: Public Setup (No Auth Required)
**Step 1: Admin Account Creation**
- Create clinic
- Create first admin user
- Get authentication token
- Store token in localStorage

### Phase B: Authenticated Setup (Auth Required)
**Step 2: Customize**
**Step 3: Clinic Profile**
**Step 4: Confirm**
**Step 5: Done**

---

## 📝 Backend Changes Needed

### 1. Create Public Setup Endpoint

**File**: `backend/app/Http/Controllers/ClinicSetupController.php`

Add this method (NO auth middleware):

```php
/**
 * Initialize clinic with admin account
 * PUBLIC endpoint - no authentication required
 * Only works if NO clinics exist in database
 */
public function initialize(Request $request)
{
    // Security: Only allow if database is empty
    if (\App\Models\Clinic::count() > 0) {
        return response()->json([
            'message' => 'Setup has already been completed',
        ], 403);
    }

    $validated = $request->validate([
        'clinic_name' => 'required|string|max:255',
        'admin_name' => 'required|string|max:255',
        'admin_email' => 'required|email|unique:users,email',
        'admin_password' => 'required|string|min:8|confirmed',
    ]);

    try {
        DB::beginTransaction();

        // 1. Create clinic
        $clinic = \App\Models\Clinic::create([
            'name' => $validated['clinic_name'],
            'is_setup_complete' => false, // Will be completed in Step 2-5
        ]);

        // 2. Create admin user
        $admin = \App\Models\User::create([
            'clinic_id' => $clinic->id,
            'name' => $validated['admin_name'],
            'email' => $validated['admin_email'],
            'password' => Hash::make($validated['admin_password']),
            'role' => 'admin',
            'assigned_module' => 'all',
        ]);

        // 3. Create default module config
        \App\Models\ClinicModuleConfig::create([
            'clinic_id' => $clinic->id,
            'triage_module_enabled' => true,
            'field_rules' => [
                'bite_location' => 'required',
                'exposure_category' => 'required',
                'animal_status' => 'optional',
                'philhealth_info' => 'optional',
                'fourps_info' => 'optional',
                'wound_washing' => 'optional',
            ],
        ]);

        // 4. Create authentication token
        $token = $admin->createToken('setup-token')->plainTextToken;

        DB::commit();

        return response()->json([
            'message' => 'Clinic and admin account created successfully',
            'token' => $token,
            'user' => $admin->load('clinic'),
            'clinic' => $clinic,
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Failed to initialize setup',
            'error' => $e->getMessage(),
        ], 500);
    }
}
```

### 2. Add Public Route

**File**: `backend/routes/api.php`

Add BEFORE the auth:sanctum middleware group:

```php
// Public setup endpoint (no authentication required)
Route::post('/setup/initialize', [ClinicSetupController::class, 'initialize']);

// Check if setup is needed
Route::get('/setup/check-needed', function () {
    return response()->json([
        'needs_setup' => \App\Models\Clinic::count() === 0,
    ]);
});
```

---

## 🎨 Frontend Changes

### Update SetupWizardPage.tsx

Change the steps array and flow:

```typescript
const steps = [
  { number: 1, title: 'Admin Account', icon: '👤' },  // NEW STEP
  { number: 2, title: 'Customize', icon: '🎨' },
  { number: 3, title: 'Clinic Profile', icon: '🏥' },
  { number: 4, title: 'Confirm', icon: '✓' },
  { number: 5, title: 'Done', icon: '🎉' },
];

const [setupData, setSetupData] = useState({
  // Step 1: Admin Account (NEW)
  clinicName: '',              // Clinic name goes here too
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
  
  // Step 2: Customize
  appName: 'Animal Bite Center',
  logo: null as File | null,
  primaryColor: '#10b981',
  
  // Step 3: Clinic Profile
  address: '',
  phone: '',
  email: '',
});
```

### Add AdminAccountStep Component

```typescript
function AdminAccountStep({ data, setData }: any) {
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState('');

  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) return 'weak';
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) return 'strong';
    return 'medium';
  };

  return (
    <div className="step-content">
      <h2>Create Admin Account</h2>
      <p className="step-description">
        Set up the clinic and create your administrator account
      </p>

      <div className="form-group">
        <label>Clinic Name *</label>
        <input
          type="text"
          value={data.clinicName}
          onChange={(e) => setData({ ...data, clinicName: e.target.value })}
          placeholder="Tagoloan Rural Health Unit"
          required
        />
      </div>

      <div className="admin-section">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#6b7280' }}>
          Administrator Details
        </h3>

        <div className="form-group">
          <label>Your Full Name *</label>
          <input
            type="text"
            value={data.adminName}
            onChange={(e) => setData({ ...data, adminName: e.target.value })}
            placeholder="Dr. Juan Dela Cruz"
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            value={data.adminEmail}
            onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
            placeholder="admin@clinic.com"
            required
          />
          <p className="field-hint">You'll use this email to log in</p>
        </div>

        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            value={data.adminPassword}
            onChange={(e) => {
              setData({ ...data, adminPassword: e.target.value });
              setPasswordStrength(checkPasswordStrength(e.target.value));
            }}
            placeholder="Minimum 8 characters"
            required
          />
          {data.adminPassword && (
            <div className={`password-strength strength-${passwordStrength}`}>
              <div className="strength-bar"></div>
              <span className="strength-text">{passwordStrength} password</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Confirm Password *</label>
          <input
            type="password"
            value={data.adminPasswordConfirm}
            onChange={(e) => {
              setData({ ...data, adminPasswordConfirm: e.target.value });
              setPasswordsMatch(e.target.value === data.adminPassword);
            }}
            placeholder="Re-enter password"
            required
          />
          {data.adminPasswordConfirm && !passwordsMatch && (
            <p className="error-hint">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Update handleNext to Handle Step 1

```typescript
const handleNext = async () => {
  // Step 1: Admin Account Creation (PUBLIC - no auth required)
  if (currentStep === 1) {
    if (!setupData.clinicName || !setupData.adminName || !setupData.adminEmail || 
        !setupData.adminPassword || !setupData.adminPasswordConfirm) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (setupData.adminPassword !== setupData.adminPasswordConfirm) {
      alert('Passwords do not match');
      return;
    }
    
    if (setupData.adminPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/setup/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          clinic_name: setupData.clinicName,
          admin_name: setupData.adminName,
          admin_email: setupData.adminEmail,
          admin_password: setupData.adminPassword,
          admin_password_confirmation: setupData.adminPasswordConfirm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const msg = error.message || 'Failed to create admin account';
        alert(msg);
        return;
      }

      const data = await response.json();
      
      // Store authentication token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('clinicData', JSON.stringify(data.clinic));

      // Proceed to next step (now authenticated!)
      setCurrentStep(2);
      return;

    } catch (error) {
      console.error('Setup initialization error:', error);
      alert('Failed to create admin account. Please try again.');
      return;
    }
  }

  // Rest of the validation for other steps...
  // (your existing validation code)
  
  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  }
};
```

---

## 🔒 Security Considerations

### 1. Rate Limiting
Add rate limiting to prevent brute force:

```php
// In routes/api.php
Route::post('/setup/initialize', [ClinicSetupController::class, 'initialize'])
    ->middleware('throttle:5,60'); // 5 attempts per 60 minutes
```

### 2. Only Allow Once
The initialize endpoint checks:
```php
if (\App\Models\Clinic::count() > 0) {
    return response()->json(['message' => 'Setup already completed'], 403);
}
```

### 3. Strong Password Validation
```php
'admin_password' => [
    'required',
    'string',
    'min:8',
    'confirmed',
    'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', // At least one lowercase, uppercase, and number
],
```

---

## 🧪 Testing Checklist

### Test 1: Fresh Install
- [ ] Empty database
- [ ] Visit setup wizard
- [ ] Step 1: Create admin account
- [ ] Verify token stored in localStorage
- [ ] Step 2-4: Complete rest of setup
- [ ] Verify can log in with created credentials

### Test 2: Security
- [ ] Try to run initialize endpoint when clinic exists → Should return 403
- [ ] Try weak password → Should be rejected
- [ ] Try mismatched passwords → Should be rejected
- [ ] Try duplicate email → Should be rejected

### Test 3: Flow
- [ ] Cannot skip Step 1
- [ ] Step 2-4 require authentication (have token from Step 1)
- [ ] All data saves correctly
- [ ] Redirect to dashboard after completion

---

## ✅ Summary

**Fix Required:**
1. ✅ Add public `/api/setup/initialize` endpoint
2. ✅ Add "Admin Account" as Step 1 in wizard
3. ✅ Store token after Step 1 completion
4. ✅ Use token for Steps 2-5

**Result:**
- Fresh install → No users → Run Step 1 → Creates clinic + admin → Get token → Complete rest of setup ✅
- This matches your requirement: "no users at first because it is a clinic" ✅

**Timeline:** 2-3 hours to implement and test

Ready to implement this fix? 🚀
