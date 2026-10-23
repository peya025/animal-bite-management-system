<?php

namespace App\Http\Controllers;

use App\Services\Storage\PublicStorageService;
use Illuminate\Http\Response;

class PublicStorageController extends Controller
{
    public function __construct(
        protected PublicStorageService $publicStorageService
    ) {}

    /**
     * Stream public storage files directly with CORS and caching headers.
     * Guarantees uploaded logos and media load without requiring `php artisan storage:link`.
     */
    public function serve(string $path): Response
    {
        return $this->publicStorageService->serve($path);
    }
}
