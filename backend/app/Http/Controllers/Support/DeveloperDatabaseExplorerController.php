<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;

use App\Services\Developer\DeveloperDatabaseExplorerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeveloperDatabaseExplorerController extends Controller
{
    public function __construct(
        private readonly DeveloperDatabaseExplorerService $explorerService
    ) {}

    /**
     * Get list of all database tables with row counts (XAMPP / MySQL compatible)
     */
    public function getTables(Request $request): JsonResponse
    {
        $tables = $this->explorerService->getTables();

        return response()->json($tables);
    }

    /**
     * Get column structure for a specific table (Data browsing disabled for privacy protection)
     */
    public function getTableDetails(Request $request, string $tableName): JsonResponse
    {
        $details = $this->explorerService->getTableDetails($tableName);

        if ($details === null) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        return response()->json($details);
    }
}
