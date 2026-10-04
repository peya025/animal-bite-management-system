<?php
// Fix developer role to have admin access
require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(8); // Lead Developer

if ($user) {
    echo "Updating user: {$user->name} (ID: {$user->id})\n";
    echo "Old role: {$user->role}\n";
    
    $user->update(['role' => 'admin']);
    
    echo "New role: admin\n";
    echo "\n✅ Success! You can now access the Queue page.\n";
    echo "Please logout and login again for changes to take effect.\n";
} else {
    echo "❌ User not found!\n";
}
