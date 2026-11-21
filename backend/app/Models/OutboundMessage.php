<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutboundMessage extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['body', 'context', 'idempotency_key'];

    protected $casts = [
        'recipient' => 'encrypted', 'body' => 'encrypted', 'subject' => 'encrypted',
        'context' => 'array', 'next_attempt_at' => 'datetime',
        'accepted_at' => 'datetime', 'delivered_at' => 'datetime', 'checked_at' => 'datetime',
    ];

    public function attempts()
    {
        return $this->hasMany(OutboundMessageAttempt::class);
    }
}
