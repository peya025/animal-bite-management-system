<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccine_vials', function (Blueprint $table) {
            $table->id('vial_id');
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('vaccine_inventory', 'inventory_id')->restrictOnDelete();

            $table->string('vial_code', 40)->nullable()->unique();
            $table->string('vaccine_type');
            $table->string('batch_number');

            $table->unsignedInteger('total_portions');
            $table->unsignedInteger('administered_portions')->default(0);
            $table->unsignedInteger('discarded_portions')->default(0);

            $table->unsignedInteger('open_vial_hours')->nullable();
            $table->dateTime('opened_at');
            $table->dateTime('use_by_at')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users', 'id')->nullOnDelete();

            $table->string('status', 30)->default('opened'); // opened, depleted, expired, disposed
            $table->dateTime('expired_at')->nullable();
            $table->foreignId('expired_by')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->text('expired_reason')->nullable();

            $table->dateTime('disposed_at')->nullable();
            $table->foreignId('disposed_by')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->text('wastage_reason')->nullable();

            $table->boolean('stock_deducted')->default(true);
            $table->timestamps();

            $table->index(['clinic_id', 'vaccine_type', 'status'], 'idx_vials_clinic_vaccine_status');
            $table->index(['inventory_id', 'status'], 'idx_vials_inventory_status');
            $table->index('use_by_at', 'idx_vials_use_by');
        });

        Schema::create('vaccine_vial_wastages', function (Blueprint $table) {
            $table->id('wastage_id');
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('vial_id')->constrained('vaccine_vials', 'vial_id')->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('vaccine_inventory', 'inventory_id')->restrictOnDelete();

            $table->string('vaccine_type');
            $table->string('batch_number');
            $table->unsignedInteger('portions_discarded');
            $table->text('reason');
            $table->dateTime('disposed_at');
            $table->foreignId('disposed_by')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->timestamps();

            $table->index(['clinic_id', 'disposed_at'], 'idx_wastage_clinic_disposed');
            $table->index('vial_id', 'idx_wastage_vial');
            $table->index('inventory_id', 'idx_wastage_inventory');
        });

        // Safe additive columns on treatment_records: preserve all legacy records as NULL
        // without inventing vial IDs or sharing history when unknown.
        Schema::table('treatment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_records', 'vial_id')) {
                $table->foreignId('vial_id')
                    ->nullable()
                    ->after('inventory_id')
                    ->constrained('vaccine_vials', 'vial_id')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('treatment_records', 'vial_portion_number')) {
                $table->unsignedInteger('vial_portion_number')
                    ->nullable()
                    ->after('vial_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            if (Schema::hasColumn('treatment_records', 'vial_id')) {
                $table->dropForeign(['vial_id']);
                $table->dropColumn('vial_id');
            }
            if (Schema::hasColumn('treatment_records', 'vial_portion_number')) {
                $table->dropColumn('vial_portion_number');
            }
        });

        Schema::dropIfExists('vaccine_vial_wastages');
        Schema::dropIfExists('vaccine_vials');
    }
};
