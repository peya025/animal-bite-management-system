<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicSchedule;
use Illuminate\Database\Seeder;

class ClinicScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clinics = Clinic::all();

        foreach ($clinics as $clinic) {
            // Seed weekly recurring schedule if none exist
            if ($clinic->schedules()->count() === 0) {
                for ($day = 0; $day <= 6; $day++) {
                    // Mon(1) to Fri(5) are open; Sun(0) and Sat(6) are closed
                    $isOpen = in_array($day, [1, 2, 3, 4, 5]);

                    ClinicSchedule::create([
                        'clinic_id' => $clinic->id,
                        'day_of_week' => $day,
                        'is_open' => $isOpen,
                        'open_time' => $isOpen ? '08:00:00' : null,
                        'close_time' => $isOpen ? '17:00:00' : null,
                        'slot_interval_minutes' => 30,
                        'max_patients_per_slot' => 10,
                    ]);
                }
            }

            // Set default drift and urgent policies if not set
            if (empty($clinic->schedule_drift_policy)) {
                $clinic->update([
                    'schedule_drift_policy' => 'forward_only',
                    'backward_max_days' => 1,
                    'urgent_access_policy' => 'walk_ins_accepted_outside_hours',
                ]);
            }
        }
    }
}
