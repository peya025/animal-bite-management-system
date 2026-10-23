# MVP Implementation Guide - Phase 1

## Quick Start Checklist

### Prerequisites
- [x] Laravel 12 backend setup
- [x] React + TypeScript frontend setup
- [x] MySQL database configured
- [x] Sanctum + CORS configured

---

## Step 1: Database Migrations

### Create Migration Files

```bash
cd backend

# Core tables for MVP
php artisan make:migration create_clinics_table
php artisan make:migration add_clinic_fields_to_users_table
php artisan make:migration create_patients_table
php artisan make:migration create_bite_cases_table
php artisan make:migration create_vaccination_schedules_table
php artisan make:migration create_patient_queue_table
```

### Migration: Clinics Table

```php
// database/migrations/xxxx_create_clinics_table.php
public function up()
{
    Schema::create('clinics', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->text('address')->nullable();
        $table->string('phone', 50)->nullable();
        $table->string('email')->nullable();
        $table->string('logo_path')->nullable();
        
        // Setup status
        $table->boolean('is_setup_complete')->default(false);
        $table->timestamp('setup_completed_at')->nullable();
        
        $table->timestamps();
    });
}
```

### Migration: Update Users Table

```php
// database/migrations/xxxx_add_clinic_fields_to_users_table.php
public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->foreignId('clinic_id')->after('id')->constrained()->cascadeOnDelete();
        $table->enum('role', ['admin', 'registration', 'triage', 'treatment'])->after('password');
        $table->boolean('is_active')->default(true)->after('role');
        $table->string('phone', 50)->nullable()->after('email');
        $table->boolean('must_change_password')->default(false)->after('password');
        $table->timestamp('last_login_at')->nullable()->after('remember_token');
    });
}
```

### Migration: Patients Table

```php
// database/migrations/xxxx_create_patients_table.php
public function up()
{
    Schema::create('patients', function (Blueprint $table) {
        $table->id();
        $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
        $table->string('patient_number', 50)->unique();
        
        // Personal info
        $table->string('first_name', 100);
        $table->string('last_name', 100);
        $table->date('date_of_birth')->nullable();
        $table->enum('gender', ['male', 'female'])->default('male');
        
        // Contact
        $table->string('phone', 50)->nullable();
        $table->text('address')->nullable();
        
        // Emergency contact
        $table->string('emergency_contact_name')->nullable();
        $table->string('emergency_contact_phone', 50)->nullable();
        
        // Registration tracking
        $table->foreignId('registered_by')->constrained('users');
        
        $table->timestamps();
        
        $table->index(['first_name', 'last_name']);
    });
}
```

### Migration: Bite Cases Table

```php
// database/migrations/xxxx_create_bite_cases_table.php
public function up()
{
    Schema::create('bite_cases', function (Blueprint $table) {
        $table->id();
        $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
        $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
        $table->string('case_number', 50)->unique();
        
        // Bite details
        $table->date('bite_date');
        $table->string('bite_location');
        $table->enum('bite_severity', ['minor', 'moderate', 'severe']);
        $table->string('animal_type', 100);
        $table->enum('animal_status', ['owned', 'stray', 'unknown'])->default('unknown');
        
        // Additional info
        $table->text('symptoms')->nullable();
        $table->text('notes')->nullable();
        
        // Status
        $table->enum('status', ['active', 'completed', 'referred', 'abandoned'])->default('active');
        
        // Created by triage/doctor
        $table->foreignId('created_by')->constrained('users');
        
        $table->timestamps();
        
        $table->index('status');
    });
}
```

### Migration: Vaccination Schedules Table

```php
// database/migrations/xxxx_create_vaccination_schedules_table.php
public function up()
{
    Schema::create('vaccination_schedules', function (Blueprint $table) {
        $table->id();
        $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
        $table->foreignId('bite_case_id')->constrained()->cascadeOnDelete();
        $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
        
        // Schedule
        $table->integer('dose_number');
        $table->date('scheduled_date');
        $table->enum('status', ['scheduled', 'completed', 'missed', 'rescheduled'])->default('scheduled');
        
        // Administration
        $table->timestamp('administered_at')->nullable();
        $table->foreignId('administered_by')->nullable()->constrained('users')->nullOnDelete();
        $table->string('vaccine_batch_number', 100)->nullable();
        $table->text('administration_notes')->nullable();
        
        // Scheduled by
        $table->foreignId('scheduled_by')->constrained('users');
        
        $table->timestamps();
        
        $table->index('scheduled_date');
        $table->index('status');
        $table->index(['patient_id', 'scheduled_date']);
    });
}
```

### Migration: Patient Queue Table

```php
// database/migrations/xxxx_create_patient_queue_table.php
public function up()
{
    Schema::create('patient_queue', function (Blueprint $table) {
        $table->id();
        $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
        $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
        $table->foreignId('bite_case_id')->nullable()->constrained()->nullOnDelete();
        
        // Queue details
        $table->integer('queue_number');
        $table->date('queue_date');
        $table->enum('visit_type', ['new_case', 'follow_up', 'vaccination']);
        
        // Status
        $table->enum('status', ['waiting', 'in_consultation', 'completed', 'cancelled'])->default('waiting');
        
        // Timing
        $table->timestamp('checked_in_at')->useCurrent();
        $table->timestamp('called_at')->nullable();
        $table->timestamp('completed_at')->nullable();
        
        // Staff tracking
        $table->foreignId('checked_in_by')->constrained('users');
        $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
        
        // Notes
        $table->text('check_in_notes')->nullable();
        
        $table->timestamps();
        
        $table->unique(['clinic_id', 'queue_date', 'queue_number']);
        $table->index(['queue_date', 'status']);
    });
}
```

### Run Migrations

```bash
php artisan migrate
```

---

## Step 2: Create Models

### Clinic Model

```php
// app/Models/Clinic.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Clinic extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'logo_path',
        'is_setup_complete',
        'setup_completed_at',
    ];

    protected $casts = [
        'is_setup_complete' => 'boolean',
        'setup_completed_at' => 'datetime',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }
}
```

### Update User Model

```php
// app/Models/User.php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'clinic_id',
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'phone',
        'must_change_password',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'must_change_password' => 'boolean',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    // Role helpers
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isRegistration(): bool
    {
        return $this->role === 'registration';
    }

    public function isTriage(): bool
    {
        return $this->role === 'triage';
    }

    public function isTreatment(): bool
    {
        return $this->role === 'treatment';
    }
}
```

### Patient Model

```php
// app/Models/Patient.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $fillable = [
        'clinic_id',
        'patient_number',
        'first_name',
        'last_name',
        'date_of_birth',
        'gender',
        'phone',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'registered_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    protected $appends = ['full_name'];

    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function registeredBy()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function biteCases()
    {
        return $this->hasMany(BiteCase::class);
    }

    public function queueEntries()
    {
        return $this->hasMany(PatientQueue::class);
    }

    // Auto-generate patient number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($patient) {
            if (!$patient->patient_number) {
                $patient->patient_number = static::generatePatientNumber($patient->clinic_id);
            }
        });
    }

    public static function generatePatientNumber($clinicId)
    {
        $year = date('Y');
        $lastPatient = static::where('clinic_id', $clinicId)
            ->where('patient_number', 'like', "P-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastPatient) {
            $parts = explode('-', $lastPatient->patient_number);
            $nextNumber = (int)end($parts) + 1;
        }

        return sprintf('P-%s-%04d', $year, $nextNumber);
    }
}
```

### BiteCase Model

```php
// app/Models/BiteCase.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiteCase extends Model
{
    protected $fillable = [
        'clinic_id',
        'patient_id',
        'case_number',
        'bite_date',
        'bite_location',
        'bite_severity',
        'animal_type',
        'animal_status',
        'symptoms',
        'notes',
        'status',
        'created_by',
    ];

    protected $casts = [
        'bite_date' => 'date',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class);
    }

    // Auto-generate case number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($case) {
            if (!$case->case_number) {
                $case->case_number = static::generateCaseNumber($case->clinic_id);
            }
        });
    }

    public static function generateCaseNumber($clinicId)
    {
        $year = date('Y');
        $lastCase = static::where('clinic_id', $clinicId)
            ->where('case_number', 'like', "BC-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastCase) {
            $parts = explode('-', $lastCase->case_number);
            $nextNumber = (int)end($parts) + 1;
        }

        return sprintf('BC-%s-%04d', $year, $nextNumber);
    }
}
```

### VaccinationSchedule Model

```php
// app/Models/VaccinationSchedule.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VaccinationSchedule extends Model
{
    protected $fillable = [
        'clinic_id',
        'bite_case_id',
        'patient_id',
        'dose_number',
        'scheduled_date',
        'status',
        'administered_at',
        'administered_by',
        'vaccine_batch_number',
        'administration_notes',
        'scheduled_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'administered_at' => 'datetime',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function biteCase()
    {
        return $this->belongsTo(BiteCase::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function administeredBy()
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    public function scheduledBy()
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }
}
```

### PatientQueue Model

```php
// app/Models/PatientQueue.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientQueue extends Model
{
    protected $table = 'patient_queue';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bite_case_id',
        'queue_number',
        'queue_date',
        'visit_type',
        'status',
        'checked_in_at',
        'called_at',
        'completed_at',
        'checked_in_by',
        'handled_by',
        'check_in_notes',
    ];

    protected $casts = [
        'queue_date' => 'date',
        'checked_in_at' => 'datetime',
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function biteCase()
    {
        return $this->belongsTo(BiteCase::class);
    }

    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function handledBy()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    // Auto-generate queue number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($queue) {
            if (!$queue->queue_number) {
                $queue->queue_number = static::generateQueueNumber($queue->clinic_id, $queue->queue_date);
            }
        });
    }

    public static function generateQueueNumber($clinicId, $queueDate)
    {
        $lastQueue = static::where('clinic_id', $clinicId)
            ->where('queue_date', $queueDate)
            ->orderBy('queue_number', 'desc')
            ->first();

        return $lastQueue ? $lastQueue->queue_number + 1 : 1;
    }
}
```

---

## Step 3: Create Seeders

### Default Clinic and Admin Seeder

```php
// database/seeders/DefaultClinicSeeder.php
<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultClinicSeeder extends Seeder
{
    public function run()
    {
        // Create default clinic
        $clinic = Clinic::create([
            'name' => 'Default Clinic',
            'is_setup_complete' => false,
        ]);

        // Create default admin
        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@clinic.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->command->info('Default clinic and admin created!');
        $this->command->info('Email: admin@clinic.com');
        $this->command->info('Password: password');
    }
}
```

### Run Seeder

```bash
php artisan db:seed --class=DefaultClinicSeeder
```

---

Continue to Part 2 for Controllers implementation...
