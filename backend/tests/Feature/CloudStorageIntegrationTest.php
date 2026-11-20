<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\User;
use App\Services\StaffSignatureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CloudStorageIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_s3_driver_is_supported_by_flysystem(): void
    {
        Storage::fake('s3');

        Storage::disk('s3')->put('test.txt', 'cloud storage active');
        $this->assertTrue(Storage::disk('s3')->exists('test.txt'));
        $this->assertSame('cloud storage active', Storage::disk('s3')->get('test.txt'));
    }

    public function test_clinic_logo_uses_cloud_url_when_filesystem_disk_is_s3(): void
    {
        Storage::fake('s3');
        config([
            'filesystems.disks.public.driver' => 's3',
            'filesystems.disks.public.root' => null,
            'filesystems.disks.public.region' => 'auto',
            'filesystems.disks.public.bucket' => 'test-bucket',
            'filesystems.disks.public.url' => 'https://pub-mock.r2.dev',
        ]);

        $clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Center',
            'logo_path' => 'clinic-logos/test_logo.png',
        ]);

        $this->assertSame('https://pub-mock.r2.dev/clinic-logos/test_logo.png', $clinic->logo_url);
    }

    public function test_staff_signature_can_write_and_read_from_cloud_signatures_disk(): void
    {
        Storage::fake('signatures');

        $service = new StaffSignatureService();

        // 1x1 transparent PNG
        $transparentPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

        $path = $service->write($transparentPng);

        $this->assertTrue($service->available($path));

        $response = $service->response($path);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
    }
}
