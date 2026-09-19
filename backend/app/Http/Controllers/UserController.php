<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Get all users (admin only)
     */
    public function index(Request $request)
    {
        // Check if user is admin
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }
        
        $clinicId = $request->user()->clinic_id;
        
        $users = User::where('clinic_id', $clinicId)
            ->with('roles')
            ->select('id', 'name', 'email', 'phone', 'role', 'assigned_module', 'is_active', 'signature_path', 'professional_license_no', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    /**
     * Create new user (admin only)
     */
    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $request->validate([
            'name'                    => 'required|string|max:255',
            'email'                   => 'required|email|max:255|unique:users',
            'password'                => 'required|string|min:8',
            'role'                    => 'nullable|string',
            'workstation_role'        => 'nullable|string',
            'roles'                   => 'nullable|array',
            'phone'                   => 'nullable|string|max:50',
            'professional_license_no' => 'nullable|string|max:100',
            'signature_path'          => 'nullable|string|max:255',
            'signature_data'          => 'nullable|string',
            'signature'               => 'nullable|image|max:2048',
        ]);

        $roleSlugInput = $request->workstation_role ?? $request->role ?? 'registration';
        $legacyRole = $this->determineLegacyRole($roleSlugInput, $request->roles);

        $user = User::create([
            'clinic_id'               => $request->user()->clinic_id,
            'name'                    => $request->name,
            'email'                   => $request->email,
            'password'                => Hash::make($request->password),
            'role'                    => $legacyRole,
            'phone'                   => $request->phone,
            'professional_license_no' => $request->professional_license_no,
            'is_active'               => $request->boolean('is_active', true),
        ]);

        // Process signature
        $sigPath = $this->processSignature($request, $user);
        if ($sigPath) {
            $user->update(['signature_path' => $sigPath]);
        }

        // Attach workstation roles
        $this->syncWorkstationRoles($user, $request, $request->user()->id);

        $user->load('roles');

        return response()->json([
            'message' => 'User created successfully',
            'user'    => $user,
        ], 201);
    }

    /**
     * Get single user
     */
    public function show(Request $request, $id)
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)
            ->with('roles')
            ->findOrFail($id);

        return response()->json($user);
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'name'                    => 'sometimes|required|string|max:255',
            'email'                   => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password'                => 'sometimes|nullable|string|min:8',
            'role'                    => 'nullable|string',
            'workstation_role'        => 'nullable|string',
            'roles'                   => 'nullable|array',
            'phone'                   => 'nullable|string|max:50',
            'professional_license_no' => 'nullable|string|max:100',
            'signature_path'          => 'nullable|string|max:255',
            'signature_data'          => 'nullable|string',
            'signature'               => 'nullable|image|max:2048',
            'is_active'               => 'sometimes|boolean',
        ]);

        $data = $request->except(['password', 'signature', 'signature_data', 'workstation_role', 'roles']);
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        if ($request->filled('workstation_role') || $request->filled('roles') || $request->filled('role')) {
            $roleSlugInput = $request->workstation_role ?? $request->role;
            $data['role'] = $this->determineLegacyRole($roleSlugInput, $request->roles);
        }

        $user->update($data);

        // Process signature update if provided
        $sigPath = $this->processSignature($request, $user);
        if ($sigPath) {
            $user->update(['signature_path' => $sigPath]);
        }

        // Sync roles if provided
        if ($request->has('workstation_role') || $request->has('roles') || $request->has('role')) {
            $this->syncWorkstationRoles($user, $request, $request->user()->id);
        }

        $user->load('roles');

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user,
        ]);
    }

    /**
     * Determine legacy role enum from inputs
     */
    private function determineLegacyRole(?string $input, ?array $rolesArray = null): string
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
     * Process signature upload, base64 data, or direct path
     */
    private function processSignature(Request $request, User $user): ?string
    {
        if ($request->hasFile('signature')) {
            $file = $request->file('signature');
            $dest = public_path('signatures');
            if (!file_exists($dest)) {
                mkdir($dest, 0755, true);
            }
            $filename = 'signature_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move($dest, $filename);
            return 'signatures/' . $filename;
        }

        if ($request->filled('signature_data')) {
            $data = $request->signature_data;
            if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
                $data = substr($data, strpos($data, ',') + 1);
                $type = strtolower($type[1]);
                if (in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                    $data = base64_decode($data);
                    if ($data !== false) {
                        $dest = public_path('signatures');
                        if (!file_exists($dest)) {
                            mkdir($dest, 0755, true);
                        }
                        $filename = 'signature_' . $user->id . '_' . time() . '.' . $type;
                        file_put_contents($dest . '/' . $filename, $data);
                        return 'signatures/' . $filename;
                    }
                }
            }
        }

        if ($request->filled('signature_path')) {
            return $request->signature_path;
        }

        return null;
    }

    /**
     * Sync workstation roles in user_roles table
     */
    private function syncWorkstationRoles(User $user, Request $request, ?int $assignedById = null): void
    {
        $slugs = [];

        if ($request->filled('roles') && is_array($request->roles)) {
            $slugs = $request->roles;
        } elseif ($request->filled('workstation_role')) {
            $wr = $request->workstation_role;
            if ($wr === 'solo_nurse' || $wr === 'dual_nurse') {
                $slugs = ['intake_nurse', 'follow_up_nurse'];
            } else {
                $slugs = [$wr];
            }
        } elseif ($request->filled('role')) {
            $r = $request->role;
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
            $roleModels = \App\Models\Role::whereIn('slug', $slugs)->get();
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

    /**
     * Delete user
     */
    public function destroy(Request $request, $id)
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        // Prevent deleting yourself
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Update staff member's assigned module
     * Access: Admin only
     */
    public function updateAssignedModule(Request $request, $id)
    {
        // Check if user is admin
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }
        
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
     * List all patient accounts (admin only)
     */
    public function patientAccounts(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $accounts = \App\Models\PatientAccount::with([
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
                        'date'  => \Carbon\Carbon::parse($nextAppt->scheduled_date ?? $nextAppt->appointment_date)->format('M j, Y'),
                        'label' => $nextAppt->dose_number === 0 ? 'Day 0' : "Day {$nextAppt->dose_number}",
                    ] : null,
                ];
            }),
            'last_login_at'  => $a->last_login_at,
            'created_at'     => $a->created_at,
        ]);

        return response()->json($accounts);
    }

    /**
     * Toggle patient account active status (admin only)
     */
    public function togglePatientAccount(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $account = \App\Models\PatientAccount::findOrFail($id);
        $account->update(['is_active' => !$account->is_active]);

        return response()->json([
            'message' => 'Patient account ' . ($account->is_active ? 'activated' : 'deactivated'),
            'account' => $account,
        ]);
    }
}
