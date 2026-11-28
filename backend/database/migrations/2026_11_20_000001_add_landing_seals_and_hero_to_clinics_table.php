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
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('header_seal_1_path')->nullable()->after('right_print_logo_path');
            $table->string('header_seal_1_label')->nullable()->after('header_seal_1_path');
            $table->string('header_seal_2_path')->nullable()->after('header_seal_1_label');
            $table->string('header_seal_2_label')->nullable()->after('header_seal_2_path');
            $table->string('header_seal_3_path')->nullable()->after('header_seal_2_label');
            $table->string('header_seal_3_label')->nullable()->after('header_seal_3_path');
            $table->string('hero_image_path')->nullable()->after('header_seal_3_label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn([
                'header_seal_1_path',
                'header_seal_1_label',
                'header_seal_2_path',
                'header_seal_2_label',
                'header_seal_3_path',
                'header_seal_3_label',
                'hero_image_path',
            ]);
        });
    }
};
