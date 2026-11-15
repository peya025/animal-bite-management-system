<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationFeePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'registration_fee_id',
        'clinic_id',
        'amount_cents',
        'payment_method',
        'payment_method_details',
        'reference_number',
        'notes',
        'idempotency_key',
        'is_voided',
        'voided_at',
        'voided_by',
        'void_reason',
        'collected_at',
        'recorded_by',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'is_voided'    => 'boolean',
        'voided_at'    => 'datetime',
        'collected_at' => 'datetime',
    ];

    protected $appends = [
        'amount',
    ];

    public function getAmountAttribute(): string
    {
        return number_format(($this->amount_cents ?? 0) / 100, 2, '.', '');
    }

    public function registrationFee(): BelongsTo
    {
        return $this->belongsTo(RegistrationFee::class, 'registration_fee_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
