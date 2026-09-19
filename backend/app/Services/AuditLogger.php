<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Emit a structured audit log entry for model mutations.
     */
    public static function log(
        string $action,
        Model $subject,
        array $before = [],
        array $after = [],
        ?string $reason = null,
        ?int $userId = null,
        ?int $clinicId = null
    ): AuditLog {
        $user = Auth::user();
        $effectiveUserId = $userId ?? $user?->id;
        $effectiveClinicId = $clinicId ?? $user?->clinic_id ?? $subject->getAttribute('clinic_id');

        $description = $reason ?: ucfirst(str_replace(['.', '_'], ' ', $action)) . ' on ' . class_basename($subject) . ' #' . $subject->getKey();

        return AuditLog::create([
            'user_id'     => $effectiveUserId,
            'clinic_id'   => $effectiveClinicId,
            'action'      => $action,
            'model'       => get_class($subject),
            'model_id'    => $subject->getKey(),
            'old_values'  => !empty($before) ? $before : null,
            'new_values'  => !empty($after) ? $after : null,
            'description' => $description,
            'metadata'    => array_filter([
                'reason' => $reason,
                'subject_type' => get_class($subject),
                'subject_id'   => $subject->getKey(),
            ]),
            'ip_address'  => Request::ip() ?? '127.0.0.1',
            'user_agent'  => Request::userAgent(),
            'url'         => Request::fullUrl() ?? 'system',
            'method'      => Request::method() ?? 'CLI',
        ]);
    }
}
