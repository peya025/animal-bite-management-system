<?php

// Deliberately limited to this feature's additive migrations on a local database.
// Run without arguments to inspect; --apply runs only these two migrations.
$root = dirname(__DIR__, 3);
require $root.'/backend/vendor/autoload.php';
$app = require $root.'/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$connection = config('database.default');
$settings = config('database.connections.'.$connection);
$host = $settings['host'] ?? null;
$database = $settings['database'] ?? null;
echo json_encode(['environment' => app()->environment(), 'connection' => $connection, 'host' => $host,
    'database' => $database, 'publication_enabled' => (bool) config('community_awareness.publication_enabled')], JSON_PRETTY_PRINT).PHP_EOL;
if (!app()->environment('local') || config('community_awareness.publication_enabled') || !empty($settings['url'])) {
    throw new RuntimeException('Refusing migration: local environment, disabled publication and explicit connection required.');
}
if ($connection !== 'mysql' || !in_array($host, ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Refusing migration: expected local MySQL connection.');
}
Illuminate\Support\Facades\DB::connection()->getPdo();
echo "Local database connection verified. No patient records read.\n";
if (in_array('--apply', $argv, true)) {
    $status = Illuminate\Support\Facades\Artisan::call('migrate', ['--path' => [
        'database/migrations/2026_11_27_000100_create_community_advisory_tables.php',
        'database/migrations/2026_11_27_000200_create_surveillance_tables.php',
        'database/migrations/2026_11_27_000300_extend_community_advisories_for_phase4.php',
        'database/migrations/2026_11_27_000400_create_community_advisory_deliveries_table.php',
    ], '--no-interaction' => true]);
    echo Illuminate\Support\Facades\Artisan::output();
    exit($status);
}
foreach (['community_advisories', 'community_advisory_events', 'community_advisory_deliveries', 'surveillance_runs', 'surveillance_signals', 'surveillance_signal_events'] as $table) {
    echo $table.': '.(Illuminate\Support\Facades\Schema::hasTable($table) ? 'present' : 'not yet created').PHP_EOL;
}
foreach (['advisory_type', 'source_authority', 'source_verified_at', 'scheduled_for'] as $column) {
    echo 'community_advisories.'.$column.': '.(Illuminate\Support\Facades\Schema::hasColumn('community_advisories', $column) ? 'present' : 'not yet created').PHP_EOL;
}
