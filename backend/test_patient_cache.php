<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Cache;

echo "Testing Patient API Caching\n";
echo "==========================\n\n";

// Test 1: Check if Cache works
echo "Test 1: Cache Basic Test\n";
Cache::put('diagnostic-test', 'working', 60);
$result = Cache::get('diagnostic-test');
echo $result === 'working' ? "✅ Cache is functional\n" : "❌ Cache NOT working\n";
echo "\n";

// Test 2: Check cache table
echo "Test 2: Cache Table Contents\n";
$cacheCount = DB::table('cache')->count();
echo "Total cache entries: $cacheCount\n";

$patientCaches = DB::table('cache')->where('key', 'LIKE', '%patients%')->count();
echo "Patient-related caches: $patientCaches\n";

if ($patientCaches > 0) {
    echo "✅ Patient cache exists!\n";
    $recentCache = DB::table('cache')
        ->where('key', 'LIKE', '%patients%')
        ->orderBy('expiration', 'DESC')
        ->first();
    echo "Recent patient cache key: " . $recentCache->key . "\n";
    echo "Expires at: " . date('Y-m-d H:i:s', $recentCache->expiration) . "\n";
} else {
    echo "❌ No patient cache found - caching not working on patient endpoint!\n";
}
echo "\n";

// Test 3: Check if PatientController has Cache import
echo "Test 3: Check PatientController Code\n";
$controllerFile = __DIR__ . '/app/Http/Controllers/PatientController.php';
$content = file_get_contents($controllerFile);

if (strpos($content, 'use Illuminate\Support\Facades\Cache;') !== false) {
    echo "✅ PatientController has Cache import\n";
} else {
    echo "❌ PatientController missing Cache import!\n";
}

if (strpos($content, 'Cache::remember') !== false) {
    echo "✅ PatientController uses Cache::remember\n";
} else {
    echo "❌ PatientController NOT using Cache::remember!\n";
}
echo "\n";

// Test 4: Simulate patient query timing
echo "Test 4: Direct Patient Query Speed\n";
$start = microtime(true);
$patients = DB::table('patients')->limit(10)->get();
$queryTime = (microtime(true) - $start) * 1000;
echo "Direct query time: " . number_format($queryTime, 2) . "ms\n";
echo "Patient count: " . count($patients) . "\n";

if ($queryTime > 100) {
    echo "⚠️  Query is slow! Should be < 100ms for small data\n";
} else {
    echo "✅ Query speed is good\n";
}
echo "\n";

echo "==========================\n";
echo "Diagnosis Complete\n";
