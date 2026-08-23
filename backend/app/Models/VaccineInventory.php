<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineInventory extends Model
{
    use HasFactory;

    protected $table = 'vaccine_inventory';
    protected $primaryKey = 'inventory_id';

    protected $fillable = [
        'clinic_id',
        'vaccine_type',
        'batch_number',
        'received_from',
        'manufactured_date',
        'shelf_life_months',
        'open_vial_hours',
        'doses_per_vial',
        'cold_chain_notes',
        'opened_at',
        'open_vial_discard_at',
        'open_vial_status',
        'open_vial_doses_used',
        'current_quantity',
        'expiration_date',
        'status',
    ];

    protected $casts = [
        'current_quantity' => 'integer',
        'expiration_date' => 'date',
        'manufactured_date' => 'date',
        'opened_at' => 'datetime',
        'open_vial_discard_at' => 'datetime',
        'shelf_life_months' => 'integer',
        'open_vial_hours' => 'integer',
        'doses_per_vial' => 'integer',
        'open_vial_doses_used' => 'integer',
    ];

    /**
     * Relationship: VaccineInventory belongs to Clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    /**
     * Relationship: VaccineInventory has many InventoryTransactions
     */
    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'inventory_id', 'inventory_id');
    }

    /**
     * Relationship: VaccineInventory has many TreatmentRecords
     */
    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'inventory_id', 'inventory_id');
    }
}
