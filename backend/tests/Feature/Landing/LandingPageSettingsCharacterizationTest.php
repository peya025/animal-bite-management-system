<?php

namespace Tests\Feature\Landing;

use App\Models\Clinic;
use App\Models\LandingPageSetting;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandingPageSettingsCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $developer;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

        $roleDev = Role::firstOrCreate(['slug' => 'developer'], [
            'name'          => 'developer',
            'display_name'  => 'System Developer',
            'default_route' => '/developer',
        ]);

        $roleNurse = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name'          => 'intake_nurse',
            'display_name'  => 'Intake Nurse',
            'default_route' => '/queue',
        ]);

        $this->developer = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dev User',
            'email'     => 'dev@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'developer',
            'is_active' => true,
        ]);
        $this->developer->roles()->attach($roleDev->id, ['assigned_at' => now()]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse Joy',
            'email'     => 'nurse@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $this->nurse->roles()->attach($roleNurse->id, ['assigned_at' => now()]);

        // Explicitly register developer landing-page routes for this test suite
        \Illuminate\Support\Facades\Route::middleware(['auth:sanctum', 'active.user', 'role:developer'])->group(function () {
            \Illuminate\Support\Facades\Route::post('/api/developer/landing-page-settings', [\App\Http\Controllers\LandingPageSettingsController::class, 'updateSettings']);
            \Illuminate\Support\Facades\Route::put('/api/developer/landing-page-settings', [\App\Http\Controllers\LandingPageSettingsController::class, 'updateSettings']);
        });
    }

    public function test_get_settings_returns_default_settings_when_none_in_database(): void
    {
        $response = $this->getJson('/api/landing-page-settings');

        $response->assertStatus(200)
            ->assertJson([
                'app_short_name'      => 'TABTA',
                'app_full_name'       => 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'abtc_brand_title'    => 'ABTC',
                'abtc_description'    => 'Animal Bite Management & Monitoring System',
                'developed_for_text'  => 'Developed for Animal Bite Treatment Center',
                'operating_schedule'  => 'SCHEDULE: MONDAYS & THURSDAYS',
                'operating_hours'     => '8:00 AM – 5:00 PM',
                'registration_window' => '8:00 AM – 10:00 AM (Come Early!)',
                'requirement_notice'  => 'Please bring updated PhilHealth MDR',
            ])
            ->assertJsonStructure([
                'app_short_name',
                'app_full_name',
                'abtc_brand_title',
                'abtc_description',
                'developed_for_text',
                'quick_links',
                'support_links',
                'system_info_links',
                'operating_schedule',
                'operating_hours',
                'registration_window',
                'requirement_notice',
            ]);
    }

    public function test_get_settings_returns_persisted_settings_when_present(): void
    {
        LandingPageSetting::create([
            'app_short_name'     => 'CUSTOM-ABTC',
            'app_full_name'      => 'Custom Animal Bite Clinic',
            'abtc_brand_title'   => 'CABTC',
            'abtc_description'   => 'Custom Description',
            'developed_for_text' => 'Developed for Tagoloan',
        ]);

        $response = $this->getJson('/api/landing-page-settings');

        $response->assertStatus(200)
            ->assertJsonPath('app_short_name', 'CUSTOM-ABTC')
            ->assertJsonPath('app_full_name', 'Custom Animal Bite Clinic')
            ->assertJsonPath('abtc_brand_title', 'CABTC')
            ->assertJsonPath('abtc_description', 'Custom Description');
    }

    public function test_update_settings_requires_authentication_and_developer_role(): void
    {
        // Unauthenticated
        $this->postJson('/api/developer/landing-page-settings', [
            'app_short_name' => 'NEW-NAME',
        ])->assertStatus(401);

        // Non-developer (Nurse)
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/developer/landing-page-settings', [
            'app_short_name' => 'NEW-NAME',
        ])->assertStatus(403);
    }

    public function test_update_settings_creates_record_when_none_exists(): void
    {
        Sanctum::actingAs($this->developer);

        $payload = [
            'app_short_name'     => 'NEW-ABTC',
            'app_full_name'      => 'Newly Created ABTC Center',
            'abtc_brand_title'   => 'NEW-BRAND',
            'abtc_description'   => 'Newly configured system',
            'developed_for_text' => 'Custom text for ABTC',
            'operating_schedule' => 'Daily: 8am - 5pm',
            'quick_links'        => [
                ['label' => 'Portal', 'url' => '/portal'],
            ],
        ];

        $response = $this->postJson('/api/developer/landing-page-settings', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Landing page settings updated successfully',
                'settings' => [
                    'app_short_name'   => 'NEW-ABTC',
                    'app_full_name'    => 'Newly Created ABTC Center',
                    'abtc_brand_title' => 'NEW-BRAND',
                ],
            ]);

        $this->assertDatabaseHas('landing_page_settings', [
            'app_short_name' => 'NEW-ABTC',
            'app_full_name'  => 'Newly Created ABTC Center',
        ]);
    }

    public function test_update_settings_updates_existing_record(): void
    {
        $existing = LandingPageSetting::create([
            'app_short_name' => 'OLD-NAME',
            'app_full_name'  => 'Old Clinic Name',
        ]);

        Sanctum::actingAs($this->developer);

        $response = $this->putJson('/api/developer/landing-page-settings', [
            'app_short_name' => 'UPDATED-NAME',
            'app_full_name'  => 'Updated Clinic Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Landing page settings updated successfully')
            ->assertJsonPath('settings.app_short_name', 'UPDATED-NAME');

        $this->assertDatabaseHas('landing_page_settings', [
            'id'             => $existing->id,
            'app_short_name' => 'UPDATED-NAME',
            'app_full_name'  => 'Updated Clinic Name',
        ]);
    }

    public function test_update_settings_validates_input(): void
    {
        Sanctum::actingAs($this->developer);

        // String exceeding max:50
        $response = $this->postJson('/api/developer/landing-page-settings', [
            'app_short_name' => str_repeat('A', 51),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['app_short_name']);
    }
}
