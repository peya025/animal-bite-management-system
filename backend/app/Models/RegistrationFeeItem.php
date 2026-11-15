<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationFeeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'registration_fee_id',
        'clinic_id',
        'fee_type',
        'label',
        'disposition',
        'amount_cents',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
    ];

    protected $appends = [
        'amount',
    ];

    public function getAmountAttribute(): ?string
    {
        if ($this->amount_cents === null) {
            return null;
        }

        return number_format($this->amount_cents / 100, 2, '.', '');
    }

    public function registrationFee(): BelongsTo
    {
        return $this->belongsTo(RegistrationFee::class, 'registration_fee_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
