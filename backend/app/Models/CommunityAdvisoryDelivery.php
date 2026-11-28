<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityAdvisoryDelivery extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'advisory_version' => 'integer',
            'attempts' => 'integer',
            'next_attempt_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function advisory(): BelongsTo
    {
        return $this->belongsTo(CommunityAdvisory::class, 'advisory_id');
    }

    public function patientAccount(): BelongsTo
    {
        return $this->belongsTo(PatientAccount::class, 'patient_account_id');
    }
}
