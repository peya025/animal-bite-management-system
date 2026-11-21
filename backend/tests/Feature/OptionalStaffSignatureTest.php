<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OptionalStaffSignatureTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('signatures');
        $clinic = Clinic::create(['name' => 'Signature Test Clinic']);
        $this->admin = $this->staff($clinic->id, 'admin');
        $this->nurse = $this->staff($clinic->id, 'treatment');
        Sanctum::actingAs($this->admin);
    }

    private function staff(int $clinicId, string $role): User
    {
        return User::create([
            'clinic_id' => $clinicId, 'name' => 'Test Staff', 'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password123'), 'role' => $role, 'is_active' => true,
        ]);
    }

    private function image(): string
    {
        return 'data:image/png;base64,'.base64_encode(UploadedFile::fake()->image('signature.png', 160, 60)->get());
    }

    private function upload(): string
    {
        $this->putJson('/api/users/'.$this->nurse->id, ['signature_data' => $this->image()])->assertOk();

        return $this->nurse->fresh()->signature_path;
    }

    private function record(?string $path): TreatmentRecord
    {
        $patient = Patient::create([
            'clinic_id' => $this->nurse->clinic_id, 'patient_number' => fake()->unique()->numerify('PAT-######'),
            'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'male', 'date_of_birth' => '1990-01-01',
        ]);

        return TreatmentRecord::create([
            'clinic_id' => $this->nurse->clinic_id, 'patient_id' => $patient->patient_id,
            'administered_by' => $this->nurse->id, 'administered_at' => now(),
            'dose_number' => 0, 'treatment_date' => now(), 'status' => 'completed',
            'signature' => $path, 'signed_at' => $path ? now() : null,
        ]);
    }

    public function test_create_with_optional_upload_and_private_preview(): void
    {
        $response = $this->postJson('/api/users', [
            'name' => 'New Nurse', 'email' => 'new@example.test', 'password' => 'password123',
            'workstation_role' => 'intake_nurse', 'signature_data' => $this->image(),
        ])->assertCreated();
        $path = $response->json('user.signature_path');
        Storage::disk('signatures')->assertExists($path);
        $this->assertFileDoesNotExist(public_path($path));
        $preview = $this->get('/api/users/'.$response->json('user.id').'/signature');
        $preview->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->assertStringContainsString('no-store', $preview->headers->get('Cache-Control'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'signature.uploaded', 'user_id' => $this->admin->id]);
    }

    public function test_omission_keeps_image_and_replacement_or_removal_preserves_history(): void
    {
        $original = $this->upload();
        $record = $this->record($original);
        $unsigned = $this->record(null);
        $this->putJson('/api/users/'.$this->nurse->id, ['phone' => '09123456789'])->assertOk();
        $this->assertSame($original, $this->nurse->fresh()->signature_path);
        $replacement = $this->upload();
        $this->assertNotSame($original, $replacement);
        $this->assertSame($original, $record->fresh()->signature_path);
        $this->assertNull($unsigned->fresh()->signature_path);
        $this->putJson('/api/users/'.$this->nurse->id, ['remove_signature' => true])->assertOk();
        $this->assertNull($this->nurse->fresh()->signature_path);
        Storage::disk('signatures')->assertExists([$original, $replacement]);
        $this->get('/api/vaccination-records/'.$record->treatment_id.'/signature')->assertOk();
        $this->get('/api/vaccination-records/'.$unsigned->treatment_id.'/signature')->assertNotFound();
        $this->assertDatabaseHas('audit_logs', ['action' => 'signature.removed', 'user_id' => $this->admin->id]);
    }

    public function test_signature_access_is_scoped_to_owner_admin_and_clinic(): void
    {
        $path = $this->upload();
        $record = $this->record($path);
        Sanctum::actingAs($this->nurse);
        $this->getJson('/api/staff-signature')->assertOk()->assertJsonPath('signature_path', $path);
        $this->get('/api/users/'.$this->nurse->id.'/signature')->assertOk();
        $this->putJson('/api/users/'.$this->nurse->id, ['remove_signature' => true])->assertForbidden();
        Sanctum::actingAs($this->staff($this->nurse->clinic_id, 'treatment'));
        $this->get('/api/users/'.$this->nurse->id.'/signature')->assertForbidden();
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        Sanctum::actingAs($this->staff($otherClinic->id, 'admin'));
        $this->get('/api/users/'.$this->nurse->id.'/signature')->assertNotFound();
        $this->get('/api/vaccination-records/'.$record->treatment_id.'/signature')->assertNotFound();
        $this->putJson('/api/users/'.$this->nurse->id, ['signature_data' => $this->image()])->assertNotFound();
    }

    public function test_invalid_uploads_do_not_create_accounts_or_change_existing_image(): void
    {
        $path = $this->upload();
        $invalid = [
            ['signature_data' => 'data:image/png;base64,not-valid%%%'],
            ['signature_data' => 'data:image/png;base64,'.base64_encode('<?php echo "bad";')],
            ['signature_data' => 'data:image/svg+xml;base64,'.base64_encode('<svg/>')],
            ['signature_data' => 'data:image/png;base64,'.base64_encode(str_repeat('a', 2 * 1024 * 1024 + 1))],
            ['signature_path' => '../../another-user.png'],
            ['signature_data' => $this->image(), 'remove_signature' => true],
            ['signature_data' => 'data:image/png;base64,'.base64_encode(UploadedFile::fake()->image('wide.png', 4097, 1)->get())],
        ];
        foreach ($invalid as $payload) {
            $this->putJson('/api/users/'.$this->nurse->id, $payload)->assertUnprocessable();
            $this->assertSame($path, $this->nurse->fresh()->signature_path);
        }
        $this->postJson('/api/users', [
            'name' => 'Invalid', 'email' => 'invalid@example.test', 'password' => 'password123',
            'signature_data' => 'data:image/png;base64,bm90LWltYWdl',
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['email' => 'invalid@example.test']);
    }

    public function test_file_upload_is_reencoded_and_path_is_generated(): void
    {
        $response = $this->call('PUT', '/api/users/'.$this->nurse->id, [], [], [
            'signature' => UploadedFile::fake()->image('anything.jpg', 160, 60),
        ])->assertOk();
        $path = $response->json('user.signature_path');
        $this->assertMatchesRegularExpression('/^signatures\/[a-f0-9-]{36}\.png$/', $path);
        $this->assertSame(IMAGETYPE_PNG, getimagesizefromstring(Storage::disk('signatures')->get($path))[2]);
    }

    public function test_stale_profile_preview_is_rejected(): void
    {
        $old = $this->upload();
        $this->upload();
        $this->get('/api/users/'.$this->nurse->id.'/signature?version='.urlencode($old))->assertStatus(409);
    }

    public function test_completed_record_signature_cannot_be_replaced(): void
    {
        $record = $this->record($this->upload());
        $this->expectException(\DomainException::class);
        $record->update(['signature' => null, 'signed_at' => null]);
    }

    public function test_legacy_migration_preserves_record_associations_without_inventing_consent(): void
    {
        $legacy = 'signatures/test_migration_'.bin2hex(random_bytes(8)).'.png';
        file_put_contents(public_path($legacy), UploadedFile::fake()->image('legacy.png', 120, 40)->get());
        $this->nurse->update(['signature_path' => $legacy]);
        $record = $this->record($legacy);
        // Simulate a legacy record whose signing time is unknown.
        DB::table('treatment_records')->where('treatment_id', $record->treatment_id)->update(['signed_at' => null]);
        try {
            $this->artisan('signatures:privatize')->assertSuccessful();
            $this->assertSame($legacy, $this->nurse->fresh()->signature_path);
            $this->assertFileExists(public_path($legacy));
            $this->artisan('signatures:privatize', ['--apply' => true])->assertSuccessful();
            $new = $this->nurse->fresh()->signature_path;
            $this->assertNotSame($legacy, $new);
            $this->assertSame($new, $record->fresh()->signature);
            $this->assertNull($record->fresh()->signed_at);
            Storage::disk('signatures')->assertExists($new);
            $this->assertFileDoesNotExist(public_path($legacy));
            $this->assertTrue(AuditLog::where('action', 'signature.migrated')->exists());
        } finally {
            if (is_file(public_path($legacy))) {
                unlink(public_path($legacy));
            }
        }
    }
}
