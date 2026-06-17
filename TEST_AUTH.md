# Test Authentication - Phase 1

## ✅ Phase 1 Setup Complete!

### What We Built:
1. ✅ Created `clinics` table
2. ✅ Updated `users` table with clinic_id and role
3. ✅ Created `Clinic` model with relationships
4. ✅ Updated `User` model with role helpers
5. ✅ Created seeder with 4 test users
6. ✅ Updated `AuthController` to include clinic data

---

## 🧪 Test the System

### 1. Test Admin Login

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@clinic.com\",\"password\":\"password123\"}"
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@clinic.com",
    "role": "admin",
    "phone": "09123456789",
    "is_active": true,
    "clinic": {
      "id": 1,
      "name": "Animal Bite Center",
      "address": "123 Main Street, City",
      "phone": "09123456789",
      "email": "info@animalbitecenter.com",
      "is_setup_complete": false
    }
  },
  "token": "1|xxxxxxxxxxxxxxxxx",
  "token_type": "Bearer"
}
```

### 2. Test Registration Staff Login

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"registration@clinic.com\",\"password\":\"password123\"}"
```

### 3. Test Triage Staff Login

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"triage@clinic.com\",\"password\":\"password123\"}"
```

### 4. Test Treatment Staff Login

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"treatment@clinic.com\",\"password\":\"password123\"}"
```

### 5. Test Get User Info (Protected Route)

First, save the token from login response, then:

```bash
curl -X GET http://localhost:8000/api/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@clinic.com",
  "role": "admin",
  "phone": "09123456789",
  "is_active": true,
  "last_login_at": "2024-06-17T14:38:15.000000Z",
  "clinic": {
    "id": 1,
    "name": "Animal Bite Center",
    ...
  }
}
```

---

## 🔍 Verify Database

### Check Clinics
```bash
php artisan tinker
```

```php
App\Models\Clinic::first()
```

### Check Users
```php
App\Models\User::all()
```

### Check User with Clinic
```php
App\Models\User::with('clinic')->first()
```

### Check Clinic with Users
```php
App\Models\Clinic::with('users')->first()
```

### Test Role Helpers
```php
$user = App\Models\User::first();
$user->isAdmin(); // should return true
$user->isRegistration(); // should return false
```

---

## 📊 Test Data Summary

| Email | Password | Role | Name |
|-------|----------|------|------|
| admin@clinic.com | password123 | admin | Admin User |
| registration@clinic.com | password123 | registration | Registration Staff |
| triage@clinic.com | password123 | triage | Triage Doctor |
| treatment@clinic.com | password123 | treatment | Treatment Nurse |

**Clinic:**
- Name: Animal Bite Center
- Setup Complete: No (false)

---

## 🐛 Troubleshooting

### Issue: Migration Error
```bash
php artisan migrate:fresh
php artisan db:seed --class=DefaultClinicSeeder
```

### Issue: "401 Unauthenticated"
- Make sure Laravel server is running: `php artisan serve`
- Check token is included in Authorization header
- Verify token hasn't expired

### Issue: "The provided credentials are incorrect"
- Check email and password spelling
- Verify seeder ran successfully
- Check database has users: `php artisan tinker` → `User::count()`

### Issue: CORS Error from Frontend
- Backend running: `http://localhost:8000`
- Frontend running: `http://localhost:5173`
- Check `config/cors.php` has `http://localhost:5173`
- Clear config cache: `php artisan config:clear`

---

## ✅ Phase 1 Checklist

- [x] Database migrations created and run
- [x] Clinic model created
- [x] User model updated with relationships
- [x] Default seeder created
- [x] Test data seeded (1 clinic + 4 users)
- [x] AuthController updated
- [x] Login returns user with clinic data
- [x] /api/me returns user with clinic data
- [x] Last login timestamp updated

---

## 🚀 Next Steps (Phase 2)

Ready to move to Phase 2? We'll create:

1. **Clinic Setup Controller**
   - Check setup status
   - Update clinic info
   - Complete setup wizard

2. **User Management Controller**
   - List users
   - Create users
   - Edit users
   - Delete users

3. **Role-Based Middleware**
   - Check user role
   - Protect routes by role

Would you like to proceed with Phase 2?
