<?php

namespace Tests\Feature\Inventory;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Models\VaccineVial;
use App\Models\VaccineVialWastage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VaccineVialLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function createClinicAndNurse(): array
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

        $nurse = User::create([
            'name'                    => 'Nurse Pia',
            'email'                   => 'nurse-vial@clinic.test',
            'password'                => bcrypt('password123'),
            'clinic_id'               => $clinic->id,
            'role'                    => 'treatment',
            'is_active'               => true,
            'professional_license_no' => 'PRC-998877',
        ]);

        $role = Role::firstOrCreate(['slug' => 'treatment_nurse'], [
            'name'          => 'treatment_nurse',
            'display_name'  => 'Treatment Nurse',
            'default_route' => '/dashboard',
        ]);
        $nurse->roles()->attach($role->id, ['assigned_at' => now()]);

        return [$clinic, $nurse];
    }

    private function createPatientWithIncident(Clinic $clinic, User $actor, string $firstName, string $lastName, string $caseNumber): array
    {
        $patient = Patient::create([
            'clinic_id'     => $clinic->id,
            'first_name'    => $firstName,
            'last_name'     => $lastName,
            'gender'        => 'female',
            'date_of_birth' => '1998-05-10',
        ]);

        $incident = BiteIncident::create([
            'clinic_id'         => $clinic->id,
            'patient_id'        => $patient->patient_id,
            'created_by'        => $actor->id,
            'case_number'       => $caseNumber,
            'bite_date'         => now()->toDateString(),
            'bite_place'        => 'Poblacion, Tagoloan',
            'exposure_category' => 'II',
            'severity'          => 'moderate',
            'status'            => 'active',
        ]);

        TreatmentPlan::create([
            'clinic_id'  => $clinic->id,
            'bite_id'    => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'plan_type'  => 'full_pep',
            'status'     => 'approved',
            'decided_by' => $actor->id,
            'decided_at' => now(),
        ]);

        return [$patient, $incident];
    }

    private function createPresetAndBatch(
        Clinic $clinic,
        string $vaccineName,
        int $dosesPerVial,
        int $openHours,
        string $batchNumber,
        int $quantity = 5
    ): VaccineInventory {
        VaccineTypePreset::create([
            'clinic_id'               => $clinic->id,
            'vaccine_name'            => $vaccineName,
            'category'                => 'Anti-Rabies Vaccines (ARV)',
            'default_shelf_life_months' => 24,
            'default_open_vial_hours' => $openHours,
            'is_multidose'            => $dosesPerVial > 1,
            'doses_per_vial'          => $dosesPerVial,
        ]);

        return VaccineInventory::create([
            'clinic_id'        => $clinic->id,
            'vaccine_type'     => $vaccineName,
            'batch_number'     => $batchNumber,
            'doses_per_vial'   => $dosesPerVial,
            'open_vial_hours'  => $openHours,
            'current_quantity' => $quantity,
            'expiration_date'  => now()->addMonths(6)->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);
    }

    private function administerDay0(Patient $patient, BiteIncident $incident, string $vaccineType, string $route = 'ID')
    {
        return $this->postJson('/api/vaccination-records', [
            'patient_id' => $patient->patient_id,
            'bite_id'    => $incident->bite_id,
            'doses'      => [
                [
                    'period'       => 'Day 0',
                    'date'         => now()->toDateString(),
                    'route'        => $route,
                    'vaccine_type' => $vaccineType,
                ],
            ],
        ])->assertCreated();
    }

    public function test_vial_shared_by_three_patients_links_same_vial_and_deducts_stock_once(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $batch = $this->createPresetAndBatch($clinic, 'Verorab', 3, 6, 'BATCH-555', 5);
        Sanctum::actingAs($nurse);

        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Ana', 'Cruz', 'BC-2026-0001');
        [$p2, $inc2] = $this->createPatientWithIncident($clinic, $nurse, 'Bea', 'Reyes', 'BC-2026-0002');
        [$p3, $inc3] = $this->createPatientWithIncident($clinic, $nurse, 'Cara', 'Santos', 'BC-2026-0003');
        [$p4, $inc4] = $this->createPatientWithIncident($clinic, $nurse, 'Dina', 'Lopez', 'BC-2026-0004');

        // Patient 1 opens the first vial -> deducts 1 from sealed stock (5 -> 4)
        $this->administerDay0($p1, $inc1, 'Verorab', 'IM');
        $this->assertSame(4, $batch->fresh()->current_quantity);

        $firstVial = VaccineVial::where('inventory_id', $batch->inventory_id)->firstOrFail();
        $this->assertNotSame($batch->batch_number, $firstVial->vial_code);
        $this->assertSame(1, $firstVial->administered_portions);
        $this->assertSame(2, $firstVial->available_portions);
        $this->assertSame("Vial {$firstVial->vial_code} · 1 of 3 portions administered · 2 available", $firstVial->buildSummaryText());

        // Patient 2 & 3 share the same open vial -> 0 additional sealed vials deducted
        $this->administerDay0($p2, $inc2, 'Verorab', 'IM');
        $this->administerDay0($p3, $inc3, 'Verorab', 'IM');

        $this->assertSame(4, $batch->fresh()->current_quantity);
        $firstVial->refresh();
        $this->assertSame(3, $firstVial->administered_portions);
        $this->assertSame(0, $firstVial->available_portions);
        $this->assertSame(VaccineVial::STATUS_DEPLETED, $firstVial->effective_status);
        $this->assertSame("Vial {$firstVial->vial_code} · 3 of 3 portions administered · 0 available", $firstVial->buildSummaryText());

        // Patient 4 opens a second distinct physical vial (4 -> 3)
        $this->administerDay0($p4, $inc4, 'Verorab', 'IM');
        $this->assertSame(3, $batch->fresh()->current_quantity);
        $this->assertSame(2, VaccineVial::where('inventory_id', $batch->inventory_id)->count());

        $secondVial = VaccineVial::where('inventory_id', $batch->inventory_id)->where('vial_id', '!=', $firstVial->vial_id)->firstOrFail();
        $this->assertNotSame($firstVial->vial_code, $secondVial->vial_code);

        // Verify administration list shows unique vial IDs and accurate portion summaries
        $listRes = $this->getJson('/api/vaccination-records/administrations');
        $listRes->assertStatus(200);
        $rows = collect($listRes->json('data'))->keyBy('patient_id');

        $this->assertSame($firstVial->vial_code, $rows[$p1->patient_id]['vial_code']);
        $this->assertSame(1, $rows[$p1->patient_id]['vial_portion_number']);
        $this->assertSame(2, $rows[$p2->patient_id]['vial_portion_number']);
        $this->assertSame(3, $rows[$p3->patient_id]['vial_portion_number']);
        $this->assertSame($secondVial->vial_code, $rows[$p4->patient_id]['vial_code']);
        $this->assertSame(1, $rows[$p4->patient_id]['vial_portion_number']);
    }

    public function test_vial_with_two_unused_portions_discarded_preserves_patient_record_and_logs_wastage(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $batch = $this->createPresetAndBatch($clinic, 'Verorab', 3, 6, 'BATCH-DISC', 5);
        Sanctum::actingAs($nurse);

        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Elena', 'Mendoza', 'BC-2026-0010');
        $this->administerDay0($p1, $inc1, 'Verorab', 'IM');
        $this->assertSame(4, $batch->fresh()->current_quantity);

        $vial = VaccineVial::firstOrFail();

        $disposeRes = $this->postJson("/api/inventory/vials/{$vial->vial_id}/dispose", [
            'portions_discarded' => 2,
            'reason'             => 'End of clinic session',
        ]);
        $disposeRes->assertStatus(200)
            ->assertJsonPath('vial.effective_status', 'disposed')
            ->assertJsonPath('vial.administered_portions', 1)
            ->assertJsonPath('vial.discarded_portions', 2)
            ->assertJsonPath('vial.available_portions', 0)
            ->assertJsonPath('vial.wastage_reason', 'End of clinic session')
            ->assertJsonPath('vial.summary_text', "Vial {$vial->vial_code} · 1 administered · 2 discarded · 0 available");

        // Disposing the remainder must not deduct another sealed vial
        $this->assertSame(4, $batch->fresh()->current_quantity);

        // Wastage recorded separately for reporting
        $this->assertDatabaseHas('vaccine_vial_wastages', [
            'vial_id'            => $vial->vial_id,
            'inventory_id'       => $batch->inventory_id,
            'portions_discarded' => 2,
            'reason'             => 'End of clinic session',
            'disposed_by'        => $nurse->id,
        ]);

        $wastageRes = $this->getJson('/api/inventory/wastages');
        $wastageRes->assertStatus(200)
            ->assertJsonPath('summary.total_portions_discarded', 2);

        // Patient's treatment record remains visible and unchanged
        $listRes = $this->getJson('/api/vaccination-records/administrations');
        $listRes->assertStatus(200);
        $row = collect($listRes->json('data'))->firstWhere('patient_id', $p1->patient_id);

        $this->assertSame('Day 0', $row['dose_label']);
        $this->assertSame('IM', $row['route']);
        $this->assertSame("Vial {$vial->vial_code} · 1 administered · 2 discarded · 0 available", $row['vial']['summary_text']);
        $this->assertSame('End of clinic session', $row['vial']['wastage_reason']);
    }

    public function test_expiry_before_disposal_blocks_further_use_without_confirming_physical_disposal(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $batch = $this->createPresetAndBatch($clinic, 'Verorab', 3, 6, 'BATCH-EXP', 5);
        Sanctum::actingAs($nurse);

        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Faye', 'Gomez', 'BC-2026-0020');
        [$p2, $inc2] = $this->createPatientWithIncident($clinic, $nurse, 'Gina', 'Torres', 'BC-2026-0021');

        $this->administerDay0($p1, $inc1, 'Verorab', 'ID');
        $this->assertSame(4, $batch->fresh()->current_quantity);

        $expiredVial = VaccineVial::firstOrFail();

        // Mark expired / unavailable BEFORE physical disposal
        $expireRes = $this->postJson("/api/inventory/vials/{$expiredVial->vial_id}/expire", [
            'reason' => 'Exceeded 6h room temperature window',
        ]);
        $expireRes->assertStatus(200)
            ->assertJsonPath('vial.effective_status', 'expired')
            ->assertJsonPath('vial.available_portions', 0)
            ->assertJsonPath('vial.discarded_portions', 0)
            ->assertJsonPath('vial.undisposed_portions', 2)
            ->assertJsonPath('vial.disposed_at', null);

        // Expiry must NOT create a wastage / physical disposal record
        $this->assertSame(0, VaccineVialWastage::count());
        $this->assertSame(4, $batch->fresh()->current_quantity);

        // Expiry must prevent further use: Patient 2 cannot use expiredVial and opens a new vial (4 -> 3)
        $this->administerDay0($p2, $inc2, 'Verorab', 'ID');
        $this->assertSame(3, $batch->fresh()->current_quantity);

        $p2Record = TreatmentRecord::where('patient_id', $p2->patient_id)->whereNotNull('vial_id')->firstOrFail();
        $this->assertNotSame($expiredVial->vial_id, $p2Record->vial_id);

        // Later, staff records physical disposal for the expired vial without deducting another sealed vial
        $this->postJson("/api/inventory/vials/{$expiredVial->vial_id}/dispose", [
            'portions_discarded' => 2,
            'reason'             => 'Discarded expired open vial',
        ])->assertStatus(200)
            ->assertJsonPath('vial.effective_status', 'disposed')
            ->assertJsonPath('vial.discarded_portions', 2);

        $this->assertSame(3, $batch->fresh()->current_quantity);
        $this->assertSame(1, VaccineVialWastage::count());
    }

    public function test_manual_open_vial_and_subsequent_uses_or_disposal_prevent_double_stock_deduction(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $batch = $this->createPresetAndBatch($clinic, 'Speeda', 4, 4, 'BATCH-NODBL', 5);
        Sanctum::actingAs($nurse);

        // 1. Manually opening a vial deducts 1 sealed vial once (5 -> 4)
        $this->postJson("/api/inventory/{$batch->inventory_id}/open-vial", [
            'open_vial_hours' => 4,
        ])->assertStatus(200);
        $this->assertSame(4, $batch->fresh()->current_quantity);

        $vial = VaccineVial::where('inventory_id', $batch->inventory_id)->firstOrFail();
        $this->assertSame(4, $vial->total_portions);
        $this->assertSame(0, $vial->administered_portions);

        // 2. Administering 2 portions from that opened vial deducts 0 more sealed vials
        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Hana', 'Lim', 'BC-2026-0030');
        [$p2, $inc2] = $this->createPatientWithIncident($clinic, $nurse, 'Iris', 'Tan', 'BC-2026-0031');

        $this->administerDay0($p1, $inc1, 'Speeda', 'ID');
        $this->administerDay0($p2, $inc2, 'Speeda', 'ID');
        $this->assertSame(4, $batch->fresh()->current_quantity);

        $vial->refresh();
        $this->assertSame(2, $vial->administered_portions);
        $this->assertSame(2, $vial->available_portions);

        // 3. Disposing the remaining 2 portions deducts 0 more sealed vials
        $this->postJson("/api/inventory/vials/{$vial->vial_id}/dispose", [
            'portions_discarded' => 2,
            'reason'             => '4-hour open vial window ended',
        ])->assertStatus(200);

        $this->assertSame(4, $batch->fresh()->current_quantity);

        // 4. Attempting a second disposal is rejected cleanly without touching stock
        $this->postJson("/api/inventory/vials/{$vial->vial_id}/dispose", [
            'portions_discarded' => 1,
            'reason'             => 'Duplicate disposal',
        ])->assertStatus(422);
        $this->assertSame(4, $batch->fresh()->current_quantity);
    }

    public function test_uses_each_vaccine_products_configured_capacity_and_use_by_hours(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $this->createPresetAndBatch($clinic, 'VaxA-5Dose', 5, 4, 'BATCH-A5', 3);
        $this->createPresetAndBatch($clinic, 'VaxB-2Dose', 2, 8, 'BATCH-B2', 3);
        Sanctum::actingAs($nurse);

        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Jane', 'Diaz', 'BC-2026-0040');
        [$p2, $inc2] = $this->createPatientWithIncident($clinic, $nurse, 'Kate', 'Vera', 'BC-2026-0041');

        $this->administerDay0($p1, $inc1, 'VaxA-5Dose', 'ID');
        $this->administerDay0($p2, $inc2, 'VaxB-2Dose', 'IM');

        $vialA = VaccineVial::where('vaccine_type', 'VaxA-5Dose')->firstOrFail();
        $vialB = VaccineVial::where('vaccine_type', 'VaxB-2Dose')->firstOrFail();

        $this->assertSame(5, $vialA->total_portions);
        $this->assertSame(4, $vialA->open_vial_hours);
        $this->assertSame(4, $vialA->available_portions);
        $this->assertSame(4, (int) round($vialA->opened_at->diffInHours($vialA->use_by_at)));

        $this->assertSame(2, $vialB->total_portions);
        $this->assertSame(8, $vialB->open_vial_hours);
        $this->assertSame(1, $vialB->available_portions);
        $this->assertSame(8, (int) round($vialB->opened_at->diffInHours($vialB->use_by_at)));
    }

    public function test_time_expired_vial_cannot_be_reused_and_still_requires_explicit_disposal(): void
    {
        [$clinic, $nurse] = $this->createClinicAndNurse();
        $batch = $this->createPresetAndBatch($clinic, 'Verorab', 3, 4, 'BATCH-TIMEEXP', 4);
        Sanctum::actingAs($nurse);

        [$p1, $inc1] = $this->createPatientWithIncident($clinic, $nurse, 'Luna', 'Cruz', 'BC-2026-0050');
        [$p2, $inc2] = $this->createPatientWithIncident($clinic, $nurse, 'Mona', 'Reyes', 'BC-2026-0051');

        $this->administerDay0($p1, $inc1, 'Verorab', 'ID');
        $vial = VaccineVial::firstOrFail();

        // Simulate time passing beyond the 4-hour use-by window
        $vial->update(['use_by_at' => now()->subMinutes(5)]);

        $detail = $this->getJson("/api/inventory/vials/{$vial->vial_id}")
            ->assertStatus(200)
            ->json('vial');

        $this->assertSame('expired', $detail['effective_status']);
        $this->assertSame(0, $detail['available_portions']);
        $this->assertSame(0, $detail['discarded_portions']);
        $this->assertSame(2, $detail['undisposed_portions']);

        // Next patient cannot use the time-expired vial -> opens a new vial (3 -> 2)
        $this->administerDay0($p2, $inc2, 'Verorab', 'ID');
        $this->assertSame(2, $batch->fresh()->current_quantity);

        $p2Record = TreatmentRecord::where('patient_id', $p2->patient_id)->whereNotNull('vial_id')->firstOrFail();
        $this->assertNotSame($vial->vial_id, $p2Record->vial_id);
    }
}
