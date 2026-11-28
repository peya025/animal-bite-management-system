<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RegistrationFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'encounter_id',
        'currency',
        'total_cents',
        'amount_paid_cents',
        'balance_cents',
        'status',
        'is_complete',
        'no_additional_fees',
        'notes',
        'config_snapshot',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_cents'        => 'integer',
        'amount_paid_cents'  => 'integer',
        'balance_cents'      => 'integer',
        'is_complete'        => 'boolean',
        'no_additional_fees' => 'boolean',
        'config_snapshot'    => 'array',
    ];

    protected $appends = [
        'total',
        'amount_paid',
        'balance',
    ];

    public function getTotalAttribute(): string
    {
        return number_format(($this->total_cents ?? 0) / 100, 2, '.', '');
    }

    public function getAmountPaidAttribute(): string
    {
        return number_format(($this->amount_paid_cents ?? 0) / 100, 2, '.', '');
    }

    public function getBalanceAttribute(): string
    {
        return number_format(($this->balance_cents ?? 0) / 100, 2, '.', '');
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(RegistrationEncounter::class, 'encounter_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RegistrationFeeItem::class, 'registration_fee_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RegistrationFeePayment::class, 'registration_fee_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
