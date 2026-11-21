<?php

namespace App\Services\Patient;

use App\Mail\ClinicEmail;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientAccountPatient;
use App\Models\PatientInvitation;
use App\Services\Messaging\InvitationDelivery;
use App\Services\Messaging\SmtpEmailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PatientInvitationService
{
    /**
     * Staff sends an invitation to a walk-in patient.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function send(int $patientId, int $staffUserId): array
    {
        return DB::transaction(function () use ($patientId, $staffUserId) {
            $patient = Patient::whereKey($patientId)->lockForUpdate()->firstOrFail();

            if ($patient->registration_source === 'mobile' || $patient->registration_source === 'online') {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Only walk-in patients without an existing online account are eligible for portal invitations.',
                        'code' => 'NOT_ELIGIBLE',
                    ],
                ];
            }

            if (empty(trim((string) $patient->contact_number)) && empty(trim((string) $patient->email))) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Patient does not have a valid email address on record. Please update the patient email first.',
                        'code' => 'NO_CONTACT',
                    ],
                ];
            }

            if (! filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Patient does not have a valid email address on record. Please update the patient email first.',
                    ],
                ];
            }

            $alreadyVerified = PatientAccountPatient::where('patient_id', $patient->patient_id)
                ->where('status', 'verified')
                ->exists();

            if ($alreadyVerified) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Patient already has an active verified portal account.',
                    ],
                ];
            }

            $token = Str::random(64);
            $expiresAt = now()->addDays(7);

            $invitation = PatientInvitation::create([
                'clinic_id' => $patient->clinic_id,
                'patient_id' => $patient->patient_id,
                'invited_by' => $staffUserId,
                'phone' => $patient->contact_number ?: null,
                'recipient_email' => trim($patient->email),
                'token' => $token,
                'status' => 'pending',
                'expires_at' => $expiresAt,
            ]);

            if (! $this->sendInvitationEmail($patient->email, $invitation->token, $patient)) {
                $invitation->update(['status' => 'expired']);

                return [
                    'status' => 503,
                    'data' => [
                        'message' => 'Unable to send the invitation email. Please try again or contact the system administrator.',
                    ],
                ];
            }

            PatientInvitation::where('patient_id', $patientId)->where('id', '!=', $invitation->id)->where('status', 'pending')->update(['status' => 'expired']);

            \App\Models\AuditLog::create([
                'user_id' => $staffUserId,
                'clinic_id' => $patient->clinic_id,
                'action' => 'patient.invite_sent',
                'model' => 'Patient',
                'model_id' => $patient->patient_id,
                'new_values' => [
                    'invitation_id' => $invitation->id,
                    'recipient_email' => $invitation->recipient_email,
                    'phone' => $invitation->phone,
                    'expires_at' => $expiresAt->toDateTimeString(),
                ],
                'description' => "Portal invitation sent to patient #{$patient->patient_id} by user #{$staffUserId}",
            ]);

            return [
                'status' => 201,
                'data' => [
                    'message' => 'Invitation email sent successfully to '.trim($patient->email).'.',
                    'invitation' => $invitation->load(['patient', 'invitedBy']),
                ],
            ];
        });
    }

    /**
     * Staff sends invitations in bulk to multiple walk-in patients.
     *
     * @param  array<int>  $patientIds
     * @return array<string, mixed>
     */
    public function bulkSend(array $patientIds, int $staffUserId): array
    {
        $sent = 0;
        $errors = [];
        foreach (array_unique($patientIds) as $patientId) {
            $result = $this->send((int) $patientId, $staffUserId);
            if ($result['status'] === 201) {
                $sent++;
            } else {
                $errors[] = $result['data']['message'];
            }
        }

        return ['message' => "Sent {$sent} portal invitation(s).", 'sent_count' => $sent,
            'skipped_count' => count($errors), 'errors' => $errors];
    }

    /**
     * Patient activates mobile app account using activation token.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function activate(array $validated, bool $issueToken = true): array
    {
        return DB::transaction(function () use ($validated, $issueToken) {
            $candidate = PatientInvitation::forToken($validated['token'])->first();
            if ($candidate) {
                Patient::whereKey($candidate->patient_id)->lockForUpdate()->first();
            }
            $invitation = PatientInvitation::forToken($validated['token'])->lockForUpdate()->first();

            if (! $invitation) {
                return [
                    'status' => 422,
                    'data' => ['message' => 'Invalid or expired code. Please contact the clinic for a new invite.'],
                ];
            }

            if ($invitation->expires_at->isPast() || $invitation->status !== 'pending') {
                if ($invitation->status === 'pending') {
                    $invitation->update(['status' => 'expired']);
                }

                return [
                    'status' => 422,
                    'data' => ['message' => 'Invalid or expired code. Please contact the clinic for a new invite.'],
                ];
            }

            $patient = $invitation->patient;

            if (! $patient) {
                return [
                    'status' => 404,
                    'data' => ['message' => 'Associated patient record not found.'],
                ];
            }

            $patient = Patient::whereKey($patient->patient_id)->lockForUpdate()->firstOrFail();
            $invitedEmail = $invitation->recipient_email ?: $patient->email;
            if (strcasecmp(trim($invitedEmail), trim($validated['email'])) !== 0 || strcasecmp(trim($patient->email), trim($invitedEmail)) !== 0 || PatientAccountPatient::where('patient_id', $patient->patient_id)->where('status', 'verified')->exists() || PatientAccount::where('email', strtolower($validated['email']))->exists()) {
                return ['status' => 422, 'data' => ['message' => 'Use the invited email address, or contact the clinic if an account already exists.']];
            }
            $patientAccount = PatientAccount::create([
                'name' => trim("{$patient->first_name} {$patient->last_name}"),
                'email' => strtolower($validated['email']),
                'phone' => $invitation->phone,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => now(),
                'is_active' => true,
            ]);

            $linkage = PatientAccountPatient::create([
                'patient_account_id' => $patientAccount->id,
                'patient_id' => $patient->patient_id,
                'relationship' => 'self',
                'is_primary' => true,
                'status' => 'verified',
                'verified_by' => $invitation->invited_by,
                'verified_at' => now(),
            ]);

            $invitation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            $authToken = $issueToken ? $patientAccount->createToken('mobile-app-patient')->plainTextToken : null;

            return [
                'status' => 200,
                'data' => [
                    'message' => 'Account activated successfully!',
                    'token' => $authToken,
                    'account' => $patientAccount,
                    'patient' => $patient,
                    'linkage' => $linkage,
                ],
            ];
        });
    }

    /**
     * Staff resends an invitation.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function resend(int $id): array
    {
        return DB::transaction(function () use ($id) {
            $candidate = PatientInvitation::findOrFail($id);
            Patient::whereKey($candidate->patient_id)->lockForUpdate()->firstOrFail();
            $invitation = PatientInvitation::whereKey($id)->lockForUpdate()->firstOrFail();

            if ($invitation->status === 'accepted') {
                return [
                    'status' => 422,
                    'data' => ['message' => 'This invitation has already been accepted.'],
                ];
            }

            // Throttle: 1 per 5 minutes per patient
            $throttleKey = 'patient_invite_resend:'.$invitation->patient_id;
            if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($throttleKey, 1)) {
                return [
                    'status' => 429,
                    'data' => [
                        'message' => 'Please wait at least 5 minutes before resending another invitation to this patient.',
                        'code' => 'THROTTLED',
                    ],
                ];
            }

            $patient = $invitation->patient;
            if (! $patient || ! filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
                return [
                    'status' => 422,
                    'data' => ['message' => 'Please update the patient with a valid email address first.'],
                ];
            }

            if (PatientAccountPatient::where('patient_id', $patient->patient_id)->where('status', 'verified')->exists()) {
                return ['status' => 422, 'data' => ['message' => 'Patient already has an active verified portal account.']];
            }
            $newToken = Str::random(64);
            if (! $this->sendInvitationEmail($patient->email, $newToken, $patient)) {
                return [
                    'status' => 503,
                    'data' => [
                        'message' => 'Unable to send the invitation email. Please try again or contact the system administrator.',
                    ],
                ];
            }

            PatientInvitation::where('patient_id', $patient->patient_id)->where('id', '!=', $invitation->id)->where('status', 'pending')->update(['status' => 'expired']);
            $invitation->update([
                'token' => $newToken,
                'recipient_email' => trim($patient->email),
                'status' => 'pending',
                'expires_at' => now()->addDays(7),
            ]);

            \Illuminate\Support\Facades\RateLimiter::hit($throttleKey, 300);

            \App\Models\AuditLog::create([
                'user_id' => auth()->id() ?? $invitation->invited_by,
                'clinic_id' => $patient->clinic_id,
                'action' => 'patient.invite_resent',
                'model' => 'Patient',
                'model_id' => $patient->patient_id,
                'new_values' => [
                    'invitation_id' => $invitation->id,
                    'recipient_email' => $invitation->recipient_email,
                ],
                'description' => "Portal invitation resent to patient #{$patient->patient_id}",
            ]);

            return [
                'status' => 200,
                'data' => [
                    'message' => 'Invitation email sent successfully to '.trim($patient->email).'.',
                    'invitation' => $invitation,
                ],
            ];
        });
    }

    /**
     * Staff manually links an existing patient_account to a patient record.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function linkAccount(int $patientId, int $patientAccountId): array
    {
        $patient = Patient::findOrFail($patientId);
        $account = PatientAccount::findOrFail($patientAccountId);

        $existing = PatientAccountPatient::where('patient_account_id', $account->id)
            ->where('patient_id', $patient->patient_id)
            ->first();

        if ($existing) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Account linkage already exists.',
                    'linkage' => $existing,
                ],
            ];
        }

        $linkage = PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $patient->patient_id,
            'relationship' => 'self',
            'is_primary' => false,
            'status' => 'pending',
        ]);

        return [
            'status' => 201,
            'data' => [
                'message' => 'Patient account linked successfully (Status: Pending Verification).',
                'linkage' => $linkage,
            ],
        ];
    }

    /**
     * Staff verifies a manual linkage.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function verifyLink(int $id, int $staffUserId): array
    {
        $linkage = PatientAccountPatient::findOrFail($id);
        $linkage->markAsVerified($staffUserId);

        return [
            'status' => 200,
            'data' => [
                'message' => 'Patient account linkage verified successfully.',
                'linkage' => $linkage,
            ],
        ];
    }

    /**
     * Return success only when a delivery mailer accepts the invitation.
     */
    protected function sendInvitationEmail(?string $email, string $token, Patient $patient): bool
    {
        $email = trim((string) $email);
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        try {
            return app(InvitationDelivery::class)->send((int) $patient->clinic_id, $email, 'patient_invitation', function () use ($email, $token, $patient) {
                return app(SmtpEmailService::class)->send($email, new ClinicEmail(
                    'Activate Your Tagoloan ABTC Patient Portal Account', [
                        "Hello {$patient->first_name} {$patient->last_name},",
                        'You have been invited to activate your Patient Portal account for the Tagoloan Animal Bite Treatment Center.',
                        'Access upcoming schedules, appointment information, vaccination history, your digital card, profile and notifications in the patient app.',
                        'Open ABTCare, select account activation, paste the code below and create your password using your registered email address.',
                        'This invitation is valid for seven days. Do not share this code.',
                        'If you did not expect this invitation, please contact the clinic.',
                    ], rtrim(config('app.url'), '/').'/patient-portal/activate#'.$token, 'Activate Patient Portal', activationCode: $token
                ));
            });
        } catch (\Exception $e) {
            Log::error('Portal invitation email failed.', [
                'patient_id' => $patient->patient_id,
                'exception' => get_class($e),
            ]);

            return false;
        }
    }
}
