<?php

namespace Tests\Feature;

use App\Models\{BiteIncident, BiteIncidentIntake, Clinic, Patient, PatientAccount, Queue, TagoloanTreatmentCard, TreatmentPlan, TreatmentRecord, User, VaccineInventory};
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Form2PlaceOfExposureTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $doctor;
    private User $nurse;
    private Patient $patient;
    private BiteIncident $incident;
    private Queue $queue;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::create(2026, 11, 7, 9, 30));

        $this->clinic = Clinic::create(['name' => 'Tagoloan RHU ABTC']);
        $this->doctor = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);
        $this->nurse = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-2026-001',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
        ]);
        $this->incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_date' => '2026-11-06',
            'severity' => 'moderate',
            'exposure_category' => 'II',
            'animal_type' => 'dog',
            'status' => 'active',
            'episode_type' => 'primary',
            'episode_number' => 1,
            'created_by' => $this->doctor->id,
        ]);
        $this->queue = Queue::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_number' => 1,
            'queue_date' => '2026-11-07',
            'visit_type' => 'new_case',
            'status' => 'in_consultation',
            'checked_in_by' => $this->doctor->id,
        ]);

        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Purified Chick Embryo Cell Vaccine (PCECV)',
            'brand_name' => 'Rabipur',
            'batch_number' => 'RAB-2026-01',
            'current_quantity' => 50,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
    }

    public function test_doctor_submits_category_2_saves_place_of_exposure_and_queue_advances_to_nurse(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'II',
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Dog scratch on right forearm',
            'consultation_date' => '2026-11-07',
            'treatment_plan' => 'full_pep',
            'prescribed_vaccine_type' => 'Rabipur',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Incident bite_place updated from Form 2
        $this->incident->refresh();
        $this->assertSame('Poblacion, Tagoloan', $this->incident->bite_place);
        $this->assertSame('active', $this->incident->status);

        // 2. Queue ticket routed to nurse station (waiting)
        $this->queue->refresh();
        $this->assertSame('waiting', $this->queue->status);
    }

    public function test_doctor_completes_category_1_saves_place_of_exposure_and_bite_cases_summary_shows_location(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'place_of_exposure' => 'Baluarte, Tagoloan',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Intact skin contact with dog saliva',
            'consultation_date' => '2026-11-07',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Incident completed and bite_place persisted
        $this->incident->refresh();
        $this->assertSame('Baluarte, Tagoloan', $this->incident->bite_place);
        $this->assertSame('completed', $this->incident->status);

        // 2. Queue completed directly (does not go to nurse Form 3)
        $this->queue->refresh();
        $this->assertSame('completed', $this->queue->status);

        // 3. Bite Cases Location Risk Summary groups under actual location, not 'Unknown'
        $summaryResponse = $this->getJson('/api/cases/location-summary');
        $summaryResponse->assertOk();

        $locations = $summaryResponse->json('locations') ?? [];
        $this->assertNotEmpty($locations);

        $baluarteGroup = collect($locations)->firstWhere('location', 'Baluarte, Tagoloan');
        $this->assertNotNull($baluarteGroup, 'Expected Baluarte, Tagoloan group in Bite Cases Summary');
        $this->assertEquals(1, $baluarteGroup['total_cases']);

        $unknownGroup = collect($locations)->firstWhere('location', 'Unknown');
        $this->assertNull($unknownGroup, 'Did not expect Unknown location group when place is recorded');

        // 4. Bite Map data retrieves the incident
        $mapResponse = $this->getJson('/api/cases/map-data');
        $mapResponse->assertOk();
        $mapData = $mapResponse->json('data') ?? $mapResponse->json();
        $this->assertNotEmpty($mapData);
    }

    public function test_doctor_completes_transfer_out_saves_place_of_exposure_and_location_summary_groups_by_location(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'III',
            'place_of_exposure' => 'Casinglot, Tagoloan',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Severe deep transdermal laceration requiring hospital surgery',
            'diagnosis' => 'Category III transdermal bite - for ER surgery',
            'is_referral' => true,
            'complete_referral' => true,
            'transferred_to_facility' => 'Northern Mindanao Medical Center (NMMC)',
            'transfer_reason' => 'Requires surgical exploration and wound debridement',
            'transfer_date' => '2026-11-07',
            'consultation_date' => '2026-11-07',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Incident status is transferred_out and bite_place is persisted
        $this->incident->refresh();
        $this->assertSame('Casinglot, Tagoloan', $this->incident->bite_place);
        $this->assertSame('transferred_out', $this->incident->status);
        $this->assertSame('Northern Mindanao Medical Center (NMMC)', $this->incident->transferred_to_facility);

        // 2. Queue completed directly
        $this->queue->refresh();
        $this->assertSame('completed', $this->queue->status);

        // 3. Location summary includes the transferred_out case under Casinglot, Tagoloan
        $summaryResponse = $this->getJson('/api/cases/location-summary');
        $summaryResponse->assertOk();

        $locations = $summaryResponse->json('locations') ?? [];
        $casinglotGroup = collect($locations)->firstWhere('location', 'Casinglot, Tagoloan');
        $this->assertNotNull($casinglotGroup, 'Expected Casinglot, Tagoloan in summary');
        $this->assertEquals(1, $casinglotGroup['total_cases']);

        // 4. Map data includes transferred_out case
        $mapResponse = $this->getJson('/api/cases/map-data');
        $mapResponse->assertOk();
    }

    public function test_form2_prefills_saved_location_in_patient_treatment_details(): void
    {
        Sanctum::actingAs($this->doctor);

        $this->incident->update(['bite_place' => 'Santa Ana, Tagoloan']);

        $response = $this->getJson("/api/treatment-records/patient/{$this->patient->patient_id}?bite_id={$this->incident->bite_id}");
        $response->assertOk();

        $data = $response->json('data') ?? $response->json();
        $this->assertSame('Santa Ana, Tagoloan', $data['place_of_exposure'] ?? null);
    }

    public function test_subsequent_form2_submission_updates_incident_and_intake_place(): void
    {
        Sanctum::actingAs($this->doctor);

        $account = PatientAccount::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@patient.test',
            'phone' => '09171234567',
            'password' => bcrypt('password123'),
        ]);

        $intake = BiteIncidentIntake::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'patient_account_id' => $account->id,
            'bite_id' => $this->incident->bite_id,
            'bite_date' => '2026-11-06',
            'bite_place' => 'Old Intake Location',
            'site_washed' => true,
            'exposure_type' => 'bite',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'status' => 'reviewed',
        ]);
        $this->incident->update(['bite_place' => 'Old Incident Location']);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'II',
            'place_of_exposure' => 'Zone 2, Sta. Ines, Tagoloan',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Dog bite on calf',
            'consultation_date' => '2026-11-07',
            'treatment_plan' => 'full_pep',
            'prescribed_vaccine_type' => 'Rabipur',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        $this->incident->refresh();
        $this->assertSame('Zone 2, Sta. Ines, Tagoloan', $this->incident->bite_place);

        $intake->refresh();
        $this->assertSame('Zone 2, Sta. Ines, Tagoloan', $intake->bite_place);
    }
}
