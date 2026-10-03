<?php

namespace Tests\Feature;

use App\Models\{BiteIncident, Clinic, Patient, TagoloanTreatmentCard, TreatmentRecord, User, VaccineInventory};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExposureCategoryOwnershipTest extends TestCase
{
    use RefreshDatabase;

    private User $doctor;
    private User $nurse;
    private BiteIncident $incident;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(10, 0));
        $clinic = Clinic::create(['name' => 'Category test clinic']);
        $this->doctor = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'triage', 'is_active' => true]);
        $this->nurse = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'treatment', 'is_active' => true]);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'CAT-1',
            'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'male']);
        $this->incident = BiteIncident::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id,
            'bite_date' => '2026-10-02', 'severity' => 'moderate', 'animal_type' => 'dog',
            'status' => 'active', 'episode_type' => 'primary', 'episode_number' => 1, 'created_by' => $this->doctor->id]);
        Sanctum::actingAs($this->doctor);
    }

    private function form2(array $changes = []): array
    {
        return array_replace(['patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'exposure_category' => 'III', 'nature_of_visit' => 'new_consultation', 'consultation_types' => ['injury'],
            'chief_complaints' => 'Animal bite', 'consultation_date' => '2026-10-03'], $changes);
    }

    private function card(string $category = 'II'): TagoloanTreatmentCard
    {
        return TagoloanTreatmentCard::create(['clinic_id' => $this->incident->clinic_id,
            'patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-02', 'exposure_category' => $category, 'created_by' => $this->nurse->id]);
    }

    private function assertFormsShow(string $category): void
    {
        $patient = $this->incident->patient_id;
        $bite = $this->incident->bite_id;
        $this->getJson("/api/treatment-records/patient/{$patient}?bite_id={$bite}")
            ->assertOk()->assertJsonPath('exposure_category', $category);
        $this->getJson("/api/tagoloan-treatment-cards/patient/{$patient}?bite_id={$bite}")
            ->assertOk()->assertJsonPath('bite_incident.exposure_category', $category)
            ->assertJsonPath('existing_card.exposure_category', $category);
        $this->getJson("/api/vaccination-records/patient/{$patient}?bite_id={$bite}")
            ->assertOk()->assertJsonPath('tagoloan_card.exposure_category', $category);
    }

    public function test_form_two_saves_and_updates_all_categories_without_stale_card_values(): void
    {
        $card = $this->card();
        foreach (['III' => 'severe', 'I' => 'minor', 'II' => 'moderate'] as $category => $severity) {
            $this->postJson('/api/treatment-records', $this->form2(['exposure_category' => $category]))->assertCreated();
            $this->assertSame($severity, $this->incident->fresh()->severity);
            $this->assertFormsShow($category);
        }
        $this->assertSame('II', $card->fresh()->getRawOriginal('exposure_category'));
        $this->assertDatabaseCount('bite_incidents', 1);
        $this->assertDatabaseCount('tagoloan_treatment_cards', 1);
    }

    public function test_form_three_card_cannot_overwrite_category_but_still_saves_other_fields(): void
    {
        $this->postJson('/api/treatment-records', $this->form2())->assertCreated();
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/tagoloan-treatment-cards', [
            'patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-03', 'exposure_category' => 'I', 'mode_of_exposure' => 'scratch_abrasion',
        ])->assertOk();
        $this->assertSame('severe', $this->incident->fresh()->severity);
        $this->assertSame('scratch_abrasion', $this->incident->fresh()->exposure_mode);
        $this->assertFormsShow('III');
    }

    public function test_vaccine_save_ignores_category_and_preserves_post_treatment_lock(): void
    {
        $this->postJson('/api/treatment-records', $this->form2())->assertCreated();
        VaccineInventory::create(['clinic_id' => $this->incident->clinic_id, 'vaccine_type' => 'Speeda',
            'batch_number' => 'CAT-01', 'current_quantity' => 10, 'expiration_date' => '2027-12-31',
            'status' => 'active', 'open_vial_status' => 'unopened']);
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->incident->patient_id, 'bite_id' => $this->incident->bite_id,
            'exposure_category' => 'I', 'doses' => [['period' => 'Day 0', 'date' => '2026-10-03', 'route' => 'ID', 'vaccine_type' => 'Speeda']],
        ])->assertCreated();
        $this->assertFormsShow('III');
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', $this->form2(['exposure_category' => 'II']))
            ->assertUnprocessable()->assertJsonPath('locked', true);
        $this->assertSame('severe', $this->incident->fresh()->severity);
        $this->assertSame(1, TreatmentRecord::where('bite_id', $this->incident->bite_id)->where('dose_number', 0)->where('status', 'completed')->count());
    }

    public function test_category_validation_and_authorization(): void
    {
        foreach (['IV', '', null] as $invalid) {
            $this->postJson('/api/treatment-records', $this->form2(['exposure_category' => $invalid]))
                ->assertUnprocessable()->assertJsonValidationErrors('exposure_category');
        }
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/treatment-records', $this->form2())->assertForbidden();
        $this->assertSame('moderate', $this->incident->fresh()->severity);
    }

    public function test_existing_records_and_older_clients_do_not_lose_category(): void
    {
        $this->card();
        $this->assertFormsShow('II');
        $payload = $this->form2();
        unset($payload['exposure_category']);
        $this->postJson('/api/treatment-records', $payload)->assertCreated();
        $this->assertFormsShow('II');
        $this->assertSame('moderate', $this->incident->fresh()->severity);
    }

    public function test_legacy_card_only_category_remains_visible_and_unchanged_on_read(): void
    {
        $this->incident->update(['severity' => 'unassessed']);
        $card = $this->card('I');
        $this->assertFormsShow('I');
        $this->assertSame('unassessed', $this->incident->fresh()->severity);
        $this->assertSame('I', $card->fresh()->getRawOriginal('exposure_category'));
    }

    public function test_category_is_scoped_to_patient_episode_and_clinic(): void
    {
        $other = $this->incident->replicate();
        $other->case_number = 'OTHER';
        $other->episode_number = 2;
        $other->save();
        $this->postJson('/api/treatment-records', $this->form2())->assertCreated();
        $this->assertSame('moderate', $other->fresh()->severity);
        $patient = Patient::create(['clinic_id' => $this->incident->clinic_id, 'patient_number' => 'OTHER',
            'first_name' => 'Other', 'last_name' => 'Patient', 'gender' => 'female']);
        $this->postJson('/api/treatment-records', $this->form2(['patient_id' => $patient->patient_id]))->assertUnprocessable();
        $foreignClinic = Clinic::create(['name' => 'Other clinic']);
        Sanctum::actingAs(User::factory()->create(['clinic_id' => $foreignClinic->id, 'role' => 'triage', 'is_active' => true]));
        $this->postJson('/api/treatment-records', $this->form2())->assertUnprocessable();
        $this->assertSame('severe', $this->incident->fresh()->severity);
    }

    public function test_reports_and_filters_use_updated_category_over_legacy_card(): void
    {
        $card = $this->card('I');
        $this->postJson('/api/treatment-records', $this->form2())->assertCreated();
        $this->getJson('/api/reports/exposure-registry?from=2026-10-01&to=2026-10-31&category=III')
            ->assertOk()->assertJsonPath('totals.cat_3', 1)->assertJsonPath('totals.cat_1', 0);
        $this->getJson('/api/reports/exposure-registry?from=2026-10-01&to=2026-10-31&category=I')
            ->assertOk()->assertJsonPath('totals.total', 0);
        $this->assertSame('I', $card->fresh()->getRawOriginal('exposure_category'));
    }
}
