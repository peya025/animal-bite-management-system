<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('patient_followup_logs')) {
            return;
        }

        Schema::create('patient_followup_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id')->index();
            $table->unsignedBigInteger('bite_id')->index();
            $table->unsignedBigInteger('patient_id')->index();
            $table->unsignedBigInteger('appointment_id')->nullable()->index();
            $table->string('dose_label', 50)->nullable();
            $table->unsignedInteger('days_overdue')->nullable();
            $table->string('contact_type', 30); // call, sms, visit, other
            $table->string('status', 50); // promised_visit, reached, no_answer, wrong_number, sms_queued, sms_sent, sms_simulated, sms_logged, sms_failed, refused, completed_elsewhere
            $table->string('recipient_number', 50)->nullable();
            $table->text('message_body')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('created_by_name', 150)->nullable();
            $table->timestamps();

            $table->foreign('bite_id')->references('bite_id')->on('bite_incidents')->onDelete('cascade');
            $table->foreign('patient_id')->references('patient_id')->on('patients')->onDelete('cascade');
            $table->foreign('appointment_id')->references('appointment_id')->on('appointments')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['clinic_id', 'bite_id', 'created_at'], 'pfl_clinic_bite_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_followup_logs');
    }
};
