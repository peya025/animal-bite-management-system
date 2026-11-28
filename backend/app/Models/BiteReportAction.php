<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiteReportAction extends Model
{
    protected $table = 'bite_report_actions';

    protected $primaryKey = 'action_id';

    public const ALLOWED_STATUSES = [
        'Proposed',
        'Accepted',
        'In progress',
        'Completed',
        'Deferred',
        'open',
        'in_progress',
        'completed',
        'deferred',
    ];

    protected $fillable = [
        'clinic_id',
        'snapshot_id',
        'finding_key',
        'observed_pattern',
        'supporting_metric',
        'proposed_action',
        'owner_name',
        'due_date',
        'resources_notes',
        'baseline_value',
        'target_measure',
        'status',
        'review_date',
        'review_outcome',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'review_date' => 'date:Y-m-d',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'clinic_id');
    }

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(BiteReportSnapshot::class, 'snapshot_id', 'snapshot_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id', 'user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id', 'user_id');
    }
}
