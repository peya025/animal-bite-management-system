<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientDetails;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ManageNurseUnattendedSample extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sample:nurse-unattended {action=seed : seed or remove}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed or remove a sample unattended patient for testing the Check In to Nurse feature';

    const SAMPLE_PATIENT_NUMBER = 'TEST-NURSE-001';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $action = strtolower($this->argument('action'));

        if ($action === 'remove') {
            return $this->removeSample();
        }

        return $this->seedSample();
    }

    private function seedSample(): int
    {
        $clinic = Clinic::first();
        if (!$clinic) {
            $this->error('No clinic found in database.');
            return 1;
        }

        $clinicId = $clinic->id;
        $this->info("🏥 Target Clinic: {$clinic->name} (ID: {$clinicId})");

        $staffUser = User::where('clinic_id', $clinicId)->first();
        $userId = $staffUser?->id ?? 1;

        // Clean up previous sample if it exists
        $this->cleanPreviousSample($clinicId);

        $nowManila = Carbon::now('Asia/Manila');
        $regDate = $nowManila->copy()->subDays(4);
        $day0Date = $nowManila->copy()->subDays(4)->toDateString();
        $yesterdayDate = $nowManila->copy()->subDay()->toDateString();
        $todayDate = $nowManila->toDateString();

        // 1. Create Patient
        $patient = Patient::create([
            'clinic_id'           => $clinicId,
            'patient_number'      => self::SAMPLE_PATIENT_NUMBER,
            'first_name'          => 'Juan',
            'middle_name'         => 'Test',
            'last_name'           => 'Dela Cruz (Unattended)',
            'gender'              => 'Male',
            'age'                 => 30,
            'date_of_birth'       => '1996-03-15',
            'address'             => 'Zone 2, Tagoloan',
            'contact_number'      => '09171234567',
            'registration_source' => 'staff',
            'registered_by'       => $userId,
            'created_at'          => $regDate,
            'updated_at'          => $regDate,
        ]);

        PatientDetails::create([
            'clinic_id'      => $clinicId,
            'patient_id'     => $patient->patient_id,
            'fourps_member'  => 'no',
            'has_membership' => 'none',
        ]);

        // 2. Create Bite Incident (Triage Completed 4 days ago)
        $biteIncident = BiteIncident::create([
            'clinic_id'      => $clinicId,
            'patient_id'     => $patient->patient_id,
            'created_by'     => $userId,
            'case_number'    => 'CASE-UNATTENDED-001',
            'bite_date'      => $regDate->toDateString(),
            'bite_place'     => 'Tagoloan',
            'status'         => 'active',
            'episode_type'   => 'primary',
            'exposure_type'  => 'bite',
            'site_washed'    => 1,
            'confirmed_at'   => $regDate,
            'created_at'     => $regDate,
            'updated_at'     => $regDate,
        ]);

        // 3. Create Approved Treatment Plan (Full PEP)
        TreatmentPlan::create([
            'clinic_id'          => $clinicId,
            'patient_id'         => $patient->patient_id,
            'bite_id'            => $biteIncident->bite_id,
            'plan_type'          => 'full_pep',
            'status'             => 'approved',
            'ordered_dose_days'  => ['0', '3', '7'],
            'approved_at'        => $regDate,
            'created_at'         => $regDate,
        ]);

        // 4. Create Day 0 Dose Treatment Record (Administered 4 days ago)
        TreatmentRecord::create([
            'clinic_id'       => $clinicId,
            'patient_id'      => $patient->patient_id,
            'bite_id'         => $biteIncident->bite_id,
            'dose_number'     => 0,
            'scheduled_date'  => $day0Date,
            'treatment_date'  => $day0Date,
            'administered_at' => $regDate,
            'administered_by' => $userId,
            'status'          => 'completed',
            'protocol_type'   => 'standard',
            'route'           => 'ID',
            'created_at'      => $regDate,
        ]);

        // 5. Create Day 3 Follow-up Appointment (Scheduled for yesterday, missed)
        $appointment = Appointment::create([
            'clinic_id'        => $clinicId,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $biteIncident->bite_id,
            'created_by'       => $userId,
            'appointment_date' => $yesterdayDate,
            'scheduled_date'   => $yesterdayDate,
            'appointment_time' => '09:00:00',
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 3,
            'status'           => 'missed',
            'notes'            => 'Day 3 Dose',
            'created_at'       => $regDate,
        ]);

        // 6. Create Queue ticket from yesterday marked no_response (Auto-expired after 1 day)
        $yesterdayQueue = Queue::create([
            'clinic_id'          => $clinicId,
            'patient_id'         => $patient->patient_id,
            'appointment_id'     => $appointment->appointment_id,
            'bite_id'            => $biteIncident->bite_id,
            'queue_number'       => 77,
            'queue_date'         => $yesterdayDate,
            'visit_type'         => 'follow_up',
            'queue_category'     => 'regular',
            'priority'           => 'normal',
            'status'             => 'no_response',
            'call_count'         => 3,
            'checked_in_by'      => $userId,
            'checked_in_at'      => $nowManila->copy()->subDay(),
            'no_response_at'     => $nowManila->copy()->subDay(),
            'consultation_notes' => 'Auto-expired: patient did not complete visit before clinic closed',
            'created_at'         => $nowManila->copy()->subDay(),
        ]);

        QueueHistory::create([
            'queue_id'    => $yesterdayQueue->queue_id,
            'clinic_id'   => $clinicId,
            'patient_id'  => $patient->patient_id,
            'action'      => 'no_response',
            'from_status' => 'waiting',
            'to_status'   => 'no_response',
            'call_count'  => 3,
            'notes'       => 'Auto-expired: patient did not complete visit before clinic closed',
            'occurred_at' => $nowManila->copy()->subDay(),
        ]);

        // Clear patient list & queue cache
        Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
        Cache::forget("web:queue:clinic:{$clinicId}:date:{$yesterdayDate}");
        $tabs = ['all', 'today_queue', 'online', 'overdue', 'pre_registered'];
        foreach ($tabs as $tab) {
            for ($p = 1; $p <= 5; $p++) {
                Cache::forget("web:patients:list:clinic:{$clinicId}:tab:{$tab}:page:{$p}");
            }
        }

        $this->newLine();
        $this->info("✅ Sample unattended patient created successfully!");
        $this->table(
            ['Field', 'Value'],
            [
                ['Patient Name', "{$patient->first_name} {$patient->last_name}"],
                ['Patient Number', $patient->patient_number],
                ['Day 0 Dose', "Administered on {$day0Date} (Completed)"],
                ['Day 3 Appointment', "Scheduled for {$yesterdayDate} (Missed - >24h unattended)"],
                ['Yesterday Queue #', 'Queue #77 (Status: no_response / auto-expired)'],
                ['Today Active Queue', 'None (Eligible for Check In to Nurse)'],
            ]
        );
        $this->info("👉 You can now go to Registration > Patient List (/patients).");
        $this->info("👉 You will see the 'Check In to Nurse' button for Juan Dela Cruz (Unattended).");
        $this->info("👉 Click it to check in to Nurse queue and receive today's Queue Number.");
        $this->info("👉 To remove this sample patient later, run:");
        $this->comment("   php artisan sample:nurse-unattended remove");

        return 0;
    }

    private function removeSample(): int
    {
        $patients = Patient::where('patient_number', self::SAMPLE_PATIENT_NUMBER)->get();

        if ($patients->isEmpty()) {
            $this->warn('No sample patient found with number ' . self::SAMPLE_PATIENT_NUMBER);
            return 0;
        }

        foreach ($patients as $patient) {
            $clinicId = $patient->clinic_id;

            // Delete queue histories & queues
            $queueIds = Queue::where('patient_id', $patient->patient_id)->pluck('queue_id');
            QueueHistory::whereIn('queue_id', $queueIds)->delete();
            Queue::where('patient_id', $patient->patient_id)->forceDelete();

            // Delete treatment records
            TreatmentRecord::where('patient_id', $patient->patient_id)->forceDelete();

            // Delete appointments
            Appointment::where('patient_id', $patient->patient_id)->forceDelete();

            // Delete bite incidents & treatment plans
            $biteIds = BiteIncident::where('patient_id', $patient->patient_id)->pluck('bite_id');
            TreatmentPlan::whereIn('bite_id', $biteIds)->forceDelete();
            BiteIncident::where('patient_id', $patient->patient_id)->forceDelete();

            // Delete patient details
            PatientDetails::where('patient_id', $patient->patient_id)->forceDelete();

            // Delete patient
            $patient->forceDelete();

            // Clear cache
            $todayDate = Carbon::now('Asia/Manila')->toDateString();
            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
            $tabs = ['all', 'today_queue', 'online', 'overdue', 'pre_registered'];
            foreach ($tabs as $tab) {
                for ($p = 1; $p <= 5; $p++) {
                    Cache::forget("web:patients:list:clinic:{$clinicId}:tab:{$tab}:page:{$p}");
                }
            }

            $this->info("🗑️ Removed sample patient: {$patient->first_name} {$patient->last_name} (#{$patient->patient_number})");
        }

        $this->info('✅ Sample patient and all associated records removed cleanly.');
        return 0;
    }

    private function cleanPreviousSample(int $clinicId): void
    {
        $existing = Patient::where('clinic_id', $clinicId)->where('patient_number', self::SAMPLE_PATIENT_NUMBER)->first();
        if ($existing) {
            $this->removeSample();
        }
    }
}
