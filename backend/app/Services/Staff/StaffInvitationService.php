<?php

namespace App\Services\Staff;

use App\Mail\StaffInvitationMail;
use App\Models\Clinic;
use App\Models\Role;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Services\Messaging\EmailTransportInterface;
use App\Services\Messaging\InvitationDelivery;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class StaffInvitationService
{
    /**
     * Send staff invitation, map workstation roles, and dispatch email.
     *
     * @return array{message: string, invitation: StaffInvitation, email_sent: bool, invitation_link: string}
     *
     * @throws ValidationException
     */
    public function invite(User $admin, array $validated): array
    {
        return DB::transaction(function () use ($admin, $validated) {
            Clinic::whereKey($admin->clinic_id)->lockForUpdate()->firstOrFail();
            $email = trim($validated['email']);

            // Check if user already exists with this email
            if (User::where('email', $email)->exists()) {
                throw ValidationException::withMessages([
                    'email' => ['A user with this email already exists.'],
                ]);
            }

            // Check for existing pending invitation
            $existingInvitation = StaffInvitation::where('email', $email)
                ->where('status', 'pending')
                ->where('clinic_id', $admin->clinic_id)
                ->first();

            if ($existingInvitation && ! $existingInvitation->isExpired()) {
                throw ValidationException::withMessages([
                    'email' => ['An invitation has already been sent to this email.'],
                ]);
            }

            $inputRole = $validated['workstation_role'] ?? $validated['role'] ?? 'registration';

            // Map canonical/workstation role
            $legacyRole = 'registration';
            $workstationRole = $inputRole;

            if (in_array($inputRole, ['intake_nurse', 'follow_up_nurse', 'solo_nurse', 'treatment'])) {
                $legacyRole = 'treatment';
                $workstationRole = ($inputRole === 'treatment') ? 'solo_nurse' : $inputRole;
            } elseif (in_array($inputRole, ['doctor', 'triage'])) {
                $legacyRole = 'triage';
                $workstationRole = 'doctor';
            } elseif (in_array($inputRole, ['receptionist', 'registration'])) {
                $legacyRole = 'registration';
                $workstationRole = 'receptionist';
            } elseif (in_array($inputRole, ['clinic_admin', 'admin'])) {
                $legacyRole = 'admin';
                $workstationRole = 'clinic_admin';
            }

            // Create invitation
            $invitation = StaffInvitation::createInvitation([
                'clinic_id' => $admin->clinic_id,
                'invited_by' => $admin->id,
                'email' => $email,
                'role' => $legacyRole,
                'workstation_role' => $workstationRole,
            ]);

            // Send invitation email
            try {
                $emailSent = app(InvitationDelivery::class)->send(
                    (int) $invitation->clinic_id, $invitation->email, 'staff_invitation',
                    fn () => app(EmailTransportInterface::class)->send($invitation->email, new StaffInvitationMail($invitation))
                );
            } catch (\Exception $e) {
                Log::error('Staff invitation delivery failed.', ['exception' => get_class($e)]);
                $emailSent = false;
            }

            if (! $emailSent) {
                // Do not expire the invitation on delivery failure. The token
                // remains valid until its natural expiry timestamp so the admin
                // can retry sending without creating a duplicate invitation record.
                Log::warning('Staff invitation email could not be delivered.', ['invitation_id' => $invitation->id]);
            }

            return [
                'message' => $emailSent
                    ? 'Invitation email accepted for delivery to '.$email.'.'
                    : 'Unable to send the invitation email. Please try again or contact the system administrator.',
                'invitation' => $invitation,
                'email_sent' => $emailSent,
                'delivery_status' => $emailSent ? 'accepted' : 'failed',
                'invitation_link' => config('app.frontend_url').'/accept-invitation/'.$invitation->token,
            ];
        });
    }

    public function resend(User $admin, int $id): array
    {
        return DB::transaction(function () use ($admin, $id) {
            Clinic::whereKey($admin->clinic_id)->lockForUpdate()->firstOrFail();
            $invitation = StaffInvitation::where('clinic_id', $admin->clinic_id)->lockForUpdate()->findOrFail($id);
            if ($invitation->status === 'accepted' || User::where('email', $invitation->email)->exists()) {
                throw ValidationException::withMessages(['email' => 'This invitation cannot be resent.']);
            }
            $candidate = clone $invitation;
            $candidate->token = StaffInvitation::generateToken();
            $candidate->expires_at = now()->addDays(7);
            $sent = app(InvitationDelivery::class)->send((int) $invitation->clinic_id, $invitation->email, 'staff_invitation',
                fn () => app(EmailTransportInterface::class)->send($invitation->email, new StaffInvitationMail($candidate)));
            if ($sent) {
                $invitation->update(['token' => $candidate->token, 'expires_at' => $candidate->expires_at, 'status' => 'pending']);
                StaffInvitation::where('email', $invitation->email)->where('id', '!=', $id)->where('status', 'pending')->update(['status' => 'expired']);
            }

            return ['email_sent' => $sent, 'delivery_status' => $sent ? 'accepted' : 'failed', 'invitation' => $invitation,
                'message' => $sent ? 'Invitation email accepted for delivery to '.$invitation->email.'.' : 'Unable to send the invitation email. Please try again or contact the system administrator.'];
        });
    }

    /**
     * Get all invitations for current clinic.
     */
    public function index(User $admin): Collection
    {
        return StaffInvitation::where('clinic_id', $admin->clinic_id)
            ->with('inviter')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Validate an invitation token.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function validateToken(string $token): array
    {
        $invitation = StaffInvitation::forToken($token)->first();

        if (! $invitation) {
            return [
                'status' => 404,
                'data' => [
                    'valid' => false,
                    'message' => 'Invalid invitation token',
                ],
            ];
        }

        if (! $invitation->isValid()) {
            return [
                'status' => 400,
                'data' => [
                    'valid' => false,
                    'message' => $invitation->isExpired() ? 'This invitation has expired' : 'This invitation has already been used',
                ],
            ];
        }

        return [
            'status' => 200,
            'data' => [
                'valid' => true,
                'invitation' => [
                    'email' => $invitation->email,
                    'role' => $invitation->role,
                    'clinic_name' => $invitation->clinic->name,
                    'expires_at' => $invitation->expires_at,
                ],
            ],
        ];
    }

    /**
     * Accept invitation, create user, attach roles, and generate auth token.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function accept(string $token, array $validated): array
    {
        return DB::transaction(function () use ($token, $validated) {
            $invitation = StaffInvitation::forToken($token)->lockForUpdate()->first();

            if (! $invitation || ! $invitation->isValid()) {
                return [
                    'status' => 400,
                    'data' => ['message' => 'Invalid or expired invitation'],
                ];
            }

            if (User::where('email', $invitation->email)->exists()) {
                return ['status' => 422, 'data' => ['message' => 'An account with this email already exists.']];
            }

            // Create user
            $user = User::create([
                'clinic_id' => $invitation->clinic_id,
                'name' => $validated['name'],
                'email' => $invitation->email,
                'password' => Hash::make($validated['password']),
                'role' => $invitation->role,
                'phone' => $validated['phone'] ?? null,
                'signature_path' => null,
                'professional_license_no' => $validated['professional_license_no'] ?? null,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Attach workstation roles to user_roles
            $targetSlugs = [];
            $wr = $invitation->workstation_role;
            if ($wr === 'solo_nurse') {
                $targetSlugs = ['intake_nurse', 'follow_up_nurse'];
            } elseif ($wr) {
                $targetSlugs = [$wr];
            } elseif ($invitation->role === 'treatment') {
                $targetSlugs = ['intake_nurse', 'follow_up_nurse'];
            } elseif ($invitation->role === 'triage') {
                $targetSlugs = ['doctor'];
            } elseif ($invitation->role === 'registration') {
                $targetSlugs = ['receptionist'];
            } elseif ($invitation->role === 'admin') {
                $targetSlugs = ['clinic_admin'];
            }

            if (! empty($targetSlugs)) {
                $roleModels = Role::whereIn('slug', $targetSlugs)->get();
                $syncData = [];
                foreach ($roleModels as $rm) {
                    $syncData[$rm->id] = [
                        'assigned_by' => $invitation->invited_by,
                        'assigned_at' => now(),
                    ];
                }
                $user->roles()->sync($syncData);
            }

            // Mark invitation as accepted
            $invitation->markAsAccepted();

            // Generate auth token for auto-login
            $authToken = $user->createToken('auth_token')->plainTextToken;
            $user->load(['clinic', 'roles']);

            return [
                'status' => 201,
                'data' => [
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
                    'token' => $authToken,
                    'token_type' => 'Bearer',
                ],
            ];
        });
    }

    /**
     * Cancel pending invitation.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function cancel(User $admin, int $id): array
    {
        $invitation = StaffInvitation::where('clinic_id', $admin->clinic_id)
            ->findOrFail($id);

        if (! $invitation->isPending()) {
            return [
                'status' => 400,
                'data' => ['message' => 'Only pending invitations can be cancelled'],
            ];
        }

        $invitation->update(['status' => 'expired']);

        return [
            'status' => 200,
            'data' => ['message' => 'Invitation cancelled successfully'],
        ];
    }
}
