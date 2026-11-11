<?php

namespace App\Services\Storage;

use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Illuminate\Support\Facades\Storage;

class PublicStorageService
{
    /**
     * Stream public storage files directly with CORS, caching, and range headers.
     */
    public function serve(string $path): SymfonyResponse
    {
        $disk = Storage::disk('public');

        // Prevent path traversal
        $normalized = $this->normalizePath($path);

        if (!$disk->exists($normalized)) {
            abort(404, 'File not found');
        }

        $size = $disk->size($normalized);
        $mime = $disk->mimeType($normalized) ?: 'application/octet-stream';
        $headers = [
            'Content-Type'                 => $mime,
            'Cache-Control'                => 'public, max-age=86400, must-revalidate',
            'Access-Control-Allow-Origin'  => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
            'Accept-Ranges'                => 'bytes',
            'Access-Control-Expose-Headers'=> 'Content-Range, Accept-Ranges, Content-Length',
        ];

        // Support HTTP Range requests for video streaming / seeking
        $range = request()->header('Range');
        if ($range && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
            $start = intval($matches[1]);
            $end = $matches[2] !== '' ? intval($matches[2]) : ($size - 1);
            if ($end >= $size) {
                $end = $size - 1;
            }
            if ($start > $end || $start >= $size) {
                return response('', 416, [
                    'Content-Range'               => "bytes */{$size}",
                    'Access-Control-Allow-Origin' => '*',
                ]);
            }
            $length = $end - $start + 1;

            $chunk = '';
            try {
                $stream = $disk->readStream($normalized);
                if ($stream !== false && is_resource($stream)) {
                    fseek($stream, $start);
                    $chunk = fread($stream, $length) ?: '';
                    fclose($stream);
                } else {
                    $content = $disk->get($normalized);
                    $chunk = substr($content, $start, $length);
                }
            } catch (\Throwable) {
                $content = $disk->get($normalized);
                $chunk = substr($content, $start, $length);
            }

            $headers['Content-Range'] = "bytes {$start}-{$end}/{$size}";
            $headers['Content-Length'] = (string) strlen($chunk);

            return response($chunk, 206, $headers);
        }

        $content = $disk->get($normalized);
        $headers['Content-Length'] = (string) strlen($content);

        return response($content, 200, $headers);
    }

    /**
     * Normalize path to prevent directory traversal attempts.
     */
    public function normalizePath(string $path): string
    {
        return ltrim(str_replace(['../', '..\\'], '', $path), '/\\');
    }
}
