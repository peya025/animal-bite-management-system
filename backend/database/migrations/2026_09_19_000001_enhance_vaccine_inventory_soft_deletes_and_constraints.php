<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            if (!Schema::hasColumn('vaccine_inventory', 'deleted_at')) {
                $table->softDeletes();
            }
            if (!Schema::hasColumn('vaccine_inventory', 'archived_reason')) {
                $table->text('archived_reason')->nullable()->after('status');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'archived_by')) {
                $table->foreignId('archived_by')->nullable()->after('archived_reason')->constrained('users', 'id')->nullOnDelete();
            }
        });

        // Add unique constraint for (clinic_id, batch_number) if not exists
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            $table->unique(['clinic_id', 'batch_number'], 'vaccine_inventory_clinic_batch_unique');
        });

        // Add non-negative stock check constraint on MySQL
        if (DB::getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE vaccine_inventory ADD CONSTRAINT chk_inventory_non_negative_quantity CHECK (current_quantity >= 0)');
            } catch (\Throwable $e) {
                // Ignore if constraint already exists
            }
        }

        // Update foreign key on inventory_transactions to RESTRICT deletion
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['inventory_id']);
                $table->foreign('inventory_id')
                    ->references('inventory_id')
                    ->on('vaccine_inventory')
                    ->restrictOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['inventory_id']);
                $table->foreign('inventory_id')
                    ->references('inventory_id')
                    ->on('vaccine_inventory')
                    ->cascadeOnDelete();
            }
        });

        if (DB::getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE vaccine_inventory DROP CHECK chk_inventory_non_negative_quantity');
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        Schema::table('vaccine_inventory', function (Blueprint $table) {
            $table->dropUnique('vaccine_inventory_clinic_batch_unique');
            if (Schema::hasColumn('vaccine_inventory', 'archived_by')) {
                $table->dropConstrainedForeignId('archived_by');
            }
            if (Schema::hasColumn('vaccine_inventory', 'archived_reason')) {
                $table->dropColumn('archived_reason');
            }
            if (Schema::hasColumn('vaccine_inventory', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
