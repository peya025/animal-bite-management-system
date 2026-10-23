<?php

namespace App\Services\Landing;

use App\Models\LandingPageSetting;

class LandingPageSettingsService
{
    /**
     * Get landing page settings or fall back to defaults.
     */
    public function getSettings(): LandingPageSetting|array
    {
        $settings = LandingPageSetting::first();

        if (!$settings) {
            return $this->getDefaultSettings();
        }

        return $settings;
    }

    /**
     * Update or create landing page settings.
     */
    public function updateSettings(array $data): LandingPageSetting
    {
        $settings = LandingPageSetting::first();

        if ($settings) {
            $settings->update($data);
            return $settings;
        }

        return LandingPageSetting::create($data);
    }

    /**
     * Get default initial settings structure.
     */
    public function getDefaultSettings(): array
    {
        return [
            'app_short_name'      => 'TABTA',
            'app_full_name'       => 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
            'abtc_brand_title'    => 'ABTC',
            'abtc_description'    => 'Animal Bite Management & Monitoring System',
            'developed_for_text'  => 'Developed for Animal Bite Treatment Center',
            'quick_links'         => [
                ['label' => 'About System', 'url' => '#about'],
                ['label' => 'Help Center', 'url' => '#help'],
                ['label' => 'Staff Login', 'url' => '#login'],
            ],
            'support_links'       => [
                ['label' => 'Contact Support', 'url' => '#contact'],
                ['label' => 'User Guides', 'url' => '#guides'],
                ['label' => 'FAQs', 'url' => '#faqs'],
            ],
            'system_info_links'   => [
                ['label' => 'Features', 'url' => '#features'],
                ['label' => 'Security', 'url' => '#security'],
                ['label' => 'Report Issue', 'url' => '#report'],
            ],
            'operating_schedule'  => 'SCHEDULE: MONDAYS & THURSDAYS',
            'operating_hours'     => '8:00 AM – 5:00 PM',
            'registration_window' => '8:00 AM – 10:00 AM (Come Early!)',
            'requirement_notice'  => 'Please bring updated PhilHealth MDR',
        ];
    }
}
