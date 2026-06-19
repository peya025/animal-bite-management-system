<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $table = 'inventory_transactions';
    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'inventory_id',
        'staff_id',
        'transaction_type',
        'quantity',
        'transaction_date',
        'reference_id',
        'remarks',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'transaction_date' => 'datetime',
    ];

    /**
     * Relationship: InventoryTransaction belongs to VaccineInventory
     */
    public function inventory()
    {
        return $this->belongsTo(VaccineInventory::class, 'inventory_id', 'inventory_id');
    }

    /**
     * Relationship: InventoryTransaction belongs to Staff (User)
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }
}
