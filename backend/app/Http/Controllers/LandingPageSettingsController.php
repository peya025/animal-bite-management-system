<?php

namespace App\Http\Controllers;

use App\Models\LandingPageSetting;
use Illuminate\Http\Request;

class LandingPageSettingsController extends Controller
{
    /**
     * Get landing page & footer settings (Public API)
     */
    public function getSettings(Request $request)
    {
        $settings = LandingPageSetting::first();

        if (!$settings) {
            $settings = $this->getDefaultSettings();
        }

        return response()->json($settings);
    }

    /**
     * Update landing page & footer settings (Developer / Admin API)
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'app_short_name' => 'nullable|string|max:50',
            'app_full_name' => 'nullable|string|max:255',
            'abtc_brand_title' => 'nullable|string|max:50',
            'abtc_description' => 'nullable|string',
            'developed_for_text' => 'nullable|string|max:255',
            'quick_links' => 'nullable|array',
            'support_links' => 'nullable|array',
            'system_info_links' => 'nullable|array',
            'operating_schedule' => 'nullable|string|max:255',
            'operating_hours' => 'nullable|string|max:255',
            'registration_window' => 'nullable|string|max:255',
            'requirement_notice' => 'nullable|string|max:255',
        ]);

        $settings = LandingPageSetting::first();

        if ($settings) {
            $settings->update($validated);
        } else {
            $settings = LandingPageSetting::create($validated);
        }

        return response()->json([
            'message' => 'Landing page settings updated successfully',
            'settings' => $settings,
        ]);
    }

    /**
     * Get default initial settings structure
     */
    private function getDefaultSettings()
    {
        return [
            'app_short_name' => 'TABTA',
            'app_full_name' => 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
            'abtc_brand_title' => 'ABTC',
            'abtc_description' => 'Animal Bite Management & Monitoring System',
            'developed_for_text' => 'Developed for Animal Bite Treatment Center',
            'quick_links' => [
                ['label' => 'About System', 'url' => '#about'],
                ['label' => 'Help Center', 'url' => '#help'],
                ['label' => 'Staff Login', 'url' => '#login'],
            ],
            'support_links' => [
                ['label' => 'Contact Support', 'url' => '#contact'],
                ['label' => 'User Guides', 'url' => '#guides'],
                ['label' => 'FAQs', 'url' => '#faqs'],
            ],
            'system_info_links' => [
                ['label' => 'Features', 'url' => '#features'],
                ['label' => 'Security', 'url' => '#security'],
                ['label' => 'Report Issue', 'url' => '#report'],
            ],
            'operating_schedule' => 'SCHEDULE: MONDAYS & THURSDAYS',
            'operating_hours' => '8:00 AM – 5:00 PM',
            'registration_window' => '8:00 AM – 10:00 AM (Come Early!)',
            'requirement_notice' => 'Please bring updated PhilHealth MDR',
        ];
    }
}
