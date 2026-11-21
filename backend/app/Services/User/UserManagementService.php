<?php

namespace App\Services\User;

use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\User;
use App\Services\StaffSignatureService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserManagementService
{
    public function __construct(
        protected StaffSignatureService $signatureService
    ) {}

    /**
     * List all staff members for the given clinic.
     */
    public function listClinicUsers(int $clinicId): Collection
    {
        $users = User::where('clinic_id', $clinicId)
            ->with('roles')
            ->select('id', 'name', 'email', 'phone', 'role', 'assigned_module', 'is_active', 'signature_path', 'professional_license_no', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        $users->each(fn (User $user) => $user->setAttribute('signature_available', $this->signatureService->available($user->signature_path)));

        return $users;
    }

    /**
     * Create a new staff member with roles and optional signature.
     */
    public function createUser(int $clinicId, array $data, Request $request, int $adminId): User
    {
        $png = $this->signatureService->prepare($request);

        return DB::transaction(function () use ($clinicId, $data, $request, $png, $adminId) {
            $roleSlugInput = $data['workstation_role'] ?? $data['role'] ?? 'registration';
            $legacyRole = $this->determineLegacyRole($roleSlugInput, $data['roles'] ?? null);

            $user = User::create([
                'clinic_id'               => $clinicId,
                'name'                    => $data['name'],
                'email'                   => $data['email'],
                'password'                => Hash::make($data['password']),
                'role'                    => $legacyRole,
                'phone'                   => $data['phone'] ?? null,
                'professional_license_no' => $data['professional_license_no'] ?? null,
                'is_active'               => $data['is_active'] ?? true,
            ]);

            // Attach workstation roles
            $this->syncWorkstationRoles($user, $data, $adminId);

            $user->load('roles');
            $this->signatureService->apply($user, $request, $png);

            return $user;
        });
    }

    /**
     * Retrieve a specific staff user in the clinic.
     */
    public function getClinicUser(int $clinicId, int $userId): User
    {
        return User::where('clinic_id', $clinicId)
            ->with('roles')
            ->findOrFail($userId);
    }

    /**
     * Update an existing staff member in the clinic.
     */
    public function updateUser(int $clinicId, int $userId, array $data, Request $request, int $adminId): User
    {
        $target = User::where('clinic_id', $clinicId)->findOrFail($userId);
        $png = $this->signatureService->prepare($request);

        return DB::transaction(function () use ($target, $data, $request, $png, $adminId) {
            $user = User::whereKey($target->id)->lockForUpdate()->firstOrFail();
            $updateData = array_intersect_key($data, array_flip(['name', 'email', 'phone', 'professional_license_no', 'is_active']));

            if (!empty($data['password'])) {
                $updateData['password'] = Hash::make($data['password']);
            }

            if (isset($data['workstation_role']) || isset($data['roles']) || isset($data['role'])) {
                $roleSlugInput = $data['workstation_role'] ?? ($data['role'] ?? null);
                $updateData['role'] = $this->determineLegacyRole($roleSlugInput, $data['roles'] ?? null);
            }

            $user->update($updateData);

            // Security: If password changed or account deactivated, revoke all existing API tokens
            if (!empty($data['password']) || (array_key_exists('is_active', $data) && !$user->is_active)) {
                $user->tokens()->delete();
            }

            // Sync roles if provided
            if (array_key_exists('workstation_role', $data) || array_key_exists('roles', $data) || array_key_exists('role', $data)) {
                $this->syncWorkstationRoles($user, $data, $adminId);
            }

            $user->load('roles');
            $this->signatureService->apply($user, $request, $png);

            return $user;
        });
    }

    /**
     * Delete a staff user in the clinic.
     */
    public function deleteUser(int $clinicId, int $userId, int $adminId): void
    {
        $user = User::where('clinic_id', $clinicId)->findOrFail($userId);

        if ($user->id === $adminId) {
            abort(response()->json(['message' => 'You cannot delete your own account'], 403));
        }

        $user->delete();
    }

    /**
     * Update assigned module for a staff user.
     */
    public function updateAssignedModule(int $clinicId, int $userId, string $module): User
    {
        $user = User::where('clinic_id', $clinicId)->findOrFail($userId);
        $user->update(['assigned_module' => $module]);

        return $user;
    }

    /**
     * List all patient accounts for admin view with nested relations.
     */
    public function listPatientAccounts(): Collection
    {
        return PatientAccount::with([
            'patients.biteIncidents',
            'patients.treatmentRecords',
            'patients.appointments' => function ($q) {
                $q->orderBy('scheduled_date', 'asc');
            },
        ])
        ->withCount('patients')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(fn($a) => [
            'id'             => $a->id,
            'name'           => $a->name,
            'email'          => $a->email,
            'phone'          => $a->phone,
            'is_active'      => (bool) $a->is_active,
            'patients_count' => $a->patients_count,
            'patients'       => $a->patients->map(function ($p) {
                $hasBiteIncident = $p->biteIncidents->isNotEmpty();
                $hasScheduledAppt = $p->appointments->where('status', 'scheduled')->isNotEmpty();
                $hasTreatment = $p->treatmentRecords->isNotEmpty();

                $latestBite = $p->biteIncidents->sortByDesc('created_at')->first();
                $nextAppt = $p->appointments->first(fn($app) => $app->status === 'scheduled');

                return [
                    'id'                        => $p->patient_id,
                    'patient_id'                => $p->patient_id,
                    'patient_number'            => $p->patient_number,
                    'first_name'                => $p->first_name,
                    'middle_name'               => $p->middle_name,
                    'last_name'                 => $p->last_name,
                    'relationship'              => $p->pivot->relationship ?? 'self',
                    'gender'                    => $p->gender,
                    'age'                       => $p->age,
                    'date_of_birth'             => $p->date_of_birth,
                    'address'                   => $p->address,
                    'contact_number'            => $p->contact_number,
                    'emergency_contact_name'    => $p->emergency_contact_name,
                    'emergency_contact_number'  => $p->emergency_contact_number,
                    'status'                    => $p->status,
                    'has_active_case'           => $hasBiteIncident || $hasScheduledAppt,
                    'case_summary'              => $latestBite ? [
                        'case_number' => $latestBite->case_number,
                        'category'    => $latestBite->exposure_category ?? 'Category II',
                        'animal'      => $latestBite->animal_type ?? 'Dog',
                    ] : null,
                    'next_appointment'          => $nextAppt ? [
                        'date'  => Carbon::parse($nextAppt->scheduled_date ?? $nextAppt->appointment_date)->format('M j, Y'),
                        'label' => $nextAppt->dose_number === 0 ? 'Day 0' : "Day {$nextAppt->dose_number}",
                    ] : null,
                ];
            }),
            'last_login_at'  => $a->last_login_at,
            'created_at'     => $a->created_at,
        ]);
    }

    /**
     * Toggle patient account is_active flag.
     */
    public function togglePatientAccount(int $accountId): PatientAccount
    {
        $account = PatientAccount::findOrFail($accountId);
        $account->update(['is_active' => !$account->is_active]);

        return $account;
    }

    /**
     * Determine legacy role enum from inputs.
     */
    public function determineLegacyRole(?string $input, ?array $rolesArray = null): string
    {
        $allSlugs = [];
        if (!empty($rolesArray)) {
            $allSlugs = array_merge($allSlugs, $rolesArray);
        }
        if ($input) {
            $allSlugs[] = $input;
        }

        foreach ($allSlugs as $slug) {
            if (in_array($slug, ['intake_nurse', 'follow_up_nurse', 'solo_nurse', 'treatment'])) {
                return 'treatment';
            }
            if (in_array($slug, ['doctor', 'triage'])) {
                return 'triage';
            }
            if (in_array($slug, ['receptionist', 'registration'])) {
                return 'registration';
            }
            if (in_array($slug, ['clinic_admin', 'admin', 'developer'])) {
                return in_array('developer', $allSlugs) ? 'developer' : 'admin';
            }
        }

        return 'registration';
    }

    /**
     * Sync workstation roles in user_roles table.
     */
    public function syncWorkstationRoles(User $user, array $data, ?int $assignedById = null): void
    {
        $slugs = [];

        if (!empty($data['roles']) && is_array($data['roles'])) {
            $slugs = $data['roles'];
        } elseif (!empty($data['workstation_role'])) {
            $wr = $data['workstation_role'];
            if ($wr === 'solo_nurse' || $wr === 'dual_nurse') {
                $slugs = ['intake_nurse', 'follow_up_nurse'];
            } else {
                $slugs = [$wr];
            }
        } elseif (!empty($data['role'])) {
            $r = $data['role'];
            if ($r === 'treatment') {
                $slugs = ['intake_nurse', 'follow_up_nurse'];
            } elseif ($r === 'triage') {
                $slugs = ['doctor'];
            } elseif ($r === 'registration') {
                $slugs = ['receptionist'];
            } elseif ($r === 'admin' || $r === 'developer') {
                $slugs = ['clinic_admin'];
            } elseif ($r === 'solo_nurse' || $r === 'dual_nurse') {
                $slugs = ['intake_nurse', 'follow_up_nurse'];
            } else {
                $slugs = [$r];
            }
        }

        if (!empty($slugs)) {
            $roleModels = Role::whereIn('slug', $slugs)->get();
            $syncData = [];
            foreach ($roleModels as $rm) {
                $syncData[$rm->id] = [
                    'assigned_by' => $assignedById,
                    'assigned_at' => now(),
                ];
            }
            $user->roles()->sync($syncData);
        }
    }
}
