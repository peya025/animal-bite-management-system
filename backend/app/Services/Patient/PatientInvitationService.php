<?php

namespace App\Services\Patient;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientAccountPatient;
use App\Models\PatientInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PatientInvitationService
{
    /**
     * Staff sends an invitation to a walk-in patient.
     *
     * @param int $patientId
     * @param int $staffUserId
     * @return array{status: int, data: array<string, mixed>}
     */
    public function send(int $patientId, int $staffUserId): array
    {
        $patient = Patient::findOrFail($patientId);

        if (!filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
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

        // Expire previous pending invitations for this patient
        PatientInvitation::where('patient_id', $patient->patient_id)
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        $token = Str::random(64);
        $expiresAt = now()->addDays(7);

        $invitation = PatientInvitation::create([
            'clinic_id'  => $patient->clinic_id,
            'patient_id' => $patient->patient_id,
            'invited_by' => $staffUserId,
            'phone'      => $patient->contact_number ?: null,
            'token'      => $token,
            'status'     => 'pending',
            'expires_at' => $expiresAt,
        ]);

        if (!$this->sendInvitationEmail($patient->email, $invitation->token, $patient)) {
            $invitation->update(['status' => 'expired']);
            return [
                'status' => 503,
                'data' => [
                    'message' => 'Invitation email could not be sent. Check the email service configuration and try again.',
                ],
            ];
        }

        return [
            'status' => 201,
            'data' => [
                'message'    => 'Patient invitation sent successfully via email.',
                'invitation' => $invitation->load(['patient', 'invitedBy']),
            ],
        ];
    }

    /**
     * Staff sends invitations in bulk to multiple walk-in patients.
     *
     * @param array<int> $patientIds
     * @param int $staffUserId
     * @return array<string, mixed>
     */
    public function bulkSend(array $patientIds, int $staffUserId): array
    {
        $uniqueIds = array_unique($patientIds);
        $sentCount = 0;
        $skippedCount = 0;
        $errors = [];

        $patients = Patient::whereIn('patient_id', $uniqueIds)->get();

        foreach ($patients as $patient) {
            if (!filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
                $skippedCount++;
                $errors[] = "Patient {$patient->first_name} {$patient->last_name} (#{$patient->patient_number}) has no valid email address.";
                continue;
            }

            $alreadyVerified = PatientAccountPatient::where('patient_id', $patient->patient_id)
                ->where('status', 'verified')
                ->exists();

            if ($alreadyVerified) {
                $skippedCount++;
                $errors[] = "Patient {$patient->first_name} {$patient->last_name} already has a verified portal account.";
                continue;
            }

            PatientInvitation::where('patient_id', $patient->patient_id)
                ->where('status', 'pending')
                ->update(['status' => 'expired']);

            $token = Str::random(64);
            $expiresAt = now()->addDays(7);

            $invitation = PatientInvitation::create([
                'clinic_id'  => $patient->clinic_id,
                'patient_id' => $patient->patient_id,
                'invited_by' => $staffUserId,
                'phone'      => $patient->contact_number ?: null,
                'token'      => $token,
                'status'     => 'pending',
                'expires_at' => $expiresAt,
            ]);

            if (!$this->sendInvitationEmail($patient->email, $invitation->token, $patient)) {
                $invitation->update(['status' => 'expired']);
                $skippedCount++;
                $errors[] = "Email could not be sent for patient #{$patient->patient_number}.";
                continue;
            }
            $sentCount++;
        }

        return [
            'message'       => "Successfully sent {$sentCount} portal invitation(s)." . ($skippedCount > 0 ? " ({$skippedCount} skipped due to invalid email, existing account, or email delivery failure)" : ""),
            'sent_count'    => $sentCount,
            'skipped_count' => $skippedCount,
            'errors'        => $errors,
        ];
    }

    /**
     * Patient activates mobile app account using activation token.
     *
     * @param array $validated
     * @return array{status: int, data: array<string, mixed>}
     */
    public function activate(array $validated): array
    {
        $invitation = PatientInvitation::where('token', $validated['token'])->first();

        if (!$invitation) {
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

        if (!$patient) {
            return [
                'status' => 404,
                'data' => ['message' => 'Associated patient record not found.'],
            ];
        }

        return DB::transaction(function () use ($validated, $invitation, $patient) {
            $patientAccount = PatientAccount::create([
                'name'              => trim("{$patient->first_name} {$patient->last_name}"),
                'email'             => strtolower($validated['email']),
                'phone'             => $invitation->phone,
                'password'          => Hash::make($validated['password']),
                'email_verified_at' => now(),
                'is_active'         => true,
            ]);

            $linkage = PatientAccountPatient::create([
                'patient_account_id' => $patientAccount->id,
                'patient_id'         => $patient->patient_id,
                'relationship'       => 'self',
                'is_primary'         => true,
                'status'             => 'verified',
                'verified_by'        => $invitation->invited_by,
                'verified_at'        => now(),
            ]);

            $invitation->update([
                'status'      => 'accepted',
                'accepted_at' => now(),
            ]);

            $authToken = $patientAccount->createToken('mobile-app-patient')->plainTextToken;

            return [
                'status' => 200,
                'data' => [
                    'message' => 'Account activated successfully!',
                    'token'   => $authToken,
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
     * @param int $id
     * @return array{status: int, data: array<string, mixed>}
     */
    public function resend(int $id): array
    {
        $invitation = PatientInvitation::findOrFail($id);

        if ($invitation->status === 'accepted') {
            return [
                'status' => 422,
                'data' => ['message' => 'This invitation has already been accepted.'],
            ];
        }

        $patient = $invitation->patient;
        if (!$patient || !filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
            return [
                'status' => 422,
                'data' => ['message' => 'Please update the patient with a valid email address first.'],
            ];
        }

        $newToken = Str::random(64);
        if (!$this->sendInvitationEmail($patient->email, $newToken, $patient)) {
            return [
                'status' => 503,
                'data' => [
                    'message' => 'Invitation email could not be sent. Check the email service configuration and try again.',
                ],
            ];
        }

        $invitation->update([
            'token'      => $newToken,
            'status'     => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        return [
            'status' => 200,
            'data' => [
                'message'    => 'Invitation code resent successfully via email.',
                'invitation' => $invitation,
            ],
        ];
    }

    /**
     * Staff manually links an existing patient_account to a patient record.
     *
     * @param int $patientId
     * @param int $patientAccountId
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
            'patient_id'         => $patient->patient_id,
            'relationship'       => 'self',
            'is_primary'         => false,
            'status'             => 'pending',
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
     * @param int $id
     * @param int $staffUserId
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
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $mailer = config('mail.default');
        $transport = config("mail.mailers.{$mailer}.transport");

        if (!in_array($transport, ['smtp', 'sendmail', 'mailgun', 'ses', 'ses-v2', 'postmark', 'resend'], true)) {
            Log::warning('Portal invitation requires a delivery mailer.', ['mailer' => $mailer]);
            return false;
        }

        try {
            Mail::raw(
                "Hello {$patient->first_name},\n\n" .
                "You have been invited to join ABTCare, the Animal Bite Treatment Center patient app.\n\n" .
                "Your activation code is:\n{$token}\n\n" .
                "Open ABTCare and select account activation. Paste this code, enter your email, and create a password. This code expires in 7 days.\n\n" .
                "If you do not have the app, ask your clinic for the installation link. Do not share this code with anyone.\n\n" .
                "Thank you,\nAnimal Bite Treatment Center",
                function ($message) use ($email) {
                    $message->to($email)->subject('ABTCare - Patient Portal Invitation');
                }
            );
            return true;
        } catch (\Exception $e) {
            Log::error('Portal invitation email failed.', [
                'patient_id' => $patient->patient_id,
                'exception'  => get_class($e),
            ]);
            return false;
        }
    }
}
