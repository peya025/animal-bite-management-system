<?php

namespace Tests\Feature\Developer;

use App\Http\Controllers\Support\DeveloperDatabaseExplorerController;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeveloperDatabaseExplorerCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $developerUser;
    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Dynamically register developer routes for testing
        Route::middleware(['auth:sanctum', 'active.user', 'role:developer'])->prefix('api')->group(function () {
            Route::get('/developer/database/tables', [DeveloperDatabaseExplorerController::class, 'getTables']);
            Route::get('/developer/database/tables/{tableName}', [DeveloperDatabaseExplorerController::class, 'getTableDetails']);
        });

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $this->developerUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dev Lead',
            'email'     => 'developer@abtc.test',
            'password'  => Hash::make('Password123!'),
            'role'      => 'developer',
            'is_active' => true,
        ]);

        $this->staffUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff Nurse',
            'email'     => 'nurse@abtc.test',
            'password'  => Hash::make('Password123!'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/developer/database/tables');

        $response->assertStatus(401);
    }

    public function test_non_developer_role_is_forbidden(): void
    {
        Sanctum::actingAs($this->staffUser, ['*']);

        $response = $this->getJson('/api/developer/database/tables');

        $response->assertStatus(403);
    }

    public function test_developer_can_get_database_tables(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->getJson('/api/developer/database/tables');

        $response->assertOk()
            ->assertJsonStructure([
                'database_name',
                'total_tables',
                'tables' => [
                    '*' => [
                        'table_name',
                        'row_count',
                        'column_count',
                        'primary_key',
                        'engine',
                    ],
                ],
            ]);

        $data = $response->json();
        $this->assertGreaterThan(0, $data['total_tables']);
        $tableNames = array_column($data['tables'], 'table_name');
        $this->assertContains('clinics', $tableNames);
        $this->assertContains('users', $tableNames);
    }

    public function test_developer_can_get_table_details(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->getJson('/api/developer/database/tables/clinics');

        $response->assertOk()
            ->assertJsonStructure([
                'table_name',
                'columns' => [
                    '*' => [
                        'column_name',
                        'column_type',
                        'is_nullable',
                        'column_key',
                        'column_default',
                        'extra',
                    ],
                ],
                'total_records',
                'privacy_notice',
            ]);

        $data = $response->json();
        $this->assertEquals('clinics', $data['table_name']);
        $this->assertGreaterThanOrEqual(1, $data['total_records']);
        $this->assertEquals('Raw record content disabled for data privacy & security compliance.', $data['privacy_notice']);

        $columnNames = array_column($data['columns'], 'column_name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('name', $columnNames);
    }

    public function test_get_table_details_returns_404_for_unknown_table(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->getJson('/api/developer/database/tables/non_existent_table_xyz');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Table not found',
            ]);
    }
}
