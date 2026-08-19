<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        try {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->unique('philhealth_no');
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Ignore if duplicate index name / key already exists
            if ($e->getCode() === '42000' || str_contains($e->getMessage(), '1061 Duplicate key name')) {
                return;
            }
            throw $e;
        }
    }

    public function down(): void
    {
        try {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->dropUnique(['philhealth_no']);
            });
        } catch (\Exception $e) {
            // Ignore if index doesn't exist
        }
    }
};
