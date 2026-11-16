<?php

namespace App\Services\Messaging;

use App\Mail\ClinicEmail;
use App\Models\PatientAccount;
use Illuminate\Support\Facades\Log;

class AccountSecurityEmail
{
    public function passwordChanged(PatientAccount $account): void
    {
        try {
            $clinicId = (int) $account->patients()->wherePivot('status', 'verified')->value('patients.clinic_id');
            app(InvitationDelivery::class)->send($clinicId, $account->email, 'password_changed',
                fn () => app(SmtpEmailService::class)->send($account->email, new ClinicEmail('Patient Portal Security Notice',
                    ['Your Patient Portal password has changed.', 'If you did not make this change, contact the clinic immediately.'])));
        } catch (\Throwable $e) {
            Log::error('Security email submission failed.', ['exception' => get_class($e)]);
        }
    }
}
