<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineVialWastage extends Model
{
    use HasFactory;

    protected $table = 'vaccine_vial_wastages';
    protected $primaryKey = 'wastage_id';

    protected $fillable = [
        'clinic_id',
        'vial_id',
        'inventory_id',
        'vaccine_type',
        'batch_number',
        'portions_discarded',
        'reason',
        'disposed_at',
        'disposed_by',
    ];

    protected $casts = [
        'portions_discarded' => 'integer',
        'disposed_at'        => 'datetime',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function vial()
    {
        return $this->belongsTo(VaccineVial::class, 'vial_id', 'vial_id');
    }

    public function inventory()
    {
        return $this->belongsTo(VaccineInventory::class, 'inventory_id', 'inventory_id')->withTrashed();
    }

    public function disposedBy()
    {
        return $this->belongsTo(User::class, 'disposed_by', 'id');
    }
}
