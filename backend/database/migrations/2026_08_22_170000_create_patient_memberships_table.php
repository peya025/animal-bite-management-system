<?php

use App\Services\PatientMembershipService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->string('membership_type', 50);
            $table->boolean('is_active')->default(true);
            $table->string('status_value', 100)->nullable();
            $table->string('category', 100)->nullable();
            $table->string('relationship_value', 100)->nullable();
            $table->string('registered_beneficiary', 100)->nullable();
            $table->string('membership_id_no', 255)->nullable();
            $table->string('membership_label', 255)->nullable();
            $table->string('extra_value', 255)->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'membership_type']);
        });

        $service = new PatientMembershipService();
        $timestamp = now();

        DB::table('patient_details')
            ->orderBy('id')
            ->get()
            ->each(function ($detail) use ($service, $timestamp) {
                $memberships = $service->legacyDetailsToMemberships((array) $detail);

                if (empty($memberships)) {
                    return;
                }

                $rows = array_map(function (array $membership) use ($detail, $timestamp) {
                    return [
                        'patient_id' => $detail->patient_id,
                        'membership_type' => $membership['membership_type'],
                        'is_active' => $membership['is_active'] ?? true,
                        'status_value' => $membership['status_value'],
                        'category' => $membership['category'],
                        'relationship_value' => $membership['relationship_value'],
                        'registered_beneficiary' => $membership['registered_beneficiary'],
                        'membership_id_no' => $membership['membership_id_no'],
                        'membership_label' => $membership['membership_label'],
                        'extra_value' => $membership['extra_value'],
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }, $memberships);

                DB::table('patient_memberships')->insert($rows);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_memberships');
    }
};
