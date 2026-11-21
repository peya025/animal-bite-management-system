<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BiteReportSnapshot extends Model
{
    protected $table = 'bite_report_snapshots';

    protected $primaryKey = 'snapshot_id';

    protected $fillable = [
        'clinic_id',
        'snapshot_code',
        'version',
        'parent_snapshot_id',
        'status',
        'privacy_mode',
        'rule_version',
        'period_start',
        'period_end',
        'cutoff_date',
        'date_basis',
        'filters_json',
        'payload_json',
        'notes',
        'prepared_by_user_id',
        'reviewed_by_user_id',
        'generated_at',
        'finalized_at',
    ];

    protected $casts = [
        'version' => 'integer',
        'period_start' => 'date:Y-m-d',
        'period_end' => 'date:Y-m-d',
        'cutoff_date' => 'date:Y-m-d',
        'filters_json' => 'array',
        'payload_json' => 'array',
        'generated_at' => 'datetime',
        'finalized_at' => 'datetime',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'clinic_id');
    }

    public function parentSnapshot(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_snapshot_id', 'snapshot_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(self::class, 'parent_snapshot_id', 'snapshot_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(BiteReportAction::class, 'snapshot_id', 'snapshot_id');
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id', 'user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id', 'user_id');
    }
}
