<?php
namespace Tests\Feature;
use App\Models\{BiteIncident, Clinic, Patient, User};
use App\Services\Clinical\PatientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationAnimalTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_saves_species_before_assessment_and_preserves_it_across_statuses(): void
    {
        $clinic = Clinic::create(['name' => 'Animal Test']);
        $user = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'registration', 'is_active' => true]);
        Sanctum::actingAs($user);
        $this->mock(\App\Services\GeocodingService::class, function ($mock) {
            $mock->shouldReceive('getCoordinates')->andReturn(['latitude' => 8.54, 'longitude' => 124.75, 'source' => 'test']);
        });
        foreach (['dog', 'cat', 'other'] as $species) {
            $payload = ['first_name' => $species, 'last_name' => 'AnimalTest', 'gender' => 'female', 'animal_type' => $species,
                'animal_status' => 'owned', 'animal_available' => 'no', 'animal_condition' => 'healthy',
                'reg_date_of_consultation' => now()->toDateString()];
            $this->postJson('/api/patients', $payload)->assertSuccessful();
            $patient = Patient::where('first_name', $species)->firstOrFail();
            $incident = $patient->biteIncidents()->firstOrFail();
            $this->assertSame($species, $incident->animal_type);
            $this->assertFalse($incident->animal_available);
            $this->assertSame('healthy', $incident->animal_observation_status);
            foreach (['completed', 'transferred_out', 'active'] as $status) {
                $incident->update(['status' => $status, 'severity' => 'minor', 'bite_place' => 'Poblacion, Tagoloan']);
                $this->assertSame($species, $incident->fresh()->animal_type);
                $this->getJson('/api/cases/'.$incident->bite_id.'/map-details')->assertOk()->assertJsonPath('incident.animal_type', $species);
                $map = $this->getJson('/api/cases/map-data')->assertOk()->json('cases');
                $this->assertSame($species, collect($map)->firstWhere('bite_id', $incident->bite_id)['animal_type']);
            }
        }
        $this->getJson('/api/cases/statistics')->assertOk()->assertJsonPath('by_animal_type.cat', 1)->assertJsonPath('by_animal_type.dog', 1)->assertJsonPath('total_cases', 3);
    }

    public function test_edits_are_incident_scoped_and_blanks_do_not_erase_answers(): void
    {
        $clinic = Clinic::create(['name' => 'Animal Edit']);
        $user = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'registration', 'is_active' => true]);
        Sanctum::actingAs($user);
        $payload = ['first_name' => 'Edit', 'last_name' => 'Animal', 'gender' => 'male', 'animal_type' => 'dog'];
        $patient = app(PatientService::class)->storePatient($clinic->id, $payload, $user, $payload);
        $first = $patient->biteIncidents()->firstOrFail();
        $second = $first->replicate(['case_number']); $second->animal_type = 'cat'; $second->save();
        $this->putJson('/api/patients/'.$patient->patient_id, ['animal_bite_id' => $second->bite_id, 'animal_type' => 'other'])->assertSuccessful();
        $this->assertSame('dog', $first->fresh()->animal_type);
        $this->assertSame('other', $second->fresh()->animal_type);
        $this->putJson('/api/patients/'.$patient->patient_id, ['animal_bite_id' => $first->bite_id, 'animal_type' => '', 'contact_number' => '09123456789'])->assertSuccessful();
        $this->assertSame('dog', $first->fresh()->animal_type);
        $this->putJson('/api/patients/'.$patient->patient_id, ['animal_bite_id' => $first->bite_id, 'animal_available' => 'unknown'])->assertSuccessful();
        $this->assertNull($first->fresh()->animal_available);
        $this->assertTrue($first->fresh()->animal_available_answered);
        $otherPatient = Patient::create(['clinic_id' => $clinic->id, 'first_name' => 'Other', 'last_name' => 'Patient', 'gender' => 'male']);
        $this->putJson('/api/patients/'.$otherPatient->patient_id, ['animal_bite_id' => $first->bite_id, 'animal_type' => 'cat'])->assertUnprocessable();
        $this->postJson('/api/patients', $payload + ['animal_available' => 'invalid'])->assertUnprocessable();
    }
}
