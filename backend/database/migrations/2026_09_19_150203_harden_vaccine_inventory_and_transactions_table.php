<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            $table->softDeletes();
            $table->text('archived_reason')->nullable()->after('status');
            $table->unsignedBigInteger('archived_by')->nullable()->after('archived_reason');
            $table->foreign('archived_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['clinic_id', 'batch_number'], 'uniq_clinic_batch');
        });

        // Add CHECK constraint on MySQL/MariaDB for non-negative current_quantity
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vaccine_inventory ADD CONSTRAINT chk_inventory_non_negative_quantity CHECK (current_quantity >= 0)');
        }

        // Drop cascading foreign key on inventory_transactions and restrict deletion
        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropForeign(['inventory_id']);
            $table->foreign('inventory_id')
                ->references('inventory_id')
                ->on('vaccine_inventory')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropForeign(['inventory_id']);
            $table->foreign('inventory_id')
                ->references('inventory_id')
                ->on('vaccine_inventory')
                ->cascadeOnDelete();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vaccine_inventory DROP CONSTRAINT chk_inventory_non_negative_quantity');
        }

        Schema::table('vaccine_inventory', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropUnique('uniq_clinic_batch');
            $table->dropColumn(['deleted_at', 'archived_reason', 'archived_by']);
        });
    }
};