<?php

namespace App\Http\Controllers;

use App\Http\Requests\ActivatePatientInvitationRequest;
use App\Http\Requests\LinkPatientAccountRequest;
use App\Http\Requests\SendPatientInvitationRequest;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientAccountPatient;
use App\Models\PatientInvitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PatientInvitationController extends Controller
{
    /**
     * Staff sends an invitation to a walk-in patient.
     * POST /api/patient-invitations
     */
    public function store(SendPatientInvitationRequest $request): JsonResponse
    {
        $patient = Patient::findOrFail($request->patient_id);

        // Require a valid email; phone is optional
        if (!filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'message' => 'Patient does not have a valid email address on record. Please update the patient email first.',
            ], 422);
        }

        // Check if patient already has a verified portal account
        $alreadyVerified = PatientAccountPatient::where('patient_id', $patient->patient_id)
            ->where('status', 'verified')
            ->exists();

        if ($alreadyVerified) {
            return response()->json([
                'message' => 'Patient already has an active verified portal account.',
            ], 422);
        }

        // Expire previous pending invitations for this patient
        PatientInvitation::where('patient_id', $patient->patient_id)
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        // Generate 64-char token & 7 days expiry
        $token = Str::random(64);
        $expiresAt = now()->addDays(7);

        $invitation = PatientInvitation::create([
            'clinic_id' => $patient->clinic_id,
            'patient_id' => $patient->patient_id,
            'invited_by' => auth()->id(),
            'phone' => $patient->contact_number ?: null,
            'token' => $token,
            'status' => 'pending',
            'expires_at' => $expiresAt,
        ]);

        if (!$this->sendInvitationEmail($patient->email, $invitation->token, $patient)) {
            $invitation->update(['status' => 'expired']);
            return response()->json([
                'message' => 'Invitation email could not be sent. Check the email service configuration and try again.',
            ], 503);
        }
        return response()->json([
            'message' => 'Patient invitation sent successfully via email.',
            'invitation' => $invitation->load(['patient', 'invitedBy']),
        ], 201);
    }

    /**
     * Staff sends invitations in bulk to multiple walk-in patients.
     * POST /api/patient-invitations/bulk
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'patient_ids' => 'required|array|min:1',
            'patient_ids.*' => 'required|integer',
        ]);

        $patientIds = array_unique($request->patient_ids);
        $sentCount = 0;
        $skippedCount = 0;
        $errors = [];

        $patients = Patient::whereIn('patient_id', $patientIds)->get();

        foreach ($patients as $patient) {
            // Require a valid email; phone is optional
            if (!filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
                $skippedCount++;
                $errors[] = "Patient {$patient->first_name} {$patient->last_name} (#{$patient->patient_number}) has no valid email address.";
                continue;
            }

            // Check if patient already has a verified portal account
            $alreadyVerified = PatientAccountPatient::where('patient_id', $patient->patient_id)
                ->where('status', 'verified')
                ->exists();

            if ($alreadyVerified) {
                $skippedCount++;
                $errors[] = "Patient {$patient->first_name} {$patient->last_name} already has a verified portal account.";
                continue;
            }

            // Expire previous pending invitations for this patient
            PatientInvitation::where('patient_id', $patient->patient_id)
                ->where('status', 'pending')
                ->update(['status' => 'expired']);

            // Generate 64-char token & 7 days expiry
            $token = Str::random(64);
            $expiresAt = now()->addDays(7);

            $invitation = PatientInvitation::create([
                'clinic_id' => $patient->clinic_id,
                'patient_id' => $patient->patient_id,
                'invited_by' => auth()->id(),
                'phone' => $patient->contact_number ?: null,
                'token' => $token,
                'status' => 'pending',
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

        return response()->json([
            'message' => "Successfully sent {$sentCount} portal invitation(s)." . ($skippedCount > 0 ? " ({$skippedCount} skipped due to invalid email, existing account, or email delivery failure)" : ""),
            'sent_count' => $sentCount,
            'skipped_count' => $skippedCount,
            'errors' => $errors,
        ]);
    }

    /**
     * Patient activates mobile app account using activation token.
     * POST /api/patient-invitations/activate
     */
    public function activate(ActivatePatientInvitationRequest $request): JsonResponse
    {
        $invitation = PatientInvitation::where('token', $request->token)->first();

        if (!$invitation) {
            return response()->json([
                'message' => 'Invalid or expired code. Please contact the clinic for a new invite.',
            ], 422);
        }

        // Check if expired
        if ($invitation->expires_at->isPast() || $invitation->status !== 'pending') {
            if ($invitation->status === 'pending') {
                $invitation->update(['status' => 'expired']);
            }
            return response()->json([
                'message' => 'Invalid or expired code. Please contact the clinic for a new invite.',
            ], 422);
        }

        $patient = $invitation->patient;

        if (!$patient) {
            return response()->json([
                'message' => 'Associated patient record not found.',
            ], 404);
        }

        return DB::transaction(function () use ($request, $invitation, $patient) {
            // 1. Create Patient Account
            $patientAccount = PatientAccount::create([
                'name' => trim("{$patient->first_name} {$patient->last_name}"),
                'email' => strtolower($request->email),
                'phone' => $invitation->phone,
                'password' => Hash::make($password = $request->password),
                'email_verified_at' => now(),
                'is_active' => true,
            ]);

            // 2. Link Patient Account to Patient Record (Status = verified)
            $linkage = PatientAccountPatient::create([
                'patient_account_id' => $patientAccount->id,
                'patient_id' => $patient->patient_id,
                'relationship' => 'self',
                'is_primary' => true,
                'status' => 'verified',
                'verified_by' => $invitation->invited_by,
                'verified_at' => now(),
            ]);

            // 3. Mark Invitation as accepted
            $invitation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            // 4. Issue Sanctum API Token
            $authToken = $patientAccount->createToken('mobile-app-patient')->plainTextToken;

            return response()->json([
                'message' => 'Account activated successfully!',
                'token' => $authToken,
                'account' => $patientAccount,
                'patient' => $patient,
                'linkage' => $linkage,
            ], 200);
        });
    }

    /**
     * Staff resends an invitation.
     * POST /api/patient-invitations/{id}/resend
     */
    public function resend($id): JsonResponse
    {
        $invitation = PatientInvitation::findOrFail($id);

        if ($invitation->status === 'accepted') {
            return response()->json([
                'message' => 'This invitation has already been accepted.',
            ], 422);
        }

        $patient = $invitation->patient;
        if (!$patient || !filter_var(trim((string) $patient->email), FILTER_VALIDATE_EMAIL)) {
            return response()->json(['message' => 'Please update the patient with a valid email address first.'], 422);
        }

        $newToken = Str::random(64);
        if (!$this->sendInvitationEmail($patient->email, $newToken, $patient)) {
            return response()->json([
                'message' => 'Invitation email could not be sent. Check the email service configuration and try again.',
            ], 503);
        }

        $invitation->update([
            'token' => $newToken,
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);
        return response()->json([
            'message' => 'Invitation code resent successfully via email.',
            'invitation' => $invitation,
        ]);
    }

    /**
     * Staff manually links an existing patient_account to a patient record (edge case).
     * POST /api/patients/{patient_id}/link-account
     */
    public function linkAccount(LinkPatientAccountRequest $request, $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $account = PatientAccount::findOrFail($request->patient_account_id);

        $existing = PatientAccountPatient::where('patient_account_id', $account->id)
            ->where('patient_id', $patient->patient_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Account linkage already exists.',
                'linkage' => $existing,
            ], 422);
        }

        $linkage = PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $patient->patient_id,
            'relationship' => 'self',
            'is_primary' => false,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Patient account linked successfully (Status: Pending Verification).',
            'linkage' => $linkage,
        ], 201);
    }

    /**
     * Staff verifies a manual linkage.
     * PATCH /api/patient-account-patient/{id}/verify
     */
    public function verifyLink($id): JsonResponse
    {
        $linkage = PatientAccountPatient::findOrFail($id);
        $linkage->markAsVerified(auth()->id());

        return response()->json([
            'message' => 'Patient account linkage verified successfully.',
            'linkage' => $linkage,
        ]);
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
        // Logging and log fallbacks do not count as delivery.
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
                'exception' => get_class($e),
            ]);
            return false;
        }
    }
}