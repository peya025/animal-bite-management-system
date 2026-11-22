<?php

namespace App\Services\Mobile;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use Illuminate\Support\Facades\Log;

class DeviceTokenService
{
    /**
     * Register or update an FCM device token for an authenticated patient account.
     */
    public function registerToken(PatientAccount $account, array $data): PatientDeviceToken
    {
        $fcmToken = $data['fcm_token'];
        $deviceId = $data['device_id'] ?? null;
        $deviceType = $data['device_type'] ?? 'android';
        $deviceName = $data['device_name'] ?? null;

        // Security / Account Switching: If this token was previously registered to another account,
        // revoke the association to prevent cross-account notification leakage.
        PatientDeviceToken::where('fcm_token', $fcmToken)
            ->where('patient_account_id', '!=', $account->id)
            ->delete();

        // Token Rotation: If this physical device had an older token under this account, remove obsolete token
        if (!empty($deviceId)) {
            $account->deviceTokens()
                ->where('device_id', $deviceId)
                ->where('fcm_token', '!=', $fcmToken)
                ->delete();
        }

        // Idempotent registration / touch timestamp
        $deviceToken = $account->deviceTokens()->updateOrCreate(
            ['fcm_token' => $fcmToken],
            [
                'device_id'    => $deviceId,
                'device_type'  => $deviceType,
                'device_name'  => $deviceName,
                'last_used_at' => now(),
                'is_active'    => true,
            ]
        );

        Log::info("Device token registered for patient account ID {$account->id}", [
            'patient_account_id' => $account->id,
            'masked_token'       => $deviceToken->masked_token,
            'device_type'        => $deviceType,
            'device_id'          => $deviceId,
        ]);

        return $deviceToken;
    }

    /**
     * Remove or deactivate a device registration for an authenticated patient account.
     * Prevents cross-account deletion by scoping strictly to the authenticated account.
     */
    public function deleteToken(PatientAccount $account, array $data): int
    {
        $fcmToken = $data['fcm_token'] ?? null;
        $deviceId = $data['device_id'] ?? null;

        $query = $account->deviceTokens();

        if (!empty($fcmToken)) {
            $query->where('fcm_token', $fcmToken);
        } elseif (!empty($deviceId)) {
            $query->where('device_id', $deviceId);
        } else {
            // If neither is specified, delete all tokens for this account (e.g. global session revoke)
            $count = $query->delete();
            Log::info("All device tokens revoked for patient account ID {$account->id}", [
                'count' => $count,
            ]);
            return $count;
        }

        $count = $query->delete();

        Log::info("Device token removed for patient account ID {$account->id}", [
            'patient_account_id' => $account->id,
            'masked_token'       => !empty($fcmToken) ? (strlen($fcmToken) > 10 ? substr($fcmToken, 0, 6) . '...' . substr($fcmToken, -4) : '***') : null,
            'deleted_count'      => $count,
        ]);

        return $count;
    }
}
