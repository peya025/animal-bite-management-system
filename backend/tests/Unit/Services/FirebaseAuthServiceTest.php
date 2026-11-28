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

    public function test_loads_credentials_from_firebase_credentials_json_env_when_file_absent(): void
    {
        // Point file path to non-existent file
        $nonExistentPath = $this->tempDir . DIRECTORY_SEPARATOR . 'does-not-exist-' . uniqid() . '.json';
        Config::set('services.firebase.credentials', $nonExistentPath);

        $envPayload = [
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'private_key' => "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...\\n-----END PRIVATE KEY-----\\n",
            'client_email' => 'env-service-account@test-firebase-project.iam.gserviceaccount.com',
        ];
        Config::set('services.firebase.credentials_json', json_encode($envPayload));

        $service = new FirebaseAuthService();
        $metadata = $service->validateCredentialsFile();

        $this->assertEquals('service_account', $metadata['type']);
        $this->assertEquals('test-firebase-project', $metadata['project_id']);
        $this->assertEquals('env-service-account@test-firebase-project.iam.gserviceaccount.com', $metadata['client_email']);
        $this->assertEquals('env_json', $metadata['source']);

        // Verify resolved credentials normalized the private key newlines
        $resolved = $service->resolveCredentials();
        $this->assertStringContainsString("\n", $resolved['data']['private_key']);
        $this->assertStringNotContainsString('\n', $resolved['data']['private_key']);
    }

    public function test_loads_credentials_from_firebase_credentials_base64_env(): void
    {
        $nonExistentPath = $this->tempDir . DIRECTORY_SEPARATOR . 'does-not-exist-' . uniqid() . '.json';
        Config::set('services.firebase.credentials', $nonExistentPath);
        Config::set('services.firebase.credentials_json', null);

        $envPayload = [
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'private_key' => "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...\n-----END PRIVATE KEY-----\n",
            'client_email' => 'base64-account@test-firebase-project.iam.gserviceaccount.com',
        ];
        Config::set('services.firebase.credentials_base64', base64_encode(json_encode($envPayload)));

        $service = new FirebaseAuthService();
        $metadata = $service->validateCredentialsFile();

        $this->assertEquals('test-firebase-project', $metadata['project_id']);
        $this->assertEquals('base64-account@test-firebase-project.iam.gserviceaccount.com', $metadata['client_email']);
        $this->assertEquals('env_base64', $metadata['source']);
    }

    public function test_runtime_materializes_file_safely_when_target_missing(): void
    {
        $targetFile = $this->tempDir . DIRECTORY_SEPARATOR . 'materialized' . DIRECTORY_SEPARATOR . 'creds.json';
        Config::set('services.firebase.credentials', $targetFile);
        Config::set('services.firebase.credentials_json', null);

        $envPayload = [
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'private_key' => "-----BEGIN PRIVATE KEY-----\nKEY_MATERIAL_TEST\n-----END PRIVATE KEY-----\n",
            'client_email' => 'materialize@test-firebase-project.iam.gserviceaccount.com',
        ];
        Config::set('services.firebase.credentials_base64', base64_encode(json_encode($envPayload)));

        $this->assertFileDoesNotExist($targetFile);

        $service = new FirebaseAuthService();
        $service->validateCredentialsFile();

        $this->assertFileExists($targetFile);
        $writtenData = json_decode(file_get_contents($targetFile), true);
        $this->assertEquals('materialize@test-firebase-project.iam.gserviceaccount.com', $writtenData['client_email']);
    }

    public function test_runtime_materialization_never_overwrites_existing_file(): void
    {
        $existingPath = $this->tempDir . DIRECTORY_SEPARATOR . 'existing-precious.json';
        file_put_contents($existingPath, 'ORIGINAL_UNTOUCHED_CONTENT');
        Config::set('services.firebase.credentials', $existingPath);

        $service = new FirebaseAuthService();
        $result = $service->materializeCredentialsFile([
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'client_email' => 'new@test.com',
            'private_key' => 'NEW_KEY',
        ], overwrite: false);

        $this->assertEquals($existingPath, $result);
        $this->assertEquals('ORIGINAL_UNTOUCHED_CONTENT', file_get_contents($existingPath));
    }

    public function test_materialization_failure_fails_safely_and_continues_in_memory(): void
    {
        // Use an invalid file path that cannot be created as a file (a directory path)
        $unwritableFilePath = $this->tempDir; // pointing to an existing directory instead of a file name
        Config::set('services.firebase.credentials', $unwritableFilePath);

        $envPayload = [
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'private_key' => "-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n",
            'client_email' => 'fallback@test-firebase-project.iam.gserviceaccount.com',
        ];
        Config::set('services.firebase.credentials_json', json_encode($envPayload));

        $service = new FirebaseAuthService();

        // Must not crash, but succeed in-memory
        $metadata = $service->validateCredentialsFile();
        $this->assertEquals('fallback@test-firebase-project.iam.gserviceaccount.com', $metadata['client_email']);
        $this->assertEquals('env_json', $metadata['source']);
    }

    public function test_malformed_env_json_throws_exception(): void
    {
        Config::set('services.firebase.credentials_json', '{"invalid_json": true,');
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials from environment variable [FIREBASE_CREDENTIALS_JSON] are malformed or invalid JSON.');

        $service->validateCredentialsFile();
    }

    public function test_invalid_env_base64_throws_exception(): void
    {
        Config::set('services.firebase.credentials_json', null);
        Config::set('services.firebase.credentials_base64', '!!!Not-Valid-Base64!!!');
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials in environment variable [FIREBASE_CREDENTIALS_BASE64] are not valid Base64.');

        $service->validateCredentialsFile();
    }

    public function test_malformed_json_inside_valid_base64_throws_exception(): void
    {
        Config::set('services.firebase.credentials_json', null);
        Config::set('services.firebase.credentials_base64', base64_encode('{not valid json'));
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials decoded from [FIREBASE_CREDENTIALS_BASE64] are malformed or invalid JSON.');

        $service->validateCredentialsFile();
    }

    public function test_missing_required_fields_in_env_json_throws_exception(): void
    {
        Config::set('services.firebase.credentials_json', json_encode([
            'project_id' => 'test-firebase-project',
            // missing client_email and private_key
        ]));
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase service account credentials from [FIREBASE_CREDENTIALS_JSON] are malformed: missing client_email or private_key.');

        $service->validateCredentialsFile();
    }

    public function test_mismatched_project_id_in_env_json_throws_exception(): void
    {
        Config::set('services.firebase.project_id', 'expected-project-id');
        Config::set('services.firebase.credentials_json', json_encode([
            'type' => 'service_account',
            'project_id' => 'different-project-id',
            'client_email' => 'test@different-project-id.iam.gserviceaccount.com',
            'private_key' => "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----\n",
        ]));
        $service = new FirebaseAuthService();

        $this->expectException(FirebaseAuthenticationException::class);
        $this->expectExceptionMessage('Firebase project ID mismatch between configuration and credentials from [FIREBASE_CREDENTIALS_JSON].');

        $service->validateCredentialsFile();
    }

    public function test_secrets_never_appear_in_logs_during_validation(): void
    {
        \Illuminate\Support\Facades\Log::spy();

        $secretKeyMaterial = 'SUPER_SECRET_PRIVATE_KEY_MATERIAL_' . uniqid();
        Config::set('services.firebase.credentials_json', json_encode([
            'type' => 'service_account',
            'project_id' => 'test-firebase-project',
            'client_email' => 'audit-test@test-firebase-project.iam.gserviceaccount.com',
            'private_key' => "-----BEGIN PRIVATE KEY-----\n{$secretKeyMaterial}\n-----END PRIVATE KEY-----\n",
        ]));

        $service = new FirebaseAuthService();
        $service->validateCredentialsFile();

        // Verify that Log never recorded the private key material anywhere
        \Illuminate\Support\Facades\Log::shouldNotHaveReceived('info', function ($message, $context = []) use ($secretKeyMaterial) {
            return str_contains((string) $message, $secretKeyMaterial)
                || str_contains(json_encode($context), $secretKeyMaterial);
        });

        \Illuminate\Support\Facades\Log::shouldNotHaveReceived('warning', function ($message, $context = []) use ($secretKeyMaterial) {
            return str_contains((string) $message, $secretKeyMaterial)
                || str_contains(json_encode($context), $secretKeyMaterial);
        });

        \Illuminate\Support\Facades\Log::shouldNotHaveReceived('error', function ($message, $context = []) use ($secretKeyMaterial) {
            return str_contains((string) $message, $secretKeyMaterial)
                || str_contains(json_encode($context), $secretKeyMaterial);
        });
    }
}
