<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicResource;
use Illuminate\Database\Seeder;

class ClinicResourceSeeder extends Seeder
{
    /**
     * Seed default "Learn more" resources for the demo clinic only.
     *
     * NOTE: Both URLs below are intentional https:// placeholders.
     * Replace the DOH placeholder URL via the Web Admin -> Clinic Setup -> Patient app resources
     * page (or here before seeding) after verifying the live DOH page address.
     */
    public function run(): void
    {
        $demoClinic = Clinic::query()->orderBy('id')->first();

        if (!$demoClinic) {
            return;
        }

        ClinicResource::updateOrCreate(
            [
                'clinic_id' => $demoClinic->id,
                'type' => 'video',
                'sort_order' => 0,
            ],
            [
                'title' => 'What to expect at your first ABTC visit',
                'subtitle' => 'Orientation video on wound washing, consultation, and vaccination schedule',
                'url' => 'https://example.com/replace-with-clinic-orientation-video',
                'thumbnail_url' => null,
                'duration_label' => '3:45',
                'is_active' => true,
            ]
        );

        // TODO: Replace this placeholder URL with the verified working DOH page address
        // after opening the official DOH page and copying the exact URL.
        ClinicResource::updateOrCreate(
            [
                'clinic_id' => $demoClinic->id,
                'type' => 'link',
                'sort_order' => 1,
            ],
            [
                'title' => 'DOH National Rabies Prevention and Control Program',
                'subtitle' => 'Official Department of Health guidance and advisories',
                'url' => 'https://example.com/replace-with-verified-doh-page-url',
                'thumbnail_url' => null,
                'duration_label' => null,
                'is_active' => true,
            ]
        );
    }
}
