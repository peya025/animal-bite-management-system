<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * InventoryTransaction Model
 *
 * NOTE: Prevent direct external creation of InventoryTransaction records.
 * Records must only be created through authorized service methods (e.g., VaccineInventoryUsageService)
 * within database transactions to maintain strict inventory integrity.
 */
class InventoryTransaction extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (InventoryTransaction $transaction) {
            if (empty($transaction->transaction_date)) {
                $transaction->transaction_date = now();
            }
        });
    }

    protected $table = 'inventory_transactions';
    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'inventory_id',
        'staff_id',
        'transaction_type',
        'quantity',
        'quantity_received',
        'received_from',
        'dispensed',
        'transferred',
        'expired',
        'balanced',
                'reference_id',
        'remarks',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'quantity_received' => 'integer',
        'dispensed' => 'integer',
        'transferred' => 'integer',
        'expired' => 'integer',
        'balanced' => 'integer',
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
