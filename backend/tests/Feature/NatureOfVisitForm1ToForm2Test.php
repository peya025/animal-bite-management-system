<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NatureOfVisitForm1ToForm2Test extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createStaff(Clinic $clinic, string $roleSlug = 'registration'): User
    {
        $user = User::create([
            'name' => ucfirst($roleSlug) . ' Staff',
            'email' => $roleSlug . '@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => $roleSlug,
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => $roleSlug], [
            'name' => $roleSlug,
            'display_name' => ucfirst($roleSlug),
            'default_route' => '/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    public function test_form1_nature_of_visit_persists_appears_in_form2_and_cannot_be_overridden_by_doctor(): void
    {
        $clinic = $this->createClinic();
        $regStaff = $this->createStaff($clinic, 'registration');
        $doctor = $this->createStaff($clinic, 'triage');

        // 1. Registration Staff submits Form 1 with Nature of Visit = 'new_admission'
        Sanctum::actingAs($regStaff);
        $consultDate = Carbon::now('Asia/Manila')->toDateString();

        $createRes = $this->postJson('/api/patients', [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'gender' => 'female',
            'date_of_birth' => '1995-05-15',
            'address' => 'Tagoloan, Misamis Oriental',
            'mode_of_transaction' => 'walk-in',
            'reg_date_of_consultation' => $consultDate,
            'reg_consultation_time' => '09:30',
            'reg_blood_pressure' => '120/80',
            'reg_temperature' => '36.6',
            'reg_height' => '160',
            'reg_weight' => '55',
            'nature_of_visit' => 'new_admission',
        ]);

        $createRes->assertStatus(201);
        $patientId = $createRes->json('patient.patient_id');

        // Persisted in existing treatment_records.nature_of_visit column as scheduled Form 1 row
        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patientId,
            'status' => 'scheduled',
            'nature_of_visit' => 'new_admission',
        ]);

        // 2. Doctor opens Form 2 (GET /api/treatment-records/patient/{id}) and sees Form 1's selected value
        Sanctum::actingAs($doctor);
        $form2Load = $this->getJson("/api/treatment-records/patient/{$patientId}");
        $form2Load->assertStatus(200);
        $this->assertEquals('new_admission', $form2Load->json('latest_treatment.nature_of_visit'));
        $this->assertEquals('scheduled', $form2Load->json('latest_treatment.status'));

        // 3. Doctor submits Form 2 (even attempting to send a different nature_of_visit); Form 1's value must be preserved
        $biteId = $form2Load->json('active_bite_incident.bite_id');
        $form2Save = $this->postJson('/api/treatment-records', [
            'patient_id' => $patientId,
            'bite_id' => $biteId,
            'consultation_date' => $consultDate,
            'consultation_time' => '09:30',
            'nature_of_visit' => 'follow_up', // attempted override must be ignored
            'exposure_category' => 'II',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Dog bite on left leg',
            'diagnosis' => 'Animal bite Category II',
            'prescribed_vaccine_type' => 'Speeda',
            'medication_treatment' => 'Speeda',
        ]);

        $form2Save->assertStatus(201);
        $this->assertEquals('new_admission', $form2Save->json('treatment_record.nature_of_visit'));

        // Still a single consultation record (no duplicate) with Form 1's stored value
        $records = TreatmentRecord::where('patient_id', $patientId)->whereNull('dose_number')->get();
        $this->assertCount(1, $records);
        $this->assertEquals('new_admission', $records->first()->nature_of_visit);
        $this->assertEquals('completed', $records->first()->status);
    }
}
