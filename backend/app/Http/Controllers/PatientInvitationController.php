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

        // Check if patient has a contact number
        if (empty($patient->contact_number)) {
            return response()->json([
                'message' => 'Patient does not have a contact number on record. Please update patient contact details first.',
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
            'phone' => $patient->contact_number,
            'token' => $token,
            'status' => 'pending',
            'expires_at' => $expiresAt,
        ]);

        // Send SMS & Email to patient
        $this->sendInvitationSms($invitation->phone, $invitation->token, $patient);
        $this->sendInvitationEmail($patient->email, $invitation->token, $patient);

        $channels = ['SMS'];
        if (!empty($patient->email)) {
            $channels[] = 'Email';
        }
        $channelText = implode(' and ', $channels);

        return response()->json([
            'message' => "Patient invitation sent successfully via {$channelText}.",
            'invitation' => $invitation->load(['patient', 'invitedBy']),
        ], 201);
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

        $newToken = Str::random(64);
        $newExpiresAt = now()->addDays(7);

        $invitation->update([
            'token' => $newToken,
            'status' => 'pending',
            'expires_at' => $newExpiresAt,
        ]);

        $this->sendInvitationSms($invitation->phone, $invitation->token, $invitation->patient);
        $this->sendInvitationEmail($invitation->patient->email, $invitation->token, $invitation->patient);

        return response()->json([
            'message' => 'Invitation code resent successfully via SMS and Email.',
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
     * Internal helper to send SMS with invitation token.
     */
    protected function sendInvitationSms(string $phone, string $token, Patient $patient): void
    {
        $message = "ABTC Clinic: Hello {$patient->first_name}, you have been invited to join our Patient Portal. Use activation code: {$token} in your app within 7 days.";

        // Log SMS dispatch for development / SMS Gateway integration
        Log::info("SMS Dispatched to [{$phone}]: {$message}");
    }

    /**
     * Internal helper to send Email with invitation token via SMTP / Mailtrap.
     */
    protected function sendInvitationEmail(?string $email, string $token, Patient $patient): void
    {
        if (empty($email)) {
            return;
        }

        try {
            Mail::raw(
                "Hello {$patient->first_name},\n\n" .
                "You have been invited to join the Animal Bite Treatment Center Mobile Patient Portal.\n\n" .
                "Your Account Activation Code is:\n{$token}\n\n" .
                "Please download our mobile app and enter this code within 7 days to activate your portal account.\n\n" .
                "Thank you,\nAnimal Bite Treatment Center",
                function ($message) use ($email, $patient) {
                    $message->to($email)
                            ->subject("Animal Bite Center - Mobile Portal Invitation ({$patient->first_name})");
                }
            );
            Log::info("Portal Invitation Email sent to [{$email}] for Patient #{$patient->patient_id}");
        } catch (\Exception $e) {
            Log::error("Failed to send portal invitation email to [{$email}]: " . $e->getMessage());
        }
    }
}
