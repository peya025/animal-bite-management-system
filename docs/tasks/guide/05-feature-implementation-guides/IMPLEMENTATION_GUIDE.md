# Implementation Guide - Animal Bite Clinic Management System

This guide provides step-by-step implementation instructions based on the architecture defined in `SYSTEM_ARCHITECTURE.md`.

---

## 📋 Prerequisites Checklist

- ✅ Laravel 12 backend setup complete
- ✅ React + TypeScript frontend setup complete
- ✅ MySQL database configured
- ✅ Sanctum + CORS configured
- ✅ Mail service configured (SMTP/Mailtrap for dev)

---

## Phase 1: Database Setup

### Step 1: Create Migrations

```bash
cd backend

# Core tables
php artisan make:migration create_clinics_table
php artisan make:migration update_users_table_add_clinic_fields
php artisan make:migration create_staff_invitations_table
php artisan make:migration create_templates_table
php artisan make:migration create_clinic_settings_table

# Operational tables
php artisan make:migration create_patients_table
php artisan make:migration create_bite_cases_table
php artisan make:migration create_vaccination_schedules_table
php artisan make:migration create_patient_queue_table
```

### Step 2: Create Models

```bash
php artisan make:model Clinic
php artisan make:model StaffInvitation
php artisan make:model Template
php artisan make:model ClinicSetting
php artisan make:model Patient
php artisan make:model BiteCase
php artisan make:model VaccinationSchedule
php artisan make:model PatientQueue
```

### Step 3: Create Seeders

```bash
php artisan make:seeder TemplateSeeder
php artisan make:seeder DefaultAdminSeeder
```

---

## Phase 2: Core Models Implementation

### Example: Clinic Model with Relationships

```php
// app/Models/Clinic.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Clinic extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'registration_number',
        'logo_path',
        'template_id',
        'primary_color',
        'secondary_color',
        'is_setup_complete',
        'setup_completed_at',
        'setup_by',
        'is_active',
        'timezone',
    ];

    protected $casts = [
        'is_setup_complete' => 'boolean',
        'is_active' => 'boolean',
        'setup_completed_at' => 'datetime',
    ];

    // Relationships
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function admins(): HasMany
    {
        return $this->users()->where('role', 'admin');
    }

    public function staff(): HasMany
    {
        return $this->users()->where('role', 'staff');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class, 'template_id', 'id');
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(ClinicSetting::class);
    }

    // Helper Methods
    public function getSetting(string $key, $default = null)
    {
        $setting = $this->settings()->where('setting_key', $key)->first();
        return $setting ? $setting->setting_value : $default;
    }

    public function setSetting(string $key, $value, string $type = 'string'): void
    {
        $this->settings()->updateOrCreate(
            ['setting_key' => $key],
            ['setting_value' => $value, 'setting_type' => $type]
        );
    }
}
```

### Example: User Model Updates

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
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
        'status',
        'phone',
        'avatar_path',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Boot method for automatic clinic_id scoping
    protected static function booted()
    {
        // Automatically add clinic_id to queries when user is authenticated
        static::addGlobalScope('clinic', function ($builder) {
            if (auth()->check() && !auth()->user()->is_super_admin) {
                $builder->where('clinic_id', auth()->user()->clinic_id);
            }
        });
    }

    // Relationships
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    // Helper Methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
```

### Example: StaffInvitation Model

```php
// app/Models/StaffInvitation.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class StaffInvitation extends Model
{
    protected $fillable = [
        'clinic_id',
        'invited_by',
        'email',
        'role',
        'token',
        'status',
        'expires_at',
        'accepted_at',
        'accepted_by',
        'invitation_message',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    // Relationships
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedUser()
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    // Static methods
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    public static function createInvitation(array $data): self
    {
        return self::create([
            'clinic_id' => $data['clinic_id'],
            'invited_by' => $data['invited_by'],
            'email' => $data['email'],
            'role' => $data['role'] ?? 'staff',
            'token' => self::generateToken(),
            'status' => 'pending',
            'expires_at' => Carbon::now()->addDays(7),
            'invitation_message' => $data['message'] ?? null,
        ]);
    }

    // Helper methods
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isValid(): bool
    {
        return $this->isPending() && !$this->isExpired();
    }

    public function markAsAccepted(User $user): void
    {
        $this->update([
            'status' => 'accepted',
            'accepted_at' => now(),
            'accepted_by' => $user->id,
        ]);
    }
}
```

---

## Phase 3: Controllers Implementation

### ClinicSetupController

```php
// app/Http/Controllers/ClinicSetupController.php
namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClinicSetupController extends Controller
{
    /**
     * Check if setup is complete
     */
    public function checkSetup()
    {
        $user = auth()->user();
        $clinic = $user->clinic;

        return response()->json([
            'is_setup_complete' => $clinic->is_setup_complete,
            'clinic' => $clinic->is_setup_complete ? $clinic : null,
        ]);
    }

    /**
     * Get available templates
     */
    public function getTemplates()
    {
        $templates = Template::where('is_active', true)->get();
        
        return response()->json($templates);
    }

    /**
     * Step 1: Update clinic profile
     */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'phone' => 'required|string|max:50',
            'email' => 'required|email|max:255',
            'registration_number' => 'nullable|string|max:100',
            'logo' => 'nullable|image|max:2048', // 2MB max
        ]);

        $clinic = auth()->user()->clinic;
        
        $data = $request->except('logo');
        
        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($clinic->logo_path) {
                Storage::delete($clinic->logo_path);
            }
            
            $data['logo_path'] = $request->file('logo')->store('clinic-logos', 'public');
        }

        $clinic->update($data);

        return response()->json([
            'message' => 'Clinic profile updated successfully',
            'clinic' => $clinic,
        ]);
    }

    /**
     * Step 2: Select template
     */
    public function selectTemplate(Request $request)
    {
        $request->validate([
            'template_id' => 'required|exists:templates,id',
        ]);

        $clinic = auth()->user()->clinic;
        $clinic->update([
            'template_id' => $request->template_id,
        ]);

        return response()->json([
            'message' => 'Template selected successfully',
            'clinic' => $clinic->load('template'),
        ]);
    }

    /**
     * Step 3: Customize theme
     */
    public function customizeTheme(Request $request)
    {
        $request->validate([
            'primary_color' => 'required|regex:/^#[0-9A-F]{6}$/i',
            'secondary_color' => 'required|regex:/^#[0-9A-F]{6}$/i',
        ]);

        $clinic = auth()->user()->clinic;
        $clinic->update([
            'primary_color' => $request->primary_color,
            'secondary_color' => $request->secondary_color,
        ]);

        return response()->json([
            'message' => 'Theme customized successfully',
            'clinic' => $clinic,
        ]);
    }

    /**
     * Step 4: Complete setup
     */
    public function completeSetup(Request $request)
    {
        $clinic = auth()->user()->clinic;
        
        // Validate all required fields are filled
        if (!$clinic->name || !$clinic->template_id) {
            return response()->json([
                'message' => 'Please complete all setup steps',
            ], 422);
        }

        $clinic->update([
            'is_setup_complete' => true,
            'setup_completed_at' => now(),
            'setup_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Setup completed successfully',
            'clinic' => $clinic->load('template'),
        ]);
    }
}
```

### StaffInvitationController

```php
// app/Http/Controllers/StaffInvitationController.php
namespace App\Http\Controllers;

use App\Models\StaffInvitation;
use App\Models\User;
use App\Mail\StaffInvitationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StaffInvitationController extends Controller
{
    /**
     * Send staff invitation
     */
    public function invite(Request $request)
    {
        $this->authorize('invite', User::class);

        $request->validate([
            'email' => 'required|email|max:255',
            'role' => 'required|in:staff,admin',
            'message' => 'nullable|string',
        ]);

        $user = auth()->user();
        
        // Check if user already exists with this email
        if (User::where('email', $request->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['A user with this email already exists.'],
            ]);
        }

        // Check for pending invitation
        $existingInvitation = StaffInvitation::where('email', $request->email)
            ->where('status', 'pending')
            ->where('clinic_id', $user->clinic_id)
            ->first();

        if ($existingInvitation && !$existingInvitation->isExpired()) {
            throw ValidationException::withMessages([
                'email' => ['An invitation has already been sent to this email.'],
            ]);
        }

        // Create invitation
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $user->clinic_id,
            'invited_by' => $user->id,
            'email' => $request->email,
            'role' => $request->role,
            'message' => $request->message,
        ]);

        // Send email
        Mail::to($invitation->email)->send(new StaffInvitationMail($invitation));

        return response()->json([
            'message' => 'Invitation sent successfully',
            'invitation' => $invitation,
        ], 201);
    }

    /**
     * Get all invitations
     */
    public function index()
    {
        $this->authorize('viewAny', User::class);

        $invitations = StaffInvitation::where('clinic_id', auth()->user()->clinic_id)
            ->with(['inviter', 'acceptedUser'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invitations);
    }

    /**
     * Validate invitation token
     */
    public function validateToken(Request $request, string $token)
    {
        $invitation = StaffInvitation::where('token', $token)->first();

        if (!$invitation) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid invitation token',
            ], 404);
        }

        if (!$invitation->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => $invitation->isExpired() ? 'This invitation has expired' : 'This invitation has already been used',
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'invitation' => [
                'email' => $invitation->email,
                'role' => $invitation->role,
                'clinic' => $invitation->clinic->name,
            ],
        ]);
    }

    /**
     * Accept invitation and create account
     */
    public function accept(Request $request, string $token)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $invitation = StaffInvitation::where('token', $token)->first();

        if (!$invitation || !$invitation->isValid()) {
            return response()->json([
                'message' => 'Invalid or expired invitation',
            ], 400);
        }

        // Create user
        $user = User::create([
            'clinic_id' => $invitation->clinic_id,
            'name' => $request->name,
            'email' => $invitation->email,
            'password' => Hash::make($request->password),
            'role' => $invitation->role,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        // Mark invitation as accepted
        $invitation->markAsAccepted($user);

        // Generate auth token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully',
            'user' => $user->load('clinic'),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Cancel invitation
     */
    public function cancel(Request $request, int $id)
    {
        $this->authorize('invite', User::class);

        $invitation = StaffInvitation::where('clinic_id', auth()->user()->clinic_id)
            ->findOrFail($id);

        if (!$invitation->isPending()) {
            return response()->json([
                'message' => 'Only pending invitations can be cancelled',
            ], 400);
        }

        $invitation->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Invitation cancelled successfully',
        ]);
    }

    /**
     * Resend invitation
     */
    public function resend(Request $request, int $id)
    {
        $this->authorize('invite', User::class);

        $oldInvitation = StaffInvitation::where('clinic_id', auth()->user()->clinic_id)
            ->findOrFail($id);

        // Cancel old invitation
        $oldInvitation->update(['status' => 'cancelled']);

        // Create new invitation
        $newInvitation = StaffInvitation::createInvitation([
            'clinic_id' => $oldInvitation->clinic_id,
            'invited_by' => auth()->id(),
            'email' => $oldInvitation->email,
            'role' => $oldInvitation->role,
            'message' => $oldInvitation->invitation_message,
        ]);

        // Send email
        Mail::to($newInvitation->email)->send(new StaffInvitationMail($newInvitation));

        return response()->json([
            'message' => 'Invitation resent successfully',
            'invitation' => $newInvitation,
        ]);
    }
}
```

---

## Phase 4: Middleware Implementation

### EnsureClinicSetup Middleware

```php
// app/Http/Middleware/EnsureClinicSetup.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureClinicSetup
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $clinic = $user->clinic;

        // If admin and clinic not setup, must go to setup
        if ($user->isAdmin() && !$clinic->is_setup_complete) {
            // Allow setup routes
            if (!$request->routeIs('setup.*')) {
                return response()->json([
                    'message' => 'Clinic setup required',
                    'redirect' => '/setup',
                ], 403);
            }
        }

        // If staff and clinic not setup, deny access
        if ($user->isStaff() && !$clinic->is_setup_complete) {
            return response()->json([
                'message' => 'Clinic setup is not complete. Please contact your administrator.',
            ], 403);
        }

        return $next($request);
    }
}
```

### CheckUserStatus Middleware

```php
// app/Http/Middleware/CheckUserStatus.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckUserStatus
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$user->isActive()) {
            auth()->user()->currentAccessToken()->delete();
            
            return response()->json([
                'message' => 'Your account is not active. Please contact your administrator.',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## Phase 5: Mail Setup

### StaffInvitationMail

```php
// app/Mail/StaffInvitationMail.php
namespace App\Mail;

use App\Models\StaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StaffInvitation $invitation)
    {
    }

    public function build()
    {
        $acceptUrl = config('app.frontend_url') . '/accept-invitation/' . $this->invitation->token;

        return $this->subject('Invitation to Join ' . $this->invitation->clinic->name)
            ->markdown('emails.staff-invitation', [
                'invitation' => $this->invitation,
                'acceptUrl' => $acceptUrl,
                'clinic' => $this->invitation->clinic,
                'inviter' => $this->invitation->inviter,
            ]);
    }
}
```

### Email Template

```blade
{{-- resources/views/emails/staff-invitation.blade.php --}}
@component('mail::message')
# Invitation to Join {{ $clinic->name }}

Hello!

{{ $inviter->name }} has invited you to join **{{ $clinic->name }}** as a {{ ucfirst($invitation->role) }}.

@if($invitation->invitation_message)
**Message from {{ $inviter->name }}:**
{{ $invitation->invitation_message }}
@endif

@component('mail::button', ['url' => $acceptUrl])
Accept Invitation
@endcomponent

This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

Thanks,<br>
{{ $clinic->name }}
@endcomponent
```

---

## Phase 6: API Routes Setup

```php
// routes/api.php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClinicSetupController;
use App\Http\Controllers\StaffInvitationController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Invitation acceptance (public, token-based)
Route::prefix('invitations')->group(function () {
    Route::get('/{token}/validate', [StaffInvitationController::class, 'validateToken']);
    Route::post('/{token}/accept', [StaffInvitationController::class, 'accept']);
});

// Protected routes
Route::middleware(['auth:sanctum', 'check.user.status'])->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Setup routes (admin only, if not setup)
    Route::prefix('setup')->name('setup.')->group(function () {
        Route::get('/check', [ClinicSetupController::class, 'checkSetup']);
        Route::get('/templates', [ClinicSetupController::class, 'getTemplates']);
        Route::post('/profile', [ClinicSetupController::class, 'updateProfile']);
        Route::post('/template', [ClinicSetupController::class, 'selectTemplate']);
        Route::post('/theme', [ClinicSetupController::class, 'customizeTheme']);
        Route::post('/complete', [ClinicSetupController::class, 'completeSetup']);
    });

    // Routes requiring setup complete
    Route::middleware('ensure.clinic.setup')->group(function () {
        // Staff management (admin only)
        Route::middleware('role:admin')->prefix('staff')->group(function () {
            Route::post('/invite', [StaffInvitationController::class, 'invite']);
            Route::get('/invitations', [StaffInvitationController::class, 'index']);
            Route::post('/invitations/{id}/cancel', [StaffInvitationController::class, 'cancel']);
            Route::post('/invitations/{id}/resend', [StaffInvitationController::class, 'resend']);
        });

        // Operational routes (both admin and staff)
        // Add patient, queue, vaccination routes here
    });
});
```

---

## Phase 7: Frontend Implementation Guide

See separate file: `FRONTEND_IMPLEMENTATION.md`

---

## Testing Checklist

### Setup Flow
- [ ] Admin can complete first-time setup
- [ ] Setup wizard validates all required fields
- [ ] Template selection works correctly
- [ ] Theme customization saves properly
- [ ] Setup completion redirects to dashboard

### Staff Invitation
- [ ] Admin can send invitation
- [ ] Email is delivered with correct link
- [ ] Token validation works
- [ ] Expired invitations are rejected
- [ ] Staff account creation succeeds
- [ ] Auto-login after acceptance works

### Authentication & Authorization
- [ ] Login works for admin and staff
- [ ] Roles are enforced correctly
- [ ] Staff cannot access admin routes
- [ ] Inactive users are denied access
- [ ] Token expiration works

### Data Isolation
- [ ] Users only see data from their clinic
- [ ] Clinic scope is applied automatically
- [ ] Cross-clinic data access is prevented

---

This implementation guide provides the complete backend structure. Next steps:
1. Create migrations using provided schemas
2. Implement models with relationships
3. Create controllers with business logic
4. Set up routes and middleware
5. Configure email service
6. Implement frontend (see FRONTEND_IMPLEMENTATION.md)
