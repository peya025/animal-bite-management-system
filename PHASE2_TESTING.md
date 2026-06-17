# Phase 2 Testing Guide

## ✅ Phase 2 Complete!

### What We Built:
1. ✅ `ClinicSetupController` - Clinic setup management
2. ✅ `UserController` - User CRUD operations
3. ✅ `StaffInvitationController` - Basic invitation system
4. ✅ `CheckRole` middleware - Role-based access control
5. ✅ `staff_invitations` table and model
6. ✅ Updated API routes with role protection

---

## 🧪 Test the APIs

### 1. Login as Admin (Get Token)

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@clinic.com\",\"password\":\"password123\"}"
```

**Save the token from response!**

---

## Clinic Setup APIs (Admin Only)

### 2. Check Setup Status

```bash
curl -X GET http://localhost:8000/api/setup/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:**
```json
{
  "is_setup_complete": false,
  "clinic": null
}
```

### 3. Update Clinic Information

```bash
curl -X PUT http://localhost:8000/api/setup/clinic \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"My Animal Bite Center\",\"address\":\"456 New Street\",\"phone\":\"09876543210\",\"email\":\"contact@abc.com\"}"
```

### 4. Complete Setup

```bash
curl -X POST http://localhost:8000/api/setup/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## User Management APIs (Admin Only)

### 5. List All Users

```bash
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. Create New User

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"New Staff\",\"email\":\"newstaff@clinic.com\",\"password\":\"password123\",\"role\":\"registration\",\"phone\":\"09111111111\"}"
```

### 7. View Single User

```bash
curl -X GET http://localhost:8000/api/users/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Update User

```bash
curl -X PUT http://localhost:8000/api/users/2 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Updated Name\",\"phone\":\"09222222222\"}"
```

### 9. Delete User

```bash
curl -X DELETE http://localhost:8000/api/users/5 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Staff Invitation APIs (Admin Only)

### 10. Send Invitation

```bash
curl -X POST http://localhost:8000/api/invitations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"invited@example.com\",\"role\":\"triage\"}"
```

**Response will include:**
- `invitation` object
- `invitation_link` - share this with the staff member
- `token` - for testing acceptance

### 11. List All Invitations

```bash
curl -X GET http://localhost:8000/api/invitations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 12. Validate Invitation Token (Public)

```bash
curl -X GET http://localhost:8000/api/invitations/YOUR_INVITATION_TOKEN/validate
```

### 13. Accept Invitation (Public)

```bash
curl -X POST http://localhost:8000/api/invitations/YOUR_INVITATION_TOKEN/accept \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Invited Staff Member\",\"password\":\"password123\",\"password_confirmation\":\"password123\",\"phone\":\"09333333333\"}"
```

**Response:**
- New user created
- Auto-login token provided
- User can immediately use the system

### 14. Cancel Invitation

```bash
curl -X POST http://localhost:8000/api/invitations/1/cancel \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Role-Based Access Control Testing

### Test 1: Non-Admin Cannot Create Users

```bash
# Login as registration staff
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"registration@clinic.com\",\"password\":\"password123\"}"

# Try to create user (should fail)
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer REGISTRATION_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"test@test.com\",\"password\":\"password\",\"role\":\"triage\"}"
```

**Expected:**
```json
{
  "message": "Unauthorized. This action requires admin role."
}
```

### Test 2: Non-Admin Cannot Access Setup

```bash
curl -X GET http://localhost:8000/api/setup/status \
  -H "Authorization: Bearer REGISTRATION_TOKEN_HERE"
```

**Expected:**
```json
{
  "message": "Unauthorized. This action requires admin role."
}
```

---

## 🔍 Verify Database

### Check Staff Invitations

```bash
php artisan tinker
```

```php
App\Models\StaffInvitation::all()
App\Models\StaffInvitation::where('status', 'pending')->get()
```

### Check Users Count

```php
App\Models\User::count()
```

### Test Invitation Methods

```php
$invitation = App\Models\StaffInvitation::first();
$invitation->isValid()
$invitation->isExpired()
$invitation->isPending()
```

---

## 📊 Complete API Endpoints List

### Public Endpoints
```
GET  /api/test                              # Test API
POST /api/login                             # Login
GET  /api/invitations/{token}/validate      # Validate invitation
POST /api/invitations/{token}/accept        # Accept invitation
```

### Protected Endpoints (Auth Required)
```
POST /api/logout                            # Logout
GET  /api/me                                # Get current user
```

### Admin Only Endpoints
```
# Clinic Setup
GET  /api/setup/status                      # Check setup status
PUT  /api/setup/clinic                      # Update clinic info
POST /api/setup/complete                    # Complete setup

# User Management
GET    /api/users                           # List users
POST   /api/users                           # Create user
GET    /api/users/{id}                      # View user
PUT    /api/users/{id}                      # Update user
DELETE /api/users/{id}                      # Delete user

# Staff Invitations
POST /api/invitations                       # Send invitation
GET  /api/invitations                       # List invitations
POST /api/invitations/{id}/cancel           # Cancel invitation
```

---

## 🐛 Common Issues

### Issue: "Unauthenticated"
- Make sure token is included: `Authorization: Bearer YOUR_TOKEN`
- Check token hasn't expired
- Verify user exists and is_active = true

### Issue: "Unauthorized. This action requires admin role"
- You're logged in as non-admin
- Login with admin credentials
- Check user role: `User::find(1)->role`

### Issue: "A user with this email already exists"
- Email must be unique
- Use different email
- Delete existing user first

### Issue: "An invitation has already been sent to this email"
- Cancel previous invitation first
- Or wait for it to expire (7 days)
- Or use different email

---

## ✅ Phase 2 Checklist

- [x] ClinicSetupController created
- [x] UserController with CRUD operations
- [x] StaffInvitationController (basic, no email yet)
- [x] staff_invitations table migrated
- [x] StaffInvitation model with helpers
- [x] CheckRole middleware created
- [x] Middleware registered in bootstrap/app.php
- [x] API routes updated with role protection
- [x] Invitation acceptance creates user and auto-logins

---

## 🚀 Next Steps (Phase 3)

Ready for Phase 3? We'll create:

1. **Patient Management**
   - Patients table & model
   - Patient registration
   - Patient search & list
   - Auto-generated patient numbers (P-2024-0001)

2. **Bite Case Management**
   - Bite cases table & model
   - Create bite case
   - Link to patient
   - Auto-generated case numbers (BC-2024-0001)

Would you like to proceed to Phase 3?
