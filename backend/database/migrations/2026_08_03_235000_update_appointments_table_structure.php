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
        Schema::table('appointments', function (Blueprint $table) {
            // Add clinic_id if it doesn't exist
            if (!Schema::hasColumn('appointments', 'clinic_id')) {
                $table->unsignedBigInteger('clinic_id')->after('appointment_id');
                $table->foreign('clinic_id')->references('id')->on('clinics')->onDelete('cascade');
            }

            // Add bite_id if it doesn't exist
            if (!Schema::hasColumn('appointments', 'bite_id')) {
                $table->unsignedBigInteger('bite_id')->nullable()->after('patient_id');
                $table->foreign('bite_id')->references('bite_id')->on('bite_incidents')->onDelete('cascade');
            }

            // Make scheduled_datetime nullable if it exists
            if (Schema::hasColumn('appointments', 'scheduled_datetime')) {
                DB::statement("ALTER TABLE `appointments` MODIFY `scheduled_datetime` DATETIME NULL");
            }

            // Rename scheduled_date to appointment_date if needed
            if (Schema::hasColumn('appointments', 'scheduled_date') && !Schema::hasColumn('appointments', 'appointment_date')) {
                $table->renameColumn('scheduled_date', 'scheduled_datetime');
                $table->date('appointment_date')->after('bite_id');
                $table->time('appointment_time')->default('08:00:00')->after('appointment_date');
            } elseif (!Schema::hasColumn('appointments', 'appointment_date')) {
                $table->date('appointment_date')->after('bite_id');
                $table->time('appointment_time')->default('08:00:00')->after('appointment_date');
            }

            // Update appointment_type enum
            if (Schema::hasColumn('appointments', 'appointment_type')) {
                DB::statement("ALTER TABLE `appointments` MODIFY `appointment_type` ENUM('follow_up_vaccination', 'consultation', 'checkup', 'vaccination') NOT NULL DEFAULT 'follow_up_vaccination'");
            }

            // Add dose_number if it doesn't exist
            if (!Schema::hasColumn('appointments', 'dose_number')) {
                $table->integer('dose_number')->nullable()->comment('For vaccinations: 3, 7, 28, 90, 365')->after('appointment_type');
            }

            // Update status enum to include all states
            if (Schema::hasColumn('appointments', 'status')) {
                DB::statement("ALTER TABLE `appointments` MODIFY `status` ENUM('scheduled', 'confirmed', 'completed', 'missed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled'");
            }

            // Add notes if it doesn't exist
            if (!Schema::hasColumn('appointments', 'notes')) {
                $table->text('notes')->nullable()->after('dose_number');
            }

            // Add created_by if it doesn't exist
            if (!Schema::hasColumn('appointments', 'created_by')) {
                $table->unsignedBigInteger('created_by')->after('notes');
                $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            }
        });

        // Add indexes
        Schema::table('appointments', function (Blueprint $table) {
            if (!$this->indexExists('appointments', 'appointments_appointment_date_index')) {
                $table->index('appointment_date');
            }
            if (!$this->indexExists('appointments', 'appointments_status_index')) {
                $table->index('status');
            }
            if (!$this->indexExists('appointments', ['patient_id', 'appointment_date'])) {
                $table->index(['patient_id', 'appointment_date']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Remove added columns and indexes (reverse changes)
            if (Schema::hasColumn('appointments', 'clinic_id')) {
                $table->dropForeign(['clinic_id']);
                $table->dropColumn('clinic_id');
            }
            if (Schema::hasColumn('appointments', 'bite_id')) {
                $table->dropForeign(['bite_id']);
                $table->dropColumn('bite_id');
            }
            if (Schema::hasColumn('appointments', 'appointment_date')) {
                $table->dropColumn(['appointment_date', 'appointment_time']);
            }
            if (Schema::hasColumn('appointments', 'dose_number')) {
                $table->dropColumn('dose_number');
            }
            if (Schema::hasColumn('appointments', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('appointments', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });
    }

    /**
     * Check if an index exists on a table.
     */
    private function indexExists(string $table, string|array $columns): bool
    {
        $indexes = DB::select("SHOW INDEX FROM `{$table}`");
        $columnKey = is_array($columns) ? implode('_', $columns) : $columns;
        
        foreach ($indexes as $index) {
            if (str_contains($index->Key_name, $columnKey)) {
                return true;
            }
        }
        
        return false;
    }
};
