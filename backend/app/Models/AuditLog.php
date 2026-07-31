<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'clinic_id',
        'action',
        'model',
        'model_id',
        'ip_address',
        'user_agent',
        'url',
        'method',
        'old_values',
        'new_values',
        'description',
        'metadata',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
    ];

    /**
     * Relationships
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Log an action
     */
    public static function log(string $action, ?string $model = null, ?int $modelId = null, array $options = []): self
    {
        $user = Auth::user();
        
        return self::create([
            'user_id' => $user?->id,
            'clinic_id' => $user?->clinic_id,
            'action' => $action,
            'model' => $model,
            'model_id' => $modelId,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'url' => Request::fullUrl(),
            'method' => Request::method(),
            'old_values' => $options['old_values'] ?? null,
            'new_values' => $options['new_values'] ?? null,
            'description' => $options['description'] ?? null,
            'metadata' => $options['metadata'] ?? null,
        ]);
    }

    /**
     * Quick log methods
     */
    public static function logLogin(User $user): self
    {
        return self::create([
            'user_id' => $user->id,
            'clinic_id' => $user->clinic_id,
            'action' => 'login',
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'url' => Request::fullUrl(),
            'method' => 'POST',
            'description' => "User {$user->name} logged in",
        ]);
    }

    public static function logLogout(): self
    {
        $user = Auth::user();
        return self::create([
            'user_id' => $user?->id,
            'clinic_id' => $user?->clinic_id,
            'action' => 'logout',
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'description' => "User {$user?->name} logged out",
        ]);
    }

    public static function logCreated(string $model, int $modelId, array $values = []): self
    {
        return self::log('created', $model, $modelId, [
            'new_values' => $values,
            'description' => "{$model} #{$modelId} created",
        ]);
    }

    public static function logUpdated(string $model, int $modelId, array $oldValues, array $newValues): self
    {
        return self::log('updated', $model, $modelId, [
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'description' => "{$model} #{$modelId} updated",
        ]);
    }

    public static function logDeleted(string $model, int $modelId, array $values = []): self
    {
        return self::log('deleted', $model, $modelId, [
            'old_values' => $values,
            'description' => "{$model} #{$modelId} deleted",
        ]);
    }

    public static function logViewed(string $model, int $modelId): self
    {
        return self::log('viewed', $model, $modelId, [
            'description' => "{$model} #{$modelId} viewed",
        ]);
    }
}
