<?php

namespace App\Services\Storage;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class PublicStorageService
{
    /**
     * Stream public storage files directly with CORS and caching headers.
     */
    public function serve(string $path): Response
    {
        $disk = Storage::disk('public');

        // Prevent path traversal
        $normalized = $this->normalizePath($path);

        if (!$disk->exists($normalized)) {
            abort(404, 'File not found');
        }

        $content = $disk->get($normalized);
        $mime = $disk->mimeType($normalized) ?: 'application/octet-stream';

        return response($content, 200, [
            'Content-Type'               => $mime,
            'Cache-Control'              => 'public, max-age=86400, must-revalidate',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        ]);
    }

    /**
     * Normalize path to prevent directory traversal attempts.
     */
    public function normalizePath(string $path): string
    {
        return ltrim(str_replace(['../', '..\\'], '', $path), '/\\');
    }
}
