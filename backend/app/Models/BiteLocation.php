<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiteLocation extends Model
{
    use HasFactory;

    protected $table = 'bite_locations';
    protected $primaryKey = 'location_id';

    protected $fillable = [
        'bite_id',
        'bite_address',
        'latitude',
        'longitude',
        'barangay',
        'municipality',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /**
     * Relationship: BiteLocation belongs to BiteIncident
     */
    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }
}
