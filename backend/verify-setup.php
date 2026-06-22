<?php
/**
 * Setup Verification Script
 * 
 * Run this script to verify your backend setup is correct.
 * Usage: php verify-setup.php
 */

echo "\n╔══════════════════════════════════════════════════════════╗\n";
echo "║  Animal Bite Management System - Setup Verification     ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n\n";

$errors = [];
$warnings = [];
$passed = 0;
$total = 0;

function check($description, $condition, $error = null, $warning = false) {
    global $errors, $warnings, $passed, $total;
    $total++;
    
    if ($condition) {
        echo "✅ $description\n";
        $passed++;
    } else {
        if ($warning) {
            echo "⚠️  $description\n";
            if ($error) $warnings[] = $error;
        } else {
            echo "❌ $description\n";
            if ($error) $errors[] = $error;
        }
    }
}

echo "🔍 Checking PHP Environment...\n";
check("PHP Version >= 8.2", version_compare(PHP_VERSION, '8.2.0', '>='), 
    "PHP 8.2+ required. Current: " . PHP_VERSION);

check("PDO Extension", extension_loaded('pdo'), 
    "PDO extension not found. Required for database.");

check("PDO SQLite Driver", extension_loaded('pdo_sqlite'), 
    "PDO SQLite driver not found.", true);

check("OpenSSL Extension", extension_loaded('openssl'), 
    "OpenSSL extension required for encryption.");

check("JSON Extension", extension_loaded('json'), 
    "JSON extension required.");

check("Fileinfo Extension", extension_loaded('fileinfo'), 
    "Fileinfo extension required for file uploads.", true);

echo "\n🔍 Checking Files and Directories...\n";
check("Vendor directory exists", is_dir(__DIR__ . '/vendor'), 
    "Run: composer install");

check(".env file exists", file_exists(__DIR__ . '/.env'), 
    "Run: copy .env.example .env");

check("Database directory exists", is_dir(__DIR__ . '/database'), 
    "Database directory missing!");

check("Storage directory writable", is_writable(__DIR__ . '/storage'), 
    "Run: chmod -R 775 storage");

check("Bootstrap/cache writable", is_writable(__DIR__ . '/bootstrap/cache'), 
    "Run: chmod -R 775 bootstrap/cache");

// Check .env configuration
if (file_exists(__DIR__ . '/.env')) {
    echo "\n🔍 Checking .env Configuration...\n";
    
    $envContent = file_get_contents(__DIR__ . '/.env');
    $envLines = explode("\n", $envContent);
    $envVars = [];
    
    foreach ($envLines as $line) {
        if (empty($line) || strpos($line, '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $envVars[trim($parts[0])] = trim($parts[1]);
        }
    }
    
    check("APP_KEY is set", !empty($envVars['APP_KEY'] ?? ''), 
        "Run: php artisan key:generate");
    
    check("APP_ENV is set", !empty($envVars['APP_ENV'] ?? ''));
    
    check("DB_CONNECTION is set", !empty($envVars['DB_CONNECTION'] ?? ''));
    
    $dbConnection = $envVars['DB_CONNECTION'] ?? '';
    if ($dbConnection === 'sqlite') {
        $dbPath = $envVars['DB_DATABASE'] ?? '';
        $fullPath = __DIR__ . '/' . $dbPath;
        
        check("SQLite database file exists", file_exists($fullPath), 
            "Create database: type nul > database\\database.sqlite");
    }
    
    check("FRONTEND_URL is set", !empty($envVars['FRONTEND_URL'] ?? ''), 
        "Set FRONTEND_URL=http://localhost:5173", true);
}

// Check if Laravel is properly installed
if (is_dir(__DIR__ . '/vendor')) {
    echo "\n🔍 Checking Laravel Installation...\n";
    
    check("Autoload file exists", file_exists(__DIR__ . '/vendor/autoload.php'));
    
    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        require __DIR__ . '/vendor/autoload.php';
        
        $app = require_once __DIR__ . '/bootstrap/app.php';
        
        try {
            $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
            check("Laravel application boots", true);
            
            // Check database connection
            try {
                $pdo = new PDO('sqlite:' . __DIR__ . '/database/database.sqlite');
                check("Database connection successful", true);
                
                // Check if migrations have run
                $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
                
                check("Migrations table exists", in_array('migrations', $tables), 
                    "Run: php artisan migrate");
                
                check("Clinics table exists", in_array('clinics', $tables), 
                    "Run: php artisan migrate");
                
                check("Users table exists", in_array('users', $tables), 
                    "Run: php artisan migrate");
                
                check("Vaccine inventory table exists", in_array('vaccine_inventory', $tables), 
                    "Run: php artisan migrate");
                
                // Check if seeds have run
                if (in_array('users', $tables)) {
                    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                    check("Default users seeded", $userCount > 0, 
                        "Run: php artisan db:seed --class=DefaultClinicSeeder", true);
                }
                
            } catch (Exception $e) {
                check("Database connection", false, 
                    "Database error: " . $e->getMessage());
            }
            
        } catch (Exception $e) {
            check("Laravel boots", false, 
                "Error: " . $e->getMessage());
        }
    }
}

// Summary
echo "\n" . str_repeat("─", 60) . "\n";
echo "📊 Summary: $passed/$total checks passed\n";

if (count($warnings) > 0) {
    echo "\n⚠️  Warnings (" . count($warnings) . "):\n";
    foreach ($warnings as $i => $warning) {
        echo "   " . ($i + 1) . ". $warning\n";
    }
}

if (count($errors) > 0) {
    echo "\n❌ Errors (" . count($errors) . "):\n";
    foreach ($errors as $i => $error) {
        echo "   " . ($i + 1) . ". $error\n";
    }
    echo "\n🔧 Fix the errors above and run this script again.\n";
    echo "📖 See SETUP_TROUBLESHOOTING.md for detailed solutions.\n\n";
    exit(1);
} else {
    echo "\n🎉 All critical checks passed!\n";
    
    if (count($warnings) > 0) {
        echo "⚠️  Some warnings exist but won't prevent the app from running.\n";
    }
    
    echo "\n🚀 Next steps:\n";
    echo "   1. Start the server: php artisan serve\n";
    echo "   2. Visit: http://localhost:8000\n";
    echo "   3. Setup frontend (see frontend/README.md)\n";
    echo "   4. Login with: admin@clinic.com / password123\n\n";
    exit(0);
}
