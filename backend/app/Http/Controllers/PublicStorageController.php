<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class PublicStorageController extends Controller
{
    /**
     * Stream public storage files directly with CORS and caching headers.
     * Guarantees uploaded logos and media load without requiring `php artisan storage:link`.
     */
    public function serve(string $path): Response
    {
        $disk = Storage::disk('public');

        // Prevent path traversal
        $normalized = ltrim(str_replace(['../', '..\\'], '', $path), '/\\');

        if (!$disk->exists($normalized)) {
            abort(404, 'File not found');
        }

        $content = $disk->get($normalized);
        $mime = $disk->mimeType($normalized) ?: 'application/octet-stream';

        return response($content, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400, must-revalidate',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        ]);
    }
}

