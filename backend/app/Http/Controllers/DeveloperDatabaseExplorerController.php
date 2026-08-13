<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeveloperDatabaseExplorerController extends Controller
{
    /**
     * Get list of all database tables with row counts (XAMPP / MySQL compatible)
     */
    public function getTables(Request $request)
    {
        $databaseName = DB::getDatabaseName();

        // Native MySQL/MariaDB SHOW TABLES
        $rawTables = DB::select('SHOW TABLES');

        $tables = [];
        foreach ($rawTables as $row) {
            $rowArray = (array) $row;
            $tableName = reset($rowArray);

            if ($tableName) {
                try {
                    $actualCount = DB::table($tableName)->count();
                } catch (\Exception $e) {
                    $actualCount = 0;
                }

                $columnCount = 0;
                $primaryKey = 'id';
                try {
                    $cols = DB::select("DESCRIBE `{$tableName}`");
                    $columnCount = count($cols);
                    foreach ($cols as $c) {
                        if ($c->Key === 'PRI') {
                            $primaryKey = $c->Field;
                            break;
                        }
                    }
                } catch (\Exception $e) {
                    // Fallback
                }

                $tables[] = [
                    'table_name' => $tableName,
                    'row_count' => $actualCount,
                    'column_count' => $columnCount,
                    'primary_key' => $primaryKey,
                    'engine' => 'InnoDB',
                ];
            }
        }

        return response()->json([
            'database_name' => $databaseName,
            'total_tables' => count($tables),
            'tables' => $tables,
        ]);
    }

    /**
     * Get column structure for a specific table (Data browsing disabled for privacy protection)
     */
    public function getTableDetails(Request $request, $tableName)
    {
        $databaseName = DB::getDatabaseName();

        // Sanitize & verify table existence
        if (!Schema::hasTable($tableName)) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Native DESCRIBE table_name
        $describe = DB::select("DESCRIBE `{$tableName}`");

        $columns = array_map(function ($col) {
            return [
                'column_name' => $col->Field,
                'column_type' => $col->Type,
                'is_nullable' => $col->Null,
                'column_key' => $col->Key,
                'column_default' => $col->Default,
                'extra' => $col->Extra,
            ];
        }, $describe);

        $totalRecords = 0;
        try {
            $totalRecords = DB::table($tableName)->count();
        } catch (\Exception $e) {
            $totalRecords = 0;
        }

        // Privacy Policy: Do NOT return raw database row contents over the API
        return response()->json([
            'table_name' => $tableName,
            'columns' => $columns,
            'total_records' => $totalRecords,
            'privacy_notice' => 'Raw record content disabled for data privacy & security compliance.',
        ]);
    }
}
