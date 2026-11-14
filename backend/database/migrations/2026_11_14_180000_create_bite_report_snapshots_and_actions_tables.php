<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('bite_report_snapshots')) {
            Schema::create('bite_report_snapshots', function (Blueprint $table) {
                $table->id('snapshot_id');
                $table->unsignedBigInteger('clinic_id')->index();
                $table->string('snapshot_code', 64)->unique();
                $table->unsignedInteger('version')->default(1);
                $table->unsignedBigInteger('parent_snapshot_id')->nullable()->index();
                $table->string('status', 32)->default('draft')->index(); // draft | finalized
                $table->string('privacy_mode', 32)->default('internal_aggregate'); // internal_aggregate | aggregate_only
                $table->string('rule_version', 64);
                $table->date('period_start');
                $table->date('period_end');
                $table->date('cutoff_date');
                $table->string('date_basis', 32)->default('exposure_date');
                $table->json('filters_json')->nullable();
                $table->longText('payload_json');
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('prepared_by_user_id')->nullable();
                $table->unsignedBigInteger('reviewed_by_user_id')->nullable();
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('finalized_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('bite_report_actions')) {
            Schema::create('bite_report_actions', function (Blueprint $table) {
                $table->id('action_id');
                $table->unsignedBigInteger('clinic_id')->index();
                $table->unsignedBigInteger('snapshot_id')->nullable()->index();
                $table->string('finding_key', 64)->nullable();
                $table->string('observed_pattern', 255);
                $table->string('supporting_metric', 255);
                $table->text('proposed_action');
                $table->string('owner_name', 160);
                $table->date('due_date')->nullable();
                $table->text('resources_notes')->nullable();
                $table->string('baseline_value', 160)->nullable();
                $table->string('target_measure', 255)->nullable();
                $table->string('status', 32)->default('Proposed')->index(); // Proposed | Accepted | In progress | Completed | Deferred
                $table->date('review_date')->nullable();
                $table->text('review_outcome')->nullable();
                $table->unsignedBigInteger('created_by_user_id')->nullable();
                $table->unsignedBigInteger('updated_by_user_id')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bite_report_actions');
        Schema::dropIfExists('bite_report_snapshots');
    }
};
