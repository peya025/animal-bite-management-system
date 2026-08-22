<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueHistory extends Model
{
    public $timestamps = false;
    protected $table   = 'queue_history';

    protected $fillable = [
        'queue_id', 'clinic_id', 'patient_id',
        'action', 'from_status', 'to_status',
        'call_count', 'performed_by', 'notes', 'occurred_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'call_count'  => 'integer',
    ];

    public function queue()    { return $this->belongsTo(Queue::class, 'queue_id', 'queue_id'); }
    public function performer(){ return $this->belongsTo(User::class,  'performed_by', 'id'); }
}
