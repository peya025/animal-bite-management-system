# Phase 2 API Testing Guide

**Status**: ✅ Phase 2 Complete - Backend API & Controllers  
**Date**: July 30, 2026

## 🎯 What Was Implemented

Phase 2 adds backend API endpoints for:
1. **Module Configuration Management** - Get and update clinic module settings
2. **Staff Module Assignment** - Assign staff to specific modules (registration, triage, treatment, inventory)

---

## 📋 API Endpoints Added

### 1. Get Module Configuration
**Endpoint**: `GET /api/setup/module-config`  
**Access**: All authenticated users  
**Purpose**: Retrieve current clinic's module configuration

### 2. Update Module Configuration
**Endpoint**: `PUT /api/setup/module-config`  
**Access**: Admin only  
**Purpose**: Update clinic module settings

### 3. Get All Staff
**Endpoint**: `GET /api/users`  
**Access**: Admin only  
**Purpose**: Get list of all staff with their assigned modules

### 4. Update Staff Module Assignment
**Endpoint**: `PUT /api/users/{id}/assigned-module`  
**Access**: Admin only  
**Purpose**: Assign staff member to specific module

---

## 🧪 Manual Testing Instructions

### Prerequisites
1. Backend server running: `php artisan serve --host=0.0.0.0 --port=8000`
2. Admin user logged in (get token)
3. Use Postman, Insomnia, or Thunder Client for testing

---

### Test 1: Get Module Configuration (All Users)

**Request:**
```http
GET http://localhost:8000/api/setup/module-config
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "clinic_id": 1,
  "triage_module_enabled": true,
  "field_rules": {
    "bite_location": "required",
    "exposure_category": "required",
    "animal_status": "optional",
    "philhealth_info": "optional",
    "fourps_info": "optional",
    "wound_washing": "optional"
  },
  "created_at": "2026-07-30T12:00:00.000000Z",
  "updated_at": "2026-07-30T12:00:00.000000Z"
}
```

**What to Verify:**
- ✅ Returns current module configuration
- ✅ Works for all authenticated users (admin, registration, triage, treatment)
- ✅ Creates default config if none exists

---

### Test 2: Update Module Configuration (Admin Only)

**Request:**
```http
PUT http://localhost:8000/api/setup/module-config
Authorization: Bearer ADMIN_TOKEN_HERE
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
```

**Expected Response (200 OK):**
```json
{
  "message": "Module configuration updated successfully",
  "config": {
    "id": 1,
    "clinic_id": 1,
    "triage_module_enabled": false,
    "field_rules": {
      "bite_location": "optional",
      "exposure_category": "required",
      "animal_status": "hidden",
      "philhealth_info": "optional",
      "fourps_info": "hidden",
      "wound_washing": "optional"
    },
    "created_at": "2026-07-30T12:00:00.000000Z",
    "updated_at": "2026-07-30T12:30:00.000000Z"
  }
}
```

**What to Verify:**
- ✅ Admin can update configuration
- ✅ Changes are saved to database
- ✅ Validation works (only accepts "required", "optional", "hidden")
- ✅ Non-admin users get 403 Forbidden

**Test Non-Admin Access:**
```http
PUT http://localhost:8000/api/setup/module-config
Authorization: Bearer REGISTRATION_STAFF_TOKEN

Response: 403 Forbidden
{
  "message": "Unauthorized. Admin access required."
}
```

---

### Test 3: Get All Staff (Admin Only)

**Request:**
```http
GET http://localhost:8000/api/users
Authorization: Bearer ADMIN_TOKEN_HERE
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Admin User",
    "email": "admin@clinic.com",
    "role": "admin",
    "assigned_module": "all",
    "is_active": true,
    "created_at": "2026-07-30T10:00:00.000000Z"
  },
  {
    "id": 2,
    "name": "Registration Staff",
    "email": "registration@clinic.com",
    "role": "registration",
    "assigned_module": "registration",
    "is_active": true,
    "created_at": "2026-07-30T10:15:00.000000Z"
  },
  {
    "id": 3,
    "name": "Triage Nurse",
    "email": "triage@clinic.com",
    "role": "triage",
    "assigned_module": "triage",
    "is_active": true,
    "created_at": "2026-07-30T10:30:00.000000Z"
  }
]
```

**What to Verify:**
- ✅ Returns all staff with assigned_module field
- ✅ Only admin can access this endpoint
- ✅ Non-admin users get 403 Forbidden

---

### Test 4: Update Staff Module Assignment (Admin Only)

**Request:**
```http
PUT http://localhost:8000/api/users/2/assigned-module
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json

{
  "assigned_module": "triage"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Staff module assignment updated successfully",
  "user": {
    "id": 2,
    "clinic_id": 1,
    "name": "Registration Staff",
    "email": "registration@clinic.com",
    "role": "registration",
    "assigned_module": "triage",
    "is_active": true,
    "phone": null,
    "last_login_at": "2026-07-30T10:15:00.000000Z",
    "created_at": "2026-07-30T10:15:00.000000Z",
    "updated_at": "2026-07-30T12:45:00.000000Z"
  }
}
```

**Valid Module Values:**
- `"all"` - Access all modules
- `"registration"` - Registration module only
- `"triage"` - Triage module only
- `"treatment"` - Treatment module only
- `"inventory"` - Inventory module only

**What to Verify:**
- ✅ Admin can update staff module assignment
- ✅ Changes persist in database
- ✅ Validation works (only accepts valid module values)
- ✅ Non-admin users get 403 Forbidden

**Test Invalid Module:**
```http
PUT http://localhost:8000/api/users/2/assigned-module
Content-Type: application/json

{
  "assigned_module": "invalid_module"
}

Response: 422 Unprocessable Entity
{
  "message": "The assigned module field must be one of: all, registration, triage, treatment, inventory.",
  "errors": {
    "assigned_module": [
      "The assigned module field must be one of: all, registration, triage, treatment, inventory."
    ]
  }
}
```

---

## ✅ Phase 2 Testing Checklist

### API Endpoint Tests
- [ ] GET /api/setup/module-config returns default config
- [ ] GET /api/setup/module-config works for all authenticated users
- [ ] PUT /api/setup/module-config updates configuration (admin)
- [ ] PUT /api/setup/module-config validates field_rules
- [ ] PUT /api/setup/module-config rejects non-admin users (403)
- [ ] GET /api/users returns all staff with assigned_module
- [ ] GET /api/users rejects non-admin users (403)
- [ ] PUT /api/users/{id}/assigned-module updates assignment (admin)
- [ ] PUT /api/users/{id}/assigned-module validates module values
- [ ] PUT /api/users/{id}/assigned-module rejects non-admin users (403)

### Authorization Tests
- [ ] Admin can access all endpoints
- [ ] Registration staff CANNOT update configurations
- [ ] Triage staff CANNOT update configurations
- [ ] Treatment staff CANNOT update configurations
- [ ] Non-admin users get proper 403 error messages

### Data Validation Tests
- [ ] Invalid field_rules rejected (not "required", "optional", "hidden")
- [ ] Invalid assigned_module rejected
- [ ] Missing required fields rejected
- [ ] Empty request body rejected

### Database Persistence Tests
- [ ] Module config changes persist after page reload
- [ ] Staff assignment changes persist
- [ ] Can retrieve updated config with GET endpoint
- [ ] firstOrCreate works (creates default if none exists)

---

## 🔧 Troubleshooting

### Issue: 403 Forbidden when testing as admin
**Solution**: Verify the user token belongs to admin role
```bash
# Check user role in database
php artisan tinker
>>> \App\Models\User::find(1)->role
```

### Issue: Route not found
**Solution**: Clear route cache
```bash
php artisan route:clear
php artisan route:cache
```

### Issue: Validation errors
**Solution**: Check request body matches validation rules exactly
- field_rules must have ALL 6 fields
- Each field must be "required", "optional", or "hidden"
- assigned_module must be one of: all, registration, triage, treatment, inventory

### Issue: Module config not persisting
**Solution**: Check database table exists
```bash
php artisan migrate:status
# If missing:
php artisan migrate
```

---

## 📊 Phase 2 Deliverables - COMPLETED ✅

- [x] ✅ ClinicModuleConfigController created with show() and update()
- [x] ✅ UserController updated with updateAssignedModule()
- [x] ✅ API routes configured in routes/api.php
- [x] ✅ Authorization implemented (admin-only for updates)
- [x] ✅ Validation implemented for all endpoints
- [x] ✅ No syntax errors or diagnostics issues

---

## 🚀 Next Steps - Phase 3

After confirming Phase 2 works:
1. **Phase 3**: Build Frontend UI for Module Configuration
   - Create TypeScript types
   - Create API service
   - Build ModuleConfigPage component
   - Add route and navigation

2. **Phase 4**: Build Frontend UI for Staff Assignment
   - Update types
   - Create staff API service
   - Build StaffAssignmentPage component

3. **Phase 5**: Integration Testing & Documentation

---

**Phase 2 Status**: ✅ COMPLETE  
**Estimated Testing Time**: 30-45 minutes  
**Next Phase**: Phase 3 - Frontend UI (Module Configuration)
