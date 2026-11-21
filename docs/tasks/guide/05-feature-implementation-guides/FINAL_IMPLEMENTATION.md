# Final Implementation Guide - Core Features Only

## 🎯 Scope: Essential Features

### What We're Building:
1. ✅ **Auth** - Login/logout with Sanctum
2. ✅ **Clinic Setup** - First-time wizard for admin
3. ✅ **Users + Roles** - 4 roles (admin, registration, triage, treatment)
4. ✅ **Patients** - Registration and management
5. ✅ **Bite Cases** - Case tracking
6. ✅ **Vaccination** - Schedule and record
7. ✅ **Queue** - Daily patient queue
8. ✅ **Invitations** - Basic email invitation for staff

---

## 📊 Database Schema (8 Tables)

### 1. clinics
```sql
CREATE TABLE clinics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_path VARCHAR(255),
    is_setup_complete BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. users
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'registration', 'triage', 'treatment') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(50),
    remember_token VARCHAR(100),
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    INDEX idx_clinic_email (clinic_id, email)
);
```

### 3. staff_invitations
```sql
CREATE TABLE staff_invitations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    invited_by BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('registration', 'triage', 'treatment') NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token)
);
```

### 4. patients
```sql
CREATE TABLE patients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('male', 'female') DEFAULT 'male',
    phone VARCHAR(50),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    registered_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id),
    INDEX idx_name (first_name, last_name)
);
```

### 5. bite_cases
```sql
CREATE TABLE bite_cases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    bite_date DATE NOT NULL,
    bite_location VARCHAR(255) NOT NULL,
    bite_severity ENUM('minor', 'moderate', 'severe') NOT NULL,
    animal_type VARCHAR(100) NOT NULL,
    animal_status ENUM('owned', 'stray', 'unknown') DEFAULT 'unknown',
    notes TEXT,
    status ENUM('active', 'completed') DEFAULT 'active',
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 6. vaccination_schedules
```sql
CREATE TABLE vaccination_schedules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    bite_case_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    dose_number INT NOT NULL,
    scheduled_date DATE NOT NULL,
    status ENUM('scheduled', 'completed', 'missed') DEFAULT 'scheduled',
    administered_at TIMESTAMP NULL,
    administered_by BIGINT NULL,
    vaccine_batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (bite_case_id) REFERENCES bite_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_scheduled_date (scheduled_date)
);
```

### 7. patient_queue
```sql
CREATE TABLE patient_queue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    bite_case_id BIGINT NULL,
    queue_number INT NOT NULL,
    queue_date DATE NOT NULL,
    visit_type ENUM('new_case', 'follow_up', 'vaccination') NOT NULL,
    status ENUM('waiting', 'in_consultation', 'completed') DEFAULT 'waiting',
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    checked_in_by BIGINT NOT NULL,
    handled_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES users(id),
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_daily_queue (clinic_id, queue_date, queue_number)
);
```

### 8. personal_access_tokens (Sanctum - already migrated)
```sql
-- Already exists from Sanctum installation
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Migrations

```bash
cd backend

php artisan make:migration create_clinics_table
php artisan make:migration add_clinic_fields_to_users_table
php artisan make:migration create_staff_invitations_table
php artisan make:migration create_patients_table
php artisan make:migration create_bite_cases_table
php artisan make:migration create_vaccination_schedules_table
php artisan make:migration create_patient_queue_table
```

### Step 2: Implement Migrations

Copy the SQL schemas above into the migration files using Laravel schema builder.

**Example: create_clinics_table.php**
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('is_setup_complete')->default(false);
            $table->timestamp('setup_completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinics');
    }
};
```

**Example: add_clinic_fields_to_users_table.php**
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('clinic_id')->after('id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['admin', 'registration', 'triage', 'treatment'])->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->string('phone', 50)->nullable()->after('email');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['clinic_id']);
            $table->dropColumn(['clinic_id', 'role', 'is_active', 'phone', 'last_login_at']);
        });
    }
};
```

### Step 3: Run Migrations

```bash
php artisan migrate
```

### Step 4: Create Models

```bash
php artisan make:model Clinic
php artisan make:model StaffInvitation
php artisan make:model Patient
php artisan make:model BiteCase
php artisan make:model VaccinationSchedule
php artisan make:model PatientQueue
```

### Step 5: Create Seeder (Default Admin)

```bash
php artisan make:seeder DefaultClinicSeeder
```

**database/seeders/DefaultClinicSeeder.php**
```php
<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultClinicSeeder extends Seeder
{
    public function run(): void
    {
        // Create default clinic
        $clinic = Clinic::create([
            'name' => 'Animal Bite Center',
            'is_setup_complete' => false,
        ]);

        // Create default admin
        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->command->info('✅ Default clinic and admin created!');
        $this->command->info('📧 Email: admin@clinic.com');
        $this->command->info('🔑 Password: password123');
    }
}
```

Run seeder:
```bash
php artisan db:seed --class=DefaultClinicSeeder
```

---

## 🎨 API Endpoints Structure

### Authentication
```
POST   /api/login
POST   /api/logout
GET    /api/me
```

### Clinic Setup (Admin only)
```
GET    /api/setup/status
POST   /api/setup/complete
PUT    /api/setup/clinic
```

### Users (Admin only)
```
GET    /api/users
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

### Staff Invitations (Admin only)
```
POST   /api/invitations              # Send invitation
GET    /api/invitations              # List invitations
GET    /api/invitations/{token}      # Validate token
POST   /api/invitations/{token}/accept  # Accept invitation
```

### Patients (Admin, Registration, Triage)
```
GET    /api/patients
POST   /api/patients
GET    /api/patients/{id}
PUT    /api/patients/{id}
DELETE /api/patients/{id}
```

### Bite Cases (Admin, Triage)
```
GET    /api/cases
POST   /api/cases
GET    /api/cases/{id}
PUT    /api/cases/{id}
```

### Vaccination Schedules (Admin, Triage, Treatment)
```
GET    /api/vaccinations              # All schedules
GET    /api/vaccinations/today        # Today's vaccinations
POST   /api/vaccinations              # Create schedule
PUT    /api/vaccinations/{id}         # Update (record administration)
```

### Queue (Admin, Registration, Triage)
```
GET    /api/queue                     # Today's queue
POST   /api/queue                     # Add to queue
PUT    /api/queue/{id}/call          # Call patient
PUT    /api/queue/{id}/complete      # Complete
```

---

## 🔐 Role Permissions Matrix

| Feature | Admin | Registration | Triage | Treatment |
|---------|-------|--------------|--------|-----------|
| **Clinic Setup** | ✅ | ❌ | ❌ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ |
| **Send Invitations** | ✅ | ❌ | ❌ | ❌ |
| **Register Patients** | ✅ | ✅ | ❌ | ❌ |
| **View Patients** | ✅ | ✅ | ✅ | ✅ |
| **Add to Queue** | ✅ | ✅ | ❌ | ❌ |
| **View Queue** | ✅ | ✅ | ✅ | ❌ |
| **Create Bite Case** | ✅ | ❌ | ✅ | ❌ |
| **Schedule Vaccination** | ✅ | ❌ | ✅ | ❌ |
| **Record Vaccination** | ✅ | ❌ | ❌ | ✅ |

---

## 📧 Basic Email Invitation Flow

### 1. Admin Sends Invitation
```
Admin Dashboard
    ↓
Click "Invite Staff"
    ↓
Enter: email, role
    ↓
System generates token
    ↓
Email sent with link
```

### 2. Staff Accepts Invitation
```
Staff receives email
    ↓
Clicks invitation link
    ↓
/accept-invitation/{token}
    ↓
Validates token (not expired)
    ↓
Fill form: name, password
    ↓
Account created
    ↓
Auto-login
```

### 3. Email Template (Simple)
```
Subject: Invitation to join [Clinic Name]

Hello!

You've been invited to join [Clinic Name] as [Role].

Click here to accept: [Link]

This invitation expires in 7 days.
```

---

## 🔢 Auto-Number Generation Logic

### Patient Number: P-2024-0001
```php
// In Patient model
protected static function boot()
{
    parent::boot();
    
    static::creating(function ($patient) {
        $patient->patient_number = static::generateNumber($patient->clinic_id);
    });
}

public static function generateNumber($clinicId)
{
    $year = date('Y');
    $last = static::where('clinic_id', $clinicId)
        ->where('patient_number', 'like', "P-{$year}-%")
        ->orderBy('id', 'desc')
        ->first();
    
    $next = $last ? ((int)substr($last->patient_number, -4)) + 1 : 1;
    return sprintf('P-%s-%04d', $year, $next);
}
```

### Case Number: BC-2024-0001
```php
// Similar logic in BiteCase model
public static function generateNumber($clinicId)
{
    $year = date('Y');
    $last = static::where('clinic_id', $clinicId)
        ->where('case_number', 'like', "BC-{$year}-%")
        ->orderBy('id', 'desc')
        ->first();
    
    $next = $last ? ((int)substr($last->case_number, -4)) + 1 : 1;
    return sprintf('BC-%s-%04d', $year, $next);
}
```

### Queue Number: 1, 2, 3... (daily reset)
```php
// In PatientQueue model
public static function generateNumber($clinicId, $queueDate)
{
    $last = static::where('clinic_id', $clinicId)
        ->where('queue_date', $queueDate)
        ->orderBy('queue_number', 'desc')
        ->first();
    
    return $last ? $last->queue_number + 1 : 1;
}
```

---

## ⚡ Quick Start Commands

### Backend Setup
```bash
cd backend

# Install dependencies
composer install

# Run migrations
php artisan migrate

# Seed default admin
php artisan db:seed --class=DefaultClinicSeeder

# Start server
php artisan serve
# Server: http://localhost:8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Server: http://localhost:5173
```

### Test Login
```
URL: http://localhost:5173/login
Email: admin@clinic.com
Password: password123
```

---

## 📝 Implementation Checklist

### Backend
- [ ] Create 7 migrations
- [ ] Create 6 models
- [ ] Create default seeder
- [ ] Create authentication controllers
- [ ] Create clinic setup controller
- [ ] Create user management controller
- [ ] Create invitation controller
- [ ] Create patient controller
- [ ] Create bite case controller
- [ ] Create vaccination controller
- [ ] Create queue controller
- [ ] Add role-based middleware
- [ ] Define API routes

### Frontend
- [ ] Create login page
- [ ] Create setup wizard (admin)
- [ ] Create admin dashboard
- [ ] Create user management UI
- [ ] Create invitation UI
- [ ] Create patient registration form
- [ ] Create patient list/search
- [ ] Create queue display
- [ ] Create bite case form
- [ ] Create vaccination schedule UI
- [ ] Create vaccination recording UI
- [ ] Add role-based navigation
- [ ] Add protected routes

---

## 🎯 Development Timeline

**Week 1**: Database + Auth
- Migrations, models, seeders
- Login/logout functionality
- Clinic setup wizard

**Week 2**: User Management
- User CRUD
- Basic invitation system
- Role-based access

**Week 3**: Patient Management
- Registration form
- Patient list/search
- Queue functionality

**Week 4**: Core Workflow
- Bite case creation
- Vaccination scheduling
- Vaccination recording

**Week 5**: Polish & Test
- UI improvements
- Bug fixes
- End-to-end testing

---

This is the complete, focused implementation with only essential features. Ready to start coding! 🚀
