# Quick Reference - Animal Bite Management System

## 🎯 8 Core Features

### 1. Auth (Sanctum)
- Login with email/password
- Token-based authentication
- Logout and session management
- `POST /api/login` `POST /api/logout` `GET /api/me`

### 2. Clinic Setup
- First-time configuration wizard
- Admin-only access
- Required before system use
- `GET /api/setup/status` `POST /api/setup/complete`

### 3. Users + Roles
- 4 roles: admin, registration, triage, treatment
- Role-based permissions
- User management (admin only)
- `GET /api/users` `POST /api/users` `PUT /api/users/{id}`

### 4. Patients
- Register new patients
- Search and view records
- Auto-generated patient numbers (P-2024-0001)
- `GET /api/patients` `POST /api/patients` `GET /api/patients/{id}`

### 5. Bite Cases
- Create bite case records
- Link to patient
- Auto-generated case numbers (BC-2024-0001)
- `GET /api/cases` `POST /api/cases` `GET /api/cases/{id}`

### 6. Vaccination
- Auto-schedule doses (Day 0, 3, 7, 14, 28)
- Record administration
- Track vaccine batch numbers
- `GET /api/vaccinations` `GET /api/vaccinations/today` `PUT /api/vaccinations/{id}`

### 7. Queue
- Daily patient queue
- Auto-increment queue numbers
- Status tracking (waiting → in_consultation → completed)
- `GET /api/queue` `POST /api/queue` `PUT /api/queue/{id}/call`

### 8. Invitations (Basic)
- Email invitation system
- Token-based (7-day expiry)
- Staff accepts and creates account
- `POST /api/invitations` `GET /api/invitations/{token}` `POST /api/invitations/{token}/accept`

---

## 👥 4 User Roles

| Role | Can Do |
|------|--------|
| **Admin** | Everything: setup, manage users, all features |
| **Registration** | Register patients, add to queue |
| **Triage** | View queue, create cases, schedule vaccinations |
| **Treatment** | Record vaccination administration |

---

## 📊 8 Database Tables

1. **clinics** - Single clinic info
2. **users** - All 4 role types
3. **staff_invitations** - Email invitation tokens
4. **patients** - Patient registry
5. **bite_cases** - Animal bite incidents
6. **vaccination_schedules** - Vaccination tracking
7. **patient_queue** - Daily queue
8. **personal_access_tokens** - Sanctum tokens

---

## 🔢 Auto-Generated Numbers

### Patient Number
- Format: `P-YYYY-####`
- Example: `P-2024-0001`
- Resets yearly

### Case Number
- Format: `BC-YYYY-####`
- Example: `BC-2024-0001`
- Resets yearly

### Queue Number
- Format: `#`
- Example: `1, 2, 3...`
- Resets daily

---

## 🔄 Typical Workflow

```
1. REGISTRATION STAFF
   → Register patient (or search existing)
   → Add to queue
   → Print queue ticket

2. PATIENT WAITS
   → Status: "waiting"

3. TRIAGE/DOCTOR STAFF
   → View queue
   → Call patient (status: "in_consultation")
   → Create bite case
   → Document bite details
   → Schedule vaccinations (5 doses)
   → Complete consultation

4. TREATMENT STAFF
   → View today's scheduled vaccinations
   → Call patient
   → Administer vaccine
   → Record: batch number, time
   → Mark as completed

5. PATIENT RETURNS
   → For dose 2, 3, 4, 5
   → Registration adds to queue as "vaccination" visit
   → Treatment staff records each dose
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=DefaultClinicSeeder
php artisan serve
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. First Login
```
URL: http://localhost:5173/login
Email: admin@clinic.com
Password: password123
```

### 4. Complete Setup
- Login as admin
- Complete clinic setup wizard
- Start using the system

---

## 📧 Email Configuration

For invitations to work, configure email in `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@clinic.com"
MAIL_FROM_NAME="Animal Bite Center"
```

For development, use [Mailtrap](https://mailtrap.io) (free testing inbox).

---

## 🔐 Security Notes

### Password Rules
- Minimum 8 characters
- Include uppercase, lowercase, numbers
- Hashed with bcrypt

### Token Security
- Invitation tokens: 64-character random string
- Expire after 7 days
- One-time use only

### API Security
- All routes protected with Sanctum
- Role-based middleware
- CORS configured for frontend

---

## 📝 Common Tasks

### Create New User (Admin)
```php
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "registration"
}
```

### Register Patient
```php
POST /api/patients
{
  "first_name": "Jane",
  "last_name": "Smith",
  "date_of_birth": "1990-01-15",
  "gender": "female",
  "phone": "09123456789",
  "address": "123 Main St"
}
```

### Create Bite Case
```php
POST /api/cases
{
  "patient_id": 1,
  "bite_date": "2024-06-17",
  "bite_location": "Right hand",
  "bite_severity": "moderate",
  "animal_type": "dog",
  "animal_status": "stray"
}
```

### Add to Queue
```php
POST /api/queue
{
  "patient_id": 1,
  "visit_type": "new_case"
}
```

### Record Vaccination
```php
PUT /api/vaccinations/1
{
  "status": "completed",
  "vaccine_batch_number": "VAC-2024-001",
  "notes": "No adverse reactions"
}
```

---

## 🐛 Troubleshooting

### Database Issues
```bash
php artisan migrate:fresh --seed
```

### Cache Issues
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### CORS Issues
- Check `config/cors.php` includes frontend URL
- Verify `FRONTEND_URL` in `.env`
- Clear browser cache

### Login Issues
- Verify user exists: `php artisan tinker` → `User::all()`
- Check password: `Hash::check('password', $user->password)`
- Ensure Sanctum middleware is active

---

## 📞 Need Help?

### Documentation
1. **FINAL_IMPLEMENTATION.md** - Complete implementation guide
2. **SANCTUM_CORS_SETUP.md** - Authentication setup
3. **MVP_ARCHITECTURE.md** - Database design

### Check List
- [ ] Database migrated?
- [ ] Default admin seeded?
- [ ] Both servers running?
- [ ] CORS configured?
- [ ] Email configured (for invitations)?

---

## 🎯 Next Features (Future)

- **Phase 2**: Enhanced notifications, activity logs
- **Phase 3**: Templates, theme customization, reporting
- **Future**: SMS notifications, multi-language, mobile app sync

---

Keep this file as your go-to reference during development! 🚀
