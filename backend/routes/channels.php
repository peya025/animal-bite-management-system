<?php

use App\Models\PatientAccount;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// 1. Clinic Queue Channel (All staff & Public TV Display with staff credentials)
Broadcast::channel('clinic.{clinicId}.queue', function ($user, int $clinicId) {
    if ($user instanceof User) {
        return (int) $user->clinic_id === (int) $clinicId;
    }

    return false;
}, ['guards' => ['sanctum']]);

// 2. Clinic Staff Notifications Channel
Broadcast::channel('clinic.{clinicId}.notifications', function ($user, int $clinicId) {
    return $user instanceof User && (int) $user->clinic_id === (int) $clinicId;
}, ['guards' => ['sanctum']]);

// 3. Clinic Inventory Channel (Treatment & Admin roles)
Broadcast::channel('clinic.{clinicId}.inventory', function ($user, int $clinicId) {
    return $user instanceof User
        && (int) $user->clinic_id === (int) $clinicId
        && in_array($user->role, ['admin', 'treatment', 'nurse', 'doctor', 'developer', 'staff']);
}, ['guards' => ['sanctum']]);

// 4. Patient Private Channel
Broadcast::channel('patient.account.{accountId}', function ($user, int $accountId) {
    return $user instanceof PatientAccount && (int) $user->id === (int) $accountId;
}, ['guards' => ['sanctum']]);
