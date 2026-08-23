<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            if (!Schema::hasColumn('vaccine_inventory', 'received_from')) {
                $table->string('received_from')->nullable()->after('batch_number');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'manufactured_date')) {
                $table->date('manufactured_date')->nullable()->after('received_from');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'shelf_life_months')) {
                $table->integer('shelf_life_months')->nullable()->after('manufactured_date');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'open_vial_hours')) {
                $table->integer('open_vial_hours')->nullable()->after('shelf_life_months');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'cold_chain_notes')) {
                $table->text('cold_chain_notes')->nullable()->after('open_vial_hours');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'opened_at')) {
                $table->dateTime('opened_at')->nullable()->after('cold_chain_notes');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'open_vial_discard_at')) {
                $table->dateTime('open_vial_discard_at')->nullable()->after('opened_at');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'open_vial_status')) {
                $table->enum('open_vial_status', ['unopened', 'opened', 'discarded', 'depleted'])->default('unopened')->after('open_vial_discard_at');
            }
        });

        if (!Schema::hasTable('vaccine_type_presets')) {
            Schema::create('vaccine_type_presets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->nullable()->constrained('clinics', 'id')->cascadeOnDelete();
                $table->string('vaccine_name');
                $table->string('category')->default('Anti-Rabies Vaccines (ARV)');
                $table->integer('default_shelf_life_months')->default(24);
                $table->integer('default_open_vial_hours')->nullable()->default(6);
                $table->text('storage_temperature_notes')->nullable();
                $table->boolean('is_multidose')->default(true);
                $table->integer('doses_per_vial')->default(1);
                $table->timestamps();

                $table->index('vaccine_name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vaccine_type_presets');

        Schema::table('vaccine_inventory', function (Blueprint $table) {
            $table->dropColumn([
                'received_from',
                'manufactured_date',
                'shelf_life_months',
                'open_vial_hours',
                'cold_chain_notes',
                'opened_at',
                'open_vial_discard_at',
                'open_vial_status',
            ]);
        });
    }
};
