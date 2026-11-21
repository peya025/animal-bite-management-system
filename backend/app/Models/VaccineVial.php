<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineVial extends Model
{
    use HasFactory;

    public const STATUS_OPENED   = 'opened';
    public const STATUS_DEPLETED = 'depleted';
    public const STATUS_EXPIRED  = 'expired';
    public const STATUS_DISPOSED = 'disposed';

    protected $table = 'vaccine_vials';
    protected $primaryKey = 'vial_id';

    protected $fillable = [
        'clinic_id',
        'inventory_id',
        'vial_code',
        'vaccine_type',
        'batch_number',
        'total_portions',
        'administered_portions',
        'discarded_portions',
        'open_vial_hours',
        'opened_at',
        'use_by_at',
        'opened_by',
        'status',
        'expired_at',
        'expired_by',
        'expired_reason',
        'disposed_at',
        'disposed_by',
        'wastage_reason',
        'stock_deducted',
    ];

    protected $casts = [
        'total_portions'        => 'integer',
        'administered_portions' => 'integer',
        'discarded_portions'    => 'integer',
        'open_vial_hours'       => 'integer',
        'opened_at'             => 'datetime',
        'use_by_at'             => 'datetime',
        'expired_at'            => 'datetime',
        'disposed_at'           => 'datetime',
        'stock_deducted'        => 'boolean',
    ];

    protected $appends = [
        'effective_status',
        'available_portions',
        'undisposed_portions',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function inventory()
    {
        return $this->belongsTo(VaccineInventory::class, 'inventory_id', 'inventory_id')->withTrashed();
    }

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by', 'id');
    }

    public function expiredBy()
    {
        return $this->belongsTo(User::class, 'expired_by', 'id');
    }

    public function disposedBy()
    {
        return $this->belongsTo(User::class, 'disposed_by', 'id');
    }

    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'vial_id', 'vial_id');
    }

    public function wastages()
    {
        return $this->hasMany(VaccineVialWastage::class, 'vial_id', 'vial_id');
    }

    public function isExpiredByTime(): bool
    {
        if ($this->use_by_at !== null && $this->use_by_at->lte(now())) {
            return true;
        }

        if ($this->relationLoaded('inventory') && $this->inventory) {
            if ($this->inventory->status === 'expired') {
                return true;
            }
            if ($this->inventory->expiration_date && $this->inventory->expiration_date->toDateString() < now()->toDateString()) {
                return true;
            }
        }

        return false;
    }

    public function getEffectiveStatusAttribute(): string
    {
        if ($this->status === self::STATUS_DISPOSED) {
            return self::STATUS_DISPOSED;
        }
        if ($this->status === self::STATUS_DEPLETED) {
            return self::STATUS_DEPLETED;
        }
        if ($this->status === self::STATUS_EXPIRED || ($this->status === self::STATUS_OPENED && $this->isExpiredByTime())) {
            return self::STATUS_EXPIRED;
        }

        $remaining = max(0, (int) $this->total_portions - (int) $this->administered_portions - (int) $this->discarded_portions);
        if ($remaining === 0 && (int) $this->administered_portions >= (int) $this->total_portions) {
            return self::STATUS_DEPLETED;
        }

        return $this->status ?: self::STATUS_OPENED;
    }

    public function getAvailablePortionsAttribute(): int
    {
        if ($this->effective_status !== self::STATUS_OPENED) {
            return 0;
        }

        return max(0, (int) $this->total_portions - (int) $this->administered_portions - (int) $this->discarded_portions);
    }

    public function getUndisposedPortionsAttribute(): int
    {
        if ($this->status === self::STATUS_DISPOSED) {
            return 0;
        }

        return max(0, (int) $this->total_portions - (int) $this->administered_portions - (int) $this->discarded_portions);
    }

    public function isUsable(): bool
    {
        return $this->status === self::STATUS_OPENED
            && !$this->isExpiredByTime()
            && $this->available_portions > 0;
    }

    public function buildSummaryText(): string
    {
        $code         = $this->vial_code ?: "V-{$this->vial_id}";
        $total        = max(1, (int) $this->total_portions);
        $administered = max(0, (int) $this->administered_portions);
        $discarded    = max(0, (int) $this->discarded_portions);
        $available    = $this->available_portions;
        $effective    = $this->effective_status;

        if ($effective === self::STATUS_DISPOSED || $discarded > 0) {
            return "Vial {$code} · {$administered} administered · {$discarded} discarded · {$available} available";
        }

        if ($effective === self::STATUS_EXPIRED) {
            $unadministered = $this->undisposed_portions;
            return "Vial {$code} · {$administered} administered · {$unadministered} expired (not disposed) · 0 available";
        }

        $portionWord = $total === 1 ? 'portion' : 'portions';
        return "Vial {$code} · {$administered} of {$total} {$portionWord} administered · {$available} available";
    }
}
