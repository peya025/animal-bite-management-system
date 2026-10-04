<?php
// Quick script to check user roles
require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Current Users and Roles ===\n\n";

$users = App\Models\User::all(['id', 'name', 'email', 'role', 'is_active']);

foreach ($users as $user) {
    echo "ID: {$user->id}\n";
    echo "Name: {$user->name}\n";
    echo "Email: {$user->email}\n";
    echo "Role: {$user->role}\n";
    echo "Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    echo "-------------------\n";
}

echo "\n=== Required Roles for Queue Access ===\n";
echo "admin, registration, triage, treatment\n\n";

echo "To fix: Update your user role to one of the above.\n";
echo "Example: User::find(YOUR_ID)->update(['role' => 'admin']);\n";
