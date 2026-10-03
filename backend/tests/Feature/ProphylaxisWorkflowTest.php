<?php

namespace Tests\Feature;

use App\Models\{BiteIncident, Clinic, Patient, TreatmentPlan, TreatmentRecord, User, VaccineInventory, InventoryTransaction};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProphylaxisWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private BiteIncident $incident;
    private TreatmentRecord $consultation;
    private User $doctor;
    private User $nurse;
    private array $stock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 30)->setTime(12, 0));
        $clinic = Clinic::create(['name' => 'Prophylaxis test clinic']);
        $this->doctor = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'triage', 'is_active' => true]);
        $this->nurse = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'treatment', 'is_active' => true]);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'PX-1', 'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'male']);
        $this->incident = BiteIncident::create([
            'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id,
            'bite_date' => '2026-09-20', 'severity' => 'severe', 'animal_type' => 'dog',
            'status' => 'active', 'episode_type' => 'primary', 'episode_number' => 1,
            'confirmed_at' => now(), 'confirmed_by' => $this->doctor->id, 'created_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $this->incident->bite_id,
            'plan_type' => 'full_pep', 'status' => 'approved', 'ordered_dose_days' => [0, 3, 7],
            'decided_by' => $this->doctor->id, 'decided_at' => now(),
        ]);
        $this->consultation = TreatmentRecord::create([
            'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $this->incident->bite_id,
            'nature_of_visit' => 'new_consultation', 'consultation_date' => '2026-09-23',
            'chief_complaints' => 'Animal bite', 'status' => 'completed', 'prophylaxis_orders' => $this->orders(),
        ]);
        TreatmentRecord::create([
            'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $this->incident->bite_id,
            'dose_number' => 0, 'treatment_date' => '2026-09-23', 'status' => 'completed',
            'is_external' => true, 'external_facility_name' => 'Referral clinic',
        ]);
        foreach (['TT' => 'Tetanus Toxoid (TT)', 'ATS' => 'Anti-Tetanus Serum (ATS)', 'ERIG' => 'Equine Rabies Immunoglobulin (ERIG)'] as $medication => $name) {
            $this->stock[$medication] = VaccineInventory::create([
                'clinic_id' => $clinic->id, 'vaccine_type' => $name,
                'batch_number' => $medication.'-001', 'current_quantity' => 5,
                'expiration_date' => '2027-12-31', 'status' => 'active',
            ]);
        }
        Sanctum::actingAs($this->nurse);
    }

    private function orders(): array
    {
        return ['rig' => 'ERIG', 'rig_weight_kg' => '50', 'rig_indication' => 'category_iii',
            'tetanus_vaccine' => 'TT', 'tetanus_passive' => 'ATS',
            'tetanus_history' => 'unknown', 'notes' => 'ATS 1500 IU IM after product-specific review'];
    }

    private function administration(array $changes = []): array
    {
        return array_replace(['medication' => 'ERIG', 'date' => '2026-09-30',
            'inventory_id' => ($this->stock[$changes['medication'] ?? 'ERIG'] ?? $this->stock['ERIG'])->inventory_id,
            'inventory_units_used' => 1, 'route' => 'wound_infiltration', 'injection_site' => 'Left calf wounds',
            'dosage_ml' => '5', 'dose_iu' => '1000'], $changes);
    }

    private function submit(array $items)
    {
        return $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'exposure_category' => 'III', 'doses' => [], 'prophylaxis_administrations' => $items,
        ]);
    }

    public function test_day_seven_rig_can_be_recorded_without_another_vaccine_and_reloaded(): void
    {
        $this->submit([$this->administration()])->assertCreated();
        $this->assertDatabaseCount('treatment_records', 3);
        $this->assertSame(4, $this->stock['ERIG']->fresh()->current_quantity);
        $this->assertSame(1, InventoryTransaction::where('inventory_id', $this->stock['ERIG']->inventory_id)->where('transaction_type', 'used')->count());
        $this->getJson('/api/vaccination-records/patient/'.$this->incident->patient_id.'?bite_id='.$this->incident->bite_id)
            ->assertOk()->assertJsonPath('prophylaxis_records.0.medication_given', 'ERIG')
            ->assertJsonPath('prophylaxis_records.0.dose_iu', '1000.00');
        $this->getJson('/api/tagoloan-treatment-cards/patient/'.$this->incident->patient_id.'?bite_id='.$this->incident->bite_id)
            ->assertOk()->assertJsonPath('latest_consultation.prophylaxis_orders.rig', 'ERIG');
    }

    public function test_day_eight_rig_is_rejected_without_partial_writes(): void
    {
        TreatmentRecord::where('dose_number', 0)->update(['treatment_date' => '2026-09-22']);
        $this->submit([$this->administration()])->assertUnprocessable()->assertJsonValidationErrors('prophylaxis');
        $this->assertDatabaseCount('treatment_records', 2);
        $this->assertDatabaseCount('tagoloan_treatment_cards', 0);
    }

    public function test_rig_overdose_and_duplicate_are_rejected(): void
    {
        $this->submit([$this->administration(['dose_iu' => '2000.01'])])->assertUnprocessable();
        $this->submit([$this->administration(['dose_iu' => '2000'])])->assertCreated();
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 3);
    }

    public function test_only_the_three_requested_products_can_be_prescribed_or_administered(): void
    {
        $this->submit([$this->administration(['medication' => 'HRIG'])])->assertUnprocessable();
        $this->postJson('/api/treatment-records', ['prophylaxis_orders' => ['rig' => 'HRIG']])->assertForbidden();
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', ['prophylaxis_orders' => ['rig' => 'HRIG']])
            ->assertUnprocessable()->assertJsonValidationErrors('prophylaxis_orders.rig');
    }

    public function test_tt_and_ats_are_separate_prescribed_stock_deductions(): void
    {
        $this->submit([
            $this->administration(['medication' => 'TT', 'route' => 'IM', 'dose_iu' => null, 'dosage_ml' => '0.5']),
            $this->administration(['medication' => 'ATS', 'route' => 'IM', 'dose_iu' => '1500', 'dosage_ml' => '1']),
        ])->assertCreated();
        $this->assertDatabaseHas('treatment_records', ['medication_given' => 'TT', 'dose_number' => null, 'inventory_id' => $this->stock['TT']->inventory_id]);
        $this->assertDatabaseHas('treatment_records', ['medication_given' => 'ATS', 'dose_iu' => 1500, 'inventory_id' => $this->stock['ATS']->inventory_id]);
        $this->assertSame(4, $this->stock['TT']->fresh()->current_quantity);
        $this->assertSame(4, $this->stock['ATS']->fresh()->current_quantity);
    }

    public function test_missing_prescription_wrong_product_missing_batch_and_wrong_route_are_rejected(): void
    {
        $this->submit([$this->administration(['medication' => 'HRIG'])])->assertUnprocessable();
        $this->submit([$this->administration(['inventory_id' => null])])->assertUnprocessable();
        $this->submit([$this->administration(['route' => 'IM'])])->assertUnprocessable();
        $this->consultation->update(['prophylaxis_orders' => null]);
        $this->submit([$this->administration()])->assertUnprocessable();
    }

    public function test_booster_order_prevents_rig_and_nurse_cannot_prescribe(): void
    {
        TreatmentPlan::query()->update(['plan_type' => 'two_dose_booster']);
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->postJson('/api/treatment-records', ['prophylaxis_orders' => $this->orders()])->assertForbidden();
    }

    public function test_category_two_requires_documented_immunocompromised_indication(): void
    {
        $this->incident->update(['severity' => 'moderate']);
        $payload = ['patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'exposure_category' => 'II', 'doses' => [], 'prophylaxis_administrations' => [$this->administration()]];
        $this->postJson('/api/vaccination-records', $payload)->assertUnprocessable();
        $this->consultation->update(['prophylaxis_orders' => array_replace($this->orders(), ['rig_indication' => 'immunocompromised'])]);
        $this->postJson('/api/vaccination-records', $payload)->assertCreated();
    }

    public function test_form_two_persists_orders_and_exposes_them_to_nurse(): void
    {
        TreatmentRecord::where('dose_number', 0)->delete();
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'consultation_date' => '2026-09-30', 'nature_of_visit' => 'new_consultation',
            'chief_complaints' => 'Bite', 'consultation_types' => ['general'], 'prophylaxis_orders' => $this->orders(),
        ])->assertSuccessful();
        $this->getJson('/api/tagoloan-treatment-cards/patient/'.$this->incident->patient_id.'?bite_id='.$this->incident->bite_id)
            ->assertOk()->assertJsonPath('latest_consultation.prophylaxis_orders.tetanus_vaccine', 'TT');
    }

    public function test_legacy_checkbox_cannot_bypass_prescription_validation(): void
    {
        $this->postJson('/api/vaccination-records', ['patient_id' => $this->incident->patient_id,
            'bite_id' => $this->incident->bite_id, 'doses' => [], 'additional_meds' => ['erig' => true]])
            ->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 2);
    }

    public function test_future_dates_and_empty_submissions_are_rejected(): void
    {
        $this->submit([$this->administration(['date' => '2026-10-01'])])->assertUnprocessable();
        $this->submit([$this->administration(['date' => '2026-09-22'])])->assertUnprocessable();
        $this->submit([])->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 2);
    }

    public function test_voided_rig_can_be_replaced_but_live_historical_rig_cannot(): void
    {
        $legacy = TreatmentRecord::create([
            'clinic_id' => $this->incident->clinic_id, 'patient_id' => $this->incident->patient_id,
            'bite_id' => $this->incident->bite_id, 'dose_number' => 200,
            'treatment_date' => '2026-09-23', 'status' => 'completed',
        ]);
        $this->getJson('/api/vaccination-records/patient/'.$this->incident->patient_id.'?bite_id='.$this->incident->bite_id)
            ->assertOk()->assertJsonPath('prophylaxis_records.0.medication_given', 'ERIG');
        $this->submit([$this->administration()])->assertUnprocessable();
        $legacy->update(['voided_at' => now()]);
        $this->submit([$this->administration()])->assertCreated();
    }

    public function test_previously_immunized_patient_requires_the_documented_immune_exception(): void
    {
        $this->incident->update(['is_previously_vaccinated' => true]);
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->consultation->update(['prophylaxis_orders' => array_replace($this->orders(), ['rig_indication' => 'immunocompromised'])]);
        $this->submit([$this->administration()])->assertCreated();
    }

    public function test_no_rig_without_verified_first_vaccine(): void
    {
        TreatmentRecord::where('dose_number', 0)->delete();
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 1);
    }

    public function test_other_clinic_batch_is_neither_listed_nor_accepted(): void
    {
        $anotherClinic = Clinic::create(['name' => 'Another clinic']);
        $otherBatch = VaccineInventory::create([
            'clinic_id' => $anotherClinic->id, 'vaccine_type' => 'Equine Rabies Immunoglobulin (ERIG)',
            'batch_number' => 'OTHER-ERIG', 'current_quantity' => 3,
            'expiration_date' => '2027-12-31', 'status' => 'active',
        ]);
        $this->getJson('/api/inventory/prophylaxis-stock')->assertOk()
            ->assertDontSee('OTHER-ERIG');
        $this->submit([$this->administration(['inventory_id' => $otherBatch->inventory_id])])
            ->assertUnprocessable()->assertJsonValidationErrors('prophylaxis');
        $this->assertSame(3, $otherBatch->fresh()->current_quantity);
        $this->assertDatabaseCount('treatment_records', 2);

        $this->nurse->update(['clinic_id' => $anotherClinic->id]);
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 2);
    }

    public function test_stock_lookup_only_returns_three_supported_active_products_for_this_clinic(): void
    {
        VaccineInventory::create([
            'clinic_id' => $this->incident->clinic_id, 'vaccine_type' => 'Verorab',
            'batch_number' => 'ARV-001', 'current_quantity' => 20,
            'expiration_date' => '2027-12-31', 'status' => 'active',
        ]);
        VaccineInventory::create([
            'clinic_id' => $this->incident->clinic_id, 'vaccine_type' => 'Equine Rabies Immunoglobulin (ERIG)',
            'batch_number' => 'EXPIRED', 'current_quantity' => 9,
            'expiration_date' => '2026-09-01', 'status' => 'active',
        ]);
        $response = $this->getJson('/api/inventory/prophylaxis-stock')->assertOk();
        $this->assertCount(1, $response->json('stock.TT'));
        $this->assertCount(1, $response->json('stock.ATS'));
        $this->assertCount(1, $response->json('stock.ERIG'));
    }

    public function test_wrong_product_expired_batch_and_insufficient_stock_roll_back(): void
    {
        $this->submit([$this->administration(['inventory_id' => $this->stock['TT']->inventory_id])])->assertUnprocessable();
        $this->stock['ERIG']->update(['expiration_date' => '2026-09-01']);
        $this->submit([$this->administration()])->assertUnprocessable();
        $this->stock['ERIG']->update(['expiration_date' => '2027-12-31']);
        $this->submit([$this->administration(['inventory_units_used' => 6])])->assertUnprocessable();
        $this->assertDatabaseCount('treatment_records', 2);
        $this->assertSame(5, $this->stock['ERIG']->fresh()->current_quantity);
    }

    public function test_no_stock_cannot_be_documented_as_administered(): void
    {
        $this->stock['ERIG']->update(['current_quantity' => 0, 'status' => 'depleted']);
        $this->getJson('/api/inventory/prophylaxis-stock')->assertOk()->assertJsonCount(0, 'stock.ERIG');
        $this->submit([$this->administration()])->assertUnprocessable()->assertJsonValidationErrors('prophylaxis');
        $this->assertDatabaseCount('treatment_records', 2);
        $this->assertDatabaseCount('inventory_transactions', 0);
    }

    public function test_selected_non_fifo_batch_is_rejected_without_stock_loss(): void
    {
        $later = VaccineInventory::create([
            'clinic_id' => $this->incident->clinic_id,
            'vaccine_type' => $this->stock['ERIG']->vaccine_type, 'batch_number' => 'LATER',
            'current_quantity' => 3, 'expiration_date' => '2028-01-01', 'status' => 'active',
        ]);
        $this->submit([$this->administration(['inventory_id' => $later->inventory_id])])->assertUnprocessable();
        $this->assertSame(3, $later->fresh()->current_quantity);
        $this->assertSame(5, $this->stock['ERIG']->fresh()->current_quantity);
        $this->assertDatabaseCount('treatment_records', 2);
    }

    public function test_custom_tetanus_preset_brand_can_be_ordered_and_administered(): void
    {
        \App\Models\VaccineTypePreset::create([
            'clinic_id' => $this->incident->clinic_id,
            'vaccine_name' => 'tetanus',
            'category' => 'Tetanus & Toxoids',
            'is_multidose' => false,
            'doses_per_vial' => 1,
        ]);
        $batch = VaccineInventory::create([
            'clinic_id' => $this->incident->clinic_id,
            'vaccine_type' => 'tetanus',
            'batch_number' => 'TET-999',
            'current_quantity' => 10,
            'expiration_date' => '2028-01-01',
            'status' => 'active',
        ]);

        $res = $this->getJson('/api/inventory/prophylaxis-stock')->assertOk();
        $this->assertContains('tetanus', $res->json('tetanus_brands'));
        $this->assertCount(1, $res->json('stock.tetanus'));

        // Doctor prescribes 'tetanus'
        $this->consultation->update([
            'prophylaxis_orders' => [
                'tetanus_vaccine' => 'tetanus',
                'tetanus_last_dose' => '2025-01-01',
            ],
        ]);

        // Nurse administers 'tetanus'
        $this->submit([
            [
                'medication' => 'tetanus',
                'date' => '2026-09-30',
                'inventory_id' => $batch->inventory_id,
                'inventory_units_used' => 1,
                'route' => 'IM',
                'injection_site' => 'Right deltoid',
                'dosage_ml' => '0.5',
                'dose_iu' => null,
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('treatment_records', [
            'medication_given' => 'tetanus',
            'inventory_id' => $batch->inventory_id,
        ]);
        $this->assertSame(9, $batch->fresh()->current_quantity);
    }
}

