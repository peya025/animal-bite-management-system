<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'is_urgent' => 'boolean'];
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
