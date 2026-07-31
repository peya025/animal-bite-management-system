<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;

class DefaultClinicConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clinics = Clinic::all();

        foreach ($clinics as $clinic) {
            ClinicModuleConfig::updateOrCreate(
                ['clinic_id' => $clinic->id],
                [
                    'triage_module_enabled' => true,
                    'field_rules' => [
                        'bite_location' => 'required',
                        'exposure_category' => 'required',
                        'animal_status' => 'optional',
                        'philhealth_info' => 'optional',
                        'fourps_info' => 'optional',
                        'wound_washing' => 'optional',
                    ],
                ]
            );
        }
    }
}
