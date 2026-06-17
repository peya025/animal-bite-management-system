<?php

namespace App\Http\Controllers;

use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffInvitationController extends Controller
{
    /**
     * Send staff invitation
     */
    public function invite(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'role' => ['required', Rule::in(['registration', 'triage', 'treatment'])],
        ]);

        $user = $request->user();
        
        // Check if user already exists with this email
        if (User::where('email', $request->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['A user with this email already exists.'],
            ]);
        }

        // Check for existing pending invitation
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
        ]);

        // TODO: Send email (Phase 2 enhancement)
        // For now, just return the invitation with token
        // In production, you would send this via email

        return response()->json([
            'message' => 'Invitation created successfully',
            'invitation' => $invitation,
            'invitation_link' => url("/accept-invitation/{$invitation->token}"),
            'note' => 'Share this link with the staff member (email sending to be implemented)',
        ], 201);
    }

    /**
     * Get all invitations
     */
    public function index(Request $request)
    {
        $invitations = StaffInvitation::where('clinic_id', $request->user()->clinic_id)
            ->with('inviter')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invitations);
    }

    /**
     * Validate invitation token
     */
    public function validateToken(string $token)
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
                'clinic_name' => $invitation->clinic->name,
                'expires_at' => $invitation->expires_at,
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
            'phone' => 'nullable|string|max:50',
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
            'phone' => $request->phone,
            'is_active' => true,
        ]);

        // Mark invitation as accepted
        $invitation->markAsAccepted();

        // Generate auth token for auto-login
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load('clinic');

        return response()->json([
            'message' => 'Account created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'is_active' => $user->is_active,
                'clinic' => $user->clinic,
            ],
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Cancel invitation
     */
    public function cancel(Request $request, int $id)
    {
        $invitation = StaffInvitation::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if (!$invitation->isPending()) {
            return response()->json([
                'message' => 'Only pending invitations can be cancelled',
            ], 400);
        }

        $invitation->update(['status' => 'expired']);

        return response()->json([
            'message' => 'Invitation cancelled successfully',
        ]);
    }
}
