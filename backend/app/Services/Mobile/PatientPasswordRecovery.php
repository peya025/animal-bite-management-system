<?php

namespace App\Services\Mobile;

use App\Mail\ClinicEmail;
use App\Models\PatientAccount;
use App\Services\Messaging\AccountSecurityEmail;
use App\Services\Messaging\InvitationDelivery;
use App\Services\Messaging\SmtpEmailService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PatientPasswordRecovery
{
    public function request(string $email): void
    {
        $account = PatientAccount::where('email', strtolower(trim($email)))->where('is_active', true)->first();
        if (! $account) {
            return;
        }
        try {
            Cache::lock('password-recovery:'.$account->id, 120)->get(function () use ($account) {
                $token = Str::random(64);
                $clinicId = (int) $account->patients()->wherePivot('status', 'verified')->value('patients.clinic_id');
                $mail = new ClinicEmail('Reset Your Patient Portal Password', ['Use this link to create a new password. It expires in 30 minutes.', 'If you did not request this change, ignore this message.'],
                    rtrim(config('app.url'), '/').'/patient-portal/reset-password#'.$token, 'Reset password', $token);
                $sent = app(InvitationDelivery::class)->send($clinicId, $account->email, 'password_reset',
                    fn () => app(SmtpEmailService::class)->send($account->email, $mail));
                if ($sent) {
                    DB::table('patient_password_reset_tokens')->updateOrInsert(['patient_account_id' => $account->id],
                        ['token_hash' => hash('sha256', $token), 'expires_at' => now()->addMinutes(30)]);
                }
            });
        } catch (\Throwable $e) {
            Log::error('Password recovery email failed.', ['exception' => get_class($e)]);
        }
    }

    public function reset(array $data): bool
    {
        return DB::transaction(function () use ($data) {
            $account = PatientAccount::where('email', strtolower(trim($data['email'])))->where('is_active', true)->lockForUpdate()->first();
            if (! $account) {
                return false;
            }
            $reset = DB::table('patient_password_reset_tokens')->where('patient_account_id', $account->id)->lockForUpdate()->first();
            if (! $reset || now()->greaterThanOrEqualTo($reset->expires_at) || ! hash_equals($reset->token_hash, hash('sha256', $data['token']))) {
                return false;
            }
            $account->update(['password' => $data['password']]);
            $account->tokens()->delete();
            DB::table('patient_password_reset_tokens')->where('patient_account_id', $account->id)->delete();
            Cache::forget('mobile:account:me:'.$account->id);
            DB::afterCommit(fn () => app(AccountSecurityEmail::class)->passwordChanged($account));

            return true;
        });
    }
}
