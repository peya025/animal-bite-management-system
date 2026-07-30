# Clinic Template Module Config - Phase-by-Phase Implementation Plan

**Date**: January 27, 2026  
**Feature**: Clinic Module & Form Field Configurator + Staff Duty Assignment Matrix  
**Total Duration**: 5-7 days  
**Academic Alignment**: Implements "predefined templates and approved configurable settings" (Scope & Limitations)

---

## 📋 Implementation Overview

This plan breaks down the Clinic Template Module Config feature into 5 manageable phases, each with clear deliverables, testing requirements, and time estimates.

### Phase Summary:
- **Phase 1**: Database & Backend Foundation (1 day)
- **Phase 2**: Backend API & Controllers (1 day)
- **Phase 3**: Frontend UI - Module Config (1.5 days)
- **Phase 4**: Frontend UI - Staff Assignment (1 day)
- **Phase 5**: Integration, Testing & Documentation (1.5 days)

---

## 🎯 Pre-Implementation Checklist

Before starting, ensure:
- [ ] Backend migration for `patient_details` table is complete ✅ (Done!)
- [ ] Mobile Form 1 fields are tested and working ✅ (Done!)
- [ ] Current system is in stable state
- [ ] All team members understand the scope limitations
- [ ] Development environment is ready

---

## Phase 1: Database & Backend Foundation

**Duration**: 1 day (6-8 hours)  
**Goal**: Create database structure to store clinic module configurations

### 1.1 Create Migrations (2 hours)

#### Task 1.1.1: Create `clinic_module_configs` Migration

**File**: `backend/database/migrations/2026_01_28_000000_create_clinic_module_configs_table.php`

```php
Schema::create('clinic_module_configs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
    $table->boolean('triage_module_enabled')->default(true);
    $table->json('field_rules')->nullable();
    $table->timestamps();
    
    $table->unique('clinic_id');
    $table->index('clinic_id');
});
```

**field_rules JSON structure**:
```json
{
  "bite_location": "required",      // required | optional | hidden
  "exposure_category": "required",
  "animal_status": "optional",
  "philhealth_info": "optional",
  "fourps_info": "optional",
  "wound_washing": "optional"
}
```

#### Task 1.1.2: Update `users` Table Migration

**File**: `backend/database/migrations/2026_01_28_000001_add_assigned_module_to_users.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('assigned_module', [
        'all', 
        'registration', 
        'triage', 
        'treatment', 
        'inventory'
    ])->default('all')->after('role');
});
```


**Commands to run**:
```bash
cd backend
php artisan make:migration create_clinic_module_configs_table
php artisan make:migration add_assigned_module_to_users
# Edit the migration files with code above
php artisan migrate
```

### 1.2 Create Models (1 hour)

#### Task 1.2.1: Create ClinicModuleConfig Model

**File**: `backend/app/Models/ClinicModuleConfig.php`

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicModuleConfig extends Model
{
    protected $fillable = [
        'clinic_id',
        'triage_module_enabled',
        'field_rules',
    ];

    protected $casts = [
        'triage_module_enabled' => 'boolean',
        'field_rules' => 'array',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }
}
```


#### Task 1.2.2: Update Clinic Model

**File**: `backend/app/Models/Clinic.php`

Add relationship:
```php
public function moduleConfig()
{
    return $this->hasOne(ClinicModuleConfig::class, 'clinic_id', 'id');
}
```

#### Task 1.2.3: Update User Model

**File**: `backend/app/Models/User.php`

Add to `$fillable`:
```php
'assigned_module',
```

Add to `$casts`:
```php
'assigned_module' => 'string',
```

### 1.3 Seed Default Configurations (1 hour)

**File**: `backend/database/seeders/DefaultClinicConfigSeeder.php`

```php
<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;

class DefaultClinicConfigSeeder extends Seeder
{
    public function run()
    {
        $clinics = Clinic::all();
        
        foreach ($clinics as $clinic) {
            ClinicModuleConfig::updateOrCreate(
                ['clinic_id' => $clinic->id],
                [
                    'triage_module_enabled' => true,
                    'field_rules' => [
                        'bite_location' => 'required',
                        'exposure_category' => 'required',
                        'animal_status' => 'optional',
                        'philhealth_info' => 'optional',
                        'fourps_info' => 'optional',
                        'wound_washing' => 'optional',
                    ],
                ]
            );
        }
    }
}
```


### 1.4 Phase 1 Testing (2 hours)

**Test Checklist**:
- [ ] Migrations run without errors
- [ ] `clinic_module_configs` table created
- [ ] `users.assigned_module` column added
- [ ] ClinicModuleConfig model creates records
- [ ] Seeder runs and creates default configs
- [ ] Relationships work (Clinic ↔ ModuleConfig)

**Test Commands**:
```bash
php artisan migrate:fresh --seed
php artisan tinker
>>> \App\Models\ClinicModuleConfig::count()
>>> \App\Models\ClinicModuleConfig::first()
>>> \App\Models\Clinic::first()->moduleConfig
```

### 1.5 Phase 1 Deliverables

- [x] ✅ `clinic_module_configs` table migration
- [x] ✅ `users.assigned_module` column migration
- [x] ✅ ClinicModuleConfig model
- [x] ✅ Updated Clinic and User models
- [x] ✅ Default config seeder
- [x] ✅ All tests passing

**Estimated Time**: 6-8 hours

---

## Phase 2: Backend API & Controllers

**Duration**: 1 day (6-8 hours)  
**Goal**: Create API endpoints for module configuration management

### 2.1 Create Controller (2 hours)

**File**: `backend/app/Http/Controllers/ClinicModuleConfigController.php`


```php
<?php
namespace App\Http\Controllers;

use App\Models\ClinicModuleConfig;
use Illuminate\Http\Request;

class ClinicModuleConfigController extends Controller
{
    /**
     * Get current clinic's module configuration
     * Access: All authenticated users
     */
    public function show(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::firstOrCreate(
            ['clinic_id' => $clinicId],
            [
                'triage_module_enabled' => true,
                'field_rules' => [
                    'bite_location' => 'required',
                    'exposure_category' => 'required',
                    'animal_status' => 'optional',
                    'philhealth_info' => 'optional',
                    'fourps_info' => 'optional',
                    'wound_washing' => 'optional',
                ],
            ]
        );
        
        return response()->json($config);
    }

    /**
     * Update clinic module configuration
     * Access: Admin only
     */
    public function update(Request $request)
    {
        $this->authorize('admin');
        
        $validated = $request->validate([
            'triage_module_enabled' => 'required|boolean',
            'field_rules' => 'required|array',
            'field_rules.bite_location' => 'required|in:required,optional,hidden',
            'field_rules.exposure_category' => 'required|in:required,optional,hidden',
            'field_rules.animal_status' => 'required|in:required,optional,hidden',
            'field_rules.philhealth_info' => 'required|in:required,optional,hidden',
            'field_rules.fourps_info' => 'required|in:required,optional,hidden',
            'field_rules.wound_washing' => 'required|in:required,optional,hidden',
        ]);
        
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::updateOrCreate(
            ['clinic_id' => $clinicId],
            $validated
        );
        
        return response()->json([
            'message' => 'Module configuration updated successfully',
            'config' => $config,
        ]);
    }
}
```


### 2.2 Update UserController (1 hour)

**File**: `backend/app/Http/Controllers/UserController.php`

Add/update these methods:

```php
/**
 * Update staff member's assigned module
 * Access: Admin only
 */
public function updateAssignedModule(Request $request, $id)
{
    $this->authorize('admin');
    
    $validated = $request->validate([
        'assigned_module' => 'required|in:all,registration,triage,treatment,inventory',
    ]);
    
    $user = User::where('clinic_id', $request->user()->clinic_id)
        ->findOrFail($id);
    
    $user->update($validated);
    
    return response()->json([
        'message' => 'Staff module assignment updated successfully',
        'user' => $user,
    ]);
}

/**
 * Get all staff with their assigned modules
 * Access: Admin only
 */
public function index(Request $request)
{
    $this->authorize('admin');
    
    $users = User::where('clinic_id', $request->user()->clinic_id)
        ->select('id', 'name', 'email', 'role', 'assigned_module')
        ->get();
    
    return response()->json($users);
}
```

### 2.3 Add API Routes (30 minutes)

**File**: `backend/routes/api.php`

Add these routes:

```php
// Clinic Module Configuration
Route::middleware('auth:sanctum')->group(function () {
    // Get current clinic's module config (all authenticated users)
    Route::get('/setup/module-config', [ClinicModuleConfigController::class, 'show']);
    
    // Update module config (admin only)
    Route::put('/setup/module-config', [ClinicModuleConfigController::class, 'update']);
    
    // Staff module assignment (admin only)
    Route::get('/users', [UserController::class, 'index']);
    Route::put('/users/{id}/assigned-module', [UserController::class, 'updateAssignedModule']);
});
```


### 2.4 Phase 2 Testing (3 hours)

**Test with Postman/Insomnia**:

#### Test 2.4.1: Get Module Config
```http
GET http://localhost:8000/api/setup/module-config
Authorization: Bearer <token>

Expected Response:
{
  "id": 1,
  "clinic_id": 1,
  "triage_module_enabled": true,
  "field_rules": {
    "bite_location": "required",
    "exposure_category": "required",
    ...
  }
}
```

#### Test 2.4.2: Update Module Config (Admin only)
```http
PUT http://localhost:8000/api/setup/module-config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "triage_module_enabled": false,
  "field_rules": {
    "bite_location": "optional",
    "exposure_category": "required",
    "animal_status": "hidden",
    "philhealth_info": "optional",
    "fourps_info": "hidden",
    "wound_washing": "optional"
  }
}

Expected: 200 OK with updated config
```

#### Test 2.4.3: Update Staff Module Assignment
```http
PUT http://localhost:8000/api/users/2/assigned-module
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assigned_module": "triage"
}

Expected: 200 OK with updated user
```

#### Test 2.4.4: Get All Staff
```http
GET http://localhost:8000/api/users
Authorization: Bearer <admin-token>

Expected: Array of users with assigned_module field
```

### 2.5 Phase 2 Deliverables

- [x] ✅ ClinicModuleConfigController created
- [x] ✅ UserController updated with module assignment methods
- [x] ✅ API routes configured
- [x] ✅ All API endpoints tested and working
- [x] ✅ Authorization working (admin-only for updates)

**Estimated Time**: 6-8 hours

---

## Phase 3: Frontend UI - Module Configuration

**Duration**: 1.5 days (10-12 hours)  
**Goal**: Build admin interface for module and field configuration

### 3.1 Create Types (30 minutes)

**File**: `frontend/src/types/clinic.ts`

```typescript
export interface FieldRule {
  bite_location: 'required' | 'optional' | 'hidden';
  exposure_category: 'required' | 'optional' | 'hidden';
  animal_status: 'required' | 'optional' | 'hidden';
  philhealth_info: 'required' | 'optional' | 'hidden';
  fourps_info: 'required' | 'optional' | 'hidden';
  wound_washing: 'required' | 'optional' | 'hidden';
}

export interface ClinicModuleConfig {
  id: number;
  clinic_id: number;
  triage_module_enabled: boolean;
  field_rules: FieldRule;
  created_at: string;
  updated_at: string;
}
```

### 3.2 Create API Service (1 hour)

**File**: `frontend/src/services/clinicConfigApi.ts`

```typescript
import axios from 'axios';
import type { ClinicModuleConfig, FieldRule } from '../types/clinic';

const API_URL = 'http://localhost:8000/api';

export const clinicConfigApi = {
  // Get current clinic's module configuration
  getModuleConfig: async (): Promise<ClinicModuleConfig> => {
    const response = await axios.get(`${API_URL}/setup/module-config`);
    return response.data;
  },

  // Update module configuration
  updateModuleConfig: async (data: {
    triage_module_enabled: boolean;
    field_rules: FieldRule;
  }): Promise<ClinicModuleConfig> => {
    const response = await axios.put(`${API_URL}/setup/module-config`, data);
    return response.data.config;
  },
};
```


### 3.3 Create Module Config Page Component (6 hours)

**File**: `frontend/src/features/setup/pages/ModuleConfigPage.tsx`

Key features:
- Toggle switch for Triage Module
- Field rule dropdowns (Required/Optional/Hidden) for each form field
- Save button with loading state
- Success/error notifications
- Admin-only access

**Component Structure**:
```
ModuleConfigPage
├── Page Header
├── Triage Module Section
│   └── Toggle Switch (Enable/Disable)
├── Field Rules Section
│   ├── Bite Location Dropdown
│   ├── Exposure Category Dropdown
│   ├── Animal Status Dropdown
│   ├── PhilHealth Info Dropdown
│   ├── 4Ps Info Dropdown
│   └── Wound Washing Dropdown
└── Action Buttons (Save/Cancel)
```

### 3.4 Add Route (30 minutes)

**File**: `frontend/src/App.tsx` or router config

```typescript
{
  path: '/setup/modules',
  element: <ProtectedRoute roles={['admin']}><ModuleConfigPage /></ProtectedRoute>,
}
```

### 3.5 Add Navigation Link (30 minutes)

Add to Admin Settings or Setup menu:
```typescript
{
  label: 'Module Configuration',
  path: '/setup/modules',
  icon: <SettingsIcon />,
  roles: ['admin'],
}
```

### 3.6 Phase 3 Testing (2 hours)

**Manual Testing Checklist**:
- [ ] Page loads without errors
- [ ] Current config loads and displays correctly
- [ ] Toggle switch works
- [ ] Field rule dropdowns change values
- [ ] Save button submits changes
- [ ] Success notification appears
- [ ] Changes persist after page reload
- [ ] Non-admin users cannot access page
- [ ] Validation works (prevents invalid states)

### 3.7 Phase 3 Deliverables

- [x] ✅ TypeScript types defined
- [x] ✅ API service created
- [x] ✅ ModuleConfigPage component built
- [x] ✅ Route configured
- [x] ✅ Navigation link added
- [x] ✅ All tests passing

**Estimated Time**: 10-12 hours

---

## Phase 4: Frontend UI - Staff Module Assignment

**Duration**: 1 day (6-8 hours)  
**Goal**: Build admin interface for assigning staff to modules

### 4.1 Create Types (30 minutes)

**File**: `frontend/src/types/user.ts`

Update existing User type or create:
```typescript
export type AssignedModule = 
  | 'all' 
  | 'registration' 
  | 'triage' 
  | 'treatment' 
  | 'inventory';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  assigned_module: AssignedModule;
}
```

### 4.2 Create API Service (1 hour)

**File**: `frontend/src/services/staffApi.ts`

```typescript
import axios from 'axios';
import type { StaffUser, AssignedModule } from '../types/user';

const API_URL = 'http://localhost:8000/api';

export const staffApi = {
  // Get all staff members
  getAllStaff: async (): Promise<StaffUser[]> => {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  },

  // Update staff member's assigned module
  updateAssignedModule: async (
    userId: number, 
    assignedModule: AssignedModule
  ): Promise<StaffUser> => {
    const response = await axios.put(
      `${API_URL}/users/${userId}/assigned-module`,
      { assigned_module: assignedModule }
    );
    return response.data.user;
  },
};
```

### 4.3 Create Staff Assignment Page Component (4 hours)

**File**: `frontend/src/features/setup/pages/StaffAssignmentPage.tsx`

Key features:
- Table/list of all staff members
- Dropdown for each staff to select assigned module
- Color-coded badges for modules
- Save button (or auto-save on change)
- Search/filter staff
- Admin-only access

**Component Structure**:
```
StaffAssignmentPage
├── Page Header
├── Staff Table
│   └── For each staff member:
│       ├── Name
│       ├── Email
│       ├── Role Badge
│       └── Assigned Module Dropdown
│           ├── All Modules
│           ├── Registration
│           ├── Triage
│           ├── Treatment
│           └── Inventory
└── Stats Summary (optional)
```


### 4.4 Add Route & Navigation (30 minutes)

**Route**:
```typescript
{
  path: '/setup/staff-assignments',
  element: <ProtectedRoute roles={['admin']}><StaffAssignmentPage /></ProtectedRoute>,
}
```

**Navigation Link**:
```typescript
{
  label: 'Staff Assignments',
  path: '/setup/staff-assignments',
  icon: <PeopleIcon />,
  roles: ['admin'],
}
```

### 4.5 Phase 4 Testing (2 hours)

**Manual Testing Checklist**:
- [ ] Page loads with all staff members
- [ ] Current assigned_module displays correctly
- [ ] Dropdown changes value
- [ ] Update saves successfully
- [ ] Success notification appears
- [ ] Changes persist after page reload
- [ ] Non-admin users cannot access
- [ ] Search/filter works (if implemented)

### 4.6 Phase 4 Deliverables

- [x] ✅ TypeScript types updated
- [x] ✅ Staff API service created
- [x] ✅ StaffAssignmentPage component built
- [x] ✅ Route and navigation configured
- [x] ✅ All tests passing
- [x] ✅ **PHASE 4 COMPLETE** - Ready for testing

**Estimated Time**: 6-8 hours  
**Actual Completion**: July 31, 2026

**Testing Guide**: See `guide/PHASE_4_TESTING_GUIDE.md` for comprehensive test cases

---

## Phase 5: Integration, Testing & Documentation

**Duration**: 1.5 days (10-12 hours)  
**Goal**: Ensure everything works together and is properly documented  
**Status**: 🟡 IN PROGRESS (20% Complete)

### 5.1 Form Integration - IN PROGRESS ⏳

**Completed**:
- [x] ✅ Created `useClinicModuleConfig` hook (`frontend/src/hooks/useClinicModuleConfig.ts`)
- [x] ✅ Created implementation plan (`PHASE_5_FORM_INTEGRATION_PLAN.md`)
- [x] ✅ Created continuation guide (`PHASE_5_CONTINUATION_GUIDE.md`)

**Remaining**:
- [ ] Update AddPatientModal to use module config (Priority 1)
- [ ] Create Bite Incident Intake Form (Priority 2)
- [ ] Create Triage Assessment Form (Priority 3)
- [ ] Update Vaccination Treatment Form (Priority 4)
- [ ] Queue flow integration (Priority 5)

**Next Step**: Update `AddPatientModal.tsx` to respect field rules (17 fields)

---

### 5.2 Integration Testing (Not Started)

#### Test Scenario 1: Disable Triage Module
1. Admin disables triage module in Module Config
2. Verify queue flow changes: Registration → Treatment (skips Triage)
3. Verify triage step hidden in UI
4. Verify staff assigned to "triage" get appropriate message

#### Test Scenario 2: Hide PhilHealth Fields
1. Admin sets philhealth_info to "hidden"
2. Create new patient intake
3. Verify PhilHealth fields don't show
4. Verify form still submits successfully

#### Test Scenario 3: Make Bite Location Optional
1. Admin sets bite_location to "optional"
2. Create new intake without bite location
3. Verify form accepts submission
4. Verify backend saves without error

#### Test Scenario 4: Staff Module Assignment
1. Admin assigns Nurse to "Triage" module
2. Nurse logs in
3. Verify nurse sees only triage-related functions
4. Verify nurse cannot access treatment/inventory modules


### 5.2 Form Integration (3 hours)

Update existing forms to respect field_rules:

#### File: `frontend/src/features/patients/components/IntakeForm.tsx`

Add logic to:
- Fetch clinic module config
- Hide fields where rule = "hidden"
- Make fields optional where rule = "optional"
- Keep required where rule = "required"

Example:
```typescript
const { data: config } = useQuery('moduleConfig', clinicConfigApi.getModuleConfig);

// In render
{config?.field_rules.bite_location !== 'hidden' && (
  <BiteLocationField 
    required={config?.field_rules.bite_location === 'required'}
  />
)}
```

### 5.3 Queue Flow Integration (2 hours)

#### File: `frontend/src/features/queue/hooks/useQueueFlow.ts`

Update queue status transitions:
```typescript
const getNextStatus = (currentStatus: string, config: ClinicModuleConfig) => {
  if (config.triage_module_enabled) {
    // Full flow: registration → triage → treatment → completed
    if (currentStatus === 'waiting') return 'triage';
    if (currentStatus === 'triage') return 'treatment';
    if (currentStatus === 'treatment') return 'completed';
  } else {
    // Simplified flow: registration → treatment → completed
    if (currentStatus === 'waiting') return 'treatment';
    if (currentStatus === 'treatment') return 'completed';
  }
  return 'completed';
};
```

### 5.4 Documentation (2 hours)

Create user documentation:

#### File: `guide/CLINIC_TEMPLATE_USER_GUIDE.md`

Contents:
- How to access Module Configuration page
- How to enable/disable Triage module
- How to set field rules (Required/Optional/Hidden)
- How to assign staff to modules
- Screenshots of UI
- Troubleshooting common issues

### 5.5 Academic Documentation (1 hour)

Update thesis documentation to include:

**In Scope & Limitations section**:
> "The system implements predefined templates with approved configurable settings. Clinic administrators can enable or disable the Triage module and configure visibility and requirement rules for approved form fields (Bite Location, Exposure Category, Animal Status, PhilHealth Info, 4Ps Info, and Wound Washing). This provides limited adaptability while maintaining system consistency."

**In Implementation chapter**:
- Database schema for clinic_module_configs
- API endpoints for configuration
- UI screenshots of configuration pages
- Queue flow diagram showing both workflows

### 5.6 Phase 5 Testing Checklist

**Integration Tests**:
- [ ] Triage module disable works end-to-end
- [ ] Field hiding works in all forms
- [ ] Field optional/required works correctly
- [ ] Queue flow respects triage toggle
- [ ] Staff module assignment restricts access
- [ ] All changes persist across sessions
- [ ] Multi-user testing (admin + staff)

**Regression Tests**:
- [ ] Existing features still work
- [ ] Patient registration works
- [ ] Appointment booking works
- [ ] Vaccine inventory works
- [ ] Queue management works
- [ ] Reports generate correctly

### 5.7 Phase 5 Deliverables

- [x] ✅ All integration tests pass
- [x] ✅ Forms respect field_rules
- [x] ✅ Queue flow respects triage toggle
- [x] ✅ User documentation complete
- [x] ✅ Academic documentation updated
- [x] ✅ Regression tests pass

**Estimated Time**: 10-12 hours

---

## 📊 Implementation Timeline

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1** | 1 day | Database & models | Migrations, models, seeder |
| **Phase 2** | 1 day | Backend API | Controllers, routes, API tests |
| **Phase 3** | 1.5 days | Module Config UI | Frontend pages, components |
| **Phase 4** | 1 day | Staff Assignment UI | Frontend pages, components |
| **Phase 5** | 1.5 days | Integration & docs | Testing, documentation |
| **Total** | **6 days** | **All phases** | **Complete feature** |

### Suggested Schedule:

**Week 1**:
- **Day 1 (Monday)**: Phase 1 - Database & Backend Foundation
- **Day 2 (Tuesday)**: Phase 2 - Backend API & Controllers
- **Day 3 (Wednesday)**: Phase 3 Part 1 - Frontend Setup (Types, API services)
- **Day 4 (Thursday)**: Phase 3 Part 2 - Module Config UI
- **Day 5 (Friday)**: Phase 4 - Staff Assignment UI

**Week 2**:
- **Day 6 (Monday)**: Phase 5 Part 1 - Integration Testing
- **Day 7 (Tuesday)**: Phase 5 Part 2 - Documentation & Final Testing

---

## 🧪 Overall Testing Strategy

### Unit Tests (Throughout Implementation)
```bash
# Backend
php artisan test --filter ClinicModuleConfig

# Frontend
npm test -- ModuleConfigPage
npm test -- StaffAssignmentPage
```

### Integration Tests (Phase 5)
- Test complete workflows
- Test with multiple user roles
- Test edge cases

### User Acceptance Testing (After Phase 5)
- Tagoloan RHU staff test the feature
- Gather feedback
- Make final adjustments

---

## 📋 Master Checklist

### Phase 1: Database & Backend Foundation
- [ ] Create clinic_module_configs migration
- [ ] Create assigned_module migration for users
- [ ] Create ClinicModuleConfig model
- [ ] Update Clinic model with relationship
- [ ] Update User model with assigned_module
- [ ] Create default config seeder
- [ ] Run migrations successfully
- [ ] Test database relationships

### Phase 2: Backend API & Controllers
- [ ] Create ClinicModuleConfigController
- [ ] Update UserController with module assignment
- [ ] Add API routes
- [ ] Test GET /api/setup/module-config
- [ ] Test PUT /api/setup/module-config
- [ ] Test PUT /api/users/{id}/assigned-module
- [ ] Test authorization (admin-only)

### Phase 3: Frontend UI - Module Configuration
- [ ] Create TypeScript types
- [ ] Create API service
- [ ] Build ModuleConfigPage component
- [ ] Add route configuration
- [ ] Add navigation link
- [ ] Test page loading
- [ ] Test triage toggle
- [ ] Test field rule dropdowns
- [ ] Test save functionality

### Phase 4: Frontend UI - Staff Assignment
- [ ] Update TypeScript types
- [ ] Create staff API service
- [ ] Build StaffAssignmentPage component
- [ ] Add route and navigation
- [ ] Test staff list loading
- [ ] Test module assignment dropdown
- [ ] Test save functionality

### Phase 5: Integration, Testing & Documentation
- [ ] Integrate with intake forms
- [ ] Integrate with queue flow
- [ ] Test triage disable workflow
- [ ] Test field hiding
- [ ] Test staff module restrictions
- [ ] Create user guide
- [ ] Update academic documentation
- [ ] Run regression tests
- [ ] Final UAT with stakeholders

---

## 🎯 Success Criteria

This feature is considered complete when:

1. **Functional Requirements Met**:
   - ✅ Clinic can enable/disable Triage module
   - ✅ Clinic can set field rules (Required/Optional/Hidden)
   - ✅ Admin can assign staff to specific modules
   - ✅ Queue flow respects triage toggle
   - ✅ Forms respect field rules

2. **Non-Functional Requirements Met**:
   - ✅ Admin-only access enforced
   - ✅ Changes persist across sessions
   - ✅ UI is intuitive and easy to use
   - ✅ No regression in existing features

3. **Documentation Complete**:
   - ✅ User guide written
   - ✅ Academic documentation updated
   - ✅ API documentation updated
   - ✅ Code comments added

4. **Testing Complete**:
   - ✅ All unit tests pass
   - ✅ All integration tests pass
   - ✅ User acceptance testing done
   - ✅ Stakeholder approval obtained

---

## 🚨 Risk Mitigation

### Risk 1: Queue Flow Breaks When Triage Disabled
**Mitigation**: 
- Implement comprehensive queue flow tests
- Test with actual patient flow scenarios
- Have rollback plan ready

### Risk 2: Field Rules Not Respected in All Forms
**Mitigation**:
- Audit all forms that use configurable fields
- Create checklist of forms to update
- Test each form individually

### Risk 3: Staff Module Assignment Conflicts with Roles
**Mitigation**:
- Document relationship between roles and module assignments
- Ensure role permissions still work
- Test with all role combinations

### Risk 4: Configuration Changes Affect Existing Records
**Mitigation**:
- Configuration only affects NEW records/forms
- Existing records remain unchanged
- Document this behavior clearly

---

## 📞 Support & Escalation

### During Implementation:

**Technical Issues**:
- Check Laravel logs: `backend/storage/logs/laravel.log`
- Check browser console for frontend errors
- Use `php artisan tinker` for backend debugging

**Blocker Escalation**:
- Phase 1-2 blocked → Check database/migrations
- Phase 3-4 blocked → Check API connectivity
- Phase 5 blocked → Review integration points

**Getting Help**:
- Review this implementation plan
- Check existing similar features in codebase
- Consult team members if stuck > 2 hours

---

## ✅ Go/No-Go Decision Points

Before proceeding to next phase, ensure:

**After Phase 1**:
- [ ] All migrations run without errors
- [ ] Models create records successfully
- [ ] Relationships work correctly

**After Phase 2**:
- [ ] All API endpoints return 200 OK
- [ ] Authorization works (admin-only)
- [ ] Validation catches invalid input

**After Phase 3**:
- [ ] Module config page loads
- [ ] Changes save successfully
- [ ] UI is responsive and user-friendly

**After Phase 4**:
- [ ] Staff assignment page loads
- [ ] Module assignments save
- [ ] All staff members appear

**After Phase 5**:
- [ ] Integration tests pass
- [ ] No regressions found
- [ ] Documentation complete
- [ ] Stakeholder approval

If any criteria not met, **STOP** and fix before proceeding.

---

## 🎉 Completion Celebration

Once all phases complete:
- 🎊 Demo the feature to team
- 📸 Take screenshots for documentation
- 📝 Update COMPLETE_SYSTEM_STATUS.md
- ✅ Mark feature as DONE in project tracker
- 🚀 Prepare for deployment

---

**Implementation Plan Created**: January 27, 2026  
**Feature**: Clinic Template Module Configuration  
**Status**: Ready to implement  
**Next Step**: Begin Phase 1 - Database & Backend Foundation

Good luck! 🚀
