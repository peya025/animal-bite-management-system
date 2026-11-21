<?php
namespace Tests\Feature;

use App\Models\{BiteIncident, Clinic, Patient, TreatmentRecord, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BiteMapDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_details_are_read_only_and_isolated_to_the_selected_episode(): void
    {
        $clinic = Clinic::create(['name' => 'Map Test']);
        $user = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'triage', 'is_active' => true]);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'MAP-001', 'first_name' => 'Map', 'last_name' => 'Patient', 'gender' => 'female']);
        $attributes = ['created_by' => $user->id, 'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_date' => '2026-11-01', 'severity' => 'minor', 'animal_type' => 'dog', 'status' => 'active'];
        $selected = BiteIncident::create($attributes);
        $other = BiteIncident::create($attributes);
        $record = ['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'status' => 'completed'];
        TreatmentRecord::create($record + ['bite_id' => $selected->bite_id, 'diagnosis' => 'Selected assessment']);
        TreatmentRecord::create($record + ['bite_id' => $other->bite_id, 'diagnosis' => 'Other assessment']);
        TreatmentRecord::create($record + ['bite_id' => $other->bite_id, 'dose_number' => 0, 'vaccine_brand' => 'Other vaccine']);
        Sanctum::actingAs($user);
        $before = TreatmentRecord::count();
        $url = '/api/cases/'.$selected->bite_id.'/map-details';
        $this->getJson($url)->assertOk()->assertJsonPath('incident.bite_id', $selected->bite_id)
            ->assertJsonPath('patient.patient_id', $patient->patient_id)
            ->assertJsonCount(1, 'assessments')->assertJsonPath('assessments.0.diagnosis', 'Selected assessment')
            ->assertJsonCount(0, 'nurse_records')->assertJsonCount(0, 'schedules');
        $nurse = TreatmentRecord::create($record + ['bite_id' => $selected->bite_id, 'dose_number' => 0, 'vaccine_brand' => 'Selected vaccine', 'treatment_date' => '2026-11-01']);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'nurse_records')->assertJsonPath('nurse_records.0.vaccine_brand', 'Selected vaccine')->assertJsonCount(1, 'schedules');
        $nurse->delete();
        $selected->update(['status' => 'transferred_out', 'transferred_to_facility' => 'Referral Hospital']);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'assessments')->assertJsonCount(0, 'nurse_records');
        $selected->update(['status' => 'awaiting_assessment']);
        TreatmentRecord::where('bite_id', $selected->bite_id)->delete();
        $this->getJson($url)->assertOk()->assertJsonCount(0, 'assessments')->assertJsonCount(0, 'nurse_records');
        $this->assertSame($before - 1, TreatmentRecord::count());
        $this->postJson($url, ['diagnosis' => 'Changed'])->assertStatus(405);
        $this->putJson($url, ['diagnosis' => 'Changed'])->assertStatus(405);
        $this->deleteJson($url)->assertStatus(405);
    }

    public function test_only_authorized_clinic_staff_can_read_details(): void
    {
        $clinic = Clinic::create(['name' => 'Private Clinic']);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'MAP-002', 'first_name' => 'Private', 'last_name' => 'Patient', 'gender' => 'male']);
        $owner = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'triage', 'is_active' => true]);
        $incident = BiteIncident::create(['created_by' => $owner->id, 'clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_date' => '2026-11-01', 'severity' => 'minor', 'status' => 'active']);
        $url = '/api/cases/'.$incident->bite_id.'/map-details';
        $this->getJson($url)->assertUnauthorized();
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $user = User::factory()->create(['clinic_id' => $otherClinic->id, 'role' => 'triage', 'is_active' => true]);
        Sanctum::actingAs($user);
        $this->getJson($url)->assertNotFound();
        $user->clinic_id = $clinic->id;
        $user->role = 'unauthorized';
        Sanctum::actingAs($user);
        $this->getJson($url)->assertForbidden();
        $user->role = 'triage';
        $user->is_active = false;
        Sanctum::actingAs($user);
        $this->getJson($url)->assertForbidden();
    }
}
