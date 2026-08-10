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
            ->select('id', 'name', 'email', 'role', 'assigned_module', 'is_active', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    /**
     * Create new user (admin only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['developer', 'admin', 'registration', 'triage', 'treatment'])],
            'phone' => 'nullable|string|max:50',
        ]);

        $user = User::create([
            'clinic_id' => $request->user()->clinic_id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'phone' => $request->phone,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    /**
     * Get single user
     */
    public function show(Request $request, $id)
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)
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
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|nullable|string|min:8',
            'role' => ['sometimes', 'required', Rule::in(['developer', 'admin', 'registration', 'triage', 'treatment'])],
            'phone' => 'nullable|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = $request->except('password');
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user,
        ]);
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

        $accounts = \App\Models\PatientAccount::withCount('patients')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($a) => [
                'id'             => $a->id,
                'name'           => $a->name,
                'email'          => $a->email,
                'phone'          => $a->phone,
                'is_active'      => $a->is_active,
                'patients_count' => $a->patients_count,
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
