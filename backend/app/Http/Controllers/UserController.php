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
        $clinicId = $request->user()->clinic_id;
        
        $users = User::where('clinic_id', $clinicId)
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
            'role' => ['required', Rule::in(['admin', 'registration', 'triage', 'treatment'])],
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
            'role' => ['sometimes', 'required', Rule::in(['admin', 'registration', 'triage', 'treatment'])],
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
}
