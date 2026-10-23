<?php

namespace Tests\Feature\Storage;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicStorageCharacterizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_serve_existing_file_returns_correct_content_and_headers(): void
    {
        Storage::disk('public')->put('logos/test-logo.png', 'fake-image-binary-data');

        $response = $this->get('/api/storage/logos/test-logo.png');

        $response->assertStatus(200);
        $this->assertEquals('fake-image-binary-data', $response->getContent());
        $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=86400', $response->headers->get('Cache-Control'));
        $this->assertContains($response->headers->get('Access-Control-Allow-Origin'), ['*', 'http://localhost:5173']);
        $this->assertEquals('GET, HEAD, OPTIONS', $response->headers->get('Access-Control-Allow-Methods'));
    }

    public function test_serve_nested_file_works_with_custom_mime_types(): void
    {
        Storage::disk('public')->put('documents/notice.txt', 'Public notice text');

        $response = $this->get('/api/storage/documents/notice.txt');

        $response->assertStatus(200);
        $this->assertEquals('Public notice text', $response->getContent());
        $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('max-age=86400', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('text/plain', $response->headers->get('Content-Type'));
        $this->assertContains($response->headers->get('Access-Control-Allow-Origin'), ['*', 'http://localhost:5173']);
    }

    public function test_serve_nonexistent_file_returns_404(): void
    {
        $response = $this->get('/api/storage/nonexistent/missing.png');
        $response->assertStatus(404);
    }

    public function test_serve_prevents_path_traversal(): void
    {
        Storage::disk('public')->put('safe.txt', 'Safe file content');

        // Path with directory traversal sequences
        $response = $this->get('/api/storage/../../safe.txt');

        // After normalizing out '../', it resolves to 'safe.txt' inside the public disk
        $response->assertStatus(200);
        $this->assertEquals('Safe file content', $response->getContent());

        // Attempting to access an actual nonexistent escaped path returns 404
        $escapeResponse = $this->get('/api/storage/../../../etc/passwd');
        $escapeResponse->assertStatus(404);
    }

    public function test_serve_nested_directories_and_mime_types(): void
    {
        Storage::disk('public')->put('nested/dir/asset.json', '{"status":"ok"}');

        $response = $this->get('/api/storage/nested/dir/asset.json');

        $response->assertStatus(200);
        $this->assertEquals('{"status":"ok"}', $response->getContent());
        $this->assertStringContainsString('application/json', $response->headers->get('Content-Type'));
    }
}
