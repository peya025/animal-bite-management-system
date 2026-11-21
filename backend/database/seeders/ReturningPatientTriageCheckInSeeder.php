<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ReturningPatientTriageCheckInSeeder extends Seeder
{
    /**
     * Seeds sample returning patients who were registered/scheduled previously
     * but did not proceed to the Triage Doctor and return on a later date.
     *
     * Usage: php artisan db:seed --class=ReturningPatientTriageCheckInSeeder
     */
    public function run(): void
    {
        $clinic = Clinic::first() ?? Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
            'is_setup_complete' => true,
        ]);

        $registrationStaff = User::where('role', 'registration')->first()
            ?? User::where('clinic_id', $clinic->id)->first();

        $staffId = $registrationStaff?->id ?? 1;
        $yesterday = Carbon::yesterday();
        $twoDaysAgo = Carbon::now()->subDays(2);
        $threeDaysAgo = Carbon::now()->subDays(3);

        // ─────────────────────────────────────────────────────────────
        // Sample Patient 1: Walk-in registered yesterday with vitals, missed triage
        // ─────────────────────────────────────────────────────────────
        $patient1 = Patient::firstOrCreate(
            ['first_name' => 'Lucas Gabriel', 'last_name' => 'Mendoza', 'clinic_id' => $clinic->id],
            [
                'gender'              => 'male',
                'age'                 => 27,
                'date_of_birth'       => '1999-04-12',
                'contact_number'      => '09171112233',
                'address'             => 'Poblacion, Tagoloan, Misamis Oriental',
                'emergency_contact_name' => 'Elena Mendoza',
                'emergency_contact_number' => '09171112234',
                'registered_by'       => $staffId,
                'registration_source' => 'staff',
            ]
        );
        $patient1->timestamps = false;
        $patient1->created_at = $yesterday->copy()->setHour(9)->setMinute(30);
        $patient1->updated_at = $yesterday->copy()->setHour(9)->setMinute(30);
        $patient1->save();

        // Stub bite incident awaiting doctor assessment
        BiteIncident::firstOrCreate(
            ['patient_id' => $patient1->patient_id, 'clinic_id' => $clinic->id],
            [
                'episode_number' => 1,
                'episode_type'   => 'pending_assessment',
                'status'         => 'awaiting_assessment',
                'exposure_type'  => 'unassessed',
                'severity'       => 'unassessed',
                'bite_date'      => $yesterday->toDateString(),
                'remarks'        => 'Episode created during registration. Exposure details await Doctor assessment.',
                'created_by'     => $staffId,
            ]
        );

        // Stub treatment record with vitals recorded at registration
        TreatmentRecord::firstOrCreate(
            ['patient_id' => $patient1->patient_id, 'clinic_id' => $clinic->id],
            [
                'dose_number'         => null,
                'status'              => 'scheduled',
                'consultation_date'   => $yesterday->toDateString(),
                'treatment_date'      => $yesterday->toDateString(),
                'consultation_time'   => '09:30',
                'blood_pressure'      => '120/80',
                'temperature'         => '36.6',
                'weight'              => '65',
                'height'              => '170',
                'mode_of_transaction' => 'walk-in',
                'administered_by'     => $staffId,
            ]
        );

        // Previous day queue ticket that expired because patient did not see doctor
        Queue::firstOrCreate(
            [
                'clinic_id'   => $clinic->id,
                'patient_id'  => $patient1->patient_id,
                'queue_date'  => $yesterday->toDateString(),
            ],
            [
                'queue_number'   => 15,
                'visit_type'     => 'new_case',
                'priority'       => 'normal',
                'queue_category' => 'regular',
                'status'         => 'no_response',
                'checked_in_at'  => $yesterday->copy()->setHour(9)->setMinute(30),
                'no_response_at' => $yesterday->copy()->setHour(17)->setMinute(0),
                'checked_in_by'  => $staffId,
                'check_in_notes' => 'Auto-expired: patient did not complete visit before clinic closed',
            ]
        );

        // ─────────────────────────────────────────────────────────────
        // Sample Patient 2: Consultation appointment 2 days ago, missed triage
        // ─────────────────────────────────────────────────────────────
        $patient2 = Patient::firstOrCreate(
            ['first_name' => 'Sophia Beatrice', 'last_name' => 'Ramos', 'clinic_id' => $clinic->id],
            [
                'gender'              => 'female',
                'age'                 => 22,
                'date_of_birth'       => '2004-08-20',
                'contact_number'      => '09182223344',
                'address'             => 'Sta. Ana, Tagoloan, Misamis Oriental',
                'emergency_contact_name' => 'Roberto Ramos',
                'emergency_contact_number' => '09182223345',
                'registered_by'       => $staffId,
                'registration_source' => 'staff',
            ]
        );
        $patient2->timestamps = false;
        $patient2->created_at = $twoDaysAgo->copy()->setHour(10)->setMinute(15);
        $patient2->updated_at = $twoDaysAgo->copy()->setHour(10)->setMinute(15);
        $patient2->save();

        Appointment::firstOrCreate(
            ['patient_id' => $patient2->patient_id, 'clinic_id' => $clinic->id],
            [
                'appointment_type' => 'consultation',
                'appointment_date' => $twoDaysAgo->toDateString(),
                'scheduled_date'   => $twoDaysAgo->copy()->setHour(10)->setMinute(30),
                'status'           => 'missed',
                'notes'            => 'Initial Doctor Triage consultation appointment',
                'created_by'       => $staffId,
            ]
        );

        // ─────────────────────────────────────────────────────────────
        // Sample Patient 3: Walk-in registered 3 days ago without vitals, missed triage
        // ─────────────────────────────────────────────────────────────
        $patient3 = Patient::firstOrCreate(
            ['first_name' => 'Mateo Alonzo', 'last_name' => 'Cruz', 'clinic_id' => $clinic->id],
            [
                'gender'              => 'male',
                'age'                 => 35,
                'date_of_birth'       => '1991-11-05',
                'contact_number'      => '09193334455',
                'address'             => 'Baluarte, Tagoloan, Misamis Oriental',
                'emergency_contact_name' => 'Carmela Cruz',
                'emergency_contact_number' => '09193334456',
                'registered_by'       => $staffId,
                'registration_source' => 'staff',
            ]
        );
        $patient3->timestamps = false;
        $patient3->created_at = $threeDaysAgo->copy()->setHour(14)->setMinute(0);
        $patient3->updated_at = $threeDaysAgo->copy()->setHour(14)->setMinute(0);
        $patient3->save();

        $this->command->info('✅ Successfully seeded sample returning patients awaiting triage:');
        $this->command->info("   1. {$patient1->patient_number} - Lucas Gabriel Mendoza (registered yesterday, awaiting triage)");
        $this->command->info("   2. {$patient2->patient_number} - Sophia Beatrice Ramos (missed triage appointment from 2 days ago)");
        $this->command->info("   3. {$patient3->patient_number} - Mateo Alonzo Cruz (registered 3 days ago, awaiting triage)");
        $this->command->info('👉 All 3 patients will display the green "Check In" button in Patient Registration.');
    }
}
