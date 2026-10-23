<?php

namespace App\Services\Developer;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeveloperDatabaseExplorerService
{
    /**
     * Get list of all database tables with row counts and column metadata
     */
    public function getTables(): array
    {
        $databaseName = DB::getDatabaseName();
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $rawTables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        } else {
            // Native MySQL/MariaDB SHOW TABLES
            $rawTables = DB::select('SHOW TABLES');
        }

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
                    if ($driver === 'sqlite') {
                        $cols = DB::select("PRAGMA table_info(`{$tableName}`)");
                        $columnCount = count($cols);
                        foreach ($cols as $c) {
                            if (!empty($c->pk)) {
                                $primaryKey = $c->name;
                                break;
                            }
                        }
                    } else {
                        $cols = DB::select("DESCRIBE `{$tableName}`");
                        $columnCount = count($cols);
                        foreach ($cols as $c) {
                            if ($c->Key === 'PRI') {
                                $primaryKey = $c->Field;
                                break;
                            }
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

        return [
            'database_name' => $databaseName,
            'total_tables' => count($tables),
            'tables' => $tables,
        ];
    }

    /**
     * Get column structure for a specific table
     */
    public function getTableDetails(string $tableName): ?array
    {
        // Sanitize & verify table existence
        if (!Schema::hasTable($tableName)) {
            return null;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $rawColumns = DB::select("PRAGMA table_info(`{$tableName}`)");
            $columns = array_map(function ($col) {
                return [
                    'column_name' => $col->name,
                    'column_type' => $col->type,
                    'is_nullable' => empty($col->notnull) ? 'YES' : 'NO',
                    'column_key' => !empty($col->pk) ? 'PRI' : '',
                    'column_default' => $col->dflt_value,
                    'extra' => '',
                ];
            }, $rawColumns);
        } else {
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
        }

        $totalRecords = 0;
        try {
            $totalRecords = DB::table($tableName)->count();
        } catch (\Exception $e) {
            $totalRecords = 0;
        }

        return [
            'table_name' => $tableName,
            'columns' => $columns,
            'total_records' => $totalRecords,
            'privacy_notice' => 'Raw record content disabled for data privacy & security compliance.',
        ];
    }
}
