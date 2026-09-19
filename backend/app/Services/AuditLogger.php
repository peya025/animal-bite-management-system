<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    /**
     * Log an audit event for a model mutation.
     *
     * @param string $action Action identifier (e.g. inventory.create, inventory.deduct, inventory.archive)
     * @param Model $subject The affected Eloquent model
     * @param array $before State before the mutation
     * @param array $after State after the mutation
     * @param string|null $reason Optional reason or notes
     */
    public static function log(string $action, Model $subject, array $before, array $after, ?string $reason = null): void
    {
        $user = auth()->user();
        $clinicId = $user ? $user->clinic_id : ($subject->clinic_id ?? null);

        AuditLog::create([
            'user_id'      => auth()->id(),
            'clinic_id'    => $clinicId,
            'action'       => $action,
            'model'        => get_class($subject),
            'model_id'     => $subject->getKey(),
            'old_values'   => $before,
            'new_values'   => $after,
            'description'  => $reason ?? "{$action} performed on " . class_basename($subject) . " #{$subject->getKey()}",
            'ip_address'   => request()->ip() ?? '127.0.0.1',
        ]);
    }
}
