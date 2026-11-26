<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('community_advisories', function (Blueprint $table) {
            $table->string('advisory_type', 32)->default('community_awareness')->after('state');
            $table->string('source_authority', 160)->nullable()->after('expires_on');
            $table->string('source_reference', 500)->nullable()->after('source_authority');
            $table->date('source_issued_on')->nullable()->after('source_reference');
            $table->string('source_geography_note', 200)->nullable()->after('source_issued_on');
            $table->foreignId('source_verified_by')->nullable()->after('source_geography_note')->constrained('users')->restrictOnDelete();
            $table->timestamp('source_verified_at')->nullable()->after('source_verified_by');
            $table->timestamp('scheduled_for')->nullable()->after('approved_hash');
            $table->foreignId('scheduled_by')->nullable()->after('scheduled_for')->constrained('users')->restrictOnDelete();
            $table->index(['state', 'scheduled_for']);
        });
    }

    public function down(): void
    {
        Schema::table('community_advisories', function (Blueprint $table) {
            $table->dropIndex(['state', 'scheduled_for']);
            $table->dropConstrainedForeignId('scheduled_by');
            $table->dropColumn('scheduled_for');
            $table->dropConstrainedForeignId('source_verified_by');
            $table->dropColumn([
                'advisory_type',
                'source_authority',
                'source_reference',
                'source_issued_on',
                'source_geography_note',
                'source_verified_at',
            ]);
        });
    }
};
