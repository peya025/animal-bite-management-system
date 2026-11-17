<?php

namespace Tests\Unit\Services;

use App\Exceptions\FirebaseAuthenticationException;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class FirebaseAuthServiceTest extends TestCase
{
    protected string $tempDir;
    protected string $validCredsPath;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $this->tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fcm_test_' . uniqid();
        mkdir($this->tempDir, 0777, true);

        $this->validCredsPath = $this->tempDir . DIRECTORY_SEPARATOR . 'valid-creds.json';
        file_put_contents($this->validCredsPath, json_encode([
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'private_key' => "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...\n-----END PRIVATE KEY-----\n",
            'client_email' => 'firebase-test@test-firebase-project.iam.gserviceaccount.com',
        ]));

        Config::set('services.firebase.project_id', 'test-firebase-project');
        Config::set('services.firebase.credentials', $this->validCredsPath);
    }

    protected function tearDown(): void
    {
        if (File::isDirectory($this->tempDir)) {
            File::deleteDirectory($this->tempDir);
        }
        parent::tearDown();
    }

    public function test_resolves_credentials_path_correctly(): void
    {
        $service = new FirebaseAuthService();
        $this->assertEquals($this->validCredsPath, $service->getCredentialsFilePath());

        Config::set('services.firebase.credentials', 'storage/app/private/firebase-credentials.json');
        $this->assertEquals(base_path('storage/app/private/firebase-credentials.json'), $service->getCredentialsFilePath());
    }

    public function test_validates_credentials_file_successfully(): void
    {
        $service = new FirebaseAuthService();
        $metadata = $service->validateCredentialsFile();

        $this->assertEquals('service_account', $metadata['type']);
        $this->assertEquals('test-firebase-project', $metadata['project_id']);
        $this->assertEquals('firebase-test@test-firebase-project.iam.gserviceaccount.com', $metadata['client_email']);
    }

    public function test_missing_credentials_file_throws_exception(): void
    {
        Config::set('services.firebase.credentials', $this->tempDir . DIRECTORY_SEPARATOR . 'non-existent.json');
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials file not found.');

        $service->validateCredentialsFile();
    }

    public function test_mismatched_project_id_throws_exception(): void
    {
        Config::set('services.firebase.project_id', 'different-project-id');
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase project ID mismatch between configuration and credentials file.');

        $service->validateCredentialsFile();
    }

    public function test_malformed_credentials_file_throws_exception(): void
    {
        $malformedPath = $this->tempDir . DIRECTORY_SEPARATOR . 'malformed.json';
        file_put_contents($malformedPath, '{"broken": json');
        Config::set('services.firebase.credentials', $malformedPath);

        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials file is malformed or invalid JSON.');

        $service->validateCredentialsFile();
    }

    public function test_caches_access_token_and_returns_cached_token(): void
    {
        Cache::put(FirebaseAuthService::CACHE_KEY, 'mock-cached-access-token-12345', 3600);

        $service = new FirebaseAuthService();
        $token = $service->getAccessToken();

        $this->assertEquals('mock-cached-access-token-12345', $token);
    }

    public function test_invalidates_cached_access_token(): void
    {
        Cache::put(FirebaseAuthService::CACHE_KEY, 'mock-cached-access-token-12345', 3600);
        $this->assertTrue(Cache::has(FirebaseAuthService::CACHE_KEY));

        $service = new FirebaseAuthService();
        $service->invalidateToken();

        $this->assertFalse(Cache::has(FirebaseAuthService::CACHE_KEY));
    }
}
