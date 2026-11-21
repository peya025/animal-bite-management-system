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
        Schema::table('clinic_resources', function (Blueprint $table) {
            $table->string('video_path', 500)->nullable()->after('url');
            $table->string('thumbnail_path', 500)->nullable()->after('thumbnail_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_resources', function (Blueprint $table) {
            $table->dropColumn(['video_path', 'thumbnail_path']);
        });
    }
};
